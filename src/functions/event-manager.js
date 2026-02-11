/**
 * Centralized Event Manager to prevent memory leaks
 * Tracks all event listeners and provides cleanup methods
 */
class EventManager {
    constructor() {
        this.listeners = new Map();
        this.isDestroyed = false;
    }

    /**
     * Add event listener with tracking
     */
    add(element, event, handler, options) {
        if (this.isDestroyed) return;

        const key = `${element.constructor.name}-${event}`;
        
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        const listenerInfo = {
            element,
            event,
            handler,
            options,
            id: Math.random().toString(36).substr(2, 9)
        };

        this.listeners.get(key).push(listenerInfo);
        element.addEventListener(event, handler, options);

        return listenerInfo.id;
    }

    /**
     * Remove specific event listener
     */
    remove(element, event, handler) {
        const key = `${element.constructor.name}-${event}`;
        const listeners = this.listeners.get(key);
        
        if (listeners) {
            const index = listeners.findIndex(l => l.handler === handler);
            if (index !== -1) {
                listeners.splice(index, 1);
                element.removeEventListener(event, handler);
                
                if (listeners.length === 0) {
                    this.listeners.delete(key);
                }
            }
        }
    }

    /**
     * Remove listener by ID
     */
    removeById(id) {
        for (const [key, listeners] of this.listeners) {
            const index = listeners.findIndex(l => l.id === id);
            if (index !== -1) {
                const { element, event, handler } = listeners[index];
                listeners.splice(index, 1);
                element.removeEventListener(event, handler);
                
                if (listeners.length === 0) {
                    this.listeners.delete(key);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Remove all listeners for a specific element
     */
    removeAllForElement(element) {
        const toRemove = [];
        
        for (const [key, listeners] of this.listeners) {
            const elementListeners = listeners.filter(l => l.element === element);
            toRemove.push(...elementListeners);
        }

        toRemove.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });

        // Clean up the tracking
        for (const [key, listeners] of this.listeners) {
            const filtered = listeners.filter(l => l.element !== element);
            if (filtered.length === 0) {
                this.listeners.delete(key);
            } else {
                this.listeners.set(key, filtered);
            }
        }
    }

    /**
     * Remove all listeners (cleanup)
     */
    destroy() {
        if (this.isDestroyed) return;

        for (const [key, listeners] of this.listeners) {
            listeners.forEach(({ element, event, handler }) => {
                try {
                    element.removeEventListener(event, handler);
                } catch (e) {
                    console.warn('Error removing event listener:', e);
                }
            });
        }

        this.listeners.clear();
        this.isDestroyed = true;
    }

    /**
     * Get listener count for debugging
     */
    getListenerCount() {
        let count = 0;
        for (const listeners of this.listeners.values()) {
            count += listeners.length;
        }
        return count;
    }

    /**
     * Log all active listeners for debugging
     */
    logListeners() {
        console.log('Active Event Listeners:');
        for (const [key, listeners] of this.listeners) {
            console.log(`${key}: ${listeners.length} listeners`);
        }
    }
}

// Global event manager instance
let globalEventManager = null;

/**
 * Get or create the global event manager
 */
function getEventManager() {
    if (!globalEventManager) {
        globalEventManager = new EventManager();
    }
    return globalEventManager;
}

/**
 * Cleanup function to be called when extension is disabled/unloaded
 */
function cleanupEventListeners() {
    if (globalEventManager) {
        globalEventManager.destroy();
        globalEventManager = null;
    }
}

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanupEventListeners);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventManager, getEventManager, cleanupEventListeners };
}
