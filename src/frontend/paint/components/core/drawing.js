import { getState, getConfig } from '../utils/config.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';

let clickCount = 0;
let clickTimer = null;

export function startDrawing(e) {
    if (e.button && e.button !== 0) return;

    const state = getState();
    if (state.isDraggingSticky) return;
    if (e.target && e.target.tagName &&
        (e.target.tagName === 'rect' || e.target.tagName === 'text')) return;

    e.preventDefault();
    e.stopPropagation();

    // Handle triple click for sticky notes
    handleTripleClick(e);

    state.isDrawing = true;
    state.points = [getCanvasCoords(e)];

    state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
}

export function draw(e) {
    const state = getState();
    if (!state.isDrawing || state.isDraggingSticky) return;

    state.points.push(getCanvasCoords(e));

    const currentBrush = state.brushType ? state.brushType.value : 'smooth';
    const previewCtx = state.previewCtx;

    if (currentBrush === 'smooth') {
        previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);
        previewCtx.strokeStyle = state.brushColor;
        previewCtx.lineWidth = parseFloat(state.sizePicker.value);
        drawLine(previewCtx, state.points);
    } else {
        const len = state.points.length;
        if (len > 1) {
            createSmoothTexture(previewCtx, state.points[len - 2], state.points[len - 1]);
        }
    }

    // Request redraw from canvas module
    if (typeof window.requestRedraw === 'function') {
        window.requestRedraw();
    }
}

export function stopDrawing() {
    const state = getState();
    if (state.isDrawing) {
        state.isDrawing = false;
        state.drawingCtx.drawImage(state.previewCanvas, 0, 0);
        state.previewCtx.clearRect(0, 0, state.previewCanvas.width, state.previewCanvas.height);

        // Request redraw
        if (typeof window.requestRedraw === 'function') {
            window.requestRedraw();
        }

        state.points = [];
        saveProject();
        saveToHistory();
    }
}

function drawLine(context, points) {
    const len = points.length;
    if (len < 2) return;

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < len - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        context.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }

    const last = points[len - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
}

function createSmoothTexture(context, p1, p2) {
    const state = getState();
    const config = getConfig();
    const brushConfig = config.brush;

    const size = parseFloat(state.sizePicker.value);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const density = Math.max(
        brushConfig.TEXTURE_DENSITY_MIN,
        distance / (size * brushConfig.TEXTURE_SIZE_MULTIPLIER)
    );

    for (let i = 0; i < density; i++) {
        const t = i / density;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;

        const jitterX = (Math.random() - 0.5) * (size * brushConfig.TEXTURE_JITTER);
        const jitterY = (Math.random() - 0.5) * (size * brushConfig.TEXTURE_JITTER);

        const bristleAngle = angle + (Math.random() - 0.5) * brushConfig.TEXTURE_BRISTLE_ANGLE;
        const bristleLength = (Math.random() * size * brushConfig.TEXTURE_BRISTLE_LENGTH_MAX) +
            (size * brushConfig.TEXTURE_BRISTLE_LENGTH_MIN);

        const speedFactor = 1 - t;
        const bristleWidth = (Math.random() * (size / 6) + (size / 8)) * (0.5 + speedFactor);
        const alpha = Math.random() * 0.2 + brushConfig.TEXTURE_ALPHA_MIN;

        const cosAngle = Math.cos(bristleAngle);
        const sinAngle = Math.sin(bristleAngle);
        const halfLength = bristleLength / 2;

        context.beginPath();
        context.moveTo(
            x + jitterX - cosAngle * halfLength,
            y + jitterY - sinAngle * halfLength
        );
        context.lineTo(
            x + jitterX + cosAngle * halfLength,
            y + jitterY + sinAngle * halfLength
        );

        context.strokeStyle = state.brushColor;
        context.lineWidth = bristleWidth;
        context.globalAlpha = alpha;
        context.lineCap = 'round';
        context.stroke();

        if (Math.random() < brushConfig.TEXTURE_INK_FLOW_CHANCE) {
            context.globalAlpha = alpha * 0.5;
            context.stroke();
        }
    }
    context.globalAlpha = 1.0;
}

function handleTripleClick(e) {
    const config = getConfig();

    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);

    clickTimer = setTimeout(() => {
        if (clickCount === 3) {
            // Create sticky note
            if (typeof window.createStickyNote === 'function') {
                const coords = getCanvasCoords(e);
                window.createStickyNote(coords.x, coords.y);
            }
        }
        clickCount = 0;
    }, config.constants.CLICK_DELAY);
}