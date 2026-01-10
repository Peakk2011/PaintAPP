import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from '../core/tabManager.js';
import { updateViewTransform } from '../core/canvas.js';

/**
 * @fileoverview Zoom and pan interaction module with smooth animations
 * @module zoomPan
 * 
 * @typedef {Object} ZoomState
 * @property {number} targetScale - Target zoom scale
 * @property {number} currentScale - Current animated scale
 * @property {number} targetPanX - Target pan X position
 * @property {number} targetPanY - Target pan Y position
 * @property {number} currentPanX - Current animated pan X
 * @property {number} currentPanY - Current animated pan Y
 * @property {number|null} animationFrame - Animation frame ID
 * @property {boolean} isAnimating - Animation state flag
 * @property {string|null} tabId - ID of tab being animated
 */

// Animation state per tab
/** @type {Map<string, ZoomState>} */
const zoomStates = new Map();

// Constants
const ANIMATION_EASING = 0.15; 
const EPSILON = 0.001; 
const HALF = 0.5;

/**
 * Gets or creates zoom state for active tab
 * @returns {ZoomState|null} Zoom state or null if no active tab
 */
const getZoomState = () => {
    const activeTab = getActiveTab();
    if (!activeTab) return null;

    if (!zoomStates.has(activeTab.id)) {
        zoomStates.set(activeTab.id, {
            targetScale: activeTab.zoom || 1,
            currentScale: activeTab.zoom || 1,
            targetPanX: activeTab.pan?.x || 0,
            targetPanY: activeTab.pan?.y || 0,
            currentPanX: activeTab.pan?.x || 0,
            currentPanY: activeTab.pan?.y || 0,
            animationFrame: null,
            isAnimating: false,
            tabId: activeTab.id
        });
    }

    return zoomStates.get(activeTab.id);
};

/**
 * Cleans up zoom state for a closed tab
 * @param {string} tabId - Tab ID to clean up
 */
export const cleanupZoomState = (tabId) => {
    const state = zoomStates.get(tabId);
    if (state && state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
    }
    zoomStates.delete(tabId);
};

/**
 * Handles mouse wheel events for zoom and pan
 * @param {WheelEvent} e - Wheel event
 * @returns {void}
 */
export const handleWheel = (e) => {
    try {
        e.preventDefault();

        const activeTab = getActiveTab();
        if (!activeTab) return;

        const config = getConfig().constants;
        const rect = activeTab.canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (e.ctrlKey || e.metaKey) {
            // Zoom operation
            const delta = 1 - e.deltaY * config.ZOOM_SENSITIVITY;
            const currentZoom = activeTab.zoom || 1;
            const newScale = Math.max(
                config.MIN_SCALE,
                Math.min(config.MAX_SCALE, currentZoom * delta)
            );

            if (newScale !== currentZoom) {
                const currentPanX = activeTab.pan.x || 0;
                const currentPanY = activeTab.pan.y || 0;
                
                // Calculate the point under the mouse in canvas coordinates
                const canvasX = (mouseX - currentPanX) / currentZoom;
                const canvasY = (mouseY - currentPanY) / currentZoom;
                
                // Calculate new pan to keep the same point under the mouse
                const newPanX = mouseX - canvasX * newScale;
                const newPanY = mouseY - canvasY * newScale;

                animateZoom(newScale, newPanX, newPanY, rect);
            }
        } else {
            // Pan operation
            const sens = config.PAN_SENSITIVITY;
            const currentPanX = activeTab.pan.x || 0;
            const currentPanY = activeTab.pan.y || 0;
            let newPanX, newPanY;

            if (e.shiftKey) {
                // Shift + Wheel scrolls horizontally
                newPanX = currentPanX - e.deltaY * sens;
                newPanY = currentPanY - e.deltaX * sens;
            } else {
                // Normal wheel scrolls vertically/horizontally
                newPanX = currentPanX - e.deltaX * sens;
                newPanY = currentPanY - e.deltaY * sens;
            }

            animatePan(newPanX, newPanY, rect);
        }
    } catch (error) {
        console.error('Error handling wheel event:', error);
    }
};

/**
 * Animates zoom to target scale and position
 * @param {number} targetScale - Target zoom scale
 * @param {number} targetPanX - Target pan X position
 * @param {number} targetPanY - Target pan Y position
 * @param {DOMRect} rect - Container bounding rect
 * @returns {void}
 */
const animateZoom = (targetScale, targetPanX, targetPanY, rect) => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const zoomState = getZoomState();
        if (!zoomState) return;

        zoomState.targetScale = targetScale;
        zoomState.targetPanX = targetPanX;
        zoomState.targetPanY = targetPanY;
        zoomState.currentScale = activeTab.zoom || 1;
        zoomState.currentPanX = activeTab.pan.x || 0;
        zoomState.currentPanY = activeTab.pan.y || 0;

        if (!zoomState.isAnimating) {
            zoomState.isAnimating = true;
            startAnimation(rect);
        }
    } catch (error) {
        console.error('Error animating zoom:', error);
    }
};

/**
 * Animates pan to target position
 * @param {number} targetPanX - Target pan X position
 * @param {number} targetPanY - Target pan Y position
 * @param {DOMRect} rect - Container bounding rect
 * @returns {void}
 */
const animatePan = (targetPanX, targetPanY, rect) => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const zoomState = getZoomState();
        if (!zoomState) return;

        zoomState.targetScale = activeTab.zoom || 1;
        zoomState.targetPanX = targetPanX;
        zoomState.targetPanY = targetPanY;
        zoomState.currentScale = activeTab.zoom || 1;
        zoomState.currentPanX = activeTab.pan.x || 0;
        zoomState.currentPanY = activeTab.pan.y || 0;

        if (!zoomState.isAnimating) {
            zoomState.isAnimating = true;
            startAnimation(rect);
        }
    } catch (error) {
        console.error('Error animating pan:', error);
    }
};

/**
 * Starts the animation loop
 * @param {DOMRect} rect - Container bounding rect
 * @returns {void}
 */
const startAnimation = (rect) => {
    try {
        const animate = () => {
            try {
                const activeTab = getActiveTab();
                if (!activeTab) return;

                const zoomState = getZoomState();
                if (!zoomState) return;

                // Verify this animation belongs to current tab
                if (zoomState.tabId !== activeTab.id) {
                    zoomState.isAnimating = false;
                    return;
                }

                // Calculate interpolation
                const scaleDiff = zoomState.targetScale - zoomState.currentScale;
                const panXDiff = zoomState.targetPanX - zoomState.currentPanX;
                const panYDiff = zoomState.targetPanY - zoomState.currentPanY;

                // Check if animation should stop
                const isComplete =
                    Math.abs(scaleDiff) < EPSILON &&
                    Math.abs(panXDiff) < EPSILON &&
                    Math.abs(panYDiff) < EPSILON;

                if (isComplete) {
                    // Snap to final values
                    activeTab.zoom = zoomState.targetScale;
                    activeTab.pan.x = zoomState.targetPanX;
                    activeTab.pan.y = zoomState.targetPanY;

                    constrainPan(rect);
                    updateViewTransform();

                    zoomState.isAnimating = false;
                    zoomState.animationFrame = null;
                    return;
                }

                // Apply easing
                zoomState.currentScale += scaleDiff * ANIMATION_EASING;
                zoomState.currentPanX += panXDiff * ANIMATION_EASING;
                zoomState.currentPanY += panYDiff * ANIMATION_EASING;

                activeTab.zoom = zoomState.currentScale;
                activeTab.pan.x = zoomState.currentPanX;
                activeTab.pan.y = zoomState.currentPanY;

                constrainPan(rect);
                updateViewTransform(); 

                // Continue animation
                zoomState.animationFrame = requestAnimationFrame(animate);
            } catch (error) {
                console.error('Error in animation frame:', error);

                const zoomState = getZoomState();
                if (zoomState) {
                    zoomState.isAnimating = false;
                    zoomState.animationFrame = null;
                }
            }
        };

        const zoomState = getZoomState();
        if (!zoomState) return;

        // Cancel existing animation
        if (zoomState.animationFrame !== null) {
            cancelAnimationFrame(zoomState.animationFrame);
        }

        zoomState.animationFrame = requestAnimationFrame(animate);
    } catch (error) {
        console.error('Error starting animation:', error);
    }
};

/**
 * Constrains pan within bounds
 * @param {DOMRect} containerRect - Container bounding rect
 * @returns {void}
 */
const constrainPan = (containerRect) => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const scaledWidth = activeTab.canvasWidth * activeTab.zoom;
        const scaledHeight = activeTab.canvasHeight * activeTab.zoom;
        const containerWidth = containerRect.width;
        const containerHeight = containerRect.height;

        if (!activeTab.pan) {
            activeTab.pan = { x: 0, y: 0 };
        }

        // Constrain X axis
        if (scaledWidth > containerWidth) {
            const minPanX = containerWidth - scaledWidth;
            activeTab.pan.x = Math.min(0, Math.max(minPanX, activeTab.pan.x));
        } else {
            activeTab.pan.x = (containerWidth - scaledWidth) * HALF;
        }

        // Constrain Y axis
        if (scaledHeight > containerHeight) {
            const minPanY = containerHeight - scaledHeight;
            activeTab.pan.y = Math.min(0, Math.max(minPanY, activeTab.pan.y));
        } else {
            activeTab.pan.y = (containerHeight - scaledHeight) * HALF;
        }
    } catch (error) {
        console.error('Error constraining pan:', error);
    }
};

/**
 * Zooms in by one step
 * @returns {void}
 */
export const zoomIn = () => {
    try {
        const state = getState();
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const config = getConfig().constants;
        const centerX = state.lastMouseX || activeTab.canvasWidth * HALF;
        const centerY = state.lastMouseY || activeTab.canvasHeight * HALF;

        zoom(config.ZOOM_STEP, centerX, centerY);
    } catch (error) {
        console.error('Error zooming in:', error);
    }
};

/**
 * Zooms out by one step
 * @returns {void}
 */
export const zoomOut = () => {
    try {
        const state = getState();
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const config = getConfig().constants;
        const centerX = state.lastMouseX || activeTab.canvasWidth * HALF;
        const centerY = state.lastMouseY || activeTab.canvasHeight * HALF;

        zoom(1 / config.ZOOM_STEP, centerX, centerY);
    } catch (error) {
        console.error('Error zooming out:', error);
    }
};

/**
 * Resets zoom and pan to default values
 * @returns {void}
 */
export const resetZoom = () => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const rect = activeTab.canvasContainer.getBoundingClientRect();

        const targetScale = 1;
        const targetPanX = (rect.width - activeTab.canvasWidth) * HALF;
        const targetPanY = (rect.height - activeTab.canvasHeight) * HALF;

        animateZoom(targetScale, targetPanX, targetPanY, rect);
    } catch (error) {
        console.error('Error resetting zoom:', error);
    }
};

/**
 * Zooms by delta factor around center point
 * @param {number} delta - Zoom delta multiplier
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @returns {void}
 */
const zoom = (delta, centerX, centerY) => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab) return;

        const config = getConfig().constants;
        const rect = activeTab.canvasContainer.getBoundingClientRect();

        const currentZoom = activeTab.zoom || 1;
        const newScale = Math.max(
            config.MIN_SCALE,
            Math.min(config.MAX_SCALE, currentZoom * delta)
        );

        if (newScale === currentZoom) return;

        const currentPanX = activeTab.pan.x || 0;
        const currentPanY = activeTab.pan.y || 0;
        
        const canvasX = (centerX - currentPanX) / currentZoom;
        const canvasY = (centerY - currentPanY) / currentZoom;
        
        const newPanX = centerX - canvasX * newScale;
        const newPanY = centerY - canvasY * newScale;

        animateZoom(newScale, newPanX, newPanY, rect);
    } catch (error) {
        console.error('Error zooming:', error);
    }
};

/**
 * Sets a specific zoom level
 * @param {number} zoomLevel - Target zoom level
 * @returns {void}
 */
export const setZoom = (zoomLevel) => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    const config = getConfig().constants;
    const newZoom = Math.max(
        config.MIN_SCALE,
        Math.min(config.MAX_SCALE, zoomLevel)
    );

    const rect = activeTab.canvasContainer.getBoundingClientRect();
    animateZoom(newZoom, activeTab.pan.x || 0, activeTab.pan.y || 0, rect);
};

/**
 * Gets the current zoom level
 * @returns {number|null} Current zoom level or null if no active tab
 */
export const getZoom = () => {
    const activeTab = getActiveTab();
    return activeTab ? (activeTab.zoom || 1) : null;
};

/**
 * Pans the canvas by a specific amount
 * @param {number} deltaX - Horizontal pan distance
 * @param {number} deltaY - Vertical pan distance
 * @returns {void}
 */
export const pan = (deltaX, deltaY) => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    const rect = activeTab.canvasContainer.getBoundingClientRect();
    const currentPanX = activeTab.pan.x || 0;
    const currentPanY = activeTab.pan.y || 0;
    animatePan(currentPanX + deltaX, currentPanY + deltaY, rect);
};

/**
 * Centers the canvas in the viewport
 * @returns {void}
 */
export const centerCanvas = () => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    const rect = activeTab.canvasContainer.getBoundingClientRect();
    const centerX = rect.width * HALF;
    const centerY = rect.height * HALF;

    const currentZoom = activeTab.zoom || 1;
    const targetPanX = centerX - (activeTab.canvasWidth * currentZoom) * HALF;
    const targetPanY = centerY - (activeTab.canvasHeight * currentZoom) * HALF;

    animatePan(targetPanX, targetPanY, rect);
};

/**
 * Fits the canvas to the viewport
 * @returns {void}
 */
export const fitToView = () => {
    const activeTab = getActiveTab();
    if (!activeTab) return;

    const rect = activeTab.canvasContainer.getBoundingClientRect();
    const scaleX = rect.width / activeTab.canvasWidth;
    const scaleY = rect.height / activeTab.canvasHeight;
    const newZoom = Math.min(scaleX, scaleY) * 0.9; 

    const centerX = rect.width * HALF;
    const centerY = rect.height * HALF;
    const targetPanX = centerX - (activeTab.canvasWidth * newZoom) * HALF;
    const targetPanY = centerY - (activeTab.canvasHeight * newZoom) * HALF;

    animateZoom(newZoom, targetPanX, targetPanY, rect);
}