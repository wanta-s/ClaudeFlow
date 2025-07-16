/**
 * PasswordService Usage Examples
 * 
 * This file demonstrates various use cases and patterns for the PasswordService
 */

import { PasswordService, Result, ValidationResult } from './optimized-password-service';

// ========== Basic Usage Examples ==========

async function basicExample() {
  console.log('=== Basic Usage ===');
  
  // Create service with defaults
  const service = new PasswordService();
  
  // Hash a password
  const password = 'MySecureP@ssw0rd';
  const hash = await service.hash(password);
  console.log('Hashed password:', hash);
  
  // Verify password
  const isValid = await service.verify(password, hash);
  console.log('Password valid:', isValid);
  
  // Try with wrong password
  const wrongValid = await service.verify('WrongPassword', hash);
  console.log('Wrong password valid:', wrongValid);
}

// ========== Security Levels Example ==========

async function securityLevelsExample() {
  console.log('\n=== Security Levels ===');
  
  // Low security for development
  const devService = PasswordService.withLevel('LOW');
  console.log('Dev config:', devService.getConfig());
  
  // Medium security for staging
  const stagingService = PasswordService.withLevel('MEDIUM');
  console.log('Staging config:', stagingService.getConfig());
  
  // High security for production
  const prodService = PasswordService.withLevel('HIGH');
  console.log('Production config:', prodService.getConfig());
  
  // Environment-based selection
  const envService = PasswordService.withLevel(
    process.env.NODE_ENV === 'production' ? 'HIGH' : 'LOW'
  );
}

// ========== Custom Configuration Example ==========

async function customConfigExample() {
  console.log('\n=== Custom Configuration ===');
  
  // Create service with custom rules
  const service = new PasswordService({
    minLength: 15,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: true,
    saltRounds: 12
  });
  
  // Test various passwords
  const passwords = [
    'short',
    'thisislongenoughbutnocaps123!',
    'ThisIsLongEnoughButNoNumber!',
    'ThisIsLongEnough123ButNoSpecial',
    'ThisIsAPerfectPassword123!'
  ];
  
  for (const pwd of passwords) {
    const validation = service.validate(pwd);
    console.log(`\nPassword: "${pwd}"`);
    console.log('Valid:', validation.isValid);
    if (!validation.isValid) {
      console.log('Errors:', validation.errors);
    }
  }
}

// ========== Error Handling Examples ==========

async function errorHandlingExample() {
  console.log('\n=== Error Handling ===');
  
  const service = PasswordService.withLevel('HIGH');
  
  // Traditional try-catch approach
  try {
    await service.hash('weak');
  } catch (error) {
    console.log('Traditional error:', error.message);
  }
  
  // Result type approach
  const result = await service.tryHash('weak');
  if (!result.success) {
    console.log('Result error:', result.error.message);
  }
  
  // Handling multiple operations
  const passwords = ['weak', 'StrongPassword123!', ''];
  
  const results = await Promise.all(
    passwords.map(pwd => service.tryHash(pwd))
  );
  
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`Password ${index + 1}: Success`);
    } else {
      console.log(`Password ${index + 1}: ${result.error.message}`);
    }
  });
}

// ========== Validation Examples ==========

async function validationExample() {
  console.log('\n=== Validation Examples ===');
  
  const service = new PasswordService({
    minLength: 10,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: true
  });
  
  // Pre-validation before hashing
  function validatePassword(password: string): ValidationResult {
    return service.validate(password);
  }
  
  // Form validation simulation
  const formPasswords = [
    { field: 'password1', value: 'short' },
    { field: 'password2', value: 'nouppercase123!' },
    { field: 'password3', value: 'NoNumbers!' },
    { field: 'password4', value: 'NoSpecialChar123' },
    { field: 'password5', value: 'ValidPass123!' }
  ];
  
  const formErrors: Record<string, string[]> = {};
  
  for (const { field, value } of formPasswords) {
    const validation = validatePassword(value);
    if (!validation.isValid) {
      formErrors[field] = validation.errors;
    }
  }
  
  console.log('Form validation errors:', formErrors);
}

// ========== Retry Mechanism Example ==========

async function retryExample() {
  console.log('\n=== Retry Mechanism ===');
  
  const service = new PasswordService();
  
  // Hash with custom retry count
  const password = 'TestPassword123';
  
  try {
    // More retries for critical operations
    const hash = await service.hash(password, { retries: 5 });
    console.log('Hash with 5 retries:', hash.substring(0, 20) + '...');
    
    // Fewer retries for non-critical
    const quickHash = await service.hash(password, { retries: 1 });
    console.log('Hash with 1 retry:', quickHash.substring(0, 20) + '...');
  } catch (error) {
    console.error('Hash failed after retries:', error.message);
  }
}

// ========== Express Integration Example ==========

interface User {
  id: string;
  email: string;
  passwordHash: string;
}

async function expressExample() {
  console.log('\n=== Express Integration Pattern ===');
  
  const passwordService = PasswordService.withLevel('HIGH');
  
  // Simulated register endpoint
  async function handleRegister(email: string, password: string) {
    // Validate password first
    const validation = passwordService.validate(password);
    if (!validation.isValid) {
      return {
        status: 400,
        error: 'Password does not meet requirements',
        details: validation.errors
      };
    }
    
    // Hash password
    const hashResult = await passwordService.tryHash(password);
    if (!hashResult.success) {
      return {
        status: 500,
        error: 'Failed to process password'
      };
    }
    
    // Create user (simulated)
    const user: User = {
      id: Math.random().toString(36),
      email,
      passwordHash: hashResult.value
    };
    
    return {
      status: 201,
      data: { id: user.id, email: user.email }
    };
  }
  
  // Simulated login endpoint
  async function handleLogin(email: string, password: string, user: User) {
    const verifyResult = await passwordService.tryVerify(password, user.passwordHash);
    
    if (!verifyResult.success) {
      return {
        status: 500,
        error: 'Authentication error'
      };
    }
    
    if (!verifyResult.value) {
      return {
        status: 401,
        error: 'Invalid credentials'
      };
    }
    
    return {
      status: 200,
      data: { token: 'jwt-token-here' }
    };
  }
  
  // Test the handlers
  const registerResult = await handleRegister('user@example.com', 'SecurePass123!');
  console.log('Register result:', registerResult);
  
  if (registerResult.status === 201) {
    const user: User = {
      id: registerResult.data.id,
      email: registerResult.data.email,
      passwordHash: '' // Would be from database
    };
    
    const loginResult = await handleLogin('user@example.com', 'SecurePass123!', user);
    console.log('Login result:', loginResult);
  }
}

// ========== Password Reset Flow Example ==========

async function passwordResetExample() {
  console.log('\n=== Password Reset Flow ===');
  
  const service = PasswordService.withLevel('MEDIUM');
  
  interface PasswordResetRequest {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }
  
  async function resetPassword(request: PasswordResetRequest, userHash: string) {
    // Verify current password
    const currentValid = await service.verify(request.currentPassword, userHash);
    if (!currentValid) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    // Validate new password
    const validation = service.validate(request.newPassword);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: 'New password does not meet requirements',
        details: validation.errors
      };
    }
    
    // Ensure new password is different
    const samePassword = await service.verify(request.newPassword, userHash);
    if (samePassword) {
      return { success: false, error: 'New password must be different' };
    }
    
    // Hash new password with extra retries
    const hashResult = await service.tryHash(request.newPassword, { retries: 5 });
    if (!hashResult.success) {
      return { success: false, error: 'Failed to process new password' };
    }
    
    return { 
      success: true, 
      newHash: hashResult.value,
      message: 'Password reset successful'
    };
  }
  
  // Simulate password reset
  const mockUserHash = '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr';
  const resetRequest: PasswordResetRequest = {
    userId: 'user123',
    currentPassword: 'OldPassword123',
    newPassword: 'NewSecurePass456!'
  };
  
  const resetResult = await resetPassword(resetRequest, mockUserHash);
  console.log('Password reset result:', resetResult);
}

// ========== Batch Processing Example ==========

async function batchProcessingExample() {
  console.log('\n=== Batch Processing ===');
  
  const service = PasswordService.withLevel('MEDIUM');
  
  // Process multiple passwords concurrently
  const passwords = [
    'FirstUser123',
    'SecondUser456',
    'ThirdUser789',
    'FourthUser000',
    'FifthUser111'
  ];
  
  console.time('Batch hash');
  const hashPromises = passwords.map(pwd => service.tryHash(pwd));
  const results = await Promise.all(hashPromises);
  console.timeEnd('Batch hash');
  
  const successful = results.filter(r => r.success).length;
  console.log(`Successfully hashed: ${successful}/${passwords.length}`);
  
  // Batch verification
  const verifyPairs = results
    .filter((r): r is { success: true; value: string } => r.success)
    .map((r, i) => ({ password: passwords[i], hash: r.value }));
  
  console.time('Batch verify');
  const verifyPromises = verifyPairs.map(
    pair => service.verify(pair.password, pair.hash)
  );
  const verifyResults = await Promise.all(verifyPromises);
  console.timeEnd('Batch verify');
  
  console.log('All passwords verified correctly:', verifyResults.every(v => v));
}

// ========== Configuration Management Example ==========

async function configurationExample() {
  console.log('\n=== Configuration Management ===');
  
  // Configuration factory
  class PasswordServiceFactory {
    private static configs = {
      development: {
        minLength: 6,
        saltRounds: 10
      },
      staging: {
        minLength: 8,
        requireNumber: true,
        saltRounds: 12
      },
      production: {
        minLength: 12,
        requireUppercase: true,
        requireNumber: true,
        requireSpecialChar: true,
        saltRounds: 14
      }
    };
    
    static create(environment: 'development' | 'staging' | 'production') {
      return new PasswordService(this.configs[environment]);
    }
  }
  
  // Create environment-specific services
  const devService = PasswordServiceFactory.create('development');
  const stagingService = PasswordServiceFactory.create('staging');
  const prodService = PasswordServiceFactory.create('production');
  
  console.log('Dev config:', devService.getConfig());
  console.log('Staging config:', stagingService.getConfig());
  console.log('Prod config:', prodService.getConfig());
}

// ========== Password Strength Indicator Example ==========

async function strengthIndicatorExample() {
  console.log('\n=== Password Strength Indicator ===');
  
  function getPasswordStrength(password: string): {
    score: number;
    level: 'weak' | 'medium' | 'strong' | 'very-strong';
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;
    
    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    
    // Complexity scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    
    // Generate feedback
    if (password.length < 8) feedback.push('Use at least 8 characters');
    if (!/[A-Z]/.test(password)) feedback.push('Add uppercase letters');
    if (!/[0-9]/.test(password)) feedback.push('Add numbers');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) feedback.push('Add special characters');
    
    // Determine level
    let level: 'weak' | 'medium' | 'strong' | 'very-strong';
    if (score <= 2) level = 'weak';
    else if (score <= 4) level = 'medium';
    else if (score <= 6) level = 'strong';
    else level = 'very-strong';
    
    return { score, level, feedback };
  }
  
  // Test various passwords
  const testPasswords = [
    'password',
    'Password1',
    'Password123!',
    'MyVeryLongAndComplexPassword123!'
  ];
  
  for (const pwd of testPasswords) {
    const strength = getPasswordStrength(pwd);
    console.log(`\nPassword: "${pwd}"`);
    console.log('Strength:', strength.level, `(score: ${strength.score}/7)`);
    if (strength.feedback.length > 0) {
      console.log('Suggestions:', strength.feedback);
    }
  }
}

// ========== Run All Examples ==========

async function runAllExamples() {
  try {
    await basicExample();
    await securityLevelsExample();
    await customConfigExample();
    await errorHandlingExample();
    await validationExample();
    await retryExample();
    await expressExample();
    await passwordResetExample();
    await batchProcessingExample();
    await configurationExample();
    await strengthIndicatorExample();
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples();
}

// Export examples for testing
export {
  basicExample,
  securityLevelsExample,
  customConfigExample,
  errorHandlingExample,
  validationExample,
  retryExample,
  expressExample,
  passwordResetExample,
  batchProcessingExample,
  configurationExample,
  strengthIndicatorExample
};