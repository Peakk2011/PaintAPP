import { fetchJSON } from '../../../utils/fetch.js';

/**
 * @typedef {Object} PaintConfig
 * @property {Object} brushes                   - Brush configurations
 * @property {Object} colors                    - Color palette settings
 * @property {Object} canvas                    - Canvas default settings
 * @property {Object} tools                     - Tool configurations
 */

/**
 * @typedef {Object} Point
 * @property {number} x                         - X coordinate
 * @property {number} y                         - Y coordinate
 * @property {number} pressure                  - Pressure value (0-1)
 * @property {number} timestamp                 - Timestamp of the point
 */

/**
 * @typedef {Object} StickyNote
 * @property {string} id                        - Unique identifier
 * @property {number} x                         - X position
 * @property {number} y                         - Y position
 * @property {string} content                   - Note content
 * @property {string} color                     - Note background color
 */

/**
 * @typedef {Object} HistoryState
 * @property {ImageData} imageData              - Canvas image data
 * @property {Array<StickyNote>} stickyNotes    - Snapshot of sticky notes
 * @property {number} timestamp                 - Time of state capture
 */

/**
 * @typedef {Object} GlobalState
 * @property {number} devicePixelRatio          - Device pixel ratio
 * @property {number} dpr                       - Cached device pixel ratio getter
 * @property {Array<HistoryState>} historyStack - Undo/redo history stack
 * @property {number} historyIndex              - Current position in history
 * @property {Array<Point>} points              - Current drawing points
 * @property {Array<StickyNote>} stickyNotes    - Active sticky notes
 * @property {number} scale                     - Canvas zoom scale
 * @property {number} panX                      - Canvas pan X offset
 * @property {number} panY                      - Canvas pan Y offset
 * @property {boolean} isInitialized            - Initialization status
 */

/**
 * @typedef {Object} ObjectPools
 * @property {Array<Point>} points              - Pool of reusable point objects
 * @property {Array<Object>} transforms         - Pool of reusable transform objects
 */

/**
 * @typedef {Object} ConfigurationResult
 * @property {Readonly<PaintConfig>} config     - Frozen configuration object
 * @property {GlobalState} globalState          - Mutable global state
 */

/**
 * @type {PaintConfig|null}
 */
let config = null;

/**
 * @type {GlobalState|null}
 */
let globalState = null;

/**
 * @type {Promise<ConfigurationResult>|null}
 */
let loadingPromise = null;

/**
 * Object pools for frequently created objects
 * @type {ObjectPools}
 */
const objectPools = {
    points: [],
    transforms: []
};

/**
 * Creates a pool of preallocated objects
 * @template T
 * @param {() => T} factory - Factory function to create objects
 * @param {number} size - Initial pool size
 * @returns {Array<T>} Array of preallocated objects
 */
const createObjectPool = (factory, size) => {
    const pool = [];
    for (let i = 0; i < size; i++) {
        pool.push(factory());
    }
    return pool;
};

/**
 * Loads configuration files and initializes global state
 * @async
 * @returns {Promise<ConfigurationResult>} Configuration and global state
 * @throws {Error} If configuration files fail to load
 */
export const loadConfiguration = async () => {
    if (loadingPromise) {
        return loadingPromise;
    }

    // Return cached result if already loaded
    if (config && globalState) {
        return { config, globalState };
    }

    loadingPromise = (async () => {
        try {
            const results = await Promise.all([
                fetchJSON('frontend/data/content/paint_config.json', {
                    cache: true,
                    cacheTTL: 600000,
                    retry: 2
                }),
                fetchJSON('frontend/data/content/global_paint_utility.json', {
                    cache: true,
                    cacheTTL: 600000,
                    retry: 2
                })
            ]);

            config = Object.freeze(results[0]); // Prevent accidental mutations
            globalState = results[1];

            globalState.devicePixelRatio = window.devicePixelRatio || 1;

            globalState.historyStack = new Array(100); // Preallocate for 100 history states
            globalState.historyStack.length = 0;
            globalState.historyIndex = -1;

            globalState.points = new Array(1000); // Preallocate for 1000 points
            globalState.points.length = 0;

            globalState.stickyNotes = new Array(50); // Preallocate for 50 notes
            globalState.stickyNotes.length = 0;

            globalState.scale = 1;
            globalState.panX = 0;
            globalState.panY = 0;
            globalState.isInitialized = false;

            // Cache devicePixelRatio to avoid repeated property access
            Object.defineProperty(globalState, 'dpr', {
                get: () => globalState.devicePixelRatio,
                configurable: false,
                enumerable: true
            });

            // Freeze config deeply to enable V8 optimizations
            deepFreeze(config);

            return { config, globalState };
        } catch (error) {
            console.error('Failed to load configuration:', error);
            loadingPromise = null; // Reset on error to allow retry
            throw error;
        }
    })();

    return loadingPromise;
};

/**
 * Deep freezes an object and all its nested properties
 * @template T
 * @param {T} obj - Object to freeze
 * @returns {Readonly<T>} Deeply frozen object
 */
const deepFreeze = (obj) => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null
            && (typeof obj[prop] === 'object' || typeof obj[prop] === 'function')
            && !Object.isFrozen(obj[prop])) {
            deepFreeze(obj[prop]);
        }
    });
    return obj;
};

/**
 * Gets the frozen configuration object
 * @returns {Readonly<PaintConfig>|null} Configuration object or null if not loaded
 */
export const getConfig = () => config;

/**
 * Gets the mutable global state object
 * @returns {GlobalState|null} Global state object or null if not initialized
 */
export const getState = () => globalState;

/**
 * Checks if configuration is loaded and ready
 * @returns {boolean} True if both config and state are initialized
 */
export const isReady = () => config !== null && globalState !== null;

/**
 * Waits for configuration to be loaded
 * @async
 * @returns {Promise<ConfigurationResult>} Resolves when configuration is ready
 */
export const waitForReady = async () => {
    if (isReady()) {
        return { config, globalState };
    }
    return loadConfiguration();
};

/**
 * Updates global state with new values
 * @param {Partial<GlobalState>} updates - Partial state updates to apply
 * @returns {void}
 * @throws {Error} If state is not initialized
 */
export const updateState = (updates) => {
    if (!globalState) {
        throw new Error(
            'Cannot update state: configuration not loaded. Call loadConfiguration() first.'
        );
    }
    Object.assign(globalState, updates);
};

/**
 * Cleans up state arrays to prevent memory leaks
 * @returns {void}
 */
export const cleanupState = () => {
    if (globalState) {
        globalState.historyStack.length = 0;
        globalState.points.length = 0;
        globalState.stickyNotes.length = 0;
    }
};