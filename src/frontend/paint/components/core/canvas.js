import { getState, getConfig } from '../utils/config.js';

/**
 * @typedef {Object} CanvasCoordinates
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

// Constants cache
const SVG_NS = 'http://www.w3.org/2000/svg';
const TWO_PI = 6.283185307179586; // Math.PI * 2
const POSITION_ABSOLUTE = 'absolute';
const POINTER_EVENTS_NONE = 'none';
const LINE_CAP_ROUND = 'round';
const LINE_JOIN_ROUND = 'round';

/**
 * Sets up and configures all canvas elements for the active tab.
 * @returns {void}
 */
export const setupCanvas = () => {
    try {
        const state = getState();
        const activeTab = state.activeTab;
        if (!activeTab) return;

        const container = activeTab.canvasContainer;
        const rect = container.getBoundingClientRect();
        const dpr = state.devicePixelRatio;

        const newWidth = Math.round(rect.width);
        const newHeight = Math.round(rect.height);

        // Check if resize is needed
        if (activeTab.canvasWidth !== newWidth || activeTab.canvasHeight !== newHeight) {
            activeTab.canvasWidth = newWidth;
            activeTab.canvasHeight = newHeight;

            // Update all canvases in batch
            updateCanvasSize(activeTab.canvas, newWidth, newHeight, dpr);
            updateCanvasSize(activeTab.drawingCanvas, newWidth, newHeight, dpr);
            updateCanvasSize(activeTab.previewCanvas, newWidth, newHeight, dpr);

            // Scale and configure contexts
            const contexts = [activeTab.ctx, activeTab.drawingCtx, activeTab.previewCtx];
            contexts.forEach(ctx => {
                ctx.scale(dpr, dpr);
                ctx.lineCap = LINE_CAP_ROUND;
                ctx.lineJoin = LINE_JOIN_ROUND;
            });
        }

        // Initialize pan values on first setup
        if (!activeTab.isInitialized) {
            activeTab.pan.x = 0;
            activeTab.pan.y = 0;
            activeTab.isInitialized = true;
        }

        initSVG();
        requestRedraw();
    } catch (err) {
        console.error('Error setting up canvas:', err);
    }
};

/**
 * Updates canvas dimensions and pixel ratio
 * @param {HTMLCanvasElement} canvas    - Canvas element to update
 * @param {number} width                - New width in CSS pixels
 * @param {number} height               - New height in CSS pixels
 * @param {number} dpr                  - Device pixel ratio
 * @returns {void}
 */
const updateCanvasSize = (canvas, width, height, dpr) => {
    try {
        // Set buffer size (actual pixels)
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        // Set display size (CSS pixels)
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
    } catch (err) {
        console.error('Error updating canvas size:', err);
    }
};

/**
 * Initializes or reinitializes the SVG overlay for the active tab.
 * @returns {void}
 */
export const initSVG = () => {
    try {
        const activeTab = getState().activeTab;
        if (!activeTab) return;

        // Remove existing SVG if present
        if (activeTab.svg && activeTab.svg.parentNode) {
            activeTab.svg.parentNode.removeChild(activeTab.svg);
        }

        // Create new SVG element
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10';

        // Create group element
        const g = document.createElementNS(SVG_NS, 'g');
        svg.appendChild(g);

        // Update state
        activeTab.svg = svg;
        activeTab.svgGroup = g;
        activeTab.canvasContainer.appendChild(svg);
    } catch (err) {
        console.error('Error initializing SVG:', err);
    }
};

/**
 * Converts mouse event coordinates to canvas coordinates for the active tab.
 * @param {MouseEvent} e - Mouse event
 * @returns {CanvasCoordinates} Transformed coordinates
 */
export const getCanvasCoords = (e) => {
    try {
        const activeTab = getState().activeTab;
        if (!activeTab) return { x: 0, y: 0 };

        const rect = activeTab.canvasContainer.getBoundingClientRect();
        const scale = activeTab.zoom;
        const panX = activeTab.pan.x;
        const panY = activeTab.pan.y;
        
        return {
            x: (e.clientX - rect.left - panX) / scale,
            y: (e.clientY - rect.top - panY) / scale
        };
    } catch (err) {
        console.error('Error getting canvas coordinates:', err);
        return { x: 0, y: 0 };
    }
};

/**
 * Requests a full canvas redraw for the active tab, including grid and layers.
 * @returns {void}
 */
export const requestRedraw = () => {
    try {
        const state = getState();
        const activeTab = state.activeTab;
        if (!activeTab) return;

        const config = getConfig();
        const ctx = activeTab.ctx;
        const canvas = activeTab.canvas;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid if zoomed in enough
        if (activeTab.zoom > 0.25) {
            drawGrid(ctx, activeTab, config, activeTab.zoom);
        }

        // Draw layer canvases
        ctx.drawImage(activeTab.drawingCanvas, 0, 0);
        ctx.drawImage(activeTab.previewCanvas, 0, 0);
        
        ctx.restore();
    } catch (err) {
        console.error('Error redrawing canvas:', err);
    }
};

/**
 * Updates the CSS transform of the canvas and SVG overlay for the active tab.
 * @returns {void}
 */
export const updateViewTransform = () => {
    try {
        const activeTab = getState().activeTab;
        if (!activeTab || !activeTab.canvas || !activeTab.svg) return;

        const { canvas, svg, zoom, pan } = activeTab;

        const transform = `translate(${Math.round(pan.x)}px, ${Math.round(pan.y)}px) scale(${zoom})`;
        
        canvas.style.transformOrigin = '0 0';
        canvas.style.transform = transform;
        
        svg.style.transformOrigin = '0 0';
        svg.style.transform = transform;
    } catch (error) {
        console.error('Error updating view transform:', error);
    }
};

/**
 * Draws the grid pattern on canvas
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} activeTab - Active tab state
 * @param {Object} config - Configuration object
 * @param {number} scale - Current zoom scale
 * @returns {void}
 */
const drawGrid = (ctx, activeTab, config, scale) => {
    try {
        const gridSize = config.constants.GRID_SIZE;
        const canvasWidth = activeTab.canvasWidth;
        const canvasHeight = activeTab.canvasHeight;
        const panX = activeTab.pan.x;
        const panY = activeTab.pan.y;
        
        const opacity = Math.min(1, (scale - 0.25) / 0.25) * 0.5;
        
        ctx.fillStyle = `rgba(128,128,128,${opacity})`;
        
        const dotRadius = 1 / scale;
        
        const startX = Math.floor(-panX / scale / gridSize) * gridSize;
        const startY = Math.floor(-panY / scale / gridSize) * gridSize;
        const endX = startX + (canvasWidth / scale) + gridSize;
        const endY = startY + (canvasHeight / scale) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, TWO_PI);
                ctx.fill();
            }
        }
    } catch (err) {
        console.error('Error drawing grid:', err);
    }
};