// components/controllers/files.js
import { getState, getConfig } from '../utils/config.js';
import { removeAllStickyNotes } from '../core/stickyNotes.js';
import { saveToHistory, saveProject } from '../core/history.js';

export const clearCanvas = () => {
    const state = getState();

    state.drawingCtx.clearRect(
        0,
        0,
        state.drawingCanvas.width,
        state.drawingCanvas.height
    );

    state.previewCtx.clearRect(
        0,
        0,
        state.previewCanvas.width,
        state.previewCanvas.height
    );

    removeAllStickyNotes();

    if (typeof window.requestRedraw === 'function') {
        window.requestRedraw();
    }

    saveToHistory();
    saveProject();
}

export const saveImage = () => {
    const state = getState();
    const config = getConfig();

    const format = state.exportFormat.value;
    const timestamp = Date.now();
    const cfg = config.export;

    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    const dpr = state.devicePixelRatio;

    exportCanvas.width = state.canvas.width;
    exportCanvas.height = state.canvas.height;

    // Background color
    let bgColor = state.canvas.style.backgroundColor;
    if (!bgColor || bgColor === 'transparent' || bgColor === '') {
        bgColor = window.getComputedStyle(state.canvas).backgroundColor;
        if (!bgColor || bgColor === 'transparent' || bgColor === '') {
            bgColor = format === 'jpg' ? '#fff' : 'rgba(0,0,0,0)';
        }
    }

    exportCtx.fillStyle = bgColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(state.drawingCanvas, 0, 0);

    // Add SVG sticky notes
    const svgData = new XMLSerializer().serializeToString(state.svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
        exportCtx.drawImage(img, 0, 0, state.canvasWidth * dpr, state.canvasHeight * dpr);

        let dataUrl, filename;
        switch (format) {
            case 'png':
                dataUrl = exportCanvas.toDataURL('image/png');
                filename = cfg.FILENAME_PREFIX + timestamp + '.png';
                break;
            case 'jpg':
                dataUrl = exportCanvas.toDataURL('image/jpeg', cfg.JPEG_QUALITY);
                filename = cfg.FILENAME_PREFIX + timestamp + '.jpg';
                break;
            case 'webp':
                dataUrl = exportCanvas.toDataURL('image/webp', cfg.WEBP_QUALITY);
                filename = cfg.FILENAME_PREFIX + timestamp + '.webp';
                break;
            default:
                dataUrl = exportCanvas.toDataURL('image/png');
                filename = cfg.FILENAME_PREFIX + timestamp + '.png';
        }

        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        URL.revokeObjectURL(url);
    };

    img.src = url;
}