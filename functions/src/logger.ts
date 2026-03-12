/**
 * Logging utility for Cloud Functions
 * Handles structured logging with context
 */

import { CONFIG, LogLevel, LogContext } from './types.js';

class Logger {
  private logLevel: string;

  constructor(logLevel: string = CONFIG.LOG_LEVEL) {
    this.logLevel = logLevel;
  }

  private shouldLog(level: string): boolean {
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };
    return (levels[level] || 1) >= (levels[this.logLevel] || 1);
  }

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context
      ? ` | ${JSON.stringify(context)}`
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorStr =
        error instanceof Error ? error.stack : String(error);
      console.error(
        this.formatMessage('error', message, context),
        errorStr || ''
      );
    }
  }
}

export const logger = new Logger(CONFIG.LOG_LEVEL);
