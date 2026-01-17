import { getState, getConfig } from '../utils/config.js';
import type { GlobalState, ActiveTab } from '../utils/config.js';

/**
 * Canvas coordinates interface
 */
export interface CanvasCoordinates {
    x: number;
    y: number;
}

// Constants cache
const SVG_NS = 'http://www.w3.org/2000/svg';
const TWO_PI = 6.283185307179586; // Math.PI * 2
const POSITION_ABSOLUTE = 'absolute';
const POINTER_EVENTS_NONE = 'none';
const LINE_CAP_ROUND = 'round';
const LINE_JOIN_ROUND = 'round';

/**
 * Sets up and configures all canvas elements for the active tab.
 */
export const setupCanvas = (): void => {
    try {
        const state = getState();
        const activeTab = state?.activeTab;
        if (!activeTab) return;

        const container = (activeTab as any).canvasContainer;
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const dpr = state.devicePixelRatio;

        const newWidth = Math.round(rect.width);
        const newHeight = Math.round(rect.height);

        // Check if resize is needed
        if ((activeTab as any).canvasWidth !== newWidth || (activeTab as any).canvasHeight !== newHeight) {
            (activeTab as any).canvasWidth = newWidth;
            (activeTab as any).canvasHeight = newHeight;

            // Update all canvases in batch
            updateCanvasSize((activeTab as any).canvas, newWidth, newHeight, dpr);
            updateCanvasSize((activeTab as any).drawingCanvas, newWidth, newHeight, dpr);
            updateCanvasSize((activeTab as any).previewCanvas, newWidth, newHeight, dpr);

            // Scale and configure contexts
            const contexts = [(activeTab as any).ctx, (activeTab as any).drawingCtx, (activeTab as any).previewCtx].filter(Boolean);
            contexts.forEach((ctx: CanvasRenderingContext2D) => {
                ctx.scale(dpr, dpr);
                ctx.lineCap = LINE_CAP_ROUND;
                ctx.lineJoin = LINE_JOIN_ROUND;
            });
        }

        // Initialize pan values on first setup
        if (!(activeTab as any).isInitialized) {
            (activeTab as any).pan = { x: 0, y: 0 };
            (activeTab as any).isInitialized = true;
        }

        initSVG();
        requestRedraw();
    } catch (err) {
        console.error('Error setting up canvas:', err);
    }
};

/**
 * Updates canvas dimensions and pixel ratio
 */
const updateCanvasSize = (canvas: HTMLCanvasElement, width: number, height: number, dpr: number): void => {
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
 */
export const initSVG = (): void => {
    try {
        const state = getState();
        const activeTab = state?.activeTab;
        if (!activeTab) return;

        // Remove existing SVG if present
        const existingSvg = (activeTab as any).svg;
        if (existingSvg && existingSvg.parentNode) {
            existingSvg.parentNode.removeChild(existingSvg);
        }

        // Create new SVG element
        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10';

        // Create group element
        const g = document.createElementNS(SVG_NS, 'g');
        svg.appendChild(g);

        // Update state
        (activeTab as any).svg = svg;
        (activeTab as any).svgGroup = g;
        const container = (activeTab as any).canvasContainer;
        if (container) {
            container.appendChild(svg);
        }
    } catch (err) {
        console.error('Error initializing SVG:', err);
    }
};

/**
 * Converts mouse event coordinates to canvas coordinates for the active tab.
 */
export const getCanvasCoords = (e: MouseEvent): CanvasCoordinates => {
    try {
        const state = getState();
        const activeTab = state?.activeTab;
        if (!activeTab) return { x: 0, y: 0 };

        const container = (activeTab as any).canvasContainer;
        if (!container) return { x: 0, y: 0 };

        const rect = container.getBoundingClientRect();
        const scale = (activeTab as any).zoom || 1;
        const panX = ((activeTab as any).pan?.x) || 0;
        const panY = ((activeTab as any).pan?.y) || 0;
        
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
 */
export const requestRedraw = (): void => {
    try {
        const state = getState();
        const activeTab = state?.activeTab;
        if (!activeTab) return;

        const config = getConfig();
        const ctx = (activeTab as any).ctx;
        const canvas = (activeTab as any).canvas;

        if (!ctx || !canvas) return;

        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid if zoomed in enough
        const zoom = (activeTab as any).zoom || 1;
        if (zoom > 0.25) {
            drawGrid(ctx, activeTab, config, zoom);
        }

        // Draw layer canvases
        const drawingCanvas = (activeTab as any).drawingCanvas;
        const previewCanvas = (activeTab as any).previewCanvas;
        
        if (drawingCanvas) ctx.drawImage(drawingCanvas, 0, 0);
        if (previewCanvas) ctx.drawImage(previewCanvas, 0, 0);
        
        ctx.restore();
    } catch (err) {
        console.error('Error redrawing canvas:', err);
    }
};

/**
 * Updates the CSS transform of the canvas and SVG overlay for the active tab.
 */
export const updateViewTransform = (): void => {
    try {
        const state = getState();
        const activeTab = state?.activeTab;
        if (!activeTab) return;

        const canvas = (activeTab as any).canvas;
        const svg = (activeTab as any).svg;
        if (!canvas || !svg) return;

        const zoom = (activeTab as any).zoom || 1;
        const pan = (activeTab as any).pan || { x: 0, y: 0 };

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
 */
const drawGrid = (
    ctx: CanvasRenderingContext2D,
    activeTab: ActiveTab,
    config: unknown,
    scale: number
): void => {
    try {
        const configObj = config as { constants: { GRID_SIZE: number } };
        const gridSize = configObj.constants.GRID_SIZE;
        const canvasWidth = (activeTab as any).canvasWidth || 0;
        const canvasHeight = (activeTab as any).canvasHeight || 0;
        const panX = ((activeTab as any).pan?.x) || 0;
        const panY = ((activeTab as any).pan?.y) || 0;
        
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