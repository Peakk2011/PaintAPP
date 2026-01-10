/**
 * @file Data storage module using electron-store.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import Store from 'electron-store';
import { windowConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Store instance
 * @type {Store|null}
 */
let storeInstance = null;

/**
 * Default store values
 */
const storeDefaults = {
    windowBounds: {
        width: windowConfig.default.width,
        height: windowConfig.default.height
    }
};

/**
 * Initialize and get the store instance
 * @returns {Store} Store instance
 */
export const getStore = () => {
    if (!storeInstance) {
        logger.info('Initializing electron-store');
        storeInstance = new Store({
            defaults: storeDefaults,
            name: 'paintapp-config',
            fileExtension: 'json'
        });

        logger.debug('Store initialized', {
            path: storeInstance.path,
            size: JSON.stringify(storeInstance.store).length
        });
    }
    return storeInstance;
};

/**
 * Save window bounds to store with debouncing
 * @param {import('electron').BrowserWindow} window - Browser window instance
 */
export const saveWindowBounds = (window) => {
    if (!window || window.isDestroyed()) {
        return;
    }

    let boundsTimeout;

    const save = () => {
        clearTimeout(boundsTimeout);
        boundsTimeout = setTimeout(() => {
            const bounds = window.getBounds();
            const store = getStore();

            store.set('windowBounds', bounds);

            logger.debug('Window bounds saved', bounds);
        }, 500);
    };

    window.on('resize', save);
    window.on('move', save);

    // Clean up on window close
    window.on('closed', () => {
        clearTimeout(boundsTimeout);
    });
};

/**
 * Get saved window bounds from store
 * @returns {Object} Window bounds object
 */
export const getSavedWindowBounds = () => {
    const store = getStore();
    return store.get('windowBounds');
};

/**
 * Clear all store data (for debugging)
 */
export const clearStore = () => {
    if (storeInstance) {
        storeInstance.clear();
        logger.info('Store cleared');
    }
};