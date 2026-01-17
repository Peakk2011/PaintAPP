/**
 * @file Data storage module using electron-store.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import ElectronStore from 'electron-store';
import { BrowserWindow, Rectangle } from 'electron';
import { windowConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Store schema interface
 */
interface StoreSchema {
    windowBounds: {
        width: number;
        height: number;
        x?: number;
        y?: number;
    };
}

/**
 * Store instance
 */
let storeInstance: ElectronStore<StoreSchema> | null = null;

/**
 * Default store values
 */
const storeDefaults: StoreSchema = {
    windowBounds: {
        width: windowConfig.default.width,
        height: windowConfig.default.height
    }
};

/**
 * Initialize and get the store instance
 * @returns Store instance
 */
export const getStore = (): ElectronStore<StoreSchema> => {
    if (!storeInstance) {
        logger.info('Initializing electron-store');
        storeInstance = new ElectronStore<StoreSchema>({
            defaults: storeDefaults,
            name: 'paintapp-config',
            fileExtension: 'json'
        });

        const storePath = (storeInstance as any).path;
        const storeData = (storeInstance as any).store;
        
        logger.debug('Store initialized', {
            path: storePath,
            size: JSON.stringify(storeData).length
        });
    }
    return storeInstance;
};

/**
 * Save window bounds to store with debouncing
 * @param window - Browser window instance
 */
export const saveWindowBounds = (window: BrowserWindow): void => {
    if (!window || window.isDestroyed()) {
        return;
    }

    let boundsTimeout: NodeJS.Timeout;

    const save = (): void => {
        clearTimeout(boundsTimeout);
        boundsTimeout = setTimeout(() => {
            const bounds: Rectangle = window.getBounds();
            const store = getStore();

            (store as any).set('windowBounds', {
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y
            });

            logger.debug('Window bounds saved', {
                width: bounds.width,
                height: bounds.height,
                x: bounds.x,
                y: bounds.y
            });
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
 * @returns Window bounds object
 */
export const getSavedWindowBounds = (): StoreSchema['windowBounds'] => {
    const store = getStore();
    return (store as any).get('windowBounds');
};

/**
 * Clear all store data (for debugging)
 */
export const clearStore = (): void => {
    if (storeInstance) {
        (storeInstance as any).clear();
        logger.info('Store cleared');
    }
};

