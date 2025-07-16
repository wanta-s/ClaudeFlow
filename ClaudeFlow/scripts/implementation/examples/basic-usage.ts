import { 
  createPasswordService, 
  createUserService, 
  createAuthService,
  isError,
  ERROR_CODES
} from '../optimized';

// ============================================
// Basic Usage Example
// ============================================

async function basicExample() {
  console.log('=== Basic Authentication System Example ===\n');

  // 1. Initialize services with standard security
  const passwordService = createPasswordService('standard');
  const userService = createUserService(passwordService);
  const authService = createAuthService(userService, {
    jwtSecret: 'your-secret-key-here' // In production, use environment variable
  });

  // 2. Create a new user
  console.log('Creating new user...');
  const createResult = await userService.createUser({
    email: 'john.doe@example.com',
    username: 'johndoe',
    password: 'SecurePass123!',
    profile: {
      firstName: 'John',
      lastName: 'Doe'
    }
  });

  if (isError(createResult)) {
    console.error('Failed to create user:', createResult.error.message);
    return;
  }

  const user = createResult.data;
  console.log(`User created successfully!`);
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Display Name: ${user.profile.displayName}\n`);

  // 3. Authenticate the user
  console.log('Authenticating user...');
  const loginResult = await authService.login(
    'john.doe@example.com',
    'SecurePass123!',
    'device-web-001'
  );

  if (isError(loginResult)) {
    console.error('Login failed:', loginResult.error.message);
    return;
  }

  const tokens = loginResult.data;
  console.log('Login successful!');
  console.log(`- Access Token: ${tokens.accessToken.substring(0, 20)}...`);
  console.log(`- Expires in: ${tokens.expiresIn} seconds\n`);

  // 4. Verify the access token
  console.log('Verifying access token...');
  const verifyResult = authService.verifyAccessToken(tokens.accessToken);

  if (isError(verifyResult)) {
    console.error('Token verification failed:', verifyResult.error.message);
    return;
  }

  const payload = verifyResult.data;
  console.log('Token verified successfully!');
  console.log(`- User ID: ${payload.userId}`);
  console.log(`- Email: ${payload.email}`);
  console.log(`- Type: ${payload.type}\n`);

  // 5. Update user profile
  console.log('Updating user profile...');
  const updateResult = await userService.updateUser(user.id, {
    profile: {
      bio: 'Software developer passionate about security',
      avatar: 'https://example.com/avatar.jpg'
    },
    settings: {
      theme: 'dark',
      notifications: {
        email: false
      }
    }
  });

  if (isError(updateResult)) {
    console.error('Update failed:', updateResult.error.message);
    return;
  }

  console.log('Profile updated successfully!');
  console.log(`- Bio: ${updateResult.data.profile.bio}`);
  console.log(`- Theme: ${updateResult.data.settings.theme}\n`);

  // 6. Refresh tokens
  console.log('Refreshing tokens...');
  const refreshResult = await authService.refresh(tokens.refreshToken);

  if (isError(refreshResult)) {
    console.error('Token refresh failed:', refreshResult.error.message);
    return;
  }

  console.log('Tokens refreshed successfully!');
  console.log(`- New Access Token: ${refreshResult.data.accessToken.substring(0, 20)}...\n`);

  // 7. List user sessions
  console.log('Listing user sessions...');
  const sessions = authService.getSessions(user.id);
  console.log(`Found ${sessions.length} active session(s):`);
  sessions.forEach((session, index) => {
    console.log(`  ${index + 1}. Device: ${session.deviceId}`);
    console.log(`     Created: ${session.createdAt.toISOString()}`);
    console.log(`     Last Active: ${session.lastAccessedAt.toISOString()}`);
  });

  // 8. Logout
  console.log('\nLogging out...');
  const logoutResult = await authService.logout(refreshResult.data.accessToken);

  if (isError(logoutResult)) {
    console.error('Logout failed:', logoutResult.error.message);
    return;
  }

  console.log('Logged out successfully!');

  // 9. Verify token is now invalid
  console.log('\nVerifying token after logout...');
  const postLogoutVerify = authService.verifyAccessToken(refreshResult.data.accessToken);
  
  if (isError(postLogoutVerify)) {
    console.log('Token correctly invalidated:', postLogoutVerify.error.message);
  } else {
    console.error('ERROR: Token should be invalid after logout!');
  }

  // 10. Show statistics
  console.log('\n=== System Statistics ===');
  console.log(`Total Users: ${userService.getUserCount()}`);
  console.log(`Active Users: ${userService.getActiveUserCount()}`);
  console.log(`Active Sessions: ${authService.getActiveSessionCount()}`);
  console.log(`Blacklisted Tokens: ${authService.getBlacklistedTokenCount()}`);
}

// ============================================
// Error Handling Example
// ============================================

async function errorHandlingExample() {
  console.log('\n\n=== Error Handling Example ===\n');

  const passwordService = createPasswordService('strict');
  const userService = createUserService(passwordService);

  // 1. Handle validation errors
  console.log('Testing password validation...');
  const weakPasswordResult = await userService.createUser({
    email: 'test@example.com',
    username: 'testuser',
    password: 'weak', // Too weak for 'strict' policy
    profile: {
      firstName: 'Test',
      lastName: 'User'
    }
  });

  if (isError(weakPasswordResult)) {
    console.log('Expected validation error:', weakPasswordResult.error.message);
  }

  // 2. Handle duplicate entries
  console.log('\nTesting duplicate user creation...');
  const firstUser = await userService.createUser({
    email: 'duplicate@example.com',
    username: 'uniqueuser',
    password: 'StrongPassword123!',
    profile: {
      firstName: 'First',
      lastName: 'User'
    }
  });

  if (isError(firstUser)) {
    console.error('Failed to create first user:', firstUser.error.message);
    return;
  }

  const duplicateUser = await userService.createUser({
    email: 'duplicate@example.com', // Same email
    username: 'differentuser',
    password: 'AnotherPassword123!',
    profile: {
      firstName: 'Second',
      lastName: 'User'
    }
  });

  if (isError(duplicateUser)) {
    if (duplicateUser.error.code === ERROR_CODES.DUPLICATE_ENTRY) {
      console.log('Expected duplicate error:', duplicateUser.error.message);
    }
  }

  // 3. Handle authentication failures
  console.log('\nTesting authentication failures...');
  const authService = createAuthService(userService, {
    jwtSecret: 'test-secret'
  });

  const wrongPasswordResult = await authService.login(
    'duplicate@example.com',
    'WrongPassword123!',
    'test-device'
  );

  if (isError(wrongPasswordResult)) {
    if (wrongPasswordResult.error.code === ERROR_CODES.AUTH_FAILED) {
      console.log('Expected auth error:', wrongPasswordResult.error.message);
    }
  }

  // 4. Handle not found errors
  console.log('\nTesting not found errors...');
  const notFoundResult = userService.getUser('non-existent-id');

  if (isError(notFoundResult)) {
    if (notFoundResult.error.code === ERROR_CODES.NOT_FOUND) {
      console.log('Expected not found error:', notFoundResult.error.message);
    }
  }
}

// ============================================
// Password Strength Example
// ============================================

async function passwordStrengthExample() {
  console.log('\n\n=== Password Strength Example ===\n');

  const passwordService = createPasswordService('standard');

  const passwords = [
    'weak',
    'password123',
    'Password123',
    'Password123!',
    'MySecureP@ssw0rd',
    'MyVerySecureP@ssw0rd123!',
    'aA1!aA1!aA1!aA1!' // Repeating pattern
  ];

  console.log('Password Strength Analysis:');
  console.log('─'.repeat(60));

  for (const password of passwords) {
    const strength = passwordService.calculateStrength(password);
    const validation = passwordService.validate(password);
    
    console.log(`Password: ${password.padEnd(30)} Strength: ${strength.toString().padStart(3)}/100`);
    
    if (isError(validation)) {
      console.log(`         ⚠️  ${validation.error.message}`);
    } else {
      console.log(`         ✅ Valid password`);
    }
  }
}

// ============================================
// Custom Policy Example
// ============================================

async function customPolicyExample() {
  console.log('\n\n=== Custom Policy Example ===\n');

  // Create service with custom policy
  const passwordService = createPasswordService({
    minLength: 15,
    maxLength: 50,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minStrength: 80,
    maxRepeatingChars: 1,
    minDifferentChars: 10,
    excludePatterns: [
      /password/i,
      /12345/,
      /qwerty/i,
      /admin/i
    ]
  });

  const testPasswords = [
    { pass: 'Short1!', expected: false },
    { pass: 'ThisIsALongerPassword123!', expected: false }, // Contains 'password'
    { pass: 'MyVeryL0ngAndSecure!Pass', expected: true },
    { pass: 'AaAaAaAa1234567!', expected: false }, // Too many repeating patterns
  ];

  console.log('Testing custom policy:');
  for (const { pass, expected } of testPasswords) {
    const result = passwordService.validate(pass);
    const isValid = !isError(result);
    const status = isValid === expected ? '✅' : '❌';
    
    console.log(`${status} Password: ${pass.padEnd(30)} Expected: ${expected}, Got: ${isValid}`);
    if (isError(result)) {
      console.log(`   Reason: ${result.error.message}`);
    }
  }
}

// ============================================
// Run Examples
// ============================================

async function runAllExamples() {
  try {
    await basicExample();
    await errorHandlingExample();
    await passwordStrengthExample();
    await customPolicyExample();
  } catch (error) {
    console.error('\nUnexpected error:', error);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runAllExamples();
}