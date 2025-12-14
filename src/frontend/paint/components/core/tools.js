import { getState, getConfig, isReady, waitForReady } from '../utils/config.js';

/**
 * @typedef {Object} IroColorPicker
 * @property {Object} color                                 - Color object
 * @property {string} color.hexString                       - Hex color string
 * @property {Function} on                                  - Event listener
 */

/**
 * @typedef {Object} ColorPickerControl
 * @property {string} type                                  - Control type
 * @property {string} defaultColor                          - Default color value
 */

/**
 * @typedef {Object} ToolbarData
 * @property {Object} toolbar                               - Toolbar configuration
 * @property {Array<ColorPickerControl>} toolbar.controls   - Toolbar controls
 */

let colorPickerInitialized = false;
let themeObserver = null;

/**
 * Sets up color picker with iro.js
 * @async
 * @param {ToolbarData} data                                - Toolbar configuration data
 * @returns {Promise<void>}
 * @throws {Error} If iro.js is not loaded or initialization fails
 */
export const setupColorPicker = async (data) => {
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
        if (typeof iro === 'undefined' || !iro.ColorPicker) {
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
        let defaultColor = null;
        for (let i = 0, len = controls.length; i < len; i++) {
            const ctrl = controls[i];
            if (ctrl.type === 'color-picker') {
                defaultColor = ctrl.defaultColor;
                break;
            }
        }

        if (defaultColor) {
            state.brushColor = defaultColor;
        }

        // Validate container exists
        if (!state.iroPickerContainer) {
            console.error('Color picker container not found');
            return;
        }

        // Setup iro.js color picker with error handling
        const colorConfig = config.colorPicker;
        if (!colorConfig) {
            console.error('Color picker config not found');
            return;
        }

        // Cleanup existing picker to prevent memory leaks
        if (state.colorPicker) {
            try {
                if (typeof state.colorPicker.off === 'function') {
                    state.colorPicker.off('color:change');
                }
            } catch (e) {
                console.warn('Failed to cleanup old color picker:', e);
            }
        }

        // Create new color picker instance
        state.colorPicker = new iro.ColorPicker(state.iroPickerContainer, {
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

        // Optimized color change handler with throttling
        let colorChangeTimeout = null;
        const handleColorChange = (color) => {
            if (colorChangeTimeout) {
                return; // Skip if already scheduled
            }

            colorChangeTimeout = setTimeout(() => {
                try {
                    const hexString = color?.hexString;
                    if (hexString) {
                        state.brushColor = hexString;

                        // Batch DOM updates
                        if (state.colorPickerTrigger) {
                            state.colorPickerTrigger.style.backgroundColor = hexString;
                        }
                    }
                } catch (e) {
                    console.error('Color change handler error:', e);
                } finally {
                    colorChangeTimeout = null;
                }
            }, 16); // ~60fps throttle
        };

        state.colorPicker.on('color:change', handleColorChange);
        colorPickerInitialized = true;

    } catch (error) {
        console.error('Failed to setup color picker:', error);
        colorPickerInitialized = false;

        // Fallback to basic color
        const state = getState();
        if (state) {
            state.brushColor = '#000000';
        }
    }
};

/**
 * Adjusts color theme based on system preferences
 * @returns {void}
 */
export const adjustTheme = () => {
    try {
        const state = getState();
        const config = getConfig();

        if (!state || !config) {
            console.warn('Cannot adjust theme: state or config not ready');
            return;
        }

        const brushConfig = config.brush;
        if (!brushConfig) {
            console.warn('Brush config not found');
            return;
        }

        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultColorLight = brushConfig.DEFAULT_COLOR_LIGHT || '#000000';
        const defaultColorDark = brushConfig.DEFAULT_COLOR_DARK || '#FFFFFF';

        // Fast theme switching with strict equality
        if (isDark && state.brushColor === defaultColorLight) {
            state.brushColor = defaultColorDark;
        } else if (!isDark && state.brushColor === defaultColorDark) {
            state.brushColor = defaultColorLight;
        }

        // Batch UI updates
        requestAnimationFrame(() => {
            try {
                if (state.colorPicker && state.colorPicker.color) {
                    state.colorPicker.color.hexString = state.brushColor;
                }

                if (state.colorPickerTrigger) {
                    state.colorPickerTrigger.style.backgroundColor = state.brushColor;
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
 * @returns {void}
 */
export const initThemeObserver = () => {
    try {
        // Cleanup existing observer
        if (themeObserver) {
            themeObserver.removeListener(adjustTheme);
        }

        // Setup new observer
        themeObserver = window.matchMedia('(prefers-color-scheme: dark)');

        // Use modern addEventListener if available
        if (themeObserver.addEventListener) {
            themeObserver.addEventListener('change', adjustTheme);
        } else {
            // Fallback for older browsers
            themeObserver.addListener(adjustTheme);
        }

        // Initial adjustment
        adjustTheme();

    } catch (error) {
        console.error('Failed to initialize theme observer:', error);
    }
};

/**
 * Cleans up color picker resources
 * @returns {void}
 */
export const cleanupColorPicker = () => {
    try {
        const state = getState();

        if (state?.colorPicker) {
            if (typeof state.colorPicker.off === 'function') {
                state.colorPicker.off('color:change');
            }
            state.colorPicker = null;
        }

        if (themeObserver) {
            if (themeObserver.removeEventListener) {
                themeObserver.removeEventListener('change', adjustTheme);
            } else {
                themeObserver.removeListener(adjustTheme);
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
 * @returns {boolean} True if initialized
 */
export const isColorPickerReady = () => colorPickerInitialized;