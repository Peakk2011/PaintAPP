/**
 * @file Application lifecycle event handlers.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { app, BrowserWindow, Event, WebContents, Certificate } from 'electron';
import { logger } from './logger.js';
import { createMainWindow } from './window-manager.js';

/**
 * Handle application lifecycle events
 */
export const handleAppLifecycle = async (): Promise<void> => {
    const startTime = Date.now();
    logger.info('Setting up application lifecycle handlers');

    // Check for squirrel events (Windows installer) - use dynamic import
    if (process.platform === 'win32') {
        try {
            // Dynamic import for CommonJS module
            const squirrelStartup = await import('electron-squirrel-startup');
            if (squirrelStartup.default) {
                app.quit();
                return;
            }
        } catch (error) {
            logger.debug('electron-squirrel-startup not available or not needed', error as Record<string, unknown>);
        }
    }

    // App is ready
    app.whenReady().then(async () => {
        logger.info('Electron app ready', {
            startupTime: Date.now() - startTime
        });

        // Create main window
        await createMainWindow();

        // macOS activation handler
        app.on('activate', handleActivate);
    });

    // All windows closed
    app.on('window-all-closed', handleWindowAllClosed);

    // Certificate error handling
    app.on('certificate-error', handleCertificateError);

    logger.info('Application lifecycle handlers set up');
};

/**
 * Handle macOS activation event
 */
const handleActivate = (): void => {
    logger.debug('App activated');

    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
};

/**
 * Handle window-all-closed event
 */
const handleWindowAllClosed = (): void => {
    logger.info('All windows closed');

    // Quit app on all platforms except macOS
    if (process.platform !== 'darwin') {
        app.quit();
    }
};

/**
 * Handle certificate errors
 * @param event - Event object
 * @param webContents - WebContents instance
 * @param url - URL with certificate error
 * @param error - Error description
 * @param certificate - Certificate
 * @param callback - Callback function
 */
const handleCertificateError = (
    event: Event,
    webContents: WebContents,
    url: string,
    error: string,
    certificate: Certificate,
    callback: (isTrusted: boolean) => void
): void => {
    // Allow certificate errors in development mode
    if (process.env.NODE_ENV === 'development') {
        logger.warn('Allowing certificate error in development mode', {
            url,
            error
        });

        event.preventDefault();
        callback(true);
    } else {
        logger.error('Certificate error in production', {
            url,
            error
        });

        callback(false);
    }
};

