/**
 * @file Configuration and constants for the main process.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, nativeTheme } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Application configuration
 */
export const appConfig = {
    name: 'PaintAPP',
    appId: 'com.mintteams.paintapp',

    // Performance flags
    commandLineSwitches: [
        { switch: '--disable-background-timer-throttling' },
        { switch: '--disable-renderer-backgrounding' },
        { switch: '--enable-features', value: 'VaapiVideoDecoder,VaapiVideoEncoder' },
        { switch: '--disable-software-rasterizer' }
    ]
};

/**
 * Window size configuration
 */
export const windowConfig = {
    default: {
        width: 480,
        height: 600
    },
    min: {
        width: 380,
        height: 440
    }
};

/**
 * Platform utilities
 */
export const platform = {
    isMac: () => process.platform === 'darwin',
    isWindows: () => process.platform === 'win32',
    isLinux: () => process.platform === 'linux',

    /**
     * Get platform-specific window options
     * @returns {Object} Platform-specific window options
     */
    getWindowOptions: () => {
        if (process.platform === 'win32') {
            return {
                titleBarStyle: 'hidden',
                titleBarOverlay: {
                    color: '#00000000',
                    symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
                    height: 38
                },
                frame: true,
            };
        } else if (process.platform === 'darwin') {
            return {
                titleBarStyle: 'hiddenInset',
                vibrancy: 'under-window',
                frame: true
            };
        }
        return {};
    }
};

/**
 * Get icon file path based on platform
 * @returns {string} Icon file path
 */
export const getIconPath = () => {
    return path.join(
        __dirname,
        '..',
        'assets',
        'icon',
        platform.isMac() ? 'paintAPP.icns' : 'paintAPP.ico'
    );
};

/**
 * Apply command line switches for performance optimization
 */
export const applyCommandLineSwitches = () => {
    appConfig.commandLineSwitches.forEach(config => {
        if (config.value) {
            app.commandLine.appendSwitch(config.switch, config.value);
        } else {
            app.commandLine.appendSwitch(config.switch);
        }
    });
};