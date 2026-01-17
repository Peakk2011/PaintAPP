import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from '../core/tabManager.js';
import { removeAllStickyNotes } from '../core/stickyNotes.js';
import { saveToHistory, saveProject } from '../core/history.js';

/**
 * Active tab interface for file operations
 */
interface FileTab {
    drawingCtx?: CanvasRenderingContext2D;
    drawingCanvas?: HTMLCanvasElement;
    previewCtx?: CanvasRenderingContext2D;
    previewCanvas?: HTMLCanvasElement;
    canvas?: HTMLCanvasElement;
    canvasWidth?: number;
    canvasHeight?: number;
    svg?: SVGSVGElement;
    [key: string]: unknown;
}

declare global {
    interface Window {
        Electron?: {
            ipcRenderer?: {
                on: (channel: string, callback: (...args: unknown[]) => void) => void;
                send: (channel: string, ...args: unknown[]) => void;
            };
            platform?: string;
            isMac?: boolean;
            isWindows?: boolean;
        };
        requestRedraw?: () => void;
    }
}

/**
 * Clears the canvas of the active tab
 */
export const clearCanvas = (): void => {
    const state = getState();
    const activeTab = getActiveTab() as unknown as FileTab;

    if (!activeTab) {
        console.warn('No active tab to clear');
        return;
    }

    // Clear drawing canvas
    if (activeTab.drawingCtx && activeTab.drawingCanvas) {
        activeTab.drawingCtx.clearRect(
            0,
            0,
            activeTab.drawingCanvas.width,
            activeTab.drawingCanvas.height
        );
    }

    // Clear preview canvas
    if (activeTab.previewCtx && activeTab.previewCanvas) {
        activeTab.previewCtx.clearRect(
            0,
            0,
            activeTab.previewCanvas.width,
            activeTab.previewCanvas.height
        );
    }

    // Remove all sticky notes from active tab
    removeAllStickyNotes();

    // Request redraw
    if (typeof window.requestRedraw === 'function') {
        window.requestRedraw();
    }

    // Save state
    saveToHistory();
    saveProject();
};

/**
 * Exports the active tab's canvas as an image
 */
export const saveImage = (): void => {
    const state = getState();
    const config = getConfig();
    const activeTab = getActiveTab() as unknown as FileTab;

    if (!activeTab || !activeTab.canvas) {
        console.warn('No active tab to export');
        return;
    }

    const exportFormat = (state as any)?.exportFormat?.value || 'png';
    const format = exportFormat as string;
    const timestamp = Date.now();
    const cfg = (config as any)?.export;

    // Create export canvas
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    const dpr = state?.devicePixelRatio || 1;

    exportCanvas.width = activeTab.canvas.width;
    exportCanvas.height = activeTab.canvas.height;

    // Determine background color
    let bgColor: string = (activeTab.canvas as HTMLCanvasElement).style.backgroundColor || '';
    if (!bgColor || bgColor === 'transparent' || bgColor === '') {
        bgColor = window.getComputedStyle(activeTab.canvas as HTMLCanvasElement).backgroundColor;
        if (!bgColor || bgColor === 'transparent' || bgColor === '') {
            bgColor = format === 'jpg' ? '#fff' : 'rgba(0,0,0,0)';
        }
    }

    // Fill background
    exportCtx.fillStyle = bgColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the canvas content
    if (activeTab.drawingCanvas) {
        exportCtx.drawImage(activeTab.drawingCanvas, 0, 0);
    }

    // Add SVG sticky notes if present
    if (activeTab.svg) {
        try {
            const svgData = new XMLSerializer().serializeToString(activeTab.svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();

            img.onload = () => {
                const width = (activeTab.canvasWidth || 0) * dpr;
                const height = (activeTab.canvasHeight || 0) * dpr;
                exportCtx.drawImage(img, 0, 0, width, height);

                performExport(exportCanvas, format, timestamp, cfg);
                URL.revokeObjectURL(url);
            };

            img.onerror = () => {
                console.warn('Failed to load SVG, exporting without sticky notes');
                performExport(exportCanvas, format, timestamp, cfg);
                URL.revokeObjectURL(url);
            };

            img.src = url;
        } catch (error) {
            console.error('Error exporting with SVG:', error);
            performExport(exportCanvas, format, timestamp, cfg);
        }
    } else {
        // No SVG, export directly
        performExport(exportCanvas, format, timestamp, cfg);
    }
};

/**
 * Performs the actual export operation
 */
const performExport = (
    canvas: HTMLCanvasElement,
    format: string,
    timestamp: number,
    cfg: { FILENAME_PREFIX?: string; JPEG_QUALITY?: number; WEBP_QUALITY?: number } | undefined
): void => {
    let dataUrl: string;
    let filename: string;

    const prefix = cfg?.FILENAME_PREFIX || 'drawing-';

    switch (format) {
        case 'png':
            dataUrl = canvas.toDataURL('image/png');
            filename = prefix + timestamp + '.png';
            break;
        case 'jpg':
            dataUrl = canvas.toDataURL('image/jpeg', cfg?.JPEG_QUALITY || 0.9);
            filename = prefix + timestamp + '.jpg';
            break;
        case 'webp':
            dataUrl = canvas.toDataURL('image/webp', cfg?.WEBP_QUALITY || 0.9);
            filename = prefix + timestamp + '.webp';
            break;
        default:
            dataUrl = canvas.toDataURL('image/png');
            filename = prefix + timestamp + '.png';
    }

    // Use Electron IPC if available, otherwise browser download
    if (window.Electron?.ipcRenderer) {
        window.Electron.ipcRenderer.send('save-image', { dataUrl, format });
    } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Loads an image file into the active tab's canvas
 */
export const loadImage = (file: File): void => {
    const activeTab = getActiveTab() as unknown as FileTab;

    if (!activeTab || !activeTab.drawingCtx) {
        console.warn('No active tab to load image into');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = new Image();

        img.onload = () => {
            try {
                // Clear canvas first
                clearCanvas();

                // Draw loaded image
                if (activeTab.drawingCtx) {
                    activeTab.drawingCtx.drawImage(img, 0, 0);
                }

                // Update display
                if (typeof window.requestRedraw === 'function') {
                    window.requestRedraw();
                }

                // Save to history
                saveToHistory();
                saveProject();
            } catch (error) {
                console.error('Error drawing loaded image:', error);
            }
        };

        img.onerror = () => {
            console.error('Failed to load image file');
        };

        if (e.target?.result) {
            img.src = e.target.result as string;
        }
    };

    reader.onerror = () => {
        console.error('Failed to read image file');
    };

    reader.readAsDataURL(file);
};