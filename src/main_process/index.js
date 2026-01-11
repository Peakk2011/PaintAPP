/**
 * @file Main process module entry point.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { app } from 'electron';
import { logger } from './logger.js';
import { handleAppLifecycle } from './app-lifecycle.js';
import { setupIpcHandlers } from './ipc-handlers.js';
import { applyCommandLineSwitches } from './config.js';

/**
 * Initialize the application
 */
const initPaintAPP = () => {
    // logger.info('Initializing PaintAPP main process');

    // Apply command line switches for performance
    applyCommandLineSwitches();

    // Set up application lifecycle event handlers
    handleAppLifecycle();

    // Set up IPC communication handlers
    setupIpcHandlers();

    logger.info('PaintAPP main process initialized.');
};

export default initPaintAPP;

export * from './logger.js';
export * from './config.js';
export * from './store.js';
export * from './window-manager.js';