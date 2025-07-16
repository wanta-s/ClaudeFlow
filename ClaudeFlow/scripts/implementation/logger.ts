import { Logger } from './authMiddleware.improved';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  json?: boolean;
}

/**
 * Create a simple console logger
 */
export function createConsoleLogger(config: LoggerConfig = {}): Logger {
  const {
    level = LogLevel.INFO,
    prefix = '[AUTH]',
    timestamp = true,
    json = false
  } = config;

  const formatMessage = (lvl: string, message: string, meta?: any): string => {
    if (json) {
      return JSON.stringify({
        level: lvl,
        timestamp: timestamp ? new Date().toISOString() : undefined,
        prefix,
        message,
        ...meta
      });
    }

    const parts = [];
    if (timestamp) parts.push(new Date().toISOString());
    if (prefix) parts.push(prefix);
    parts.push(`[${lvl}]`);
    parts.push(message);
    
    return parts.join(' ') + (meta ? ` ${JSON.stringify(meta)}` : '');
  };

  return {
    debug: (message: string, meta?: any) => {
      if (level <= LogLevel.DEBUG) {
        console.debug(formatMessage('DEBUG', message, meta));
      }
    },
    info: (message: string, meta?: any) => {
      if (level <= LogLevel.INFO) {
        console.info(formatMessage('INFO', message, meta));
      }
    },
    warn: (message: string, meta?: any) => {
      if (level <= LogLevel.WARN) {
        console.warn(formatMessage('WARN', message, meta));
      }
    },
    error: (message: string, meta?: any) => {
      if (level <= LogLevel.ERROR) {
        console.error(formatMessage('ERROR', message, meta));
      }
    }
  };
}

/**
 * Create a Winston-compatible logger wrapper
 */
export function createWinstonLogger(winstonLogger: any): Logger {
  return {
    debug: (message: string, meta?: any) => winstonLogger.debug(message, meta),
    info: (message: string, meta?: any) => winstonLogger.info(message, meta),
    warn: (message: string, meta?: any) => winstonLogger.warn(message, meta),
    error: (message: string, meta?: any) => winstonLogger.error(message, meta)
  };
}

/**
 * Create a Pino-compatible logger wrapper
 */
export function createPinoLogger(pinoLogger: any): Logger {
  return {
    debug: (message: string, meta?: any) => pinoLogger.debug(meta, message),
    info: (message: string, meta?: any) => pinoLogger.info(meta, message),
    warn: (message: string, meta?: any) => pinoLogger.warn(meta, message),
    error: (message: string, meta?: any) => pinoLogger.error(meta, message)
  };
}

/**
 * Create a silent logger (for testing)
 */
export function createSilentLogger(): Logger {
  return {
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {}
  };
}