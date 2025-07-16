/**
 * Logger utility
 */
import winston from 'winston';
import { ILoggingConfig } from '../config/interfaces';

/**
 * Logger class
 */
export class Logger {
  private logger: winston.Logger;

  /**
   * Create a logger instance
   * @param {ILoggingConfig} config - Logging configuration
   */
  constructor(config: ILoggingConfig) {
    const formats = [];

    // Add timestamp
    formats.push(winston.format.timestamp());

    // Add format based on config
    if (config.format === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.simple());
    }

    // Create transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: config.level
      })
    ];

    // Add file transport if filename is provided
    if (config.filename) {
      transports.push(
        new winston.transports.File({
          filename: config.filename,
          level: config.level
        })
      );
    }

    // Create logger
    this.logger = winston.createLogger({
      level: config.level,
      format: winston.format.combine(...formats),
      transports
    });
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {any} meta - Additional metadata
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  /**
   * Create a child logger with additional context
   * @param {any} meta - Additional metadata
   * @returns {Logger} Child logger
   */
  child(meta: any): Logger {
    const childWinston = this.logger.child(meta);
    const childLogger = Object.create(this);
    childLogger.logger = childWinston;
    return childLogger;
  }
}

// Export singleton instance for backward compatibility
export const logger = new Logger({
  level: 'info',
  format: 'json'
});