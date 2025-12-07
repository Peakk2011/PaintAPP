import { getState, getConfig } from '../utils/config.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';

export function createStickyNote(x, y, width, height) {
    const state = getState();
    const config = getConfig().sticky;

    width = width || config.DEFAULT_WIDTH;
    height = height || config.DEFAULT_HEIGHT;

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.style.pointerEvents = 'auto';

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', config.DEFAULT_COLOR);
    rect.setAttribute('stroke', config.DEFAULT_STROKE);
    rect.setAttribute('stroke-width', config.STROKE_WIDTH);
    rect.setAttribute('rx', config.BORDER_RADIUS);
    rect.style.cursor = 'move';

    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textElement.setAttribute('x', x + config.TEXT_OFFSET_X);
    textElement.setAttribute('y', y + config.TEXT_OFFSET_Y);
    textElement.setAttribute('font-family', config.FONT_FAMILY);
    textElement.setAttribute('font-size', config.FONT_SIZE);
    textElement.setAttribute('fill', config.TEXT_COLOR);
    textElement.textContent = config.DEFAULT_TEXT;
    textElement.style.userSelect = 'none';

    group.appendChild(rect);
    group.appendChild(textElement);
    state.svgGroup.appendChild(group);

    const stickyObj = {
        x: x,
        y: y,
        width: width,
        height: height,
        text: config.DEFAULT_TEXT,
        color: config.DEFAULT_COLOR,
        group: group,
        rect: rect,
        textElement: textElement,
        isEditing: false,
        remove: () => {
            if (stickyObj.group && stickyObj.group.parentNode) {
                stickyObj.group.parentNode.removeChild(stickyObj.group);
            }
        }
    };

    setupStickyListeners(stickyObj);
    state.stickyNotes.push(stickyObj);

    return stickyObj;
}

function setupStickyListeners(sticky) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    const state = getState();

    const onMouseDown = (e) => {
        e.stopPropagation();
        isDragging = true;
        state.isDraggingSticky = true;
        const coords = getCanvasCoords(e);
        dragOffset.x = coords.x - sticky.x;
        dragOffset.y = coords.y - sticky.y;
    };

    const onMouseMove = (e) => {
        if (!isDragging) return;
        e.stopPropagation();
        const coords = getCanvasCoords(e);
        sticky.x = coords.x - dragOffset.x;
        sticky.y = coords.y - dragOffset.y;
        updateStickyPosition(sticky);
    };

    const onMouseUp = (e) => {
        if (isDragging) {
            e.stopPropagation();
            isDragging = false;
            state.isDraggingSticky = false;
            saveProject();
            saveToHistory();
        }
    };

    const onDoubleClick = (e) => {
        e.stopPropagation();
        startStickyEditing(sticky);
    };

    sticky.rect.addEventListener('mousedown', onMouseDown);
    sticky.rect.addEventListener('dblclick', onDoubleClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function updateStickyPosition(sticky) {
    const config = getConfig().sticky;
    sticky.rect.setAttribute('x', sticky.x);
    sticky.rect.setAttribute('y', sticky.y);
    sticky.textElement.setAttribute('x', sticky.x + config.TEXT_OFFSET_X);
    sticky.textElement.setAttribute('y', sticky.y + config.TEXT_OFFSET_Y);
}

function startStickyEditing(sticky) {
    if (sticky.isEditing) return;
    sticky.isEditing = true;

    const foreign = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    foreign.setAttribute('x', sticky.x);
    foreign.setAttribute('y', sticky.y);
    foreign.setAttribute('width', sticky.width);
    foreign.setAttribute('height', sticky.height);

    const textarea = document.createElement('textarea');
    textarea.value = sticky.text;
    textarea.style.cssText = 'width:100%;height:100%;resize:both;font:14px Arial,sans-serif;background:transparent;border:none;outline:none';

    textarea.addEventListener('blur', () => {
        sticky.text = textarea.value;
        sticky.textElement.textContent = textarea.value;
        foreign.remove();
        sticky.isEditing = false;
        saveProject();
        saveToHistory();
    });

    foreign.appendChild(textarea);
    sticky.group.appendChild(foreign);
    textarea.focus();
}

export function removeAllStickyNotes() {
    const state = getState();
    state.stickyNotes.forEach(note => note.remove());
    state.stickyNotes = [];
}