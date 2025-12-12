import { getState, getConfig } from '../utils/config.js';

export const setupColorPicker = (data) => {
    const state = getState();
    const config = getConfig(); 

    // Find color picker config
    const controls = data.toolbar.controls;
    for (let i = 0; i < controls.length; i++) {
        const ctrl = controls[i];
        if (ctrl.type === 'color-picker') {
            state.brushColor = ctrl.defaultColor;
            break;
        }
    }

    // Setup iro.js color picker
    const colorConfig = config.colorPicker;
    state.colorPicker = new iro.ColorPicker(state.iroPickerContainer, {
        width: colorConfig.WIDTH,
        borderWidth: colorConfig.BORDER_WIDTH,
        borderColor: colorConfig.BORDER_COLOR,
        layoutDirection: colorConfig.LAYOUT_DIRECTION,
        layout: [
            { component: iro.ui.Box, options: {} },
            { component: iro.ui.Slider, options: { sliderType: 'hue' } },
            { component: iro.ui.Slider, options: { sliderType: 'saturation' } },
            { component: iro.ui.Slider, options: { sliderType: 'value' } }
        ]
    });

    state.colorPicker.on('color:change', (color) => {
        state.brushColor = color.hexString;
        if (state.colorPickerTrigger) {
            state.colorPickerTrigger.style.backgroundColor = color.hexString;
        }
    });
}

export const adjustTheme = () => {
    const state = getState();
    const config = getConfig();
    const brushConfig = config.brush;

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (isDark && state.brushColor === brushConfig.DEFAULT_COLOR_LIGHT) {
        state.brushColor = brushConfig.DEFAULT_COLOR_DARK;
    } else if (!isDark && state.brushColor === brushConfig.DEFAULT_COLOR_DARK) {
        state.brushColor = brushConfig.DEFAULT_COLOR_LIGHT;
    }

    if (state.colorPicker) {
        state.colorPicker.color.hexString = state.brushColor;
    }
    if (state.colorPickerTrigger) {
        state.colorPickerTrigger.style.backgroundColor = state.brushColor;
    }
}