import { getState, getConfig, isReady, waitForReady } from '../utils/config.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';
import { getActiveTab } from './tabManager.js';

let initPromise: Promise<any> | null = null;

// Double-click detection state
let clickCount: number = 0;
let lastClickTime: number = 0;
let lastClickX: number = 0;
let lastClickY: number = 0;
let clickResetTimer: number | null = null;
const DOUBLE_CLICK_THRESHOLD: number = 350;     // milliseconds - slightly longer
const DOUBLE_CLICK_DISTANCE: number = 15;       // pixels - slightly larger tolerance

/**
 * Point coordinate interface
 */
interface Point {
    x: number;
    y: number;
}

/**
 * Mouse event with optional button property
 */
interface MouseEventLike {
    button?: number;
    clientX: number;
    clientY: number;
    target?: EventTarget | null;
    preventDefault?: () => void;
    stopPropagation?: () => void;
}

/**
 * Brush configuration interface
 */
interface BrushConfig {
    TEXTURE_DENSITY_MIN?: number;
    TEXTURE_SIZE_MULTIPLIER?: number;
    TEXTURE_JITTER?: number;
    TEXTURE_BRISTLE_ANGLE?: number;
    TEXTURE_BRISTLE_LENGTH_MAX?: number;
    TEXTURE_BRISTLE_LENGTH_MIN?: number;
    TEXTURE_ALPHA_MIN?: number;
    TEXTURE_INK_FLOW_CHANCE?: number;
}

/**
 * Ensures configuration is loaded before proceeding
 */
const ensureReady = async (): Promise<void> => {
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
const resetClickCount = (): void => {
    clickCount = 0;
    lastClickTime = 0;
    lastClickX = 0;
    lastClickY = 0;
    if (clickResetTimer !== null) {
        clearTimeout(clickResetTimer);
        clickResetTimer = null;
    }
};

/**
 * Checks if this is a double-click
 */
const isDoubleClick = (e: MouseEventLike): boolean => {
    const currentTime: number = Date.now();
    const timeSinceLastClick: number = currentTime - lastClickTime;
    
    // Calculate distance from last click
    const dx: number = e.clientX - lastClickX;
    const dy: number = e.clientY - lastClickY;
    const distance: number = Math.sqrt(dx * dx + dy * dy);
    
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
    
    if (clickResetTimer !== null) {
        clearTimeout(clickResetTimer);
    }
    clickResetTimer = window.setTimeout((): void => {
        console.log('Timer expired - resetting click count');
        resetClickCount();
    }, DOUBLE_CLICK_THRESHOLD);
    
    const isDouble: boolean = clickCount === 2;
    console.log('Is double click?', isDouble);
    
    return isDouble;
};

/**
 * Starts drawing operation
 */
export const startDrawing = async (e: MouseEventLike): Promise<void> => {
    if (e.button && e.button !== 0) return;

    await ensureReady();
    const state = getState();
    const activeTab = getActiveTab();

    if (!state || !activeTab || !activeTab.drawingCtx) {
        return;
    }

    if (activeTab.isDraggingSticky) return;

    if (e.target && (e.target as any).tagName) {
        const tagName: string = (e.target as HTMLElement).tagName.toLowerCase();
        if (tagName === 'rect' || tagName === 'text' || 
            tagName === 'svg' || tagName === 'g' || 
            tagName === 'foreignobject' || tagName === 'circle' || 
            tagName === 'line') {
            return;
        }
    }

    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
    
    const currentTool: string = (state as any).currentTool || 'brush';

    if (currentTool === 'brush' && isDoubleClick(e)) {
        console.log('Double-click detected, creating sticky note');
        if (typeof (window as any).createStickyNote === 'function') {
            const coords: Point = getCanvasCoords(e as any);
            (window as any).createStickyNote(coords.x, coords.y);
        }
        resetClickCount();
        return; 
    }

    console.log(`Single click, starting ${currentTool}.`);
    activeTab.isDrawing = true;
    (activeTab as any).points = [getCanvasCoords(e as any)];
    
    if ((currentTool === 'line' || currentTool === 'eraser') && activeTab.drawingCtx && activeTab.drawingCanvas) {
        (activeTab as any).operationSnapshot = activeTab.drawingCtx.getImageData(
            0, 
            0, 
            activeTab.drawingCanvas.width, 
            activeTab.drawingCanvas.height
        );
    }

    if (activeTab.previewCtx && activeTab.previewCanvas) {
        activeTab.previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
    }
};

/**
 * Continues drawing operation
 */
export const draw = (e: MouseEventLike): void => {
    const state = getState();
    const activeTab = getActiveTab();
    if (!state || !activeTab || !activeTab.isDrawing || activeTab.isDraggingSticky) return;

    const previewCtx = activeTab.previewCtx;
    const drawingCtx = activeTab.drawingCtx;
    if (!previewCtx || !drawingCtx) return;

    const currentTool: string = (state as any).currentTool || 'brush';
    const currentPoint: Point = getCanvasCoords(e as any);

    switch (currentTool) {
        case 'line':
            // For line, draw on preview canvas over a restored snapshot of the main canvas
            if ((activeTab as any).operationSnapshot) {
                previewCtx.putImageData((activeTab as any).operationSnapshot, 0, 0);
            }
            previewCtx.strokeStyle = (state as any).brushColor || '#000000';
            previewCtx.lineWidth = parseFloat((state as any).sizePicker?.value || '2');
            drawLine(previewCtx, [(activeTab as any).points[0], currentPoint]);
            break;

        case 'eraser':
            // For real-time eraser, restore snapshot and redraw full path on main canvas
            if ((activeTab as any).operationSnapshot) {
                drawingCtx.putImageData((activeTab as any).operationSnapshot, 0, 0);
            }
            (activeTab as any).points.push(currentPoint);
            drawingCtx.globalCompositeOperation = 'destination-out';
            drawingCtx.strokeStyle = '#000000';
            drawingCtx.lineWidth = parseFloat((state as any).sizePicker?.value || '2');
            drawLine(drawingCtx, (activeTab as any).points);
            drawingCtx.globalCompositeOperation = 'source-over';
            break;

        case 'brush':
        default:
            const currentBrush: string = (state as any).brushType?.value || 'smooth';
            previewCtx.strokeStyle = (state as any).brushColor || '#000000';
            previewCtx.lineWidth = parseFloat((state as any).sizePicker?.value || '2');

            if ((state as any).isShiftDown && activeTab.previewCanvas) {
                previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
                const startPoint: Point = (activeTab as any).points[0];
                if (currentBrush === 'smooth') {
                    drawLine(previewCtx, [startPoint, currentPoint]);
                } else {
                    createSmoothTexture(previewCtx, startPoint, currentPoint);
                }
            } else {
                (activeTab as any).points.push(currentPoint);
                if (currentBrush === 'smooth') {
                    if (activeTab.previewCanvas) {
                        previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
                    }
                    drawLine(previewCtx, (activeTab as any).points);
                } else {
                    const len: number = (activeTab as any).points.length;
                    if (len > 1) {
                        createSmoothTexture(previewCtx, (activeTab as any).points[len - 2], (activeTab as any).points[len - 1]);
                    }
                }
            }
            break;
    }

    if (typeof (window as any).requestRedraw === 'function') {
        (window as any).requestRedraw();
    }
};

/**
 * Stops drawing operation
 */
export const stopDrawing = (): void => {
    const state = getState();
    const activeTab = getActiveTab();
    if (!state || !activeTab || !activeTab.isDrawing) return;

    activeTab.isDrawing = false;
    const currentTool: string = (state as any).currentTool || 'brush';
    const drawingCtx = activeTab.drawingCtx;

    if (currentTool !== 'eraser' && drawingCtx && activeTab.previewCanvas) {
        drawingCtx.drawImage(activeTab.previewCanvas, 0, 0);
    }
    
    // Cleanup for tools that used a snapshot
    if ((activeTab as any).operationSnapshot) {
        (activeTab as any).operationSnapshot = null;
    }

    if (activeTab.previewCtx && activeTab.previewCanvas) {
        activeTab.previewCtx.clearRect(0, 0, activeTab.previewCanvas.width, activeTab.previewCanvas.height);
    }

    if (typeof (window as any).requestRedraw === 'function') {
        (window as any).requestRedraw();
    }

    (activeTab as any).points = [];
    saveProject();
    saveToHistory();
};

/**
 * Draws smooth line through points
 */
const drawLine = (context: CanvasRenderingContext2D, points: Point[]): void => {
    const len: number = points.length;
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
            const p1: Point = points[i];
            const p2: Point = points[i + 1];
            const midX: number = (p1.x + p2.x) / 2;
            const midY: number = (p1.y + p2.y) / 2;
            context.quadraticCurveTo(p1.x, p1.y, midX, midY);
        }

        const last: Point = points[len - 1];
        context.lineTo(last.x, last.y);
    }

    context.stroke();
    context.restore();
};

/**
 * Creates textured brush stroke between two points
 */
const createSmoothTexture = (context: CanvasRenderingContext2D, p1: Point, p2: Point): void => {
    const state = getState();
    const config = getConfig();
    const activeTab = getActiveTab();

    if (!state || !config || !activeTab) {
        console.warn('State, config or activeTab not ready for texture rendering');
        return;
    }

    const brushConfig: BrushConfig | undefined = (config as any).brush;
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

    const size: number = parseFloat((state as any).sizePicker?.value ?? '2');
    const dx: number = p2.x - p1.x;
    const dy: number = p2.y - p1.y;
    const distance: number = Math.sqrt(dx * dx + dy * dy);
    const angle: number = Math.atan2(dy, dx);

    const density: number = Math.max(
        TEXTURE_DENSITY_MIN,
        distance / (size * TEXTURE_SIZE_MULTIPLIER)
    );

    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';

    for (let i = 0; i < density; i++) {
        const t: number = i / density;
        const x: number = p1.x + dx * t;
        const y: number = p1.y + dy * t;

        const jitterX: number = (Math.random() - 0.5) * (size * TEXTURE_JITTER);
        const jitterY: number = (Math.random() - 0.5) * (size * TEXTURE_JITTER);

        const bristleAngle: number = angle + (Math.random() - 0.5) * TEXTURE_BRISTLE_ANGLE;
        const bristleLength: number = (Math.random() * size * TEXTURE_BRISTLE_LENGTH_MAX) +
            (size * TEXTURE_BRISTLE_LENGTH_MIN);

        const speedFactor: number = 1 - t;
        const bristleWidth: number = (Math.random() * (size / 6) + (size / 8)) * (0.5 + speedFactor);
        const alpha: number = Math.random() * 0.2 + TEXTURE_ALPHA_MIN;

        const cosAngle: number = Math.cos(bristleAngle);
        const sinAngle: number = Math.sin(bristleAngle);
        const halfLength: number = bristleLength / 2;

        context.beginPath();
        context.moveTo(
            x + jitterX - cosAngle * halfLength,
            y + jitterY - sinAngle * halfLength
        );
        context.lineTo(
            x + jitterX + cosAngle * halfLength,
            y + jitterY + sinAngle * halfLength
        );

        context.strokeStyle = (state as any).brushColor ?? '#000000';
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