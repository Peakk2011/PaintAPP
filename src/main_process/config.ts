/**
 * @file Configuration and constants for the main process.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { app, nativeTheme, BrowserWindowConstructorOptions } from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Command line switch configuration
 */
interface CommandLineSwitch {
    switch: string;
    value?: string;
}

/**
 * Application configuration
 */
export interface AppConfig {
    name: string;
    appId: string;
    commandLineSwitches: CommandLineSwitch[];
}

export const appConfig: AppConfig = {
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
export interface WindowConfig {
    default: {
        width: number;
        height: number;
    };
    min: {
        width: number;
        height: number;
    };
}

export const windowConfig: WindowConfig = {
    default: {
        width: 480,
        height: 600
    },
    min: {
        width: 395,
        height: 440
    }
};

/**
 * Platform utilities
 */
export const platform = {
    isMac: (): boolean => process.platform === 'darwin',
    isWindows: (): boolean => process.platform === 'win32',
    isLinux: (): boolean => process.platform === 'linux',

    /**
     * Get platform-specific window options
     * @returns Platform-specific window options
     */
    getWindowOptions: (): Partial<BrowserWindowConstructorOptions> => {
        if (process.platform === 'win32') {
            return {
                titleBarStyle: 'hidden', // Stable
                // titleBarStyle: 'default',
                titleBarOverlay: {
                    color: '#00000000',
                    symbolColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
                    height: 36
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
 * @returns Icon file path
 */
export const getIconPath = (): string => {
    // In development, __dirname is dist/main_process, so go up to project root
    // In production, use app.getAppPath()
    const basePath = app.isPackaged 
        ? app.getAppPath()
        : path.join(__dirname, '..', '..');
    
    return path.join(
        basePath,
        'assets',
        'icon',
        platform.isMac() ? 'paintAPP.icns' : 'paintAPP.ico'
    );
};

/**
 * Apply command line switches for performance optimization
 */
export const applyCommandLineSwitches = (): void => {
    appConfig.commandLineSwitches.forEach(config => {
        if (config.value) {
            app.commandLine.appendSwitch(config.switch, config.value);
        } else {
            app.commandLine.appendSwitch(config.switch);
        }
    });
};

