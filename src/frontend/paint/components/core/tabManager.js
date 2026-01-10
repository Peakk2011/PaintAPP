import { getState, getConfig } from '../utils/config.js';
import { setupCanvas, requestRedraw, initSVG } from './canvas.js';
import { saveToHistory } from './history.js';
import { setupCanvasListeners, cleanupCanvasListeners } from '../controllers/events.js';

let tabCounter = 0;
const tabs = [];
let newlyCreatedTabId = null;
let activeTabId = null;

/**
 * Creates a new tab state object with all necessary properties
 * @returns {object} A new tab object
 */
const createTabState = () => {
    tabCounter++;
    const tabId = `tab-${tabCounter}`;

    // Create DOM elements
    const canvasContainer = document.createElement('div');
    canvasContainer.id = `canvasContainer-${tabId}`;
    canvasContainer.className = 'canvas-container';

    const canvas = document.createElement('canvas');
    canvas.id = `canvas-${tabId}`;
    canvasContainer.appendChild(canvas);
    
    const canvasArea = document.getElementById('canvas-area');
    if (!canvasArea) {
        console.error('canvas-area element not found');
        return null;
    }
    canvasArea.appendChild(canvasContainer);

    // Create drawing and preview canvases
    const drawingCanvas = document.createElement('canvas');
    const drawingCtx = drawingCanvas.getContext('2d', { willReadFrequently: true });
    
    const previewCanvas = document.createElement('canvas');
    const previewCtx = previewCanvas.getContext('2d', { willReadFrequently: true });

    return {
        id: tabId,
        name: 'New tab', 
        canvas: canvas,
        ctx: canvas.getContext('2d', { willReadFrequently: true }),
        canvasContainer: canvasContainer,
        drawingCanvas: drawingCanvas,
        drawingCtx: drawingCtx,
        previewCanvas: previewCanvas,
        previewCtx: previewCtx,
        historyStack: [],
        historyIndex: -1,
        zoom: 1,
        pan: { x: 0, y: 0 },
        svg: null,
        svgGroup: null,
        stickyNotes: [],
        points: [],
        isDrawing: false,
        isDraggingSticky: false,
        isInitialized: false,
        canvasWidth: 0,
        canvasHeight: 0
    };
};

/**
 * Renders the tab bar based on the current tabs array
 */
const renderTabs = () => {
    const tabsContainer = document.getElementById('tabs-container');
    const tabBar = document.getElementById('tab-bar');
    const canvasArea = document.getElementById('canvas-area');
    
    if (!tabsContainer) {
        console.error('tabs-container element not found');
        return;
    }

    tabsContainer.innerHTML = '';

    if (tabs.length === 1) {
        tabsContainer.style.display = 'none';
        if (tabBar) tabBar.classList.remove('hidden'); // Keep tab bar visible
        if (canvasArea) canvasArea.classList.add('single-tab');
        return;
    }
    
    // Show tabs container when 2+ tabs
    tabsContainer.style.display = 'flex';
    if (tabBar) tabBar.classList.remove('hidden');
    if (canvasArea) canvasArea.classList.remove('single-tab');

    tabs.forEach(tab => {
        const tabButton = document.createElement('button');
        tabButton.className = `tab ${tab.id === activeTabId ? 'active' : ''}`;
        tabButton.setAttribute('data-tab-id', tab.id);
        
        const isNewTab = (tab.id === newlyCreatedTabId);
        console.log('Rendering tab:', tab.id, 'isNew:', isNewTab); // Debug log
        
        const tabName = document.createElement('span');
        tabName.className = 'tab-name';
        tabName.textContent = tab.name;
        tabButton.appendChild(tabName);

        tabName.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startRenaming(tab, tabName);
        });

        // Always show close button when there are 2+ tabs
        const closeButton = document.createElement('span');
        closeButton.className = 'close-tab-btn';
        closeButton.innerHTML = '&times;';
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(tab.id);
        });
        tabButton.appendChild(closeButton);

        tabButton.addEventListener('click', () => switchTab(tab.id));
        tabsContainer.appendChild(tabButton);
        
        // Add animation class AFTER appending to DOM
        if (isNewTab) {
            console.log('Adding tab-new class to:', tab.id); // Debug log
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                tabButton.classList.add('tab-new');
                console.log('Class added, classList:', tabButton.classList.toString()); // Debug log
            });
            // Clear the newly created flag after animation is set
            newlyCreatedTabId = null;
        }
    });
};

/**
 * Starts renaming a tab
 * @param {object} tab                  - Tab to rename
 * @param {HTMLElement} tabNameElement  - Tab name span element
 */
const startRenaming = (tab, tabNameElement) => {
    const currentName = tab.name;
    
    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'tab-name-input';
    
    // Store reference to parent for safer DOM manipulation
    const parentElement = tabNameElement.parentElement;
    if (!parentElement) return;
    
    let isFinishing = false; // Prevent multiple calls
    
    const finishRenaming = (save) => {
        if (isFinishing) return;
        isFinishing = true;
        
        const newName = input.value.trim();
        if (save && newName) {
            tab.name = newName;
        }
        
        // Restore span safely
        const newSpan = document.createElement('span');
        newSpan.className = 'tab-name';
        newSpan.textContent = tab.name;
        newSpan.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            startRenaming(tab, newSpan);
        });
        
        if (input.parentElement === parentElement) {
            try {
                input.replaceWith(newSpan);
            } catch (e) {
                // Fallback: remove input and append span
                if (input.parentElement) {
                    input.parentElement.removeChild(input);
                }
                parentElement.appendChild(newSpan);
            }
        }
    };
    
    // Replace span with input
    tabNameElement.replaceWith(input);
    input.focus();
    input.select();
    
    // Event handlers
    const onBlur = () => {
        // Small delay to allow other events to process
        setTimeout(() => finishRenaming(true), 10);
    };
    
    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishRenaming(true);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            finishRenaming(false);
        }
    };
    
    const onClick = (e) => {
        e.stopPropagation();
    };
    
    input.addEventListener('blur', onBlur);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('click', onClick);
};

/**
 * Syncs global state with active tab state
 * @param {object} tab - Tab to sync with
 */
const syncGlobalStateWithTab = (tab) => {
    const mainState = getState();
    if (!mainState || !tab) return;

    // Update global state to point to active tab
    mainState.activeTab = tab;
    mainState.scale = tab.zoom;
    mainState.panX = tab.pan.x;
    mainState.panY = tab.pan.y;
};

/**
 * Syncs tab state with global state
 * @param {object} tab - Tab to update
 */
const syncTabWithGlobalState = (tab) => {
    const mainState = getState();
    if (!mainState || !tab) return;
};

/**
 * Creates a new tab and sets it as active
 */
export const createNewTab = () => {
    const newTab = createTabState();
    if (!newTab) return;

    tabs.push(newTab);
    
    // Created tab for animation
    newlyCreatedTabId = newTab.id;
    
    switchTab(newTab.id);

    // Setup canvas for new tab
    const mainState = getState();
    mainState.activeTab = newTab;

    try {
        setupCanvas();
        initSVG();
        setupCanvasListeners();
        saveToHistory();
        requestRedraw();
    } catch (error) {
        console.error('Error setting up new tab:', error);
    }
};

/**
 * Switches to a specific tab
 * @param {string} tabId - The ID of the tab to switch to
 */
export const switchTab = (tabId) => {
    if (activeTabId === tabId) return;

    const previousTab = getActiveTab();
    const newTab = tabs.find(tab => tab.id === tabId);
    
    if (!newTab) {
        console.error(`Tab ${tabId} not found`);
        return;
    }

    if (previousTab) {
        // Don't call syncTabWithGlobalState to let each tab keep its own state
        // Cleanup listeners on previous tab
        if (previousTab.canvasContainer && previousTab.canvasContainer._cleanupListeners) {
            cleanupCanvasListeners(previousTab.canvasContainer);
        }
    }

    // Update active tab
    activeTabId = tabId;

    syncGlobalStateWithTab(newTab);

    // Update DOM visibility
    document.querySelectorAll('.canvas-container').forEach(container => {
        container.classList.remove('active');
        container.style.display = 'none';
    });

    if (newTab.canvasContainer) {
        newTab.canvasContainer.classList.add('active');
        newTab.canvasContainer.style.display = 'block';
    }

    // Update tab buttons
    renderTabs();

    try {
        setupCanvas();
        setupCanvasListeners();
        
        // IMPORTANT: Update the visual transform to match the tab's zoom/pan state
        if (typeof window.updateViewTransform === 'function') {
            window.updateViewTransform();
        } else {
            // Fallback if function not exposed
            import('./canvas.js').then(m => {
                if (m.updateViewTransform) {
                    m.updateViewTransform();
                }
            });
        }
        
        requestRedraw();
    } catch (error) {
        console.error('Error switching tab:', error);
    }
};

/**
 * Closes a specific tab with proper cleanup
 * @param {string} tabId - The ID of the tab to close
 */
export const closeTab = (tabId) => {
    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    // Prevent closing last tab
    if (tabs.length === 1) {
        console.warn('Cannot close the last tab');
        return;
    }

    const tabToClose = tabs[tabIndex];
    
    // Clean up event listeners
    if (tabToClose.canvasContainer) {
        cleanupCanvasListeners(tabToClose.canvasContainer);
    }
    
    // Clean up sticky notes
    if (tabToClose.stickyNotes && Array.isArray(tabToClose.stickyNotes)) {
        tabToClose.stickyNotes.forEach(note => {
            if (note && typeof note.remove === 'function') {
                note.remove();
            }
        });
        tabToClose.stickyNotes = [];
    }

    // Clean up SVG
    if (tabToClose.svg && tabToClose.svg.parentNode) {
        tabToClose.svg.parentNode.removeChild(tabToClose.svg);
    }

    // Clean up DOM
    if (tabToClose.canvasContainer && tabToClose.canvasContainer.parentNode) {
        tabToClose.canvasContainer.parentNode.removeChild(tabToClose.canvasContainer);
    }

    // Clean up zoom/pan animation state
    try {
        import('../controllers/zoomPan.js').then(m => {
            if (m.cleanupZoomState) {
                m.cleanupZoomState(tabToClose.id);
            }
        });
    } catch (error) {
        console.error('Error cleaning up zoom state:', error);
    }

    // Clean up history
    tabToClose.historyStack = [];
    tabToClose.points = [];

    // Clear localStorage for this tab
    try {
        const config = getConfig();
        if (config && config.storage && config.storage.PROJECT_KEY) {
            localStorage.removeItem(`${config.storage.PROJECT_KEY}-${tabToClose.id}`);
        }
    } catch (error) {
        console.error('Error cleaning up localStorage:', error);
    }

    // Remove from tabs array
    tabs.splice(tabIndex, 1);

    // If we closed the active tab, switch to another
    if (activeTabId === tabId) {
        const newIndex = Math.min(tabIndex, tabs.length - 1);
        if (tabs.length > 0) {
            switchTab(tabs[newIndex].id);
        }
    } else {
        renderTabs();
    }
};

/**
 * Returns the currently active tab object
 * @returns {object|null} The active tab state object or null if none
 */
export const getActiveTab = () => {
    return tabs.find(tab => tab.id === activeTabId) || null;
};

/**
 * Returns all tabs
 * @returns {Array<object>} Array of all tab objects
 */
export const getAllTabs = () => {
    return tabs;
};

/**
 * Updates the name of a tab
 * @param {string} tabId - Tab ID
 * @param {string} newName - New name for the tab
 */
export const renameTab = (tabId, newName) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
        tab.name = newName;
        renderTabs();
    }
};

/**
 * Initializes the tab system
 */
export const initializeTabs = () => {
    const newTabBtn = document.getElementById('new-tab-btn');
    const tabBar = document.getElementById('tab-bar');
    const canvasArea = document.getElementById('canvas-area');
    
    if (!newTabBtn) {
        console.error('new-tab-btn element not found');
        return;
    }

    newTabBtn.addEventListener('click', createNewTab);

    // Verify required DOM elements exist
    const canvasAreaElement = document.getElementById('canvas-area');
    const tabsContainer = document.getElementById('tabs-container');
    
    if (!canvasAreaElement) {
        console.error('canvas-area element not found - tabs cannot be created');
        return;
    }
    
    if (!tabsContainer) {
        console.error('tabs-container element not found - tab UI cannot be rendered');
        return;
    }

    tabsContainer.style.display = 'none';
    if (tabBar) tabBar.classList.remove('hidden');
    if (canvasArea) canvasArea.classList.add('single-tab');

    // Create the first tab
    const firstTab = createTabState();
    if (firstTab) {
        tabs.push(firstTab);
        switchTab(firstTab.id);
        
        const mainState = getState();
        mainState.activeTab = firstTab;
        
        try {
            setupCanvas();
            initSVG();
            setupCanvasListeners();
            saveToHistory();
            requestRedraw();
        } catch (error) {
            console.error('Error setting up first tab:', error);
        }
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + T: New tab
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            createNewTab();
        }
        
        // Ctrl/Cmd + W: Close tab - only if more than 1 tab
        if ((e.ctrlKey || e.metaKey) && e.key === 'w' && tabs.length > 1) {
            e.preventDefault();
            const activeTab = getActiveTab();
            if (activeTab) {
                closeTab(activeTab.id);
            }
        }

        // Ctrl/Cmd + Tab 
        if ((e.ctrlKey || e.metaKey) && e.key === 'Tab' && tabs.length > 1) {
            e.preventDefault();
            const currentIndex = tabs.findIndex(t => t.id === activeTabId);
            const nextIndex = (currentIndex + 1) % tabs.length;
            switchTab(tabs[nextIndex].id);
        }
    });
};

/**
 * Gets tab count
 * @returns {number} Number of open tabs
 */
export const getTabCount = () => {
    return tabs.length;
};

/**
 * Finds a tab by ID
 * @param {string} tabId - Tab ID to find
 * @returns {object|null} Tab object or null
 */
export const findTabById = (tabId) => {
    return tabs.find(tab => tab.id === tabId) || null;
};