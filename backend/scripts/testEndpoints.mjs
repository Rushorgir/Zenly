#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Testing Script
 * Tests all forum-related endpoints with detailed logging
 */

const API_BASE = 'http://localhost:5001';
let authToken = null;
let userId = null;
let testPostId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`STEP ${step}: ${message}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function makeRequest(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (authToken && !options.skipAuth) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const url = `${API_BASE}${endpoint}`;
  logInfo(`Request: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    
    if (response.ok) {
      logSuccess(`Status: ${response.status} ${response.statusText}`);
      return { success: true, data, status: response.status };
    } else {
      logError(`Status: ${response.status} ${response.statusText}`);
      logError(`Error: ${JSON.stringify(data, null, 2)}`);
      return { success: false, data, status: response.status };
    }
  } catch (error) {
    logError(`Network Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function test1_CreateUser() {
  logStep(1, 'Create Test User');
  
  const result = await makeRequest('/auth/signup', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      email: `test${Date.now()}@example.com`,
      password: 'TestPass123!',
      name: 'Test User'
    })
  });

  if (result.success && result.data.data) {
    authToken = result.data.data.accessToken;
    userId = result.data.data.user.id;
    logSuccess(`User created with ID: ${userId}`);
    logSuccess(`Auth token obtained`);
    return true;
  } else {
    // Try to login with existing test user
    logInfo('Trying to login with existing test user...');
    const loginResult = await makeRequest('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'password123'
      })
    });

    if (loginResult.success && loginResult.data.data) {
      authToken = loginResult.data.data.accessToken;
      userId = loginResult.data.data.user.id;
      logSuccess(`Logged in with ID: ${userId}`);
      logSuccess(`Auth token obtained`);
      return true;
    }
  }
  
  logError('Failed to create or login user');
  return false;
}

async function test2_CreatePost() {
  logStep(2, 'Create Forum Post');
  
  const result = await makeRequest('/forum/posts', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Test Post for API Testing',
      content: 'This is a test post to verify all API endpoints are working correctly.',
      category: 'Academic Stress',
      tags: ['test', 'api', 'automation'],
      isAnonymous: false
    })
  });

  if (result.success && result.data.data) {
    testPostId = result.data.data._id;
    logSuccess(`Post created with ID: ${testPostId}`);
    logInfo(`Title: ${result.data.data.title}`);
    logInfo(`Category: ${result.data.data.category}`);
    return true;
  }
  
  logError('Failed to create post');
  return false;
}

async function test3_GetAllPosts() {
  logStep(3, 'Get All Posts');
  
  const result = await makeRequest('/forum/posts', {
    method: 'GET',
    skipAuth: true
  });

  if (result.success && result.data.data) {
    logSuccess(`Retrieved ${result.data.data.length} posts`);
    return true;
  }
  
  logError('Failed to get posts');
  return false;
}

async function test4_GetSinglePost() {
  logStep(4, 'Get Single Post');
  
  if (!testPostId) {
    logError('No test post ID available');
    return false;
  }

  const result = await makeRequest(`/forum/posts/${testPostId}`, {
    method: 'GET',
    skipAuth: true
  });

  if (result.success && result.data.data) {
    logSuccess(`Retrieved post: ${result.data.data.title}`);
    logInfo(`Views: ${result.data.data.views}`);
    logInfo(`Likes: ${result.data.data.likesCount}`);
    return true;
  }
  
  logError('Failed to get single post');
  return false;
}

async function test5_LikePost() {
  logStep(5, 'Like Post');
  
  if (!testPostId) {
    logError('No test post ID available');
    return false;
  }

  const result = await makeRequest(`/forum/posts/${testPostId}/like`, {
    method: 'POST'
  });

  if (result.success && result.data.data) {
    logSuccess(`Post ${result.data.data.liked ? 'liked' : 'unliked'}`);
    logInfo(`Like count: ${result.data.data.likesCount}`);
    return true;
  }
  
  logError('Failed to like post');
  return false;
}

async function test6_UnlikePost() {
  logStep(6, 'Unlike Post');
  
  if (!testPostId) {
    logError('No test post ID available');
    return false;
  }

  const result = await makeRequest(`/forum/posts/${testPostId}/like`, {
    method: 'POST'
  });

  if (result.success && result.data.data) {
    logSuccess(`Post ${result.data.data.liked ? 'liked' : 'unliked'}`);
    logInfo(`Like count: ${result.data.data.likesCount}`);
    return true;
  }
  
  logError('Failed to unlike post');
  return false;
}

async function test7_ReportPost() {
  logStep(7, 'Report Post');
  
  if (!testPostId) {
    logError('No test post ID available');
    return false;
  }

  const result = await makeRequest(`/forum/posts/${testPostId}/report`, {
    method: 'POST',
    body: JSON.stringify({
      reason: 'Testing report functionality'
    })
  });

  if (result.success) {
    logSuccess('Post reported successfully');
    return true;
  }
  
  logError('Failed to report post');
  return false;
}

async function test8_AdminGetReportedPosts() {
  logStep(8, 'Admin: Get Reported Posts');
  
  const result = await makeRequest('/admin/forum/reported-posts', {
    method: 'GET'
  });

  if (result.success && result.data.data) {
    logSuccess(`Retrieved ${result.data.data.length} reported posts`);
    return true;
  }
  
  if (result.status === 403) {
    logInfo('User is not admin - skipping admin tests');
    return true; // Not an error, just not admin
  }
  
  logError('Failed to get reported posts');
  return false;
}

async function test9_AdminGetAllPosts() {
  logStep(9, 'Admin: Get All Posts');
  
  const result = await makeRequest('/admin/forum/all-posts', {
    method: 'GET'
  });

  if (result.success && result.data.data) {
    logSuccess(`Retrieved ${result.data.data.length} posts`);
    logInfo(`Total: ${result.data.total}`);
    return true;
  }
  
  if (result.status === 403) {
    logInfo('User is not admin - skipping');
    return true;
  }
  
  logError('Failed to get all posts');
  return false;
}

async function test10_AddComment() {
  logStep(10, 'Add Comment to Post');
  
  if (!testPostId) {
    logError('No test post ID available');
    return false;
  }

  const result = await makeRequest(`/forum/posts/${testPostId}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      content: 'This is a test comment',
      isAnonymous: false
    })
  });

  if (result.success && result.data.data) {
    logSuccess(`Comment added with ID: ${result.data.data._id}`);
    return true;
  }
  
  logError('Failed to add comment');
  return false;
}

async function runAllTests() {
  log('\n' + '█'.repeat(60), 'cyan');
  log('   ZENLY API ENDPOINT TESTING SUITE', 'cyan');
  log('█'.repeat(60) + '\n', 'cyan');

  const tests = [
    test1_CreateUser,
    test2_CreatePost,
    test3_GetAllPosts,
    test4_GetSinglePost,
    test5_LikePost,
    test6_UnlikePost,
    test7_ReportPost,
    test8_AdminGetReportedPosts,
    test9_AdminGetAllPosts,
    test10_AddComment
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      logError(`Test threw error: ${error.message}`);
      failed++;
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  log('\n' + '█'.repeat(60), 'cyan');
  log('   TEST RESULTS', 'cyan');
  log('█'.repeat(60), 'cyan');
  logSuccess(`Passed: ${passed}/${tests.length}`);
  if (failed > 0) {
    logError(`Failed: ${failed}/${tests.length}`);
  }
  log('█'.repeat(60) + '\n', 'cyan');
}

// Run tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
