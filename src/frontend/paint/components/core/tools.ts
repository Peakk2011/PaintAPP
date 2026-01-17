import { getState, getConfig, isReady, waitForReady } from '../utils/config.js';

/**
 * Iro color picker interface
 */
interface IroColorPicker {
    color: {
        hexString: string;
    };
    on: (event: string, handler: (color: { hexString: string }) => void) => void;
    off: (event: string) => void;
}

/**
 * Color picker control interface
 */
interface ColorPickerControl {
    type: string;
    defaultColor?: string;
}

/**
 * Toolbar data interface
 */
interface ToolbarData {
    toolbar?: {
        controls?: ColorPickerControl[];
    };
}

/**
 * iro.js global interface
 */
declare global {
    interface Window {
        iro?: {
            ColorPicker: new (container: HTMLElement, options: unknown) => IroColorPicker;
            ui: {
                Box: unknown;
                Slider: unknown;
            };
        };
    }
}

const iro = window.iro;

let colorPickerInitialized = false;
let themeObserver: MediaQueryList | null = null;

/**
 * Sets up color picker with iro.js
 */
export const setupColorPicker = async (data?: ToolbarData): Promise<void> => {
    try {
        // Ensure config is ready
        if (!isReady()) {
            await waitForReady();
        }

        const state = getState();
        const config = getConfig();

        if (!state || !config) {
            throw new Error('State or config not initialized');
        }

        // Validate iro.js library
        if (!iro || !iro.ColorPicker) {
            console.error('iro.js library not loaded');
            return;
        }

        // Find color picker config with early exit
        const controls = data?.toolbar?.controls;
        if (!Array.isArray(controls)) {
            console.warn('No toolbar controls found');
            return;
        }

        // Fast lookup for default color
        let defaultColor: string | null = null;
        for (let i = 0, len = controls.length; i < len; i++) {
            const ctrl = controls[i];
            if (ctrl.type === 'color-picker') {
                defaultColor = ctrl.defaultColor || null;
                break;
            }
        }

        if (defaultColor) {
            (state as any).brushColor = defaultColor;
        }

        // Validate container exists
        const container = (state as any).iroPickerContainer as HTMLElement | null;
        if (!container) {
            console.error('Color picker container not found');
            return;
        }

        // Setup iro.js color picker with error handling
        const colorConfig = (config as any)?.colorPicker;
        if (!colorConfig) {
            console.error('Color picker config not found');
            return;
        }

        // Cleanup existing picker to prevent memory leaks
        const existingPicker = (state as any).colorPicker as IroColorPicker | null;
        if (existingPicker) {
            try {
                if (typeof existingPicker.off === 'function') {
                    existingPicker.off('color:change');
                }
            } catch (e) {
                console.warn('Failed to cleanup old color picker:', e);
            }
        }

        // Create new color picker instance
        const colorPicker = new iro.ColorPicker(container, {
            width: colorConfig.WIDTH || 200,
            borderWidth: colorConfig.BORDER_WIDTH || 1,
            borderColor: colorConfig.BORDER_COLOR || '#fff',
            layoutDirection: colorConfig.LAYOUT_DIRECTION || 'vertical',
            layout: [
                { component: iro.ui.Box, options: {} },
                { component: iro.ui.Slider, options: { sliderType: 'hue' } },
                { component: iro.ui.Slider, options: { sliderType: 'saturation' } },
                { component: iro.ui.Slider, options: { sliderType: 'value' } }
            ]
        });

        (state as any).colorPicker = colorPicker;

        // Optimized color change handler with throttling
        let colorChangeTimeout: NodeJS.Timeout | null = null;
        const handleColorChange = (color: { hexString: string }): void => {
            if (colorChangeTimeout) {
                return; // Skip if already scheduled
            }

            colorChangeTimeout = setTimeout(() => {
                try {
                    const hexString = color?.hexString;
                    if (hexString) {
                        (state as any).brushColor = hexString;

                        // Batch DOM updates
                        const trigger = (state as any).colorPickerTrigger as HTMLElement | null;
                        if (trigger) {
                            trigger.style.backgroundColor = hexString;
                        }
                    }
                } catch (e) {
                    console.error('Color change handler error:', e);
                } finally {
                    colorChangeTimeout = null;
                }
            }, 16); // ~60fps throttle
        };

        colorPicker.on('color:change', handleColorChange);
        colorPickerInitialized = true;

    } catch (error) {
        console.error('Failed to setup color picker:', error);
        colorPickerInitialized = false;

        // Fallback to basic color
        const state = getState();
        if (state) {
            (state as any).brushColor = '#000000';
        }
    }
};

/**
 * Adjusts color theme based on system preferences
 */
export const adjustTheme = (): void => {
    try {
        const state = getState();
        const config = getConfig();

        if (!state || !config) {
            console.warn('Cannot adjust theme: state or config not ready');
            return;
        }

        const brushConfig = (config as any)?.brush;
        if (!brushConfig) {
            console.warn('Brush config not found');
            return;
        }

        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultColorLight = brushConfig.DEFAULT_COLOR_LIGHT || '#000000';
        const defaultColorDark = brushConfig.DEFAULT_COLOR_DARK || '#FFFFFF';

        const brushColor = (state as any).brushColor as string;

        // Fast theme switching with strict equality
        if (isDark && brushColor === defaultColorLight) {
            (state as any).brushColor = defaultColorDark;
        } else if (!isDark && brushColor === defaultColorDark) {
            (state as any).brushColor = defaultColorLight;
        }

        // Batch UI updates
        requestAnimationFrame(() => {
            try {
                const colorPicker = (state as any).colorPicker as IroColorPicker | null;
                if (colorPicker && colorPicker.color) {
                    colorPicker.color.hexString = (state as any).brushColor;
                }

                const trigger = (state as any).colorPickerTrigger as HTMLElement | null;
                if (trigger) {
                    trigger.style.backgroundColor = (state as any).brushColor;
                }
            } catch (e) {
                console.error('Theme adjustment UI update failed:', e);
            }
        });

    } catch (error) {
        console.error('Failed to adjust theme:', error);
    }
};

/**
 * Initializes theme observer for automatic theme switching
 */
export const initThemeObserver = (): void => {
    try {
        // Cleanup existing observer
        if (themeObserver) {
            if (themeObserver.removeEventListener) {
                themeObserver.removeEventListener('change', adjustTheme);
            } else {
                (themeObserver as any).removeListener(adjustTheme);
            }
        }

        // Setup new observer
        themeObserver = window.matchMedia('(prefers-color-scheme: dark)');

        // Use modern addEventListener if available
        if (themeObserver.addEventListener) {
            themeObserver.addEventListener('change', adjustTheme);
        } else {
            // Fallback for older browsers
            (themeObserver as any).addListener(adjustTheme);
        }

        // Initial adjustment
        adjustTheme();

    } catch (error) {
        console.error('Failed to initialize theme observer:', error);
    }
};

/**
 * Cleans up color picker resources
 */
export const cleanupColorPicker = (): void => {
    try {
        const state = getState();

        const colorPicker = (state as any)?.colorPicker as IroColorPicker | null;
        if (colorPicker) {
            if (typeof colorPicker.off === 'function') {
                colorPicker.off('color:change');
            }
            (state as any).colorPicker = null;
        }

        if (themeObserver) {
            if (themeObserver.removeEventListener) {
                themeObserver.removeEventListener('change', adjustTheme);
            } else {
                (themeObserver as any).removeListener(adjustTheme);
            }
            themeObserver = null;
        }

        colorPickerInitialized = false;

    } catch (error) {
        console.error('Cleanup error:', error);
    }
};

/**
 * Checks if color picker is initialized
 */
export const isColorPickerReady = (): boolean => colorPickerInitialized;