import { PasswordService, passwordService, SecurityLevel, ValidationResult } from './passwordService.optimized';

// Example 1: Basic Usage with Pre-configured Instances
async function basicUsageExample() {
  console.log('=== Basic Usage Example ===');
  
  // Use high security for admin accounts
  const adminPassword = 'AdminPass123!@#';
  const hashedAdmin = await passwordService.high.hash(adminPassword);
  console.log('Admin password hashed');
  
  // Verify password
  const isValidAdmin = await passwordService.high.verify(adminPassword, hashedAdmin);
  console.log('Admin password valid:', isValidAdmin);
  
  // Use medium security for regular users
  const userPassword = 'UserPass123';
  const hashedUser = await passwordService.medium.hash(userPassword);
  console.log('User password hashed');
  
  // Use low security for temporary passwords
  const tempPassword = 'temp123';
  const hashedTemp = await passwordService.low.hash(tempPassword);
  console.log('Temporary password hashed');
}

// Example 2: Custom Configuration
async function customConfigExample() {
  console.log('\n=== Custom Configuration Example ===');
  
  // Create service with custom requirements
  const customService = PasswordService.create({
    saltRounds: 11,
    minLength: 10,
    maxLength: 64,
    requireUpperCase: true,
    requireLowerCase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    specialChars: '!@#$%'  // Limited special characters
  });
  
  const password = 'CustomPass123!';
  const validation = customService.validateStrength(password);
  console.log('Password validation:', validation);
  
  if (validation.isValid) {
    const hashed = await customService.hash(password);
    console.log('Custom password hashed successfully');
  }
}

// Example 3: Password Validation
function validationExample() {
  console.log('\n=== Password Validation Example ===');
  
  const passwords = [
    'short',
    'nouppercase123!',
    'NOLOWERCASE123!',
    'NoNumbers!',
    'NoSpecialChars123',
    'ValidPassword123!'
  ];
  
  passwords.forEach(pwd => {
    const result = passwordService.high.validateStrength(pwd);
    console.log(`Password: ${pwd}`);
    console.log(`  Valid: ${result.isValid}`);
    if (!result.isValid) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
  });
}

// Example 4: Registration Flow
async function registrationFlowExample() {
  console.log('\n=== Registration Flow Example ===');
  
  class UserRegistration {
    private passwordService = passwordService.medium;
    
    async registerUser(email: string, password: string) {
      // Step 1: Validate password strength
      const validation = this.passwordService.validateStrength(password);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }
      
      // Step 2: Hash password
      try {
        const hashedPassword = await this.passwordService.hash(password);
        
        // Step 3: Save to database (simulated)
        console.log(`User ${email} registered with hashed password`);
        
        return {
          success: true,
          userId: Math.random().toString(36).substr(2, 9)
        };
      } catch (error) {
        return {
          success: false,
          errors: ['Registration failed']
        };
      }
    }
  }
  
  const registration = new UserRegistration();
  const result = await registration.registerUser('user@example.com', 'SecurePass123');
  console.log('Registration result:', result);
}

// Example 5: Authentication Flow
async function authenticationFlowExample() {
  console.log('\n=== Authentication Flow Example ===');
  
  class AuthService {
    private passwordService = passwordService.medium;
    private users = new Map<string, string>(); // email -> hashedPassword
    
    async createUser(email: string, password: string) {
      const hashed = await this.passwordService.hash(password);
      this.users.set(email, hashed);
    }
    
    async authenticate(email: string, password: string): Promise<boolean> {
      const storedHash = this.users.get(email);
      if (!storedHash) {
        // Prevent timing attacks by still running verification
        await this.passwordService.verify(password, '$2b$10$invalidhashforcomparison');
        return false;
      }
      
      return await this.passwordService.verify(password, storedHash);
    }
  }
  
  const auth = new AuthService();
  await auth.createUser('user@example.com', 'MyPassword123');
  
  // Test authentication
  const validAuth = await auth.authenticate('user@example.com', 'MyPassword123');
  console.log('Valid authentication:', validAuth);
  
  const invalidAuth = await auth.authenticate('user@example.com', 'WrongPassword');
  console.log('Invalid authentication:', invalidAuth);
}

// Example 6: Password Change with History
async function passwordChangeExample() {
  console.log('\n=== Password Change Example ===');
  
  class PasswordManager {
    private passwordService = passwordService.high;
    private passwordHistory: string[] = [];
    private maxHistory = 5;
    
    async changePassword(currentPassword: string, newPassword: string, currentHash: string): Promise<{ success: boolean; message: string }> {
      // Verify current password
      const isCurrentValid = await this.passwordService.verify(currentPassword, currentHash);
      if (!isCurrentValid) {
        return { success: false, message: 'Current password is incorrect' };
      }
      
      // Validate new password
      const validation = this.passwordService.validateStrength(newPassword);
      if (!validation.isValid) {
        return { success: false, message: `Invalid password: ${validation.errors.join(', ')}` };
      }
      
      // Check password history
      for (const oldHash of this.passwordHistory) {
        const isReused = await this.passwordService.verify(newPassword, oldHash);
        if (isReused) {
          return { success: false, message: 'Password has been used recently' };
        }
      }
      
      // Hash new password
      const newHash = await this.passwordService.hash(newPassword);
      
      // Update history
      this.passwordHistory.unshift(currentHash);
      if (this.passwordHistory.length > this.maxHistory) {
        this.passwordHistory.pop();
      }
      
      return { success: true, message: 'Password changed successfully' };
    }
  }
  
  const manager = new PasswordManager();
  const currentHash = await passwordService.high.hash('OldPassword123!');
  const result = await manager.changePassword('OldPassword123!', 'NewPassword456!', currentHash);
  console.log('Password change result:', result);
}

// Example 7: Performance Testing
async function performanceExample() {
  console.log('\n=== Performance Testing Example ===');
  
  const testPassword = 'PerformanceTest123!';
  
  for (const level of ['LOW', 'MEDIUM', 'HIGH'] as SecurityLevel[]) {
    const service = PasswordService.createWithLevel(level);
    const config = service.getConfig();
    
    console.log(`\nTesting ${level} security (${config.saltRounds} rounds):`);
    
    // Hash performance
    const hashStart = Date.now();
    const hashed = await service.hash(testPassword);
    const hashTime = Date.now() - hashStart;
    console.log(`  Hash time: ${hashTime}ms`);
    
    // Verify performance
    const verifyStart = Date.now();
    await service.verify(testPassword, hashed);
    const verifyTime = Date.now() - verifyStart;
    console.log(`  Verify time: ${verifyTime}ms`);
    
    // Validation performance (should be <1ms)
    const validateStart = Date.now();
    service.validateStrength(testPassword);
    const validateTime = Date.now() - validateStart;
    console.log(`  Validation time: ${validateTime}ms`);
  }
}

// Example 8: Error Handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const service = passwordService.medium;
  
  // Test various error scenarios
  const errorTests = [
    { name: 'Empty password', fn: () => service.hash('') },
    { name: 'Null password', fn: () => service.hash(null as any) },
    { name: 'Invalid hash format', fn: () => service.verify('password', 'not-a-bcrypt-hash') },
    { name: 'Undefined hash', fn: () => service.verify('password', undefined as any) }
  ];
  
  for (const test of errorTests) {
    try {
      await test.fn();
      console.log(`${test.name}: No error (unexpected)`);
    } catch (error) {
      console.log(`${test.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Run all examples
async function runAllExamples() {
  await basicUsageExample();
  await customConfigExample();
  validationExample();
  await registrationFlowExample();
  await authenticationFlowExample();
  await passwordChangeExample();
  await performanceExample();
  await errorHandlingExample();
}

// Export for testing
export {
  basicUsageExample,
  customConfigExample,
  validationExample,
  registrationFlowExample,
  authenticationFlowExample,
  passwordChangeExample,
  performanceExample,
  errorHandlingExample,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}