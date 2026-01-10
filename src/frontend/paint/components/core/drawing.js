import { getState, getConfig, isReady, waitForReady } from '../utils/config.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';
import { getActiveTab } from './tabManager.js';

let initPromise = null;

// Double-click detection state
let clickCount = 0;
let lastClickTime = 0;
let lastClickX = 0;
let lastClickY = 0;
let clickResetTimer = null;
const DOUBLE_CLICK_THRESHOLD = 350;     // milliseconds - slightly longer
const DOUBLE_CLICK_DISTANCE = 15;       // pixels - slightly larger tolerance

/**
 * Ensures configuration is loaded before proceeding
 * @async
 * @returns {Promise<void>}
 */
const ensureReady = async () => {
    if (!isReady()) {
        if (!initPromise) {
            initPromise = waitForReady();
        }
        await initPromise;
    }
};

/**
 * Resets the click counter
 */
const resetClickCount = () => {
    clickCount = 0;
    lastClickTime = 0;
    lastClickX = 0;
    lastClickY = 0;
    if (clickResetTimer) {
        clearTimeout(clickResetTimer);
        clickResetTimer = null;
    }
};

/**
 * Checks if this is a double-click
 * @param {MouseEvent} e - Mouse event
 * @returns {boolean} True if this is a double-click (2nd click)
 */
const isDoubleClick = (e) => {
    const currentTime = Date.now();
    const timeSinceLastClick = currentTime - lastClickTime;
    
    // Calculate distance from last click
    const dx = e.clientX - lastClickX;
    const dy = e.clientY - lastClickY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    console.log('Click detected:', {
        clickCount: clickCount,
        timeSinceLastClick,
        distance,
        threshold: DOUBLE_CLICK_THRESHOLD,
        maxDistance: DOUBLE_CLICK_DISTANCE
    });
    
    if (timeSinceLastClick > DOUBLE_CLICK_THRESHOLD || distance > DOUBLE_CLICK_DISTANCE) {
        clickCount = 1; 
        console.log('Resetting click count - too slow or too far');
    } else if (lastClickTime === 0) {
        // First click ever
        clickCount = 1;
        console.log('First click');
    } else {
        clickCount++; // Increment click count
        console.log('Incrementing click count to:', clickCount);
    }
    
    lastClickTime = currentTime;
    lastClickX = e.clientX;
    lastClickY = e.clientY;
    
    if (clickResetTimer) {
        clearTimeout(clickResetTimer);
    }
    clickResetTimer = setTimeout(() => {
        console.log('Timer expired - resetting click count');
        resetClickCount();
    }, DOUBLE_CLICK_THRESHOLD);
    
    const isDouble = clickCount === 2;
    console.log('Is double click?', isDouble);
    
    return isDouble;
};

/**
 * Starts drawing operation
 * @param {MouseEvent|TouchEvent} e - Event object
 * @returns {Promise<void>}
 */
export const startDrawing = async (e) => {
    if (e.button && e.button !== 0) return;

    await ensureReady();
    const state = getState();
    const activeTab = getActiveTab();
    if (!state || !activeTab) return;

    if (activeTab.isDraggingSticky) return;

    if (e.target && e.target.tagName) {
        const tagName = e.target.tagName.toLowerCase();
        if (tagName === 'rect' || tagName === 'text' || 
            tagName === 'svg' || tagName === 'g' || 
            tagName === 'foreignobject' || tagName === 'circle' || 
            tagName === 'line') {
            return;
        }
    }

    e.preventDefault();
    e.stopPropagation();

    if (isDoubleClick(e)) {
        console.log('Double-click detected, creating sticky note');
        if (typeof window.createStickyNote === 'function') {
            const coords = getCanvasCoords(e);
            window.createStickyNote(coords.x, coords.y);
        }

        resetClickCount();
        return; 
    }

    console.log('Single click, starting drawing. Click count:', clickCount);
    activeTab.isDrawing = true;
    activeTab.points = [getCanvasCoords(e)];

    if (activeTab.previewCtx && activeTab.previewCanvas) {
        activeTab.previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
    }
};

/**
 * Continues drawing operation
 * @param {MouseEvent|TouchEvent} e - Event object
 * @returns {void}
 */
export const draw = (e) => {
    const state = getState();
    const activeTab = getActiveTab();
    if (!state || !activeTab || !activeTab.isDrawing || activeTab.isDraggingSticky) return;

    const previewCtx = activeTab.previewCtx;
    if (!previewCtx || !activeTab.previewCanvas) return;

    const currentBrush = state.brushType?.value || 'smooth';

    if (state.isShiftDown) {
        const startPoint = activeTab.points[0];
        const currentPoint = getCanvasCoords(e);
        
        activeTab.points = [startPoint, currentPoint];

        previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);

        if (currentBrush === 'smooth') {
            previewCtx.strokeStyle = state.brushColor || '#000000';
            previewCtx.lineWidth = parseFloat(state.sizePicker?.value || 2);
            drawLine(previewCtx, activeTab.points);
        } else {
            createSmoothTexture(previewCtx, activeTab.points[0], activeTab.points[1]);
        }
    } else {
        activeTab.points.push(getCanvasCoords(e));

        if (currentBrush === 'smooth') {
            previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
            previewCtx.strokeStyle = state.brushColor || '#000000';
            previewCtx.lineWidth = parseFloat(state.sizePicker?.value || 2);
            drawLine(previewCtx, activeTab.points);
        } else {
            const len = activeTab.points.length;
            if (len > 1) {
                createSmoothTexture(previewCtx, activeTab.points[len - 2], activeTab.points[len - 1]);
            }
        }
    }

    if (typeof window.requestRedraw === 'function') {
        window.requestRedraw();
    }
};

/**
 * Stops drawing operation
 * @returns {void}
 */
export const stopDrawing = () => {
    const state = getState();
    const activeTab = getActiveTab();
    if (!state || !activeTab || !activeTab.isDrawing) return;

    activeTab.isDrawing = false;

    if (activeTab.drawingCtx && activeTab.previewCanvas) {
        activeTab.drawingCtx.drawImage(activeTab.previewCanvas, 0, 0);
    }

    if (activeTab.previewCtx && activeTab.previewCanvas) {
        activeTab.previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
    }

    if (typeof window.requestRedraw === 'function') {
        window.requestRedraw();
    }

    activeTab.points = [];
    saveProject();
    saveToHistory();
};

/**
 * Draws smooth line through points
 * @param {CanvasRenderingContext2D} context        - Canvas context
 * @param {Array<{x: number, y: number}>} points    - Array of points
 * @returns {void}
 */
const drawLine = (context, points) => {
    const len = points.length;
    if (len < 2) return;

    context.save();
    
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.lineCap = 'round';
    context.lineJoin = 'round';

    context.beginPath();
    context.moveTo(points[0].x, points[0].y);

    if (len === 2) {
        context.lineTo(points[1].x, points[1].y);
    } else {
        for (let i = 1; i < len - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            context.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }

        const last = points[len - 1];
        context.lineTo(last.x, last.y);
    }

    context.stroke();
    context.restore();
};

/**
 * Creates textured brush stroke between two points
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {{x: number, y: number}} p1 - Start point
 * @param {{x: number, y: number}} p2 - End point
 * @returns {void}
 */
const createSmoothTexture = (context, p1, p2) => {
    const state = getState();
    const config = getConfig();
    const activeTab = getActiveTab();

    if (!state || !config || !activeTab) {
        console.warn('State, config or activeTab not ready for texture rendering');
        return;
    }

    const brushConfig = config.brush;
    if (!brushConfig) {
        console.warn('Brush config not found');
        return;
    }

    const {
        TEXTURE_DENSITY_MIN = 5,
        TEXTURE_SIZE_MULTIPLIER = 2,
        TEXTURE_JITTER = 0.3,
        TEXTURE_BRISTLE_ANGLE = 0.3,
        TEXTURE_BRISTLE_LENGTH_MAX = 0.8,
        TEXTURE_BRISTLE_LENGTH_MIN = 0.2,
        TEXTURE_ALPHA_MIN = 0.1,
        TEXTURE_INK_FLOW_CHANCE = 0.3,
    } = brushConfig;

    const size = parseFloat(state.sizePicker?.value ?? 2);
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const density = Math.max(
        TEXTURE_DENSITY_MIN,
        distance / (size * TEXTURE_SIZE_MULTIPLIER)
    );

    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    for (let i = 0; i < density; i++) {
        const t = i / density;
        const x = p1.x + dx * t;
        const y = p1.y + dy * t;

        const jitterX = (Math.random() - 0.5) * (size * TEXTURE_JITTER);
        const jitterY = (Math.random() - 0.5) * (size * TEXTURE_JITTER);

        const bristleAngle = angle + (Math.random() - 0.5) * TEXTURE_BRISTLE_ANGLE;
        const bristleLength = (Math.random() * size * TEXTURE_BRISTLE_LENGTH_MAX) +
            (size * TEXTURE_BRISTLE_LENGTH_MIN);

        const speedFactor = 1 - t;
        const bristleWidth = (Math.random() * (size / 6) + (size / 8)) * (0.5 + speedFactor);
        const alpha = Math.random() * 0.2 + TEXTURE_ALPHA_MIN;

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

        context.strokeStyle = state.brushColor ?? '#000000';
        context.lineWidth = bristleWidth;
        context.globalAlpha = alpha;
        context.lineCap = 'round';
        context.stroke();

        if (Math.random() < TEXTURE_INK_FLOW_CHANCE) {
            context.globalAlpha = alpha * 0.5;
            context.stroke();
        }
    }
    
    context.restore();
};