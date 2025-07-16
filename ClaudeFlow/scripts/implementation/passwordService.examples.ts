import { PasswordService } from './passwordService';

// Example 1: Basic usage with default settings
async function basicExample() {
  const service = new PasswordService();
  
  const password = 'MyPassword123';
  const hash = await service.hash(password);
  const isValid = await service.verify(password, hash);
  
  console.log('Password valid:', isValid); // true
}

// Example 2: Using predefined security levels
async function securityLevelsExample() {
  const lowSecurity = PasswordService.withLevel('LOW');
  const mediumSecurity = PasswordService.withLevel('MEDIUM');
  const highSecurity = PasswordService.withLevel('HIGH');
  
  try {
    await highSecurity.hash('weak'); // Throws: too short
  } catch (error) {
    console.error('High security validation:', error.message);
  }
  
  const securePassword = 'MyP@ssw0rd123!';
  const hash = await highSecurity.hash(securePassword);
  console.log('High security hash created');
}

// Example 3: Custom configuration
async function customConfigExample() {
  const service = new PasswordService({
    saltRounds: 12,
    minLength: 10,
    requireNumber: true,
    requireUppercase: true
  });
  
  const config = service.getConfig();
  console.log('Current config:', config);
  
  try {
    await service.hash('password'); // Throws: no number, no uppercase
  } catch (error) {
    console.error('Validation error:', error.message);
  }
}

// Example 4: Error handling with retries
async function errorHandlingExample() {
  const service = new PasswordService();
  
  try {
    await service.verify('password', 'invalid-hash');
  } catch (error) {
    console.error('Invalid hash format:', error.message);
  }
  
  // Hash with custom retry count
  const hash = await service.hash('MyPassword123', 5);
  console.log('Hash created with 5 retries');
}

// Example 5: User registration flow
async function userRegistrationExample() {
  const service = PasswordService.withLevel('MEDIUM');
  
  async function registerUser(email: string, password: string) {
    try {
      const passwordHash = await service.hash(password);
      
      // Save to database
      const user = {
        email,
        passwordHash,
        createdAt: new Date()
      };
      
      console.log('User registered:', email);
      return user;
    } catch (error) {
      console.error('Registration failed:', error.message);
      throw error;
    }
  }
  
  await registerUser('user@example.com', 'SecurePass123');
}

// Example 6: Login authentication flow
async function loginExample() {
  const service = new PasswordService();
  
  // Simulated database
  const users = new Map([
    ['admin@example.com', '$2b$10$YourHashedPasswordHere']
  ]);
  
  async function authenticate(email: string, password: string) {
    const storedHash = users.get(email);
    if (!storedHash) {
      throw new Error('User not found');
    }
    
    const isValid = await service.verify(password, storedHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    console.log('Login successful for:', email);
    return { email, loginTime: new Date() };
  }
  
  try {
    await authenticate('admin@example.com', 'AdminPassword123');
  } catch (error) {
    console.error('Authentication failed:', error.message);
  }
}

// Example 7: Password strength validation
async function passwordStrengthExample() {
  const levels = ['LOW', 'MEDIUM', 'HIGH'] as const;
  const password = 'Test@123';
  
  for (const level of levels) {
    const service = PasswordService.withLevel(level);
    try {
      await service.hash(password);
      console.log(`Password meets ${level} security requirements`);
    } catch (error) {
      console.log(`Password fails ${level} security:`, error.message);
    }
  }
}

// Example 8: Batch password operations
async function batchOperationsExample() {
  const service = new PasswordService();
  const passwords = ['Pass1', 'Pass2', 'Pass3'];
  
  const hashPromises = passwords.map(pwd => 
    service.hash(pwd).catch(err => ({ error: err.message }))
  );
  
  const results = await Promise.all(hashPromises);
  results.forEach((result, index) => {
    if (typeof result === 'string') {
      console.log(`Password ${index + 1} hashed successfully`);
    } else {
      console.log(`Password ${index + 1} failed:`, result.error);
    }
  });
}

// Run examples
if (require.main === module) {
  (async () => {
    await basicExample();
    await securityLevelsExample();
    await customConfigExample();
    await errorHandlingExample();
    await userRegistrationExample();
    await passwordStrengthExample();
    await batchOperationsExample();
  })();
}