import { getState, getConfig } from '../utils/config.js';

export function setupCanvas() {
    const state = getState();
    const config = getConfig();

    const container = state.canvasContainer;
    const rect = container.getBoundingClientRect();
    const dpr = state.devicePixelRatio;

    const newWidth = Math.round(rect.width);
    const newHeight = Math.round(rect.height);

    if (state.canvasWidth !== newWidth || state.canvasHeight !== newHeight) {
        state.canvasWidth = newWidth;
        state.canvasHeight = newHeight;

        // Update all canvases
        updateCanvasSize(state.canvas, newWidth, newHeight, dpr);
        updateCanvasSize(state.drawingCanvas, newWidth, newHeight, dpr);
        updateCanvasSize(state.previewCanvas, newWidth, newHeight, dpr);

        // Scale contexts
        const contexts = [state.ctx, state.drawingCtx, state.previewCtx];
        contexts.forEach(ctx => {
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        });
    }

    if (!state.isInitialized) {
        state.panX = 0;
        state.panY = 0;
        state.isInitialized = true;
    }

    initSVG();
    requestRedraw();
}

function updateCanvasSize(canvas, width, height, dpr) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
}

export function initSVG() {
    const state = getState();

    if (state.svg) {
        state.svg.remove();
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10';

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(g);

    state.svg = svg;
    state.svgGroup = g;
    state.canvasContainer.appendChild(svg);
}

export function getCanvasCoords(e) {
    const state = getState();
    const rect = state.canvasContainer.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left - state.panX) / state.scale,
        y: (e.clientY - rect.top - state.panY) / state.scale
    };
}

export function requestRedraw() {
    const state = getState();
    const config = getConfig();
    const ctx = state.ctx;
    const canvas = state.canvas;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(state.panX, state.panY);
    ctx.scale(state.scale, state.scale);

    // Draw grid
    const scale = state.scale;
    if (scale > 0.25) {
        const gridSize = config.constants.GRID_SIZE;
        const opacity = Math.min(1, (scale - 0.25) / 0.25);

        ctx.fillStyle = 'rgba(128,128,128,' + (opacity * 0.5) + ')';
        const dotRadius = 1 / scale;

        const startX = Math.floor(-state.panX / scale / gridSize) * gridSize;
        const startY = Math.floor(-state.panY / scale / gridSize) * gridSize;
        const endX = startX + (state.canvasWidth / scale) + gridSize;
        const endY = startY + (state.canvasHeight / scale) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, 6.28318530718);
                ctx.fill();
            }
        }
    }

    // Draw canvases
    ctx.drawImage(state.drawingCanvas, 0, 0);
    ctx.drawImage(state.previewCanvas, 0, 0);
    ctx.restore();
}