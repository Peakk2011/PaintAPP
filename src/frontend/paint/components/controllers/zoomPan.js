import { getState, getConfig } from '../utils/config.js';

export function handleWheel(e) {
    e.preventDefault();

    const state = getState();
    const config = getConfig().constants;

    const rect = state.canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = 1 - e.deltaY * config.ZOOM_SENSITIVITY;
        const newScale = Math.max(
            config.MIN_SCALE,
            Math.min(config.MAX_SCALE, state.scale * delta)
        );

        if (newScale !== state.scale) {
            const scaleDiff = newScale - state.scale;
            state.panX -= (mouseX - state.panX) * scaleDiff / state.scale;
            state.panY -= (mouseY - state.panY) * scaleDiff / state.scale;
            state.scale = newScale;
        }
    } else {
        // Pan
        const sens = config.PAN_SENSITIVITY;
        state.panX -= e.deltaX * sens;
        state.panY -= e.deltaY * sens;
    }

    // Constrain pan
    constrainPan(rect);

    // Update transform
    if (typeof window.updateTransform === 'function') {
        window.updateTransform();
    }
}

function constrainPan(containerRect) {
    const state = getState();

    const scaledWidth = state.canvasWidth * state.scale;
    const scaledHeight = state.canvasHeight * state.scale;

    if (scaledWidth > containerRect.width) {
        state.panX = Math.min(0,
            Math.max(containerRect.width - scaledWidth, state.panX));
    } else {
        state.panX = (containerRect.width - scaledWidth) / 2;
    }

    if (scaledHeight > containerRect.height) {
        state.panY = Math.min(0,
            Math.max(containerRect.height - scaledHeight, state.panY));
    } else {
        state.panY = (containerRect.height - scaledHeight) / 2;
    }
}

export function zoomIn() {
    const state = getState();
    const config = getConfig().constants;
    zoom(config.ZOOM_STEP, state.lastMouseX, state.lastMouseY);
}

export function zoomOut() {
    const state = getState();
    const config = getConfig().constants;
    zoom(1 / config.ZOOM_STEP, state.lastMouseX, state.lastMouseY);
}

export function resetZoom() {
    const state = getState();

    state.scale = 1;
    const rect = state.canvasContainer.getBoundingClientRect();
    state.panX = (rect.width - state.canvasWidth) / 2;
    state.panY = (rect.height - state.canvasHeight) / 2;

    if (typeof window.updateTransform === 'function') {
        window.updateTransform();
    }
}

function zoom(delta, centerX, centerY) {
    const state = getState();
    const config = getConfig().constants;

    const newScale = Math.max(
        config.MIN_SCALE,
        Math.min(config.MAX_SCALE, state.scale * delta)
    );

    if (newScale === state.scale) return;

    const scaleDiff = newScale - state.scale;
    state.panX -= (centerX - state.panX) * scaleDiff / state.scale;
    state.panY -= (centerY - state.panY) * scaleDiff / state.scale;
    state.scale = newScale;

    if (typeof window.updateTransform === 'function') {
        window.updateTransform();
    }
}