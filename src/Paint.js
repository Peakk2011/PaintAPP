/* 
    PaintAPP/Paint.js

    Essential app | Paint app
    Made by Mint teams
    Samuel lakamo , Peakk2011(Peakk)
    Version 1.0 First release
    
    Updated: 2025-10-09
    With Seprate plain PaintAPP app
    License: MIT
    GitHub: Peakk2011/Essential-app
*/

const initSVG = () => {
    if (svg) svg.remove();

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '10';

    svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(svgGroup);
    canvasContainer.appendChild(svg);
};

// Global state variables
let canvas, ctx, canvasContainer, drawingCanvas, drawingCtx, previewCanvas, previewCtx;
let colorPickerTrigger, iroPickerContainer, sizePicker, sizeDisplay, brushType, exportFormat, clearBtn, saveBtn;
let colorPicker;

let brushColor = '#000000';
let autoSaveData = null;
let lastSaveTime = 0;

// Undo/Redo system for canvas
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 20; // Adjusted for potentially large image data

let svg, svgGroup; // For sticky notes
let isDrawing = false;
let points = [];
let panX = 0;
let panY = 0;
let scale = 1;
let minScale = 0.95;
let maxScale = 10;

let isInitialized = false;
let clickCount = 0;
let clickTimer = null;
const clickDelay = 400;

let canvasWidth = 7680;
let canvasHeight = 4320;

let stickyNotes = [];
let isDraggingSticky = false;

let lastMouseX = 0;
let lastMouseY = 0;

const saveToHistory = () => {
    if (historyIndex > 0 && historyIndex === historyStack.length - 1) {
        const lastState = historyStack[historyIndex];
        const now = Date.now();
        if (now - lastState.timestamp < 500) {
            historyStack[historyIndex] = {
                imageData: drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height),
                stickyNotes: JSON.parse(JSON.stringify(stickyNotes)),
                timestamp: now
            };
            return;
        }
    }

    historyStack = historyStack.slice(0, historyIndex + 1);
    historyStack.push({
        imageData: drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height),
        stickyNotes: JSON.parse(JSON.stringify(stickyNotes)),
        timestamp: Date.now()
    });

    if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
    } else {
        historyIndex++;
    }
};


const restoreFromHistory = (state) => {
    if (!state) return;
    drawingCtx.putImageData(state.imageData, 0, 0);

    stickyNotes.forEach(sticky => sticky.remove());
    stickyNotes = [];
    if (state.stickyNotes) {
        state.stickyNotes.forEach(noteData => {
            const sticky = createStickyNote(noteData.x, noteData.y, noteData.width, noteData.height);
            sticky.text = noteData.text;
            sticky.textElement.textContent = noteData.text;
            sticky.rect.setAttribute('fill', noteData.color);
            stickyNotes.push(sticky);
        });
    }
    requestRedraw();
};

const undo = () => {
    if (historyIndex > 0) {
        historyIndex--;
        restoreFromHistory(historyStack[historyIndex]);
    }
};

const redo = () => {
    if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        restoreFromHistory(historyStack[historyIndex]);
    }
};

const setupColorPicker = (data) => {
    const colorPickerData = data.toolbar.controls.find(c => c.type === 'color-picker');
    brushColor = colorPickerData.defaultColor;

    colorPicker = new iro.ColorPicker(iroPickerContainer, {
        width: 150,
        borderWidth: 2,
        borderColor: '#2e2e2e',
        layoutDirection: 'horizontal',
        layout: [
            { component: iro.ui.Box, options: {} },
            { component: iro.ui.Slider, options: { sliderType: 'hue' } },
            { component: iro.ui.Slider, options: { sliderType: 'saturation' } },
            { component: iro.ui.Slider, options: { sliderType: 'value' } }
        ]
    });

    colorPicker.on('color:change', (color) => {
        brushColor = color.hexString;
        colorPickerTrigger.style.backgroundColor = brushColor;
    });
};

const setupCanvas = () => {
    const containerRect = canvasContainer.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;

    const newWidth = Math.round(containerRect.width);
    const newHeight = Math.round(containerRect.height);

    // Only resize and redraw if dimensions have actually changed
    if (canvasWidth !== newWidth || canvasHeight !== newHeight) {
        canvasWidth = newWidth;
        canvasHeight = newHeight;

        // Preserve drawing buffer content
        const tempImage = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);

        [canvas, drawingCanvas, previewCanvas].forEach(c => {
            c.width = canvasWidth * devicePixelRatio;
            c.height = canvasHeight * devicePixelRatio;
            c.style.width = `${canvasWidth}px`;
            c.style.height = `${canvasHeight}px`;
        });

        [ctx, drawingCtx, previewCtx].forEach(context => {
            context.scale(devicePixelRatio, devicePixelRatio);
            context.lineCap = 'round';
            context.lineJoin = 'round';
        });

        drawingCtx.putImageData(tempImage, 0, 0);
    }

    if (!isInitialized) {
        panX = 0;
        panY = 0;
        isInitialized = true;
    }

    updateTransform();
    initSVG(); // For sticky notes
    requestRedraw();
};

const updateTransform = () => {
    requestRedraw();
};

const getCanvasCoords = (e) => {
    const rect = canvasContainer.getBoundingClientRect();
    const x = (e.clientX - rect.left - panX) / scale;
    const y = (e.clientY - rect.top - panY) / scale;
    return { x, y };
};

const createStickyNote = (x, y, width = 200, height = 150) => {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.pointerEvents = 'auto';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', '#ffeb3b');
    rect.setAttribute('stroke', '#fbc02d');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '5');
    rect.style.cursor = 'move';

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('x', x + 10);
    textElement.setAttribute('y', y + 25);
    textElement.setAttribute('font-family', 'Arial, sans-serif');
    textElement.setAttribute('font-size', '14');
    textElement.setAttribute('fill', '#333');
    textElement.textContent = 'Double-click to edit';
    textElement.style.userSelect = 'none';

    group.append(rect, textElement);
    svgGroup.appendChild(group);

    let isEditing = false;
    const stickyObj = {
        x, y, width, height, text: 'Double-click to edit', color: '#ffeb3b', group, rect, textElement,
        remove: () => {
            if (group && group.parentNode) group.parentNode.removeChild(group);
        }
    };

    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    const onMouseDown = e => {
        e.stopPropagation();
        isDragging = true;
        isDraggingSticky = true;
        const { x: mx, y: my } = getCanvasCoords(e);
        dragOffset = { x: mx - stickyObj.x, y: my - stickyObj.y };
    };

    const onMouseMove = e => {
        if (!isDragging) return;
        e.stopPropagation();
        const { x: mx, y: my } = getCanvasCoords(e);
        stickyObj.x = mx - dragOffset.x;
        stickyObj.y = my - dragOffset.y;
        updateStickyPosition(stickyObj);
    };

    const onMouseUp = e => {
        if (isDragging) {
            e.stopPropagation();
            isDragging = false;
            isDraggingSticky = false;
            saveProject();
            saveToHistory();
        }
    };

    const onDoubleClick = e => {
        e.stopPropagation();
        startStickyEditing(stickyObj);
    };

    rect.addEventListener('mousedown', onMouseDown);
    rect.addEventListener('dblclick', onDoubleClick);

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return stickyObj;
};

const updateStickyPosition = sticky => {
    sticky.rect.setAttribute('x', sticky.x);
    sticky.rect.setAttribute('y', sticky.y);
    sticky.textElement.setAttribute('x', sticky.x + 10);
    sticky.textElement.setAttribute('y', sticky.y + 25);
};

const startStickyEditing = sticky => {
    if (sticky.isEditing) return;
    sticky.isEditing = true;

    const foreign = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreign.setAttribute("x", sticky.x);
    foreign.setAttribute("y", sticky.y);
    foreign.setAttribute("width", sticky.width);
    foreign.setAttribute("height", sticky.height);

    const textarea = document.createElement('textarea');
    textarea.value = sticky.text;
    Object.assign(textarea.style, {
        width: "100%",
        height: "100%",
        resize: "both",
        font: "14px Arial, sans-serif",
        background: "transparent",
        border: "none",
        outline: "none"
    });

    textarea.addEventListener("blur", () => {
        sticky.text = textarea.value;
        sticky.textElement.textContent = sticky.text;
        foreign.remove();
        sticky.isEditing = false;
        saveProject(); // Auto-save on edit end
        saveToHistory();
    });

    foreign.appendChild(textarea);
    sticky.group.appendChild(foreign);
    textarea.focus();
};

const handleTripleClick = e => {
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => {
        if (clickCount === 3) {
            const { x, y } = getCanvasCoords(e);
            const sticky = createStickyNote(x, y);
            stickyNotes.push(sticky);
            saveToHistory();
        }
        clickCount = 0;
    }, clickDelay);
};

const requestRedraw = () => {
    ctx.save();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    if (scale > 0.25) {
        const gridSize = 50;
        const gridOpacity = Math.min(1, (scale - 0.25) / 0.25);

        ctx.fillStyle = `rgba(128, 128, 128, ${gridOpacity * 0.5})`;
        const dotRadius = 1 / scale; // Keep dot size constant on screen
 
        const startX = Math.floor(-panX / scale / gridSize) * gridSize;
        const startY = Math.floor(-panY / scale / gridSize) * gridSize;
        const endX = startX + (canvasWidth / scale) + gridSize;
        const endY = startY + (canvasHeight / scale) + gridSize;

        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
 
    ctx.drawImage(drawingCanvas, 0, 0);
    ctx.drawImage(previewCanvas, 0, 0);

    // Restore the default state
    ctx.restore();
};

const drawLine = (context, points) => {
    if (points.length < 2) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        context.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    }
    context.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    context.stroke();
};

const createSmoothTexture = (context, p1, p2) => {
    const size = parseFloat(sizePicker.value);
    const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    const density = Math.max(4, distance / (size * 0.04));

    for (let i = 0; i < density; i++) {
        const t = i / density;
        const x = p1.x + (p2.x - p1.x) * t;
        const y = p1.y + (p2.y - p1.y) * t;

        const jitterX = (Math.random() - 0.5) * (size * 0.1);
        const jitterY = (Math.random() - 0.5) * (size * 0.1);

        const bristleAngle = angle + (Math.random() - 0.5) * 0.25;
        const bristleLength = (Math.random() * size * 0.6) + (size * 0.4);

        const speedFactor = 1 - (i / density);
        const bristleWidth = (Math.random() * (size / 6) + (size / 8)) * (0.5 + speedFactor);

        // ink flow effect
        const alpha = Math.random() * 0.2 + 0.7;

        context.beginPath();
        context.moveTo(
            x + jitterX - Math.cos(bristleAngle) * bristleLength / 2,
            y + jitterY - Math.sin(bristleAngle) * bristleLength / 2
        );
        context.lineTo(
            x + jitterX + Math.cos(bristleAngle) * bristleLength / 2,
            y + jitterY + Math.sin(bristleAngle) * bristleLength / 2
        );

        context.strokeStyle = brushColor;
        context.lineWidth = bristleWidth;
        context.globalAlpha = alpha;
        context.lineCap = "round";
        context.stroke();

        if (Math.random() < 0.2) {
            context.globalAlpha = alpha * 0.5;
            context.stroke();
        }
    }
    context.globalAlpha = 1.0;
};

const startDrawing = e => {
    if (e.button && e.button !== 0) return;
    if (isDraggingSticky) return;
    if (e.target && e.target.tagName && (e.target.tagName === 'rect' || e.target.tagName === 'text')) return;
    e.preventDefault();
    e.stopPropagation();
    handleTripleClick(e);

    isDrawing = true;
    points = [getCanvasCoords(e)];

    // Clear preview canvas for the new line
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
};

const draw = e => {
    if (!isDrawing || isDraggingSticky) return;

    points.push(getCanvasCoords(e));

    const currentBrush = brushType ? brushType.value : 'smooth';

    if (currentBrush === 'smooth') {
        // For smooth lines, we need to redraw the whole line on preview to get curves right
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.strokeStyle = brushColor;
        previewCtx.lineWidth = parseFloat(sizePicker.value);
        drawLine(previewCtx, points);
    } else {
        if (points.length > 1) {
            createSmoothTexture(previewCtx, points[points.length - 2], points[points.length - 1]);
        }
    }

    requestRedraw();
};

const stopDrawing = () => {
    if (isDrawing) {
        isDrawing = false;
        drawingCtx.drawImage(previewCanvas, 0, 0);
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        requestRedraw();
        points = [];
        saveProject();
        saveToHistory();
    }
};

const handleWheel = e => {
    e.preventDefault();
    const rect = canvasContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
        // Reduce zoom sensitivity
        const zoomSensitivity = 0.005;
        const delta = 1 - e.deltaY * zoomSensitivity;
        const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));

        if (newScale !== scale) {
            const scaleDiff = newScale - scale;

            let newPanX = panX - (mouseX - panX) * scaleDiff / scale;
            let newPanY = panY - (mouseY - panY) * scaleDiff / scale;

            panX = newPanX;
            panY = newPanY;
            scale = newScale;
        }
    } else {
        // Reduce pan sensitivity
        const panSensitivity = 0.5;
        panX -= e.deltaX * panSensitivity;
        panY -= e.deltaY * panSensitivity;
    }

    // Constrain panning to keep canvas within view
    const containerWidth = rect.width;
    const containerHeight = rect.height;
    const scaledCanvasWidth = canvasWidth * scale;
    const scaledCanvasHeight = canvasHeight * scale;

    panX = scaledCanvasWidth > containerWidth ? Math.min(0, Math.max(containerWidth - scaledCanvasWidth, panX)) : (containerWidth - scaledCanvasWidth) / 2;
    panY = scaledCanvasHeight > containerHeight ? Math.min(0, Math.max(containerHeight - scaledCanvasHeight, panY)) : (containerHeight - scaledCanvasHeight) / 2;

    updateTransform();
};

const zoom = (delta, centerX, centerY) => {
    const newScale = Math.max(minScale, Math.min(maxScale, scale * delta));
    if (newScale === scale) return;

    const scaleDiff = newScale - scale;
    panX -= (centerX - panX) * scaleDiff / scale;
    panY -= (centerY - panY) * scaleDiff / scale;

    scale = newScale;
    updateTransform();
};

const zoomIn = () => {
    zoom(1.1, lastMouseX, lastMouseY);
};

const zoomOut = () => {
    zoom(0.9, lastMouseX, lastMouseY);
};

const resetZoom = () => {
    scale = 1;
    const rect = canvasContainer.getBoundingClientRect();
    panX = (rect.width - canvasWidth * scale) / 2;
    panY = (rect.height - canvasHeight * scale) / 2;
    updateTransform();
};

const handleKeyboard = e => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    } else if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    } else if (ctrl && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        zoomIn();
    } else if (ctrl && e.key === '-') {
        e.preventDefault();
        zoomOut();
    } else if (ctrl && e.key === '0') {
        e.preventDefault();
        resetZoom();
    } else if (ctrl && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        clearCanvas();
    } else if (ctrl && e.shiftKey && (e.key === 's' || e.key === 'S')) { // Export
        e.preventDefault();
        saveImage();
    } else if (ctrl && (e.key === 's' || e.key === 'S')) { // Save Project
        e.preventDefault();
        saveProject();
    }
};

const clearCanvas = () => {
    drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    stickyNotes.forEach(sticky => sticky.remove());
    stickyNotes = [];

    saveProject();
    requestRedraw();
    saveToHistory();
};

const saveImage = () => {
    const format = exportFormat.value;
    const timestamp = Date.now();

    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    const devicePixelRatio = window.devicePixelRatio || 1;
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;

    let bgColor = canvas.style.backgroundColor;
    if (!bgColor || bgColor === 'transparent' || bgColor === '') {
        bgColor = window.getComputedStyle(canvas).backgroundColor;
        if (!bgColor || bgColor === 'transparent' || bgColor === '') {
            bgColor = format === 'jpg' ? '#fff' : 'rgba(0,0,0,0)';
        }
    }

    exportCtx.fillStyle = bgColor;
    exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    exportCtx.drawImage(drawingCanvas, 0, 0);

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
        exportCtx.drawImage(img, 0, 0, canvasWidth * devicePixelRatio, canvasHeight * devicePixelRatio);
        let dataUrl, filename;
        switch (format) {
            case 'png':
                dataUrl = exportCanvas.toDataURL('image/png');
                filename = `drawing_${timestamp}.png`;
                break;
            case 'jpg':
                dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
                filename = `drawing_${timestamp}.jpg`;
                break;
            case 'webp':
                dataUrl = exportCanvas.toDataURL('image/webp', 0.95);
                filename = `drawing_${timestamp}.webp`;
                break;
            default:
                dataUrl = exportCanvas.toDataURL('image/png');
                filename = `drawing_${timestamp}.png`;
        }
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        URL.revokeObjectURL(url);
    };
    img.src = url;
};

const saveProject = () => {
    try {
        const projectData = {
            imageDataUrl: drawingCanvas.toDataURL(),
            stickyNotes: stickyNotes.map(note => ({
                x: note.x,
                y: note.y,
                width: note.width,
                height: note.height,
                text: note.text,
                color: note.color,
            })),
        };
        localStorage.setItem('PaintAPP-Progress', JSON.stringify(projectData));
    } catch (error) {
        console.error('Failed to save project:', error);
    }
};

const loadProject = () => {
    const savedData = localStorage.getItem('PaintAPP-Progress');
    if (!savedData) return;

    try {
        const projectData = JSON.parse(savedData);
        const img = new Image();
        img.onload = () => {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            drawingCtx.drawImage(img, 0, 0);
            requestRedraw();
            saveToHistory();
        };
        img.src = projectData.imageDataUrl;

        projectData.stickyNotes.forEach(noteData => stickyNotes.push(createStickyNote(noteData.x, noteData.y, noteData.width, noteData.height, noteData.text, noteData.color)));
    } catch (error) {
        console.error('Failed to load project:', error);
    }
};

const handleTouch = e => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        target: e.target,
        preventDefault: () => { },
        stopPropagation: () => { }
    };
    startDrawing(mouseEvent);
};

const handleTouchMove = e => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
    };
    draw(mouseEvent);
};

const adjustTheme = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark && brushColor === '#000000') {
        brushColor = '#ffffff';
    } else if (!isDark && brushColor === '#ffffff') {
        brushColor = '#000000';
    }
    colorPicker.color.hexString = brushColor;
    colorPickerTrigger.style.backgroundColor = brushColor;
};

const initializePaint = (data) => {
    // Assign DOM elements now that they are guaranteed to exist
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    canvasContainer = document.getElementById('canvasContainer');

    drawingCanvas = document.createElement('canvas');
    drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });
    previewCanvas = document.createElement('canvas');
    previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });

    colorPickerTrigger = document.getElementById('color-picker-trigger');
    iroPickerContainer = document.getElementById('iro-picker-container');
    
    sizePicker = document.getElementById('brushSize');
    sizeDisplay = document.getElementById('sizeDisplay');
    brushType = document.getElementById('brushType');
    exportFormat = document.getElementById('exportFormat');
    clearBtn = document.getElementById('clearBtn');
    saveBtn = document.getElementById('saveBtn');

    setupColorPicker(data);
    setupCanvas();
    loadProject();

    // Setup event listeners
    canvasContainer.addEventListener('mousedown', startDrawing);
    canvasContainer.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', (e) => {
        if (e.button !== 2) { // Ignore right-click mouseup
            stopDrawing();
        }
    });
    document.addEventListener('mouseleave', stopDrawing);
    canvasContainer.addEventListener('wheel', handleWheel, { passive: false });
    canvasContainer.addEventListener('touchstart', handleTouch, { passive: false });
    canvasContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasContainer.addEventListener('touchend', stopDrawing);

    canvasContainer.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (window.Electron && window.Electron.ipcRenderer) {
            const currentBrush = brushType ? brushType.value : 'smooth';
            window.Electron.ipcRenderer.send('show-context-menu', currentBrush);
        }
    });

    document.addEventListener('mousemove', e => {
        const rect = canvasContainer.getBoundingClientRect();
        lastMouseX = e.clientX - rect.left;
        lastMouseY = e.clientY - rect.top;
    });

    colorPickerTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = iroPickerContainer.style.display === 'flex';
        iroPickerContainer.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', (e) => {
        if (!iroPickerContainer.contains(e.target) && e.target !== colorPickerTrigger) {
            iroPickerContainer.style.display = 'none';
        }
    });

    if (clearBtn) clearBtn.addEventListener('click', clearCanvas);
    if (saveBtn) saveBtn.addEventListener('click', saveImage);

    if (sizePicker && sizeDisplay) {
        sizePicker.addEventListener('input', () => sizeDisplay.textContent = `${sizePicker.value}px`);
    }

    document.addEventListener('keydown', handleKeyboard);
    adjustTheme();
    if (historyStack.length === 0) {
        saveToHistory(); // Save initial empty state if nothing was loaded
    }
};

const handleResize = () => {
    setupCanvas();
    // Check if canvasContainer is initialized before proceeding
    if (canvasContainer) {
        setupCanvas();
    }
};

// These listeners should be set up only once the app is initialized.
window.addEventListener('resize', handleResize);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adjustTheme);

// IPC Main process direct

if (window.Electron && window.Electron.ipcRenderer) {
    window.Electron.ipcRenderer.on('trigger-action', (action, value) => {
        switch (action) {
            case 'undo':
                undo();
                break;
            case 'redo':
                redo();
                break;
            case 'save-project':
                saveProject();
                console.log("Save Project action triggered");
                break;
            case 'export-image':
                saveImage();
                break;
            case 'clear':
                clearCanvas();
                break;
            case 'zoom-in':
                zoomIn();
                break;
            case 'zoom-out':
                zoomOut();
                break;
            case 'zoom-reset':
                resetZoom();
                break;
            case 'set-brush':
                if (brushType && value) {
                    brushType.value = value;
                }
                break;
        }
    });
}

// Platform direct

if (window.Electron) {
    const platform = window.Electron.platform;
    const isMac = window.Electron.isMac;
    const isWindows = window.Electron.isWindows;

    if (platform) {
        document.body.classList.add(`platform-${platform}`);
    }
    if (isMac) {
        document.body.classList.add('mac');
    } else if (isWindows) {
        document.body.classList.add('windows');
    }
}