import { supabase } from '../config/supabase.js';

const formatModel = (item) => {
  if (!item) return null;
  const { id, ...rest } = item;
  return { ...rest, _id: id };
};

const createPost = async (data, userId, io) => {
  const { data: post, error } = await supabase
    .from('forum_posts')
    .insert({ ...data, userId })
    .select('*, userId:users(id, firstName, lastName)')
    .single();

  if (error) throw error;

  const formattedPost = formatModel(post);
  if (io) {
    io.to('forum').emit('forum:newPost', formattedPost);
  }
  return formattedPost;
};

const listPosts = async (queryParams = {}) => {
  const { tag, q, category, sort = '-createdAt', limit = 100 } = queryParams;
  let query = supabase
    .from('forum_posts')
    .select('*, userId:users(id, firstName, lastName)')
    .is('deletedAt', null);

  if (tag) query = query.contains('tags', [tag]);
  if (category && category !== 'all') query = query.eq('category', category);
  if (q) {
    // In Supabase we use textSearch or ilike
    query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
  }

  // Handle sort (assuming '-createdAt' means descending createdAt)
  const isDesc = sort.startsWith('-');
  const sortCol = isDesc ? sort.substring(1) : sort;
  query = query.order(sortCol, { ascending: !isDesc });

  const { data: posts, error } = await query.limit(Number(limit));
  if (error) throw error;

  return posts.map(formatModel);
};

const getPost = async (id) => {
  const { data: post, error } = await supabase
    .from('forum_posts')
    .select('*, userId:users(id, firstName, lastName)')
    .eq('id', id)
    .single();

  if (error || !post) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }

  const views = (post.views || 0) + 1;
  const { data: updatedPost, error: updateError } = await supabase
    .from('forum_posts')
    .update({ views })
    .eq('id', id)
    .select('*, userId:users(id, firstName, lastName)')
    .single();

  if (updateError) throw updateError;
  return formatModel(updatedPost);
};

const likePost = async (postId, userId, io) => {
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select('id, likesCount')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  const { data: existingReaction } = await supabase
    .from('forum_reactions')
    .select('id')
    .eq('postId', postId)
    .eq('userId', userId)
    .eq('type', 'like')
    .single();

  let liked, likesCount;

  if (existingReaction) {
    await supabase.from('forum_reactions').delete().eq('id', existingReaction.id);
    likesCount = Math.max(0, post.likesCount - 1);
    await supabase.from('forum_posts').update({ likesCount }).eq('id', postId);
    liked = false;
  } else {
    await supabase.from('forum_reactions').insert({ postId, userId, type: 'like' });
    likesCount = (post.likesCount || 0) + 1;
    await supabase.from('forum_posts').update({ likesCount }).eq('id', postId);
    liked = true;
  }

  if (io) {
    io.to('forum').emit('forum:postUpdate', { postId, updates: { likesCount } });
  }

  return { liked, likesCount };
};

const reportPost = async (postId, userId, reason) => {
  const { data: post, error: postError } = await supabase
    .from('forum_posts')
    .select('id, reports, reportCount, isFlagged')
    .eq('id', postId)
    .single();

  if (postError || !post) {
    const err = new Error('Post not found');
    err.status = 404;
    throw err;
  }

  const reports = post.reports || [];
  const alreadyReported = reports.some((r) => r.userId === userId);
  if (alreadyReported) {
    const err = new Error('You have already reported this post');
    err.status = 400;
    throw err;
  }

  reports.push({
    userId,
    reason: reason || 'No reason provided',
    timestamp: new Date().toISOString()
  });
  const reportCount = reports.length;
  const isFlagged = reportCount >= 3 ? true : post.isFlagged;

  const { error } = await supabase
    .from('forum_posts')
    .update({ reports, reportCount, isFlagged })
    .eq('id', postId);

  if (error) throw error;
  return { message: 'Post reported successfully' };
};

const addComment = async (postId, userId, { content, parentCommentId, isAnonymous }) => {
  let depth = 0;
  if (parentCommentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from('forum_comments')
      .select('id, depth, repliesCount')
      .eq('id', parentCommentId)
      .single();

    if (parentError || !parentComment) {
      const err = new Error('Parent comment not found');
      err.status = 404;
      throw err;
    }

    depth = parentComment.depth + 1;
    if (depth > 5) {
      const err = new Error('Maximum reply depth exceeded');
      err.status = 400;
      throw err;
    }

    await supabase
      .from('forum_comments')
      .update({ repliesCount: parentComment.repliesCount + 1 })
      .eq('id', parentCommentId);
  }

  const { data: comment, error: createError } = await supabase
    .from('forum_comments')
    .insert({
      postId,
      userId,
      content,
      parentCommentId: parentCommentId || null,
      depth,
      isAnonymous: isAnonymous || false
    })
    .select('*, userId:users(id, firstName, lastName)')
    .single();

  if (createError) throw createError;

  const { data: post } = await supabase
    .from('forum_posts')
    .select('id, commentsCount')
    .eq('id', postId)
    .single();

  if (post) {
    await supabase
      .from('forum_posts')
      .update({ commentsCount: (post.commentsCount || 0) + 1 })
      .eq('id', postId);
  }

  return formatModel(comment);
};

const listComments = async (postId, parentId) => {
  let query = supabase
    .from('forum_comments')
    .select('*, userId:users(id, firstName, lastName)')
    .eq('postId', postId)
    .is('deletedAt', null);

  if (parentId && parentId !== 'null') {
    query = query.eq('parentCommentId', parentId);
  } else {
    query = query.is('parentCommentId', null);
  }

  const { data: comments, error } = await query.order('createdAt', { ascending: true });
  if (error) throw error;

  return comments.map(formatModel);
};

const likeComment = async (commentId, userId) => {
  const { data: comment, error: commentError } = await supabase
    .from('forum_comments')
    .select('id, likesCount')
    .eq('id', commentId)
    .single();

  if (commentError || !comment) {
    const err = new Error('Comment not found');
    err.status = 404;
    throw err;
  }

  const { data: existingReaction } = await supabase
    .from('forum_reactions')
    .select('id')
    .eq('commentId', commentId)
    .eq('userId', userId)
    .eq('type', 'like')
    .single();

  if (existingReaction) {
    await supabase.from('forum_reactions').delete().eq('id', existingReaction.id);
    const likesCount = Math.max(0, comment.likesCount - 1);
    await supabase.from('forum_comments').update({ likesCount }).eq('id', commentId);
    return { liked: false, likesCount };
  } else {
    await supabase.from('forum_reactions').insert({ commentId, userId, type: 'like' });
    const likesCount = (comment.likesCount || 0) + 1;
    await supabase.from('forum_comments').update({ likesCount }).eq('id', commentId);
    return { liked: true, likesCount };
  }
};

const addReaction = async (postId, userId, type) => {
  const { data: reaction, error } = await supabase
    .from('forum_reactions')
    .insert({ postId, userId, type })
    .select('*')
    .single();

  if (error) throw error;
  return formatModel(reaction);
};

const removeReaction = async (id, userId) => {
  const { error } = await supabase
    .from('forum_reactions')
    .delete()
    .eq('id', id)
    .eq('userId', userId);

  if (error) {
    const err = new Error('Failed to remove reaction');
    err.status = 500;
    throw err;
  }
  return { success: true };
};

export default {
  createPost,
  listPosts,
  getPost,
  likePost,
  reportPost,
  addComment,
  listComments,
  likeComment,
  addReaction,
  removeReaction
};
