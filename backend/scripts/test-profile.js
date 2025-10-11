#!/usr/bin/env node

/**
 * Test Profile API Integration
 * Tests: Get profile, update avatar, change password
 */

const API_BASE = 'http://localhost:5001';

// Test credentials
const TEST_EMAIL = 'nayyarrushaan@gmail.com';
const TEST_PASSWORD = 'password123';
const NEW_PASSWORD = 'newpassword123';

let accessToken = '';

async function login() {
    console.log('\n🔐 Logging in...');
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    const data = await response.json();
    
    if (data.success) {
        accessToken = data.data.accessToken;
        console.log('✅ Login successful');
        console.log(`   User: ${data.data.user.name} (${data.data.user.email})`);
        return true;
    } else {
        console.log('❌ Login failed:', data.error);
        return false;
    }
}

async function getProfile() {
    console.log('\n📋 Getting profile...');
    const response = await fetch(`${API_BASE}/users/me`, {
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    
    if (data.success) {
        console.log('✅ Profile retrieved');
        console.log('   Name:', data.data.name);
        console.log('   Email:', data.data.email);
        console.log('   University:', data.data.university || 'Not set');
        console.log('   Role:', data.data.role);
        console.log('   Avatar:', data.data.avatarUrl ? 'Set' : 'Not set');
        return data.data;
    } else {
        console.log('❌ Get profile failed:', data.error);
        return null;
    }
}

async function updateAvatar() {
    console.log('\n🖼️  Updating avatar...');
    const testAvatarUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCI+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDAiIGZpbGw9IiMwMDciLz48L3N2Zz4=';
    
    const response = await fetch(`${API_BASE}/users/me/avatar`, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ avatarUrl: testAvatarUrl })
    });
    const data = await response.json();
    
    if (data.success) {
        console.log('✅ Avatar updated');
        console.log('   Avatar URL length:', data.data.avatarUrl?.length || 0, 'characters');
        return true;
    } else {
        console.log('❌ Update avatar failed:', data.error);
        return false;
    }
}

async function updateProfile() {
    console.log('\n✏️  Updating profile...');
    
    const response = await fetch(`${API_BASE}/users/me`, {
        method: 'PATCH',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            university: 'Test University',
            academicYear: 'Year 2'
        })
    });
    const data = await response.json();
    
    if (data.success) {
        console.log('✅ Profile updated');
        console.log('   University:', data.data.university);
        console.log('   Academic Year:', data.data.academicYear);
        return true;
    } else {
        console.log('❌ Update profile failed:', data.error);
        return false;
    }
}

async function changePassword() {
    console.log('\n🔑 Changing password...');
    
    const response = await fetch(`${API_BASE}/users/me/password`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            currentPassword: TEST_PASSWORD,
            newPassword: NEW_PASSWORD
        })
    });
    const data = await response.json();
    
    if (data.success) {
        console.log('✅ Password changed successfully');
        return true;
    } else {
        console.log('❌ Change password failed:', data.error);
        return false;
    }
}

async function changePasswordBack() {
    console.log('\n🔄 Changing password back...');
    
    const response = await fetch(`${API_BASE}/users/me/password`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            currentPassword: NEW_PASSWORD,
            newPassword: TEST_PASSWORD
        })
    });
    const data = await response.json();
    
    if (data.success) {
        console.log('✅ Password reverted to original');
        return true;
    } else {
        console.log('❌ Revert password failed:', data.error);
        return false;
    }
}

async function testWrongPassword() {
    console.log('\n🚫 Testing with wrong current password...');
    
    const response = await fetch(`${API_BASE}/users/me/password`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            currentPassword: 'wrongpassword',
            newPassword: 'newpassword123'
        })
    });
    const data = await response.json();
    
    if (!data.success && data.error.includes('incorrect')) {
        console.log('✅ Correctly rejected wrong password');
        return true;
    } else {
        console.log('❌ Should have rejected wrong password');
        return false;
    }
}

async function runTests() {
    console.log('🧪 PROFILE API INTEGRATION TESTS');
    console.log('='.repeat(50));
    
    let passed = 0;
    let failed = 0;
    
    // Test 1: Login
    if (await login()) passed++; else failed++;
    
    // Test 2: Get Profile
    if (await getProfile()) passed++; else failed++;
    
    // Test 3: Update Avatar
    if (await updateAvatar()) passed++; else failed++;
    
    // Test 4: Update Profile
    if (await updateProfile()) passed++; else failed++;
    
    // Test 5: Test wrong password (should fail)
    if (await testWrongPassword()) passed++; else failed++;
    
    // Test 6: Change Password
    if (await changePassword()) passed++; else failed++;
    
    // Test 7: Change Password Back
    if (await changePasswordBack()) passed++; else failed++;
    
    // Final Results
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}/${passed + failed}`);
    console.log(`❌ Failed: ${failed}/${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All tests passed!');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the output above.');
    }
}

// Run tests
runTests().catch(console.error);
