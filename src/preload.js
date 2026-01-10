import { contextBridge, ipcRenderer } from 'electron';

// Whitelist channels
const vaild_channels = {
    send: [
        'show-context-menu',
        'window-minimize',
        'window-maximize',
        'window-close',
        'save-file',
        'open-file',
        'export-image'
    ],
    receive: [
        'file-opened',
        'file-saved',
        'menu-action',
        'theme-changed'
    ]
};

// Validate channel
const isValidChannel = (channel, type) => {
    return vaild_channels[type]?.includes(channel);
};

// Expose to renderer process
contextBridge.exposeInMainWorld('electron', {
    // IPC Communication with validation
    ipcRenderer: {
        // Send to main process
        send: (channel, ...args) => {
            if (isValidChannel(channel, 'send')) {
                ipcRenderer.send(channel, ...args);
            } else {
                console.warn(`Invalid send channel: ${channel}`);
            }
        },

        // Receive from main process
        on: (channel, listener) => {
            if (isValidChannel(channel, 'receive')) {
                const subscription = (event, ...args) => listener(...args);
                ipcRenderer.on(channel, subscription);

                // Return unsubscribe function
                return () => {
                    ipcRenderer.removeListener(channel, subscription);
                };
            } else {
                console.warn(`Invalid receive channel: ${channel}`);
                return () => { }; // noop unsubscribe
            }
        },

        // One-time listener
        once: (channel, listener) => {
            if (isValidChannel(channel, 'receive')) {
                ipcRenderer.once(channel, (event, ...args) => listener(...args));
            } else {
                console.warn(`Invalid once channel: ${channel}`);
            }
        },

        // Invoke (request-response pattern)
        invoke: async (channel, ...args) => {
            if (isValidChannel(channel, 'send')) {
                return await ipcRenderer.invoke(channel, ...args);
            } else {
                console.warn(`Invalid invoke channel: ${channel}`);
                throw new Error(`Invalid channel: ${channel}`);
            }
        }
    },

    // Platform info (cached)
    platform: process.platform,
    isMac: process.platform === 'darwin',
    isWindows: process.platform === 'win32',
    isLinux: process.platform === 'linux',

    // Process info
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});

// Preload detection
if (window.performance && window.performance.mark) {
    window.performance.mark('preload-complete');
}

window.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add(`platform-${process.platform}`);
});
