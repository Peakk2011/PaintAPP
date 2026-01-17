/**
 * Mintkit Fetch API with caching, retry logic, and optimizations
 * @module FetchAPI
 * @author Mint Teams
 * @version 2.0.0
 */

/**
 * Cache entry interface
 */
interface CacheEntry {
    data: unknown;
    timestamp: number;
}

/**
 * Fetch JSON options
 */
export interface FetchJSONOptions {
    cache?: boolean;
    cacheTTL?: number;
    timeout?: number;
    retry?: number;
    retryDelay?: number;
    headers?: HeadersInit;
    mode?: RequestMode;
    credentials?: RequestCredentials;
    requestCache?: RequestCache;
}

/**
 * Batch fetch options
 */
export interface BatchFetchOptions {
    concurrency?: number;
    stopOnError?: boolean;
    onProgress?: (completed: number, total: number) => void;
}

/**
 * Batch fetch result
 */
export interface BatchFetchResult {
    data: unknown;
    url: string;
    error: Error | null;
    success: boolean;
}

/**
 * Fetch with progress options
 */
export interface FetchWithProgressOptions {
    onProgress?: (loaded: number, total: number) => void;
    onUploadProgress?: (loaded: number, total: number) => void;
    timeout?: number;
    headers?: Record<string, string>;
}

/**
 * Memory cache for JSON responses
 */
const cache = new Map<string, CacheEntry>();

/**
 * Pending requests to prevent duplicate fetches
 */
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Fetches and parses JSON with advanced features including caching,
 * request deduplication, retry logic, and timeout handling.
 */
export const fetchJSON = async (
    url: string,
    options: FetchJSONOptions = {}
): Promise<unknown> => {
    const {
        cache: useCache = true,
        cacheTTL = 300000,
        timeout = 10000,
        retry = 0,
        retryDelay = 1000,
        headers = {},
        ...fetchOptions
    } = options;

    // Check cache first
    if (useCache) {
        const cached = cache.get(url);
        if (cached && Date.now() - cached.timestamp < cacheTTL) {
            return cached.data;
        }
    }

    // Request deduplication - prevent multiple identical requests
    if (pendingRequests.has(url)) {
        return pendingRequests.get(url);
    }

    const request = (async (): Promise<unknown> => {
        let lastError: Error | unknown;

        for (let attempt = 0; attempt <= retry; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    ...fetchOptions,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(headers as Record<string, string>)
                    },
                    signal: controller.signal
                } as RequestInit);

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Cache the result
                if (useCache) {
                    cache.set(url, {
                        data,
                        timestamp: Date.now()
                    });
                }

                pendingRequests.delete(url);
                return data;

            } catch (error) {
                lastError = error;

                // Don't retry if aborted or not a network error
                if ((error as Error)?.name === 'AbortError' || attempt === retry) {
                    break;
                }

                // Exponential backoff
                await new Promise(resolve =>
                    setTimeout(resolve, retryDelay * Math.pow(2, attempt))
                );
            }
        }

        pendingRequests.delete(url);
        throw lastError;
    })();

    pendingRequests.set(url, request);
    return request;
};

/**
 * Fetches multiple URLs in parallel with concurrency control.
 */
export const batchFetchJSON = async (
    urls: string[],
    options: FetchJSONOptions & BatchFetchOptions = {}
): Promise<BatchFetchResult[]> => {
    
    const {
        concurrency = 5,
        stopOnError = false,
        onProgress = null,
        ...fetchOptions
    } = options;

    const results: BatchFetchResult[] = [];
    let completed = 0;

    /**
     * Process a single URL
     */
    const processURL = async (url: string): Promise<BatchFetchResult> => {
        try {
            const data = await fetchJSON(url, fetchOptions);
            completed++;
            if (onProgress) onProgress(completed, urls.length);
            return { url, data, error: null, success: true };
        } catch (error) {
            completed++;
            if (onProgress) onProgress(completed, urls.length);
            if (stopOnError) throw error;
            return { url, data: null, error: error as Error, success: false };
        }
    };

    // Process URLs with concurrency limit
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchResults = await Promise.all(batch.map(processURL));
        results.push(...batchResults);
    }

    return results;
};

/**
 * Preloads a JSON resource and stores it in cache for later use.
 */
export const preloadJSON = async (
    url: string,
    options: FetchJSONOptions = {}
): Promise<void> => {
    await fetchJSON(url, { ...options, cache: true });
};

/**
 * Clears the cache for a specific URL or all cached entries.
 */
export const clearCache = (url?: string): boolean => {
    if (url) {
        return cache.delete(url);
    }
    cache.clear();
    return true;
};

/**
 * Gets the current cache size.
 */
export const getCacheSize = (): number => cache.size;

/**
 * Checks if a URL is currently cached and not expired.
 */
export const isCached = (url: string, cacheTTL: number = 300000): boolean => {
    const cached = cache.get(url);
    return cached !== undefined && Date.now() - cached.timestamp < cacheTTL;
};

/**
 * Fetches with low-level control using XMLHttpRequest.
 */
export const fetchJSONWithProgress = (
    url: string,
    options: FetchWithProgressOptions = {}
): Promise<unknown> => {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const {
            onProgress,
            onUploadProgress,
            timeout = 10000,
            headers = {}
        } = options;

        xhr.open('GET', url, true);
        xhr.timeout = timeout;
        xhr.responseType = 'json';

        // Set headers
        Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
        });

        // Download progress
        if (onProgress) {
            xhr.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    onProgress(e.loaded, e.total);
                }
            });
        }

        // Upload progress
        if (onUploadProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    onUploadProgress(e.loaded, e.total);
                }
            });
        }

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response);
            } else {
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error'));
        });

        xhr.addEventListener('timeout', () => {
            reject(new Error('Request timeout'));
        });

        xhr.send();
    });
};