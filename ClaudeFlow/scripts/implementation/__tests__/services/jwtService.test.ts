import jwt from 'jsonwebtoken';
import { JwtService } from '../../src/services/jwtService';
import { IConfig, TokenPayload, RefreshTokenPayload } from '../../src/types';
import { UnauthorizedError } from '../../src/utils/errors';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('JwtService', () => {
  let jwtService: JwtService;
  let mockConfig: IConfig;

  beforeEach(() => {
    mockConfig = {
      nodeEnv: 'test',
      port: 3000,
      database: {
        url: 'postgres://test',
        logging: false,
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 }
      },
      jwt: {
        secret: 'test-secret-key-that-is-long-enough',
        expiresIn: '24h',
        refreshExpiresIn: '7d'
      },
      cors: { origin: '*', credentials: true },
      bcrypt: { saltRounds: 10 },
      rateLimit: { windowMs: 900000, max: 100 }
    };

    jwtService = new JwtService(mockConfig);
    jest.clearAllMocks();
  });

  describe('generateAccessToken', () => {
    it('should generate access token with valid payload', () => {
      const payload: TokenPayload = {
        userId: 123,
        email: 'test@example.com'
      };
      const mockToken = 'mock.access.token';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateAccessToken(payload);

      expect(result).toBe(mockToken);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        mockConfig.jwt.secret,
        { expiresIn: mockConfig.jwt.expiresIn }
      );
    });

    it('should handle numeric userId', () => {
      const payload: TokenPayload = {
        userId: 999,
        email: 'user@example.com'
      };
      const mockToken = 'mock.token.numeric';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateAccessToken(payload);

      expect(result).toBe(mockToken);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        mockConfig.jwt.secret,
        { expiresIn: mockConfig.jwt.expiresIn }
      );
    });

    it('should handle special characters in email', () => {
      const payload: TokenPayload = {
        userId: 1,
        email: 'user+tag@sub.example.com'
      };
      const mockToken = 'mock.token.special';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateAccessToken(payload);

      expect(result).toBe(mockToken);
    });

    it('should throw error if jwt.sign throws', () => {
      const payload: TokenPayload = {
        userId: 1,
        email: 'test@example.com'
      };

      mockedJwt.sign.mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      expect(() => jwtService.generateAccessToken(payload)).toThrow('Failed to generate access token');
    });

    it('should handle empty email', () => {
      const payload: TokenPayload = {
        userId: 1,
        email: ''
      };
      const mockToken = 'mock.token.empty';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateAccessToken(payload);

      expect(result).toBe(mockToken);
    });

    it('should handle very large userId', () => {
      const payload: TokenPayload = {
        userId: Number.MAX_SAFE_INTEGER,
        email: 'test@example.com'
      };
      const mockToken = 'mock.token.large';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateAccessToken(payload);

      expect(result).toBe(mockToken);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate refresh token with valid payload', () => {
      const payload: RefreshTokenPayload = {
        userId: 123,
        tokenVersion: 1
      };
      const mockToken = 'mock.refresh.token';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateRefreshToken(payload);

      expect(result).toBe(mockToken);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        mockConfig.jwt.secret,
        { expiresIn: mockConfig.jwt.refreshExpiresIn }
      );
    });

    it('should handle zero tokenVersion', () => {
      const payload: RefreshTokenPayload = {
        userId: 1,
        tokenVersion: 0
      };
      const mockToken = 'mock.refresh.zero';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateRefreshToken(payload);

      expect(result).toBe(mockToken);
    });

    it('should handle large tokenVersion', () => {
      const payload: RefreshTokenPayload = {
        userId: 1,
        tokenVersion: 999999
      };
      const mockToken = 'mock.refresh.large';

      mockedJwt.sign.mockReturnValue(mockToken as any);

      const result = jwtService.generateRefreshToken(payload);

      expect(result).toBe(mockToken);
    });

    it('should throw error if jwt.sign throws', () => {
      const payload: RefreshTokenPayload = {
        userId: 1,
        tokenVersion: 1
      };

      mockedJwt.sign.mockImplementation(() => {
        throw new Error('JWT signing error');
      });

      expect(() => jwtService.generateRefreshToken(payload)).toThrow('Failed to generate refresh token');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const mockToken = 'valid.access.token';
      const decodedPayload: TokenPayload = {
        userId: 123,
        email: 'test@example.com'
      };

      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      const result = jwtService.verifyAccessToken(mockToken);

      expect(result).toEqual(decodedPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith(mockToken, mockConfig.jwt.secret);
    });

    it('should throw UnauthorizedError for invalid token', () => {
      const mockToken = 'invalid.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow(UnauthorizedError);
      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow('Invalid access token');
    });

    it('should throw UnauthorizedError for expired token', () => {
      const mockToken = 'expired.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow(UnauthorizedError);
      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow('Access token expired');
    });

    it('should throw UnauthorizedError for malformed token', () => {
      const mockToken = 'malformed.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow(UnauthorizedError);
      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow('Invalid access token');
    });

    it('should handle empty token', () => {
      const mockToken = '';

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow(UnauthorizedError);
    });

    it('should verify token with special characters in payload', () => {
      const mockToken = 'special.token';
      const decodedPayload: TokenPayload = {
        userId: 1,
        email: 'user+tag@example.com'
      };

      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      const result = jwtService.verifyAccessToken(mockToken);

      expect(result).toEqual(decodedPayload);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const mockToken = 'valid.refresh.token';
      const decodedPayload: RefreshTokenPayload = {
        userId: 123,
        tokenVersion: 1
      };

      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      const result = jwtService.verifyRefreshToken(mockToken);

      expect(result).toEqual(decodedPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith(mockToken, mockConfig.jwt.secret);
    });

    it('should throw UnauthorizedError for invalid refresh token', () => {
      const mockToken = 'invalid.refresh.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      expect(() => jwtService.verifyRefreshToken(mockToken)).toThrow(UnauthorizedError);
      expect(() => jwtService.verifyRefreshToken(mockToken)).toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedError for expired refresh token', () => {
      const mockToken = 'expired.refresh.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      expect(() => jwtService.verifyRefreshToken(mockToken)).toThrow(UnauthorizedError);
      expect(() => jwtService.verifyRefreshToken(mockToken)).toThrow('Refresh token expired');
    });

    it('should handle refresh token with zero version', () => {
      const mockToken = 'zero.version.token';
      const decodedPayload: RefreshTokenPayload = {
        userId: 1,
        tokenVersion: 0
      };

      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      const result = jwtService.verifyRefreshToken(mockToken);

      expect(result).toEqual(decodedPayload);
    });
  });

  describe('Configuration edge cases', () => {
    it('should handle custom expiration times', () => {
      const customConfig = {
        ...mockConfig,
        jwt: {
          ...mockConfig.jwt,
          expiresIn: '1h',
          refreshExpiresIn: '30d'
        }
      };
      const customService = new JwtService(customConfig);

      const accessPayload: TokenPayload = { userId: 1, email: 'test@example.com' };
      const refreshPayload: RefreshTokenPayload = { userId: 1, tokenVersion: 1 };

      mockedJwt.sign.mockReturnValue('custom.token' as any);

      customService.generateAccessToken(accessPayload);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        accessPayload,
        customConfig.jwt.secret,
        { expiresIn: '1h' }
      );

      customService.generateRefreshToken(refreshPayload);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        refreshPayload,
        customConfig.jwt.secret,
        { expiresIn: '30d' }
      );
    });

    it('should handle numeric expiration times', () => {
      const customConfig = {
        ...mockConfig,
        jwt: {
          ...mockConfig.jwt,
          expiresIn: '3600', // 1 hour in seconds
          refreshExpiresIn: '604800' // 7 days in seconds
        }
      };
      const customService = new JwtService(customConfig);

      const payload: TokenPayload = { userId: 1, email: 'test@example.com' };

      mockedJwt.sign.mockReturnValue('numeric.token' as any);

      customService.generateAccessToken(payload);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        payload,
        customConfig.jwt.secret,
        { expiresIn: '3600' }
      );
    });
  });

  describe('Error scenarios', () => {
    it('should handle undefined secret gracefully', () => {
      const brokenConfig = {
        ...mockConfig,
        jwt: {
          ...mockConfig.jwt,
          secret: undefined as any
        }
      };
      const brokenService = new JwtService(brokenConfig);

      const payload: TokenPayload = { userId: 1, email: 'test@example.com' };

      mockedJwt.sign.mockImplementation(() => {
        throw new Error('secretOrPrivateKey must have a value');
      });

      expect(() => brokenService.generateAccessToken(payload)).toThrow('Failed to generate access token');
    });

    it('should handle network timeouts in verification', () => {
      const mockToken = 'timeout.token';

      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Network timeout');
      });

      expect(() => jwtService.verifyAccessToken(mockToken)).toThrow(UnauthorizedError);
    });
  });
});