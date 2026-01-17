import { fetchJSON } from '../../../utils/fetch.js';

/**
 * Point interface
 */
export interface Point {
    x: number;
    y: number;
    pressure: number;
    timestamp: number;
}

/**
 * Sticky note interface
 */
export interface StickyNote {
    id: string;
    x: number;
    y: number;
    content: string;
    color: string;
}

/**
 * History state interface
 */
export interface HistoryState {
    imageData: ImageData;
    stickyNotes: StickyNote[];
    timestamp: number;
}

/**
 * Active tab state interface
 */
export interface ActiveTab {
    [key: string]: unknown;
}

/**
 * Global state interface
 */
export interface GlobalState {
    devicePixelRatio: number;
    dpr: number;
    historyStack: HistoryState[];
    historyIndex: number;
    stickyNotes: StickyNote[];
    scale: number;
    panX: number;
    panY: number;
    isInitialized: boolean;
    activeTab: ActiveTab | null;
    isDrawing: boolean;
    isShiftDown: boolean;
    isDraggingSticky: boolean;
}

/**
 * Paint configuration interface
 */
export interface PaintConfig {
    brushes: Record<string, unknown>;
    colors: Record<string, unknown>;
    canvas: Record<string, unknown>;
    tools: Record<string, unknown>;
}

/**
 * Object pools interface
 */
interface ObjectPools {
    points: Point[];
    transforms: unknown[];
}

/**
 * Configuration result interface
 */
export interface ConfigurationResult {
    config: Readonly<PaintConfig>;
    globalState: GlobalState;
}

let config: PaintConfig | null = null;
let globalState: GlobalState | null = null;
let loadingPromise: Promise<ConfigurationResult> | null = null;

/**
 * Object pools for frequently created objects
 */
const objectPools: ObjectPools = {
    points: [],
    transforms: []
};

/**
 * Creates a pool of preallocated objects
 */
const createObjectPool = <T>(factory: () => T, size: number): T[] => {
    const pool: T[] = [];
    for (let i = 0; i < size; i++) {
        pool.push(factory());
    }
    return pool;
};

/**
 * Deep freezes an object and all its nested properties
 */
const deepFreeze = <T>(obj: T): Readonly<T> => {
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(prop => {
        const key = prop as keyof T;
        if (obj[key] !== null
            && (typeof obj[key] === 'object' || typeof obj[key] === 'function')
            && !Object.isFrozen(obj[key])) {
            deepFreeze(obj[key] as Record<string, unknown>);
        }
    });
    return obj;
};

/**
 * Loads configuration files and initializes global state
 */
export const loadConfiguration = async (): Promise<ConfigurationResult> => {
    if (loadingPromise) {
        return loadingPromise;
    }

    // Return cached result if already loaded
    if (config && globalState) {
        return { config, globalState };
    }

    loadingPromise = (async (): Promise<ConfigurationResult> => {
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

            config = Object.freeze(results[0] as PaintConfig); // Prevent accidental mutations
            globalState = results[1] as GlobalState;

            globalState.devicePixelRatio = window.devicePixelRatio || 1;

            globalState.historyStack = new Array<HistoryState>(100); // Preallocate for 100 history states
            globalState.historyStack.length = 0;
            globalState.historyIndex = -1;

            globalState.stickyNotes = new Array<StickyNote>(50); // Preallocate for 50 notes
            globalState.stickyNotes.length = 0;

            globalState.scale = 1;
            globalState.panX = 0;
            globalState.panY = 0;
            globalState.isInitialized = false;
            globalState.activeTab = null;
            globalState.isDrawing = false;
            globalState.isShiftDown = false;
            globalState.isDraggingSticky = false;

            // Cache devicePixelRatio to avoid repeated property access
            Object.defineProperty(globalState, 'dpr', {
                get: () => globalState!.devicePixelRatio,
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
 * Gets the frozen configuration object
 */
export const getConfig = (): Readonly<PaintConfig> | null => config;

/**
 * Gets the mutable global state object
 */
export const getState = (): GlobalState | null => globalState;

/**
 * Checks if configuration is loaded and ready
 */
export const isReady = (): boolean => config !== null && globalState !== null;

/**
 * Waits for configuration to be loaded
 */
export const waitForReady = async (): Promise<ConfigurationResult> => {
    if (isReady() && config && globalState) {
        return { config, globalState };
    }
    return loadConfiguration();
};

/**
 * Updates global state with new values
 */
export const updateState = (updates: Partial<GlobalState>): void => {
    if (!globalState) {
        throw new Error(
            'Cannot update state: configuration not loaded. Call loadConfiguration() first.'
        );
    }
    Object.assign(globalState, updates);
};

/**
 * Cleans up state arrays to prevent memory leaks
 */
export const cleanupState = (): void => {
    if (globalState) {
        globalState.historyStack.length = 0;
        globalState.stickyNotes.length = 0;
    }
};