/**
 * @file Structured logger for the main process.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { app } from 'electron';

/**
 * Log levels enumeration
 */
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

/**
 * Create formatted log message
 * @param level - Log level
 * @param message - Log message
 * @returns Formatted log string
 */
const formatLogMessage = (level: string, message: string): string => {
    const timestamp = new Date().toISOString();
    return `PaintAPP [${timestamp}] [${level}] ${message}`;
};

/**
 * Main process logger
 */
export const logger = {
    /**
     * Log info level message
     * @param message - Log message
     * @param data - Additional data
     */
    info: (message: string, data: Record<string, unknown> = {}): void => {
        const logMessage = formatLogMessage(LogLevel.INFO, message);
        if (Object.keys(data).length > 0) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    },

    /**
     * Log warning level message
     * @param message - Log message
     * @param data - Additional data
     */
    warn: (message: string, data: Record<string, unknown> = {}): void => {
        const logMessage = formatLogMessage(LogLevel.WARN, message);
        if (Object.keys(data).length > 0) {
            console.warn(logMessage, data);
        } else {
            console.warn(logMessage);
        }
    },

    /**
     * Log error level message
     * @param message - Log message
     * @param error - Error object or additional data
     */
    error: (message: string, error?: Error | unknown): void => {
        const logMessage = formatLogMessage(LogLevel.ERROR, message);
        if (error) {
            console.error(logMessage, error);
        } else {
            console.error(logMessage);
        }
    },

    /**
     * Log debug level message (only in development mode)
     * @param message - Log message
     * @param data - Additional data
     */
    debug: (message: string, data: Record<string, unknown> = {}): void => {
        if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
            const logMessage = formatLogMessage(LogLevel.DEBUG, message);
            if (Object.keys(data).length > 0) {
                console.debug(logMessage, data);
            } else {
                console.debug(logMessage);
            }
        }
    }
};

