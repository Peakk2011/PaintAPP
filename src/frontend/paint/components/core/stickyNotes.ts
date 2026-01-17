import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from './tabManager.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';

/**
 * Sticky note interface
 */
export interface StickyNote {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    group: SVGGElement;
    rect: SVGRectElement;
    textElement: SVGTextElement;
    isEditing: boolean;
    remove: () => void;
    cleanup: (() => void) | null;
}

/**
 * Drag state interface
 */
interface DragState {
    x: number;
    y: number;
}

/**
 * Sticky note configuration interface
 */
interface StickyConfig {
    DEFAULT_WIDTH: number;
    DEFAULT_HEIGHT: number;
    DEFAULT_COLOR: string;
    DEFAULT_STROKE: string;
    STROKE_WIDTH: number;
    BORDER_RADIUS: number;
    TEXT_OFFSET_X: number;
    TEXT_OFFSET_Y: number;
    FONT_FAMILY: string;
    FONT_SIZE: number;
    TEXT_COLOR: string;
    DEFAULT_TEXT: string;
    DELETE_BTN_OFFSET: number;
    DELETE_BTN_RADIUS: number;
}

// Constants cache
const SVG_NS: string = 'http://www.w3.org/2000/svg';
const POINTER_EVENTS_AUTO: string = 'auto';
const CURSOR_MOVE: string = 'move';
const USER_SELECT_NONE: string = 'none';

/**
 * Creates a new sticky note element
 */
export const createStickyNote = (
    x: number,
    y: number,
    width?: number,
    height?: number,
    svgGroup?: SVGGElement
): StickyNote | null => {
    try {
        const state = getState();
        const activeTab = getActiveTab();
        
        if (!activeTab) {
            console.warn('No active tab to create sticky note');
            return null;
        }

        // Use provided svgGroup or get from active tab
        const targetSvgGroup: SVGGElement | null = svgGroup || activeTab.svgGroup;
        
        if (!targetSvgGroup) {
            console.error('No SVG group available for sticky note');
            return null;
        }

        const configObj = getConfig();
        if (!configObj) {
            console.error('Config not available');
            return null;
        }

        const config: StickyConfig = (configObj as any).sticky;

        const noteWidth: number = width || config.DEFAULT_WIDTH;
        const noteHeight: number = height || config.DEFAULT_HEIGHT;

        // Create elements in batch
        const group = document.createElementNS(SVG_NS, 'g') as SVGGElement;
        const rect = document.createElementNS(SVG_NS, 'rect') as SVGRectElement;
        const textElement = document.createElementNS(SVG_NS, 'text') as SVGTextElement;

        // Set group properties
        group.style.pointerEvents = POINTER_EVENTS_AUTO;
        group.setAttribute('transform', `translate(${x}, ${y})`);

        // Batch rect attribute updates
        const rectAttrs: [string, string | number][] = [
            ['x', 0],
            ['y', 0],
            ['width', noteWidth],
            ['height', noteHeight],
            ['fill', config.DEFAULT_COLOR],
            ['stroke', config.DEFAULT_STROKE],
            ['stroke-width', config.STROKE_WIDTH],
            ['rx', config.BORDER_RADIUS]
        ];

        for (let i = 0; i < rectAttrs.length; i++) {
            rect.setAttribute(rectAttrs[i][0], String(rectAttrs[i][1]));
        }
        rect.style.cursor = CURSOR_MOVE;

        // Batch text attribute updates
        const textX: number = config.TEXT_OFFSET_X;
        const textY: number = config.TEXT_OFFSET_Y;
        const textAttrs: [string, string | number][] = [
            ['x', textX],
            ['y', textY],
            ['font-family', config.FONT_FAMILY],
            ['font-size', config.FONT_SIZE],
            ['fill', config.TEXT_COLOR]
        ];

        for (let i = 0; i < textAttrs.length; i++) {
            textElement.setAttribute(textAttrs[i][0], String(textAttrs[i][1]));
        }
        textElement.textContent = config.DEFAULT_TEXT;
        textElement.style.userSelect = USER_SELECT_NONE;

        // Append in batch (fewer reflows)
        group.appendChild(rect);
        group.appendChild(textElement);
        targetSvgGroup.appendChild(group);

        const stickyObj: StickyNote = {
            x: x,
            y: y,
            width: noteWidth,
            height: noteHeight,
            text: config.DEFAULT_TEXT,
            color: config.DEFAULT_COLOR,
            group: group,
            rect: rect,
            textElement: textElement,
            isEditing: false,
            cleanup: null,
            remove: (): void => {
                try {
                    if (typeof stickyObj.cleanup === 'function') {
                        stickyObj.cleanup();
                    }

                    if (stickyObj.group && stickyObj.group.parentNode) {
                        stickyObj.group.parentNode.removeChild(stickyObj.group);
                    }
                    
                    const currentTab = getActiveTab();
                    if (currentTab && currentTab.stickyNotes) {
                        const index: number = currentTab.stickyNotes.indexOf(stickyObj);
                        if (index > -1) {
                            currentTab.stickyNotes.splice(index, 1);
                        }
                    }
                    
                    saveProject();
                    saveToHistory();
                } catch (error) {
                    console.error('Error removing sticky note:', error);
                }
            }
        };

        // Create delete button
        const deleteBtn = document.createElementNS(SVG_NS, 'g') as SVGGElement;
        deleteBtn.setAttribute('class', 'sticky-note-delete-button');
        deleteBtn.style.cursor = 'pointer';

        const deleteCircle = document.createElementNS(SVG_NS, 'circle') as SVGCircleElement;
        deleteCircle.setAttribute('cx', String(noteWidth - config.DELETE_BTN_OFFSET));
        deleteCircle.setAttribute('cy', String(config.DELETE_BTN_OFFSET));
        deleteCircle.setAttribute('r', String(config.DELETE_BTN_RADIUS));
        deleteCircle.setAttribute('fill', '#ff5f57');
        deleteCircle.setAttribute('stroke', '#7d0000');
        deleteCircle.setAttribute('stroke-width', '0.5');

        const deleteLine1 = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
        const lineOffset: number = config.DELETE_BTN_RADIUS / 2.2;
        deleteLine1.setAttribute('x1', String(noteWidth - config.DELETE_BTN_OFFSET - lineOffset));
        deleteLine1.setAttribute('y1', String(config.DELETE_BTN_OFFSET - lineOffset));
        deleteLine1.setAttribute('x2', String(noteWidth - config.DELETE_BTN_OFFSET + lineOffset));
        deleteLine1.setAttribute('y2', String(config.DELETE_BTN_OFFSET + lineOffset));
        deleteLine1.setAttribute('stroke', '#7d0000');
        deleteLine1.setAttribute('stroke-width', '1');

        const deleteLine2 = document.createElementNS(SVG_NS, 'line') as SVGLineElement;
        deleteLine2.setAttribute('x1', String(noteWidth - config.DELETE_BTN_OFFSET - lineOffset));
        deleteLine2.setAttribute('y1', String(config.DELETE_BTN_OFFSET + lineOffset));
        deleteLine2.setAttribute('x2', String(noteWidth - config.DELETE_BTN_OFFSET + lineOffset));
        deleteLine2.setAttribute('y2', String(config.DELETE_BTN_OFFSET - lineOffset));
        deleteLine2.setAttribute('stroke', '#7d0000');
        deleteLine2.setAttribute('stroke-width', '1');
        
        deleteBtn.appendChild(deleteCircle);
        deleteBtn.appendChild(deleteLine1);
        deleteBtn.appendChild(deleteLine2);
        group.appendChild(deleteBtn);

        const onDeleteClick = (e: MouseEvent): void => {
            e.stopPropagation();
            e.preventDefault();
            stickyObj.remove();
        };

        deleteBtn.addEventListener('click', onDeleteClick as EventListener);

        setupStickyListeners(stickyObj);
        
        // Add to active tab's sticky notes
        if (activeTab.stickyNotes) {
            activeTab.stickyNotes.push(stickyObj);
        }

        return stickyObj;
    } catch (error) {
        console.error('Error creating sticky note:', error);
        return null;
    }
};

/**
 * Sets up event listeners for sticky note interactions
 */
const setupStickyListeners = (sticky: StickyNote): void => {
    try {
        let isDragging: boolean = false;
        const dragOffset: DragState = { x: 0, y: 0 };

        const onMouseDown = (e: MouseEvent): void => {
            try {
                const activeTab = getActiveTab();
                if (!activeTab) return;
                if (e.button !== 0) return;

                e.stopPropagation();
                e.preventDefault();
                
                isDragging = true;
                activeTab.isDraggingSticky = true;
                
                const coords = getCanvasCoords(e);
                dragOffset.x = coords.x - sticky.x;
                dragOffset.y = coords.y - sticky.y;
            } catch (error) {
                console.error('Error in mousedown handler:', error);
            }
        };

        const onMouseMove = (e: MouseEvent): void => {
            if (!isDragging) return;

            try {
                e.stopPropagation();
                e.preventDefault();
                
                const coords = getCanvasCoords(e);
                sticky.x = coords.x - dragOffset.x;
                sticky.y = coords.y - dragOffset.y;
                updateStickyPosition(sticky);
            } catch (error) {
                console.error('Error in mousemove handler:', error);
            }
        };

        const onMouseUp = (e: MouseEvent): void => {
            if (!isDragging) return;

            try {
                const activeTab = getActiveTab();
                if (activeTab) {
                    activeTab.isDraggingSticky = false;
                }

                e.stopPropagation();
                e.preventDefault();
                isDragging = false;
                
                saveProject();
                saveToHistory();
            } catch (error) {
                console.error('Error in mouseup handler:', error);
            }
        };

        const onDoubleClick = (e: MouseEvent): void => {
            try {
                e.stopPropagation();
                e.preventDefault();
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

        sticky.cleanup = (): void => {
            sticky.rect.removeEventListener('mousedown', onMouseDown);
            sticky.rect.removeEventListener('dblclick', onDoubleClick);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    } catch (error) {
        console.error('Error setting up sticky listeners:', error);
    }
};

/**
 * Updates sticky note position in DOM
 */
const updateStickyPosition = (sticky: StickyNote): void => {
    try {
        const x: number = Math.round(sticky.x * 100) / 100;
        const y: number = Math.round(sticky.y * 100) / 100;
        sticky.group.setAttribute('transform', `translate(${x}, ${y})`);
    } catch (error) {
        console.error('Error updating sticky position:', error);
    }
};

/**
 * Starts editing mode for sticky note
 */
const startStickyEditing = (sticky: StickyNote): void => {
    if (sticky.isEditing) return;

    try {
        sticky.isEditing = true;
        const originalText: string = sticky.text;

        const foreign = document.createElementNS(SVG_NS, 'foreignObject') as SVGForeignObjectElement;
        const foreignAttrs: [string, number][] = [
            ['x', 0],
            ['y', 0],
            ['width', sticky.width],
            ['height', sticky.height]
        ];

        for (let i = 0; i < foreignAttrs.length; i++) {
            foreign.setAttribute(foreignAttrs[i][0], String(foreignAttrs[i][1]));
        }

        const textarea: HTMLTextAreaElement = document.createElement('textarea');
        textarea.value = sticky.text;
        textarea.style.cssText = `
            width: 100%;
            height: 100%;
            border: 1px solid #adadad;
            outline: none;
            resize: both;
            font: 14px var(--font-text), sans-serif;
            background-color: rgba(255, 253, 208, 0.95);
            color: #000000;
            padding: 0.75rem;
            box-sizing: border-box;
            border-radius: 5px;
        `;

        const removeEditor = (): void => {
            if (foreign.parentNode) {
                foreign.parentNode.removeChild(foreign);
            }
            sticky.isEditing = false;
        };

        const saveChanges = (): void => {
            const newText: string = textarea.value.trim();
            if (newText) {
                sticky.text = newText;
                sticky.textElement.textContent = newText;
                saveProject();
                saveToHistory();
            } else {
                // If empty, revert to original
                sticky.text = originalText;
                sticky.textElement.textContent = originalText;
            }
            removeEditor();
        };

        const cancelChanges = (): void => {
            sticky.text = originalText;
            sticky.textElement.textContent = originalText;
            removeEditor();
        };

        const onBlur = (): void => {
            try {
                // Save changes on blur instead of canceling
                saveChanges();
            } catch (error) {
                console.error('Error in blur handler:', error);
                removeEditor();
            }
        };

        const onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveChanges();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelChanges();
            }
            // Allow Shift+Enter for new lines
        };

        const onTextareaClick = (e: Event): void => {
            e.stopPropagation();
        };

        textarea.addEventListener('blur', onBlur);
        textarea.addEventListener('keydown', onKeyDown);
        textarea.addEventListener('click', onTextareaClick);
        textarea.addEventListener('mousedown', onTextareaClick);
        
        foreign.appendChild(textarea);
        sticky.group.appendChild(foreign);
        
        setTimeout((): void => {
            textarea.focus();
            textarea.select();
        }, 10);
    } catch (error) {
        console.error('Error starting sticky editing:', error);
        sticky.isEditing = false;
    }
};

/**
 * Removes all sticky notes from the active tab's canvas
 */
export const removeAllStickyNotes = (): void => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab || !activeTab.stickyNotes) {
            console.warn('No active tab or sticky notes to remove');
            return;
        }

        const notes: any[] = (activeTab as any).stickyNotes.slice();

        // Remove all sticky notes
        notes.forEach((note: StickyNote): void => {
            if (note && typeof note.remove === 'function') {
                note.remove();
            }
        });

        // Clear array
        activeTab.stickyNotes.length = 0;
    } catch (error) {
        console.error('Error removing all sticky notes:', error);
    }
};

/**
 * Gets all sticky notes from the active tab
 */
export const getStickyNotes = (): StickyNote[] => {
    const activeTab = getActiveTab();
    return activeTab && activeTab.stickyNotes ? (activeTab.stickyNotes as any[]) : [];
};

/**
 * Counts sticky notes in the active tab
 */
export const getStickyNoteCount = (): number => {
    const activeTab = getActiveTab();
    return activeTab && activeTab.stickyNotes ? activeTab.stickyNotes.length : 0;
};

/**
 * This ensures sticky notes stay in the correct position relative to the canvas
 */
export const updateAllStickyPositions = (): void => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab || !activeTab.stickyNotes) return;

        (activeTab.stickyNotes as any[]).forEach((sticky: any): void => {
            if (sticky && sticky.group) {
                updateStickyPosition(sticky);
            }
        });
    } catch (error) {
        console.error('Error updating sticky positions:', error);
    }
};