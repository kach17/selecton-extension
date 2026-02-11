/**
 * Lazy Feature Loading System for Selecton Extension
 * Only initializes features when they're actually needed
 */
class LazyFeatureLoader {
    constructor() {
        this.loadedFeatures = new Set();
        this.featureInitializers = new Map();
        this.featureFlags = new Map();
    }

    /**
     * Register a feature with its initialization function
     */
    register(featureName, initializer, dependencies = []) {
        this.featureInitializers.set(featureName, {
            initializer,
            dependencies,
            initialized: false
        });
    }

    /**
     * Check if a feature should be enabled based on configs
     */
    shouldEnable(featureName, configs) {
        switch (featureName) {
            case 'currency':
                return configs.convertCurrencies;
            case 'translation':
                return configs.showTranslateButton;
            case 'markers':
                return configs.addMarkerButton;
            case 'search':
                return configs.showSearchButton;
            case 'copy':
                return configs.showCopyButton;
            case 'calendar':
                return configs.addCalendarButton;
            case 'dictionary':
                return configs.showDictionaryButton;
            case 'formatting':
                return configs.addFontFormatButtons;
            case 'sharing':
                return configs.showShareButton;
            default:
                return false;
        }
    }

    /**
     * Load a feature only when needed
     */
    async loadFeature(featureName) {
        if (this.loadedFeatures.has(featureName)) {
            return true;
        }

        const featureInfo = this.featureInitializers.get(featureName);
        if (!featureInfo) {
            console.warn(`Selecton: Feature ${featureName} not registered`);
            return false;
        }

        try {
            // Load dependencies first
            for (const dep of featureInfo.dependencies) {
                await this.loadFeature(dep);
            }

            // Initialize the feature
            if (typeof featureInfo.initializer === 'function') {
                await featureInfo.initializer();
            }

            featureInfo.initialized = true;
            this.loadedFeatures.add(featureName);
            
            if (configs.debugMode) {
                console.log(`Selecton: Lazy loaded feature: ${featureName}`);
            }
            
            return true;
        } catch (error) {
            console.error(`Selecton: Failed to load feature ${featureName}:`, error);
            return false;
        }
    }

    /**
     * Initialize features based on current configuration
     */
    async initializeEnabledFeatures(configs) {
        const featuresToLoad = [];
        
        // Check each feature and prepare for loading
        for (const [featureName] of this.featureInitializers) {
            if (this.shouldEnable(featureName, configs)) {
                featuresToLoad.push(featureName);
            }
        }

        // Load features in parallel where possible
        const loadPromises = featuresToLoad.map(feature => this.loadFeature(feature));
        await Promise.all(loadPromises);

        if (configs.debugMode) {
            console.log(`Selecton: Loaded ${featuresToLoad.length} features:`, featuresToLoad);
        }
    }

    /**
     * Get feature loading statistics
     */
    getStats() {
        return {
            totalFeatures: this.featureInitializers.size,
            loadedFeatures: this.loadedFeatures.size,
            pendingFeatures: this.featureInitializers.size - this.loadedFeatures.size
        };
    }

    /**
     * Preload critical features
     */
    async preloadCriticalFeatures() {
        const criticalFeatures = ['core', 'events'];
        for (const feature of criticalFeatures) {
            await this.loadFeature(feature);
        }
    }
}

// Global feature loader instance
let globalFeatureLoader = null;

/**
 * Get or create the global feature loader
 */
function getFeatureLoader() {
    if (!globalFeatureLoader) {
        globalFeatureLoader = new LazyFeatureLoader();
        
        // Register all features with their initialization functions
        globalFeatureLoader.register('currency', async () => {
            // Currency feature initialization - only load when actually needed
            if (typeof fetchCurrencyRates === 'function') {
                // Only fetch rates if currency conversion is enabled
                if (configs.convertCurrencies) {
                    let updateRatesEveryDays = configs.updateRatesEveryDays;
                    if (updateRatesEveryDays < 7) updateRatesEveryDays = 7;

                    ratesLastFetchedDate = configs.ratesLastFetchedDate;

                    if (ratesLastFetchedDate == null || ratesLastFetchedDate == undefined || ratesLastFetchedDate == '')
                        fetchCurrencyRates();
                    else {
                        let today = new Date();
                        let dayOfNextFetch = new Date(ratesLastFetchedDate);
                        const oneDayInMilliseconds = 1000 * 60 * 60 * 24;

                        if (configs.debugMode) {
                            console.log('--- Check dates to update currency rates ---');
                            console.log('Today: ' + today);
                            console.log('Date of last fetch: ' + dayOfNextFetch);
                        }

                        today = today.getTime();
                        dayOfNextFetch = new Date(dayOfNextFetch.getTime() + (updateRatesEveryDays * oneDayInMilliseconds));

                        if (configs.debugMode) {
                            console.log('Rates update interval: ' + updateRatesEveryDays);
                            console.log('Date of next fetch: ' + dayOfNextFetch);
                            console.log('--- Finished checking dates ---');
                        }

                        loadCurrencyRatesFromMemory();
                        if (today >= dayOfNextFetch) {
                            if (configs.debugMode) console.log('Trying to fetch updated currency rates...');
                            fetchCurrencyRates(); /// update rates from server
                        } 
                    }
                }
            }
        });

        globalFeatureLoader.register('translation', async () => {
            // Translation feature initialization
            if (typeof loadTranslatedLabels === 'function') {
                loadTranslatedLabels();
            }
        });

        globalFeatureLoader.register('markers', async () => {
            // Markers feature initialization
            if (typeof initMarkersRestore === 'function') {
                initMarkersRestore();
            }
        });

        globalFeatureLoader.register('search', async () => {
            // Search feature initialization
            // Search functionality is built into tooltip creation
        });

        globalFeatureLoader.register('copy', async () => {
            // Copy feature initialization
            // Copy functionality is built into tooltip creation
        });

        globalFeatureLoader.register('calendar', async () => {
            // Calendar feature initialization
            // Calendar functionality is built into contextual buttons
        });

        globalFeatureLoader.register('dictionary', async () => {
            // Dictionary feature initialization
            // Dictionary functionality is built into contextual buttons
        });

        globalFeatureLoader.register('formatting', async () => {
            // Formatting feature initialization
            // Formatting functionality is built into contextual buttons
        });

        globalFeatureLoader.register('sharing', async () => {
            // Sharing feature initialization
            // Sharing functionality is built into contextual buttons
        });
    }
    return globalFeatureLoader;
}

/**
 * Initialize lazy loading system
 */
async function initializeLazyFeatures(configs) {
    const loader = getFeatureLoader();
    
    // Preload critical features first
    await loader.preloadCriticalFeatures();
    
    // Then load enabled features based on configuration
    await loader.initializeEnabledFeatures(configs);
    
    return loader;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LazyFeatureLoader, getFeatureLoader, initializeLazyFeatures };
}
