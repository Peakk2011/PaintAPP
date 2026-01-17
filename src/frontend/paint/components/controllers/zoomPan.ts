import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from '../core/tabManager.js';
import { updateViewTransform } from '../core/canvas.js';

/**
 * Zoom state interface
 */
interface ZoomState {
    targetScale: number;
    currentScale: number;
    targetPanX: number;
    targetPanY: number;
    currentPanX: number;
    currentPanY: number;
    animationFrame: number | null;
    isAnimating: boolean;
    tabId: string | null;
}

/**
 * Active tab interface for zoom operations
 */
interface ZoomableTab {
    id: string;
    zoom: number;
    pan: { x: number; y: number };
    canvasContainer: HTMLElement;
    canvasWidth: number;
    canvasHeight: number;
}

// Animation state per tab
const zoomStates = new Map<string, ZoomState>();

// Constants
const ANIMATION_EASING = 0.15; 
const EPSILON = 0.001; 
const HALF = 0.5;

/**
 * Gets or creates zoom state for active tab
 */
const getZoomState = (): ZoomState | null => {
    const activeTab = getActiveTab() as unknown as ZoomableTab;
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

    return zoomStates.get(activeTab.id) || null;
};

/**
 * Cleans up zoom state for a closed tab
 */
export const cleanupZoomState = (tabId: string): void => {
    const state = zoomStates.get(tabId);
    if (state && state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
    }
    zoomStates.delete(tabId);
};

/**
 * Handles mouse wheel events for zoom and pan
 */
export const handleWheel = (e: WheelEvent): void => {
    try {
        e.preventDefault();

        const activeTab = getActiveTab() as unknown as ZoomableTab;
        if (!activeTab) return;

        const config = getConfig();
        const constants = (config as any)?.constants;
        if (!constants) return;

        const rect = activeTab.canvasContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (e.ctrlKey || e.metaKey) {
            // Zoom operation
            const delta = 1 - e.deltaY * constants.ZOOM_SENSITIVITY;
            const currentZoom = activeTab.zoom || 1;
            const newScale = Math.max(
                constants.MIN_SCALE,
                Math.min(constants.MAX_SCALE, currentZoom * delta)
            );

            if (newScale !== currentZoom) {
                const currentPanX = activeTab.pan?.x || 0;
                const currentPanY = activeTab.pan?.y || 0;
                
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
            const sens = constants.PAN_SENSITIVITY;
            const currentPanX = activeTab.pan?.x || 0;
            const currentPanY = activeTab.pan?.y || 0;
            let newPanX: number, newPanY: number;

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
 */
const animateZoom = (targetScale: number, targetPanX: number, targetPanY: number, rect: DOMRect): void => {
    try {
        const activeTab = getActiveTab() as unknown as ZoomableTab;
        if (!activeTab) return;

        const zoomState = getZoomState();
        if (!zoomState) return;

        zoomState.targetScale = targetScale;
        zoomState.targetPanX = targetPanX;
        zoomState.targetPanY = targetPanY;
        zoomState.currentScale = activeTab.zoom || 1;
        zoomState.currentPanX = activeTab.pan?.x || 0;
        zoomState.currentPanY = activeTab.pan?.y || 0;

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
 */
const animatePan = (targetPanX: number, targetPanY: number, rect: DOMRect): void => {
    try {
        const activeTab = getActiveTab() as unknown as ZoomableTab;
        if (!activeTab) return;

        const zoomState = getZoomState();
        if (!zoomState) return;

        zoomState.targetScale = activeTab.zoom || 1;
        zoomState.targetPanX = targetPanX;
        zoomState.targetPanY = targetPanY;
        zoomState.currentScale = activeTab.zoom || 1;
        zoomState.currentPanX = activeTab.pan?.x || 0;
        zoomState.currentPanY = activeTab.pan?.y || 0;

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
 */
const startAnimation = (rect: DOMRect): void => {
    try {
        const animate = (): void => {
            try {
                const activeTab = getActiveTab() as unknown as ZoomableTab;
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
                    if (!activeTab.pan) activeTab.pan = { x: 0, y: 0 };
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
                if (!activeTab.pan) activeTab.pan = { x: 0, y: 0 };
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
 */
const constrainPan = (containerRect: DOMRect): void => {
    try {
        const activeTab = getActiveTab() as unknown as ZoomableTab;
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
 */
export const zoomIn = (): void => {
    try {
        const state = getState();
        const activeTab = getActiveTab() as unknown as ZoomableTab;
        if (!activeTab) return;

        const config = getConfig();
        const constants = (config as any)?.constants;
        if (!constants) return;

        const centerX = (state as any).lastMouseX || activeTab.canvasWidth * HALF;
        const centerY = (state as any).lastMouseY || activeTab.canvasHeight * HALF;

        zoom(constants.ZOOM_STEP, centerX, centerY);
    } catch (error) {
        console.error('Error zooming in:', error);
    }
};

/**
 * Zooms out by one step
 */
export const zoomOut = (): void => {
    try {
        const state = getState();
        const activeTab = getActiveTab() as unknown as ZoomableTab;
        if (!activeTab) return;

        const config = getConfig();
        const constants = (config as any)?.constants;
        if (!constants) return;

        const centerX = (state as any).lastMouseX || activeTab.canvasWidth * HALF;
        const centerY = (state as any).lastMouseY || activeTab.canvasHeight * HALF;

        zoom(1 / constants.ZOOM_STEP, centerX, centerY);
    } catch (error) {
        console.error('Error zooming out:', error);
    }
};

/**
 * Resets zoom and pan to default values
 */
export const resetZoom = (): void => {
    try {
        const activeTab = getActiveTab() as unknown as ZoomableTab;
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
 */
const zoom = (delta: number, centerX: number, centerY: number): void => {
    try {
        const activeTab = getActiveTab() as unknown as ZoomableTab;
        if (!activeTab) return;

        const config = getConfig();
        const constants = (config as any)?.constants;
        if (!constants) return;

        const rect = activeTab.canvasContainer.getBoundingClientRect();

        const currentZoom = activeTab.zoom || 1;
        const newScale = Math.max(
            constants.MIN_SCALE,
            Math.min(constants.MAX_SCALE, currentZoom * delta)
        );

        if (newScale === currentZoom) return;

        const currentPanX = activeTab.pan?.x || 0;
        const currentPanY = activeTab.pan?.y || 0;
        
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
 */
export const setZoom = (zoomLevel: number): void => {
    const activeTab = getActiveTab() as unknown as ZoomableTab;
    if (!activeTab) return;

    const config = getConfig();
    const constants = (config as any)?.constants;
    if (!constants) return;

    const newZoom = Math.max(
        constants.MIN_SCALE,
        Math.min(constants.MAX_SCALE, zoomLevel)
    );

    const rect = activeTab.canvasContainer.getBoundingClientRect();
    animateZoom(newZoom, activeTab.pan?.x || 0, activeTab.pan?.y || 0, rect);
};

/**
 * Gets the current zoom level
 */
export const getZoom = (): number | null => {
    const activeTab = getActiveTab() as unknown as ZoomableTab;
    return activeTab ? (activeTab.zoom || 1) : null;
};

/**
 * Pans the canvas by a specific amount
 */
export const pan = (deltaX: number, deltaY: number): void => {
    const activeTab = getActiveTab() as unknown as ZoomableTab;
    if (!activeTab) return;

    const rect = activeTab.canvasContainer.getBoundingClientRect();
    const currentPanX = activeTab.pan?.x || 0;
    const currentPanY = activeTab.pan?.y || 0;
    animatePan(currentPanX + deltaX, currentPanY + deltaY, rect);
};

/**
 * Centers the canvas in the viewport
 */
export const centerCanvas = (): void => {
    const activeTab = getActiveTab() as unknown as ZoomableTab;
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
 */
export const fitToView = (): void => {
    const activeTab = getActiveTab() as unknown as ZoomableTab;
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
};