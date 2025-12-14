import { getState, getConfig } from '../utils/config.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';

/**
 * @typedef {Object} StickyNote
 * @property {number} x                                 - X coordinate
 * @property {number} y                                 - Y coordinate
 * @property {number} width                             - Width of sticky note
 * @property {number} height                            - Height of sticky note
 * @property {string} text                              - Text content
 * @property {string} color                             - Background color
 * @property {SVGGElement} group                        - SVG group element
 * @property {SVGRectElement} rect                      - SVG rectangle element
 * @property {SVGTextElement} textElement               - SVG text element
 * @property {boolean} isEditing                        - Editing state flag
 * @property {Function} remove                          - Remove function
 */

/**
 * @typedef {Object} DragState
 * @property {number} x - X offset
 * @property {number} y - Y offset
 */

// Constants cache
const SVG_NS = 'http://www.w3.org/2000/svg';
const POINTER_EVENTS_AUTO = 'auto';
const CURSOR_MOVE = 'move';
const USER_SELECT_NONE = 'none';

/**
 * Creates a new sticky note element
 * @param {number} x                                    - X coordinate
 * @param {number} y                                    - Y coordinate
 * @param {number} [width]                              - Optional width
 * @param {number} [height]                             - Optional height
 * @returns {StickyNote|null} The created sticky note object or null on error
 */
export const createStickyNote = (x, y, width, height) => {
    try {
        const state = getState();
        const config = getConfig().sticky;

        width = width | 0 || config.DEFAULT_WIDTH;
        height = height | 0 || config.DEFAULT_HEIGHT;

        // Create elements in batch
        const group = document.createElementNS(SVG_NS, 'g');
        const rect = document.createElementNS(SVG_NS, 'rect');
        const textElement = document.createElementNS(SVG_NS, 'text');

        // Set group properties
        group.style.pointerEvents = POINTER_EVENTS_AUTO;

        // Batch rect attribute updates
        const rectAttrs = [
            ['x', x],
            ['y', y],
            ['width', width],
            ['height', height],
            ['fill', config.DEFAULT_COLOR],
            ['stroke', config.DEFAULT_STROKE],
            ['stroke-width', config.STROKE_WIDTH],
            ['rx', config.BORDER_RADIUS]
        ];

        for (let i = 0; i < rectAttrs.length; i++) {
            rect.setAttribute(rectAttrs[i][0], rectAttrs[i][1]);
        }
        rect.style.cursor = CURSOR_MOVE;

        // Batch text attribute updates
        const textX = x + config.TEXT_OFFSET_X;
        const textY = y + config.TEXT_OFFSET_Y;
        const textAttrs = [
            ['x', textX],
            ['y', textY],
            ['font-family', config.FONT_FAMILY],
            ['font-size', config.FONT_SIZE],
            ['fill', config.TEXT_COLOR]
        ];

        for (let i = 0; i < textAttrs.length; i++) {
            textElement.setAttribute(textAttrs[i][0], textAttrs[i][1]);
        }
        textElement.textContent = config.DEFAULT_TEXT;
        textElement.style.userSelect = USER_SELECT_NONE;

        // Append in batch (fewer reflows)
        group.appendChild(rect);
        group.appendChild(textElement);
        state.svgGroup.appendChild(group);

        /** @type {StickyNote} */
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
                try {
                    if (stickyObj.group && stickyObj.group.parentNode) {
                        stickyObj.group.parentNode.removeChild(stickyObj.group);
                    }
                } catch (error) {
                    console.error('Error removing sticky note:', error);
                }
            }
        };

        setupStickyListeners(stickyObj);
        state.stickyNotes.push(stickyObj);

        return stickyObj;
    } catch (error) {
        console.error('Error creating sticky note:', error);
        return null;
    }
};

/**
 * Sets up event listeners for sticky note interactions
 * @param {StickyNote} sticky - The sticky note object
 * @returns {void}
 */
const setupStickyListeners = (sticky) => {
    try {
        let isDragging = false;
        /** @type {DragState} */
        const dragOffset = { x: 0, y: 0 };
        const state = getState();

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onMouseDown = (e) => {
            try {
                e.stopPropagation();
                isDragging = true;
                state.isDraggingSticky = true;
                const coords = getCanvasCoords(e);
                dragOffset.x = coords.x - sticky.x;
                dragOffset.y = coords.y - sticky.y;
            } catch (error) {
                console.error('Error in mousedown handler:', error);
            }
        };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onMouseMove = (e) => {
            if (!isDragging) return;

            try {
                e.stopPropagation();
                const coords = getCanvasCoords(e);
                sticky.x = coords.x - dragOffset.x;
                sticky.y = coords.y - dragOffset.y;
                updateStickyPosition(sticky);
            } catch (error) {
                console.error('Error in mousemove handler:', error);
            }
        };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onMouseUp = (e) => {
            if (!isDragging) return;

            try {
                e.stopPropagation();
                isDragging = false;
                state.isDraggingSticky = false;
                saveProject();
                saveToHistory();
            } catch (error) {
                console.error('Error in mouseup handler:', error);
            }
        };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onDoubleClick = (e) => {
            try {
                e.stopPropagation();
                startStickyEditing(sticky);
            } catch (error) {
                console.error('Error in dblclick handler:', error);
            }
        };

        // Attach event listeners
        sticky.rect.addEventListener('mousedown', onMouseDown);
        sticky.rect.addEventListener('dblclick', onDoubleClick);
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    } catch (error) {
        console.error('Error setting up sticky listeners:', error);
    }
};

/**
 * Updates sticky note position in DOM
 * @param {StickyNote} sticky - The sticky note object
 * @returns {void}
 */
const updateStickyPosition = (sticky) => {
    try {
        const config = getConfig().sticky;
        const textX = sticky.x + config.TEXT_OFFSET_X;
        const textY = sticky.y + config.TEXT_OFFSET_Y;

        // Batch attribute updates
        sticky.rect.setAttribute('x', sticky.x);
        sticky.rect.setAttribute('y', sticky.y);
        
        sticky.textElement.setAttribute('x', textX);
        sticky.textElement.setAttribute('y', textY);
    } catch (error) {
        console.error('Error updating sticky position:', error);
    }
};

/**
 * Starts editing mode for sticky note
 * @param {StickyNote} sticky - The sticky note object
 * @returns {void}
 */
const startStickyEditing = (sticky) => {
    if (sticky.isEditing) return;

    try {
        sticky.isEditing = true;

        const foreign = document.createElementNS(SVG_NS, 'foreignObject');
        const foreignAttrs = [
            ['x', sticky.x],
            ['y', sticky.y],
            ['width', sticky.width],
            ['height', sticky.height]
        ];

        for (let i = 0; i < foreignAttrs.length; i++) {
            foreign.setAttribute(foreignAttrs[i][0], foreignAttrs[i][1]);
        }

        const textarea = document.createElement('textarea');
        textarea.value = sticky.text;
        textarea.style.cssText = 'width:100%;height:100%;resize:both;font:14px Arial,sans-serif;background:transparent;border:none;outline:none';

        /**
         * @returns {void}
         */
        const onBlur = () => {
            try {
                sticky.text = textarea.value;
                sticky.textElement.textContent = textarea.value;
                
                foreign.remove();
                sticky.isEditing = false;

                saveProject();
                saveToHistory();
            } catch (error) {
                console.error('Error in blur handler:', error);
                sticky.isEditing = false;
            }
        };

        textarea.addEventListener(
            'blur',
            onBlur
        );
        
        foreign.appendChild(textarea);
        sticky.group.appendChild(foreign);
        textarea.focus();
    } catch (error) {
        console.error('Error starting sticky editing:', error);
        sticky.isEditing = false;
    }
};

/**
 * Removes all sticky notes from canvas
 * @returns {void}
 */
export const removeAllStickyNotes = () => {
    try {
        const state = getState();
        const notes = state.stickyNotes;

        // Iterate backwards
        for (let i = notes.length - 1; i >= 0; i--) {
            notes[i].remove();
        }

        // Clear array
        state.stickyNotes.length = 0;
    } catch (error) {
        console.error('Error removing all sticky notes:', error);
    }
};