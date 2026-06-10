import { supabase } from '../config/supabase.js';
import aiOrchestratorService from './ai-orchestrator.service.js';
import streamingService from './streaming.service.js';

// Helper to format Supabase data
const formatModel = (item) => {
  if (!item) return null;
  const { id, ...rest } = item;
  return { ...rest, _id: id };
};

const createConversation = async ({ type = 'general-chat', journalEntryId, title }, userId) => {
  if (!['journal-reflection', 'general-chat'].includes(type)) {
    const err = new Error('Invalid conversation type');
    err.status = 400;
    throw err;
  }

  if (type === 'journal-reflection') {
    if (!journalEntryId) {
      const err = new Error('Journal ID required for journal-reflection type');
      err.status = 400;
      throw err;
    }

    const { data: journal, error: journalError } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('id', journalEntryId)
      .eq('userId', userId)
      .is('deletedAt', null)
      .single();

    if (journalError || !journal) {
      const err = new Error('Journal not found');
      err.status = 404;
      throw err;
    }
  }

  const { data: emptyConversation, error: emptyError } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('userId', userId)
    .eq('type', type)
    .eq('messageCount', 0)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (emptyConversation) {
    const err = new Error('Empty conversation exists');
    err.status = 400;
    err.existingConversation = formatModel(emptyConversation);
    throw err;
  }

  const { data: conversation, error: createError } = await supabase
    .from('ai_conversations')
    .insert({
      userId,
      type,
      journalEntryId: type === 'journal-reflection' ? journalEntryId : null,
      title: title || (type === 'journal-reflection' ? 'Journal Reflection' : 'Chat with AI'),
      status: 'active',
      context: {
        recentJournals: [],
        userPreferences: {},
        conversationGoals: [],
        topicsDiscussed: []
      },
      messageCount: 0,
      createdAt: new Date().toISOString()
    })
    .select('*')
    .single();

  if (createError) throw createError;
  return formatModel(conversation);
};

const getConversation = async (id, userId) => {
  const { data: conversation, error } = await supabase
    .from('ai_conversations')
    .select('*, journalEntryId:journal_entries(id, content, mood, createdAt)')
    .eq('id', id)
    .eq('userId', userId)
    .single();

  if (error || !conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  return formatModel(conversation);
};

const listConversations = async ({ type, status, limit = 20, cursor }, userId) => {
  let query = supabase.from('ai_conversations').select('*').eq('userId', userId);

  if (type) {
    query = query.eq('type', type);
  }

  if (status) {
    query = query.eq('status', status);
  } else {
    query = query.neq('status', 'archived');
  }

  if (cursor) {
    query = query.lt('id', cursor);
  }

  const { data: conversations, error } = await query
    .order('lastMessageAt', { ascending: false, nullsFirst: false })
    .order('createdAt', { ascending: false })
    .limit(parseInt(limit) + 1);

  if (error) throw error;

  const hasMore = conversations.length > parseInt(limit);
  const results = hasMore ? conversations.slice(0, -1) : conversations;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return { results: results.map(formatModel), nextCursor, hasMore };
};

const sendMessage = async (conversationId, content, userId) => {
  if (!content || content.trim().length === 0) {
    const err = new Error('Message content is required');
    err.status = 400;
    throw err;
  }

  if (content.length > 2000) {
    const err = new Error('Message too long (max 2000 characters)');
    err.status = 400;
    throw err;
  }

  const { data: conversation, error: convError } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('userId', userId)
    .single();

  if (convError || !conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  const { data: userMessage, error: userError } = await supabase
    .from('ai_messages')
    .insert({
      conversationId,
      userId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString()
    })
    .select('*')
    .single();

  if (userError) throw userError;

  const aiResponse = await aiOrchestratorService.generateChatResponse(
    conversationId,
    content.trim()
  );

  const { data: aiMessage, error: aiError } = await supabase
    .from('ai_messages')
    .insert({
      conversationId,
      userId,
      role: 'assistant',
      content: aiResponse.content,
      metadata: {
        ...aiResponse.metadata,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        latencyMs: 0
      },
      createdAt: new Date().toISOString()
    })
    .select('*')
    .single();

  if (aiError) throw aiError;

  const updateData = {
    messageCount: conversation.messageCount + 2,
    lastMessageAt: new Date().toISOString()
  };

  if (aiResponse.metadata.isCrisis) {
    updateData.status = 'crisis';
    updateData.crisisDetected = true;
    updateData.crisisLevel = aiResponse.metadata.riskLevel;
  }

  await supabase.from('ai_conversations').update(updateData).eq('id', conversationId);

  return { userMessage: formatModel(userMessage), aiMessage: formatModel(aiMessage), aiResponse };
};

const sendMessageStream = async (res, conversationId, content, userId) => {
  if (!content || content.trim().length === 0) {
    const err = new Error('Message content is required');
    err.status = 400;
    throw err;
  }

  await streamingService.streamAIResponse(res, conversationId, content.trim(), userId);
};

const getMessages = async (conversationId, userId, { limit = 50, before, after } = {}) => {
  const { data: conversation, error: convError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('userId', userId)
    .single();

  if (convError || !conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  let query = supabase.from('ai_messages').select('*').eq('conversationId', conversationId);

  if (before) query = query.lt('createdAt', new Date(before).toISOString());
  if (after) query = query.gt('createdAt', new Date(after).toISOString());

  const ascending = !before;

  const { data: messages, error: msgError } = await query
    .order('createdAt', { ascending })
    .limit(parseInt(limit) + 1);

  if (msgError) throw msgError;

  const hasMore = messages.length > parseInt(limit);
  const results = hasMore ? messages.slice(0, -1) : messages;
  if (before) results.reverse();

  return { results: results.map(formatModel), hasMore };
};

const updateConversation = async (id, userId, { status, title }) => {
  const { data: conversation, error: convError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', id)
    .eq('userId', userId)
    .single();

  if (convError || !conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  const updateData = { updatedAt: new Date().toISOString() };
  if (status) updateData.status = status;
  if (title) updateData.title = title;

  const { data: updated, error } = await supabase
    .from('ai_conversations')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return formatModel(updated);
};

const deleteConversation = async (id, userId) => {
  const { data: conversation, error: convError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', id)
    .eq('userId', userId)
    .single();

  if (convError || !conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }

  const { count: msgCount, error: msgError } = await supabase
    .from('ai_messages')
    .delete()
    .eq('conversationId', id)
    .select('id', { count: 'exact' });

  const { error } = await supabase.from('ai_conversations').delete().eq('id', id);

  if (error) {
    const err = new Error('Failed to delete conversation');
    err.status = 500;
    throw err;
  }

  return { deletedMessages: msgCount || 0 };
};

const provideFeedback = async (messageId, userId, feedback) => {
  const { data: message, error: msgError } = await supabase
    .from('ai_messages')
    .select('*, conversationId:ai_conversations(userId)')
    .eq('id', messageId)
    .single();

  if (msgError || !message) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }

  if (message.conversationId.userId !== userId) {
    const err = new Error('Access denied');
    err.status = 403;
    throw err;
  }

  const updatedFeedback = {
    rating: feedback.rating,
    helpful: feedback.helpful,
    flagged: feedback.flagged,
    flagReason: feedback.flagReason,
    comment: feedback.comment,
    createdAt: new Date().toISOString()
  };

  const { error } = await supabase
    .from('ai_messages')
    .update({ feedback: updatedFeedback })
    .eq('id', messageId);

  if (error) throw error;
  return { message: 'Feedback recorded successfully' };
};

const cleanupConversations = async (userId) => {
  const { count: msgCount } = await supabase
    .from('ai_messages')
    .delete()
    .eq('userId', userId)
    .select('id', { count: 'exact' });

  const { count: convCount } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('userId', userId)
    .select('id', { count: 'exact' });

  return { deletedConversations: convCount || 0, deletedMessages: msgCount || 0 };
};

const migrateConversationTypes = async (userId) => {
  const { data: conversationsToMigrate } = await supabase
    .from('ai_conversations')
    .select('id, title, type')
    .eq('userId', userId)
    .is('type', null);

  if (!conversationsToMigrate || conversationsToMigrate.length === 0) {
    return { migratedCount: 0 };
  }

  const { data: updated, error } = await supabase
    .from('ai_conversations')
    .update({ type: 'general-chat' })
    .eq('userId', userId)
    .is('type', null)
    .select('id');

  return {
    migratedCount: updated?.length || 0,
    conversations: conversationsToMigrate.map(formatModel)
  };
};

export default {
  createConversation,
  getConversation,
  listConversations,
  sendMessage,
  sendMessageStream,
  getMessages,
  updateConversation,
  deleteConversation,
  provideFeedback,
  cleanupConversations,
  migrateConversationTypes
};
