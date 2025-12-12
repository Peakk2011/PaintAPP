import { fetchJSON } from '../../../utils/fetch.js';

let config = null;
let globalState = null;

export const loadConfiguration = async () => {
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

        config = results[0];
        globalState = results[1];

        // Initialize state
        globalState.devicePixelRatio = window.devicePixelRatio || 1;
        globalState.historyStack = [];
        globalState.historyIndex = -1;
        globalState.points = [];
        globalState.stickyNotes = [];
        globalState.scale = 1;
        globalState.panX = 0;
        globalState.panY = 0;
        globalState.isInitialized = false;

        return { config, globalState };
    } catch (error) {
        console.error('Failed to load configuration:', error);
        throw error;
    }
}

export const getConfig = () => {
    return config;
}

export const getState = () => {
    return globalState;
}