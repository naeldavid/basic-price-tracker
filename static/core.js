// ===== WEBSOCKET MANAGER CLASS =====
class WebSocketManager {
    constructor() {
        this.connections = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.isOnline = navigator.onLine;
        this.setupNetworkListeners();
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.reconnectAll();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.closeAll();
        });
    }

    connect(url, options = {}) {
        if (!this.isOnline) return null;
        
        try {
            const ws = new WebSocket(url);
            const connectionId = Date.now() + Math.random();
            
            ws.onopen = () => {
                console.log('WebSocket connected:', url);
                this.reconnectAttempts = 0;
                if (options.onOpen) options.onOpen();
            };
            
            ws.onmessage = (event) => {
                if (options.onMessage) {
                    try {
                        const data = JSON.parse(event.data);
                        options.onMessage(data);
                    } catch (error) {
                        console.error('WebSocket message parse error:', error);
                    }
                }
            };
            
            ws.onclose = () => {
                console.log('WebSocket closed:', url);
                this.connections.delete(connectionId);
                if (options.onClose) options.onClose();
                this.attemptReconnect(url, options);
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (options.onError) options.onError(error);
            };
            
            this.connections.set(connectionId, { ws, url, options });
            return connectionId;
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            return null;
        }
    }

    attemptReconnect(url, options) {
        if (!this.isOnline || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        setTimeout(() => {
            console.log(`Reconnecting WebSocket (attempt ${this.reconnectAttempts})...`);
            this.connect(url, options);
        }, delay);
    }

    reconnectAll() {
        this.connections.forEach(({ url, options }) => {
            this.connect(url, options);
        });
    }

    closeAll() {
        this.connections.forEach(({ ws }) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        });
        this.connections.clear();
    }

    send(connectionId, data) {
        const connection = this.connections.get(connectionId);
        if (connection && connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }
}

// ===== PERFORMANCE MONITOR CLASS =====
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            apiCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            memoryUsage: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.startTime = Date.now();
        this.observers = [];
        this.setupPerformanceObserver();
    }

    setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach((entry) => {
                    if (entry.entryType === 'navigation') {
                        this.metrics.loadTime = entry.loadEventEnd - entry.loadEventStart;
                    }
                });
            });
            observer.observe({ entryTypes: ['navigation', 'resource'] });
        }
    }

    recordApiCall(responseTime, success = true) {
        this.metrics.apiCalls++;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.apiCalls;
        
        if (success) {
            this.metrics.successfulCalls++;
        } else {
            this.metrics.failedCalls++;
        }
        
        this.notifyObservers();
    }

    recordCacheHit(hit = true) {
        if (hit) {
            this.metrics.cacheHits++;
        } else {
            this.metrics.cacheMisses++;
        }
    }

    getMemoryUsage() {
        if ('memory' in performance) {
            this.metrics.memoryUsage = {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return this.metrics.memoryUsage;
    }

    getMetrics() {
        this.getMemoryUsage();
        return {
            ...this.metrics,
            uptime: Date.now() - this.startTime,
            successRate: this.metrics.apiCalls > 0 ? (this.metrics.successfulCalls / this.metrics.apiCalls) * 100 : 0,
            cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ? 
                (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0
        };
    }

    addObserver(callback) {
        this.observers.push(callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => callback(this.getMetrics()));
    }

    reset() {
        this.metrics = {
            apiCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            totalResponseTime: 0,
            averageResponseTime: 0,
            memoryUsage: 0,
            cacheHits: 0,
            cacheMisses: 0
        };
        this.startTime = Date.now();
    }
}

// ===== UNIVERSAL API CLASS =====
class UniversalAPI {
    constructor() {
        this.baseCurrency = localStorage.getItem('baseCurrency') || 'USD';
        this.wsManager = new WebSocketManager();
        this.performanceMonitor = new PerformanceMonitor();
        
        this.assets = {
            // Cryptocurrencies
            btc: { symbol: 'BTC', name: 'Bitcoin', emoji: '₿', type: 'crypto' },
            eth: { symbol: 'ETH', name: 'Ethereum', emoji: '⟠', type: 'crypto' },
            bnb: { symbol: 'BNB', name: 'Binance Coin', emoji: '🔶', type: 'crypto' },
            ada: { symbol: 'ADA', name: 'Cardano', emoji: '🌐', type: 'crypto' },
            sol: { symbol: 'SOL', name: 'Solana', emoji: '☀️', type: 'crypto' },
            xrp: { symbol: 'XRP', name: 'Ripple', emoji: '🌊', type: 'crypto' },
            dot: { symbol: 'DOT', name: 'Polkadot', emoji: '🔴', type: 'crypto' },
            doge: { symbol: 'DOGE', name: 'Dogecoin', emoji: '🐶', type: 'crypto' },
            avax: { symbol: 'AVAX', name: 'Avalanche', emoji: '⛰️', type: 'crypto' },
            matic: { symbol: 'MATIC', name: 'Polygon', emoji: '🔷', type: 'crypto' },
            
            // Precious Metals
            gold: { symbol: 'XAU', name: 'Gold', emoji: '🥇', type: 'metal' },
            silver: { symbol: 'XAG', name: 'Silver', emoji: '🥈', type: 'metal' },
            platinum: { symbol: 'XPT', name: 'Platinum', emoji: '⬜', type: 'metal' },
            palladium: { symbol: 'XPD', name: 'Palladium', emoji: '🔘', type: 'metal' },
            
            // Major Currencies
            usd_eur: { symbol: 'EUR', name: 'USD to Euro', emoji: '🇪🇺', type: 'currency' },
            usd_gbp: { symbol: 'GBP', name: 'USD to Pound', emoji: '🇬🇧', type: 'currency' },
            usd_jpy: { symbol: 'JPY', name: 'USD to Yen', emoji: '🇯🇵', type: 'currency' },
            usd_cad: { symbol: 'CAD', name: 'USD to Canadian Dollar', emoji: '🇨🇦', type: 'currency' },
            usd_aud: { symbol: 'AUD', name: 'USD to Australian Dollar', emoji: '🇦🇺', type: 'currency' },
            usd_chf: { symbol: 'CHF', name: 'USD to Swiss Franc', emoji: '🇨🇭', type: 'currency' },
            usd_cny: { symbol: 'CNY', name: 'USD to Chinese Yuan', emoji: '🇨🇳', type: 'currency' },
            usd_inr: { symbol: 'INR', name: 'USD to Indian Rupee', emoji: '🇮🇳', type: 'currency' },
            usd_aed: { symbol: 'AED', name: 'USD to UAE Dirham', emoji: '🇦🇪', type: 'currency' },
            usd_bhd: { symbol: 'BHD', name: 'USD to Bahraini Dinar', emoji: '🇧🇭', type: 'currency' },
            
            // World Currencies
            usd_krw: { symbol: 'KRW', name: 'USD to Korean Won', emoji: '🇰🇷', type: 'currency' },
            usd_brl: { symbol: 'BRL', name: 'USD to Brazilian Real', emoji: '🇧🇷', type: 'currency' },
            usd_mxn: { symbol: 'MXN', name: 'USD to Mexican Peso', emoji: '🇲🇽', type: 'currency' },
            usd_rub: { symbol: 'RUB', name: 'USD to Russian Ruble', emoji: '🇷🇺', type: 'currency' },
            usd_try: { symbol: 'TRY', name: 'USD to Turkish Lira', emoji: '🇹🇷', type: 'currency' },
            usd_zar: { symbol: 'ZAR', name: 'USD to South African Rand', emoji: '🇿🇦', type: 'currency' },
            usd_nok: { symbol: 'NOK', name: 'USD to Norwegian Krone', emoji: '🇳🇴', type: 'currency' },
            usd_sek: { symbol: 'SEK', name: 'USD to Swedish Krona', emoji: '🇸🇪', type: 'currency' },
            
            // Big Mac Index
            bigmac_us: { symbol: 'US', name: 'Big Mac USA', emoji: '🇺🇸', type: 'bigmac' },
            bigmac_uk: { symbol: 'UK', name: 'Big Mac UK', emoji: '🇬🇧', type: 'bigmac' },
            bigmac_jp: { symbol: 'JP', name: 'Big Mac Japan', emoji: '🇯🇵', type: 'bigmac' },
            bigmac_eu: { symbol: 'EU', name: 'Big Mac EU', emoji: '🇪🇺', type: 'bigmac' },
            bigmac_ca: { symbol: 'CA', name: 'Big Mac Canada', emoji: '🇨🇦', type: 'bigmac' }
        };
        
        this.fallbackPrices = {
            // Crypto
            btc: 43000, eth: 2600, bnb: 240, ada: 0.38, sol: 60, xrp: 0.52, dot: 5.2, doge: 0.08, avax: 12, matic: 0.75,
            // Metals
            gold: 2050, silver: 24.5, platinum: 950, palladium: 1200,
            // Major Currencies
            usd_eur: 0.92, usd_gbp: 0.79, usd_jpy: 150, usd_cad: 1.35, usd_aud: 1.52, usd_chf: 0.88, usd_cny: 7.25, usd_inr: 83.2, usd_aed: 3.67, usd_bhd: 0.38,
            // World Currencies
            usd_krw: 1320, usd_brl: 5.1, usd_mxn: 17.8, usd_rub: 92, usd_try: 29.5, usd_zar: 18.7, usd_nok: 10.8, usd_sek: 10.9,
            // Big Mac
            bigmac_us: 5.69, bigmac_uk: 4.89, bigmac_jp: 450, bigmac_eu: 5.15, bigmac_ca: 6.77
        };
        
        this.lastPrices = JSON.parse(localStorage.getItem('lastAssetPrices')) || this.fallbackPrices;
        this.userSelectedAssets = JSON.parse(localStorage.getItem('userSelectedAssets')) || [];
        this.apiCallCount = 0;
        this.rateLimitDelay = 1000;
        this.maxRetries = 3;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.circuitBreaker = {
            failures: 0,
            threshold: 5,
            timeout: 30000,
            state: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
        };
        this.setupServiceWorker();
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./static/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    console.log('Service Worker update found');
                });
            } catch (error) {
                console.warn('Service Worker registration failed:', error);
            }
        }
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'BACKGROUND_SYNC':
                if (data.action === 'PRICE_UPDATE_AVAILABLE') {
                    this.notifyPriceUpdate();
                }
                break;
        }
    }

    notifyPriceUpdate() {
        // Notify the main app about background price updates
        window.dispatchEvent(new CustomEvent('backgroundPriceUpdate'));
    }

    async fetchWithTimeout(url, timeout = 8000) {
        // Check circuit breaker
        if (this.circuitBreaker.state === 'OPEN') {
            if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.timeout) {
                throw new Error('Circuit breaker is OPEN');
            } else {
                this.circuitBreaker.state = 'HALF_OPEN';
            }
        }

        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 
                    'Accept': 'application/json',
                    'User-Agent': 'PriceTracker/2.0',
                    'Cache-Control': 'no-cache'
                }
            });
            clearTimeout(timeoutId);
            
            const responseTime = Date.now() - startTime;
            
            if (response.ok) {
                this.apiCallCount++;
                this.performanceMonitor.recordApiCall(responseTime, true);
                this.resetCircuitBreaker();
                
                const data = await response.json();
                
                // Cache successful response in service worker
                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'CACHE_PRICES',
                        data: data
                    });
                }
                
                return data;
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            this.performanceMonitor.recordApiCall(responseTime, false);
            this.recordCircuitBreakerFailure();
            throw error;
        }
    }

    resetCircuitBreaker() {
        this.circuitBreaker.failures = 0;
        this.circuitBreaker.state = 'CLOSED';
    }

    recordCircuitBreakerFailure() {
        this.circuitBreaker.failures++;
        this.circuitBreaker.lastFailure = Date.now();
        
        if (this.circuitBreaker.failures >= this.circuitBreaker.threshold) {
            this.circuitBreaker.state = 'OPEN';
            console.warn('Circuit breaker opened due to repeated failures');
        }
    }

    async rateLimitDelay() {
        if (this.apiCallCount > 0 && this.apiCallCount % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async queueRequest(requestFn) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const { requestFn, resolve, reject } = this.requestQueue.shift();
            
            try {
                await this.rateLimitDelay();
                const result = await requestFn();
                resolve(result);
            } catch (error) {
                reject(error);
            }
        }

        this.isProcessingQueue = false;
    }

    async fetchCryptoPrice(asset = 'btc') {
        const symbols = { 
            btc: 'BTC-USD', eth: 'ETH-USD', bnb: 'BNB-USD', ada: 'ADA-USD', 
            sol: 'SOL-USD', xrp: 'XRP-USD', dot: 'DOT-USD', doge: 'DOGE-USD', 
            avax: 'AVAX-USD', matic: 'MATIC-USD'
        };
        const symbol = symbols[asset];
        
        if (!symbol) throw new Error(`Unsupported crypto: ${asset}`);
        
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        
        const data = await this.fetchWithTimeout(apiUrl);
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price && price > 0) {
            console.log(`${asset.toUpperCase()}: $${price}`);
            return price;
        }
        
        throw new Error(`Failed to fetch ${asset} price`);
    }

    async fetchMetalPrice(asset) {
        const symbols = {
            gold: 'GC=F', silver: 'SI=F', platinum: 'PL=F', palladium: 'PA=F'
        };
        
        const symbol = symbols[asset];
        if (!symbol) throw new Error(`Unsupported metal: ${asset}`);
        
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        
        const data = await this.fetchWithTimeout(apiUrl);
        const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (price && price > 0) {
            console.log(`${asset}: $${price}`);
            return price;
        }
        
        throw new Error(`Failed to fetch ${asset} price`);
    }

    async fetchForexPrice(asset) {
        const symbols = {
            usd_eur: 'EURUSD=X', usd_gbp: 'GBPUSD=X', usd_jpy: 'USDJPY=X', usd_cad: 'USDCAD=X',
            usd_aud: 'AUDUSD=X', usd_chf: 'USDCHF=X', usd_cny: 'USDCNY=X', usd_inr: 'USDINR=X',
            usd_zar: 'USDZAR=X', usd_aed: 'USDAED=X', usd_bhd: 'USDBHD=X'
        };
        
        const symbol = symbols[asset];
        if (!symbol) throw new Error(`Unsupported forex: ${asset}`);
        
        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
        
        const data = await this.fetchWithTimeout(apiUrl);
        let rate = data.chart?.result?.[0]?.meta?.regularMarketPrice;
        
        if (asset.includes('eur') || asset.includes('gbp') || asset.includes('aud')) {
            rate = 1 / rate;
        }
        
        if (rate && rate > 0) {
            console.log(`${asset}: ${rate}`);
            return rate;
        }
        
        throw new Error(`Failed to fetch ${asset} rate`);
    }

    getBigMacPrice(asset) {
        const realPrices = {
            bigmac_us: 5.69, bigmac_uk: 4.89, bigmac_jp: 450, 
            bigmac_eu: 5.15, bigmac_ca: 6.77
        };
        
        const basePrice = realPrices[asset] || this.fallbackPrices[asset] || 5.0;
        const variation = (Math.random() - 0.5) * 0.02;
        const price = basePrice * (1 + variation);
        
        this.lastPrices[asset] = price;
        this.saveLastPrices();
        return price;
    }

    async fetchPrice(asset) {
        const assetInfo = this.assets[asset];
        if (!assetInfo) return this.fallbackPrices[asset] || 0;

        try {
            switch (assetInfo.type) {
                case 'crypto':
                    return await this.fetchCryptoPrice(asset);
                case 'metal':
                    return await this.fetchMetalPrice(asset);
                case 'currency':
                    return await this.fetchForexPrice(asset);
                case 'bigmac':
                    return this.getBigMacPrice(asset);
                default:
                    return this.fallbackPrices[asset] || 0;
            }
        } catch (error) {
            console.warn(`${asset} fetch failed:`, error);
            return this.lastPrices[asset] || this.fallbackPrices[asset] || 0;
        }
    }

    async fetchAllPrices() {
        const prices = {};
        const assets = this.userSelectedAssets;
        
        for (const asset of assets) {
            try {
                prices[asset] = await this.fetchPrice(asset);
                console.log(`Fetched ${asset}: ${prices[asset]}`);
            } catch (error) {
                console.error(`Failed to fetch ${asset}:`, error);
                throw error;
            }
        }
        
        return prices;
    }

    async fetchNews() {
        const newsApis = [
            'https://newsapi.org/v2/everything?q=bitcoin+gold+cryptocurrency&sortBy=publishedAt&apiKey=demo',
            'https://api.currentsapi.services/v1/latest-news?category=business&apiKey=demo'
        ];
        
        for (const apiUrl of newsApis) {
            try {
                const data = await this.fetchWithTimeout(apiUrl);
                if (data.articles && data.articles.length > 0) {
                    return data.articles.slice(0, 10);
                }
            } catch (error) {
                console.warn('News API failed:', error.message);
                continue;
            }
        }
        
        // Fallback news
        return [
            { title: "Bitcoin reaches new monthly high", source: { name: "CoinDesk" }, publishedAt: new Date().toISOString(), url: "https://www.coindesk.com" },
            { title: "Gold prices surge amid uncertainty", source: { name: "Reuters" }, publishedAt: new Date(Date.now() - 3600000).toISOString(), url: "https://www.reuters.com" },
            { title: "USD strengthens against major currencies", source: { name: "Bloomberg" }, publishedAt: new Date(Date.now() - 7200000).toISOString(), url: "https://www.bloomberg.com" },
            { title: "Big Mac Index shows global trends", source: { name: "The Economist" }, publishedAt: new Date(Date.now() - 10800000).toISOString(), url: "https://www.economist.com" },
            { title: "Cryptocurrency market shows resilience", source: { name: "CoinTelegraph" }, publishedAt: new Date(Date.now() - 14400000).toISOString(), url: "https://cointelegraph.com" }
        ];
    }

    saveLastPrices() {
        try {
            localStorage.setItem('lastAssetPrices', JSON.stringify(this.lastPrices));
        } catch (error) {
            console.warn('Failed to save prices to localStorage:', error);
        }
    }

    saveUserSelection(selectedAssets) {
        this.userSelectedAssets = selectedAssets;
        try {
            localStorage.setItem('userSelectedAssets', JSON.stringify(selectedAssets));
        } catch (error) {
            console.warn('Failed to save user selection:', error);
        }
    }

    getUserSelectedAssets() {
        return this.userSelectedAssets;
    }

    setBaseCurrency(currency) {
        this.baseCurrency = currency;
        try {
            localStorage.setItem('baseCurrency', currency);
        } catch (error) {
            console.warn('Failed to save base currency:', error);
        }
    }

    getBaseCurrency() {
        return this.baseCurrency;
    }

    getAssetInfo(asset) {
        return this.assets[asset];
    }

    getAllAssets() {
        return Object.keys(this.assets);
    }

    getAssetsByType(type) {
        return Object.keys(this.assets).filter(asset => this.assets[asset].type === type);
    }

    getApiStats() {
        return {
            totalCalls: this.apiCallCount,
            rateLimitDelay: this.rateLimitDelay,
            maxRetries: this.maxRetries,
            lastUpdate: new Date().toISOString()
        };
    }
}

// ===== DATA STORAGE CLASS =====
class DataStorage {
    constructor() {
        this.storageKey = 'priceTrackerData';
        this.historyKey = 'priceHistory';
        this.settingsKey = 'appSettings';
        this.maxHistoryItems = 10000;
        this.compressionEnabled = true;
    }

    compress(data) {
        if (!this.compressionEnabled) return JSON.stringify(data);
        
        try {
            const jsonString = JSON.stringify(data);
            // Simple compression by removing unnecessary whitespace and shortening keys
            return jsonString.replace(/\s+/g, '').replace(/"timestamp"/g, '"t"').replace(/"price"/g, '"p"').replace(/"asset"/g, '"a"');
        } catch (error) {
            console.warn('Compression failed:', error);
            return JSON.stringify(data);
        }
    }

    decompress(compressedData) {
        if (!this.compressionEnabled) return JSON.parse(compressedData);
        
        try {
            const restored = compressedData.replace(/"t"/g, '"timestamp"').replace(/"p"/g, '"price"').replace(/"a"/g, '"asset"');
            return JSON.parse(restored);
        } catch (error) {
            console.warn('Decompression failed:', error);
            return JSON.parse(compressedData);
        }
    }

    saveHistory(history, asset = 'default') {
        try {
            const key = `${this.historyKey}_${asset}`;
            const limitedHistory = history.slice(0, this.maxHistoryItems);
            const compressed = this.compress(limitedHistory);
            localStorage.setItem(key, compressed);
            
            // Also save to a master history index
            this.updateHistoryIndex(asset);
        } catch (error) {
            console.error('Failed to save history:', error);
            this.clearOldHistory();
        }
    }

    loadHistory(asset = 'default') {
        try {
            const key = `${this.historyKey}_${asset}`;
            const compressed = localStorage.getItem(key);
            if (!compressed) return [];
            
            return this.decompress(compressed);
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    }

    updateHistoryIndex(asset) {
        try {
            const indexKey = 'historyIndex';
            const index = JSON.parse(localStorage.getItem(indexKey) || '[]');
            if (!index.includes(asset)) {
                index.push(asset);
                localStorage.setItem(indexKey, JSON.stringify(index));
            }
        } catch (error) {
            console.warn('Failed to update history index:', error);
        }
    }

    getAllHistoryAssets() {
        try {
            const indexKey = 'historyIndex';
            return JSON.parse(localStorage.getItem(indexKey) || '[]');
        } catch (error) {
            return [];
        }
    }

    clearOldHistory() {
        try {
            const assets = this.getAllHistoryAssets();
            assets.forEach(asset => {
                const key = `${this.historyKey}_${asset}`;
                const history = this.loadHistory(asset);
                if (history.length > this.maxHistoryItems) {
                    const trimmed = history.slice(0, this.maxHistoryItems);
                    this.saveHistory(trimmed, asset);
                }
            });
        } catch (error) {
            console.error('Failed to clear old history:', error);
        }
    }

    saveSettings(settings) {
        try {
            const compressed = this.compress(settings);
            localStorage.setItem(this.settingsKey, compressed);
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    loadSettings() {
        try {
            const compressed = localStorage.getItem(this.settingsKey);
            if (!compressed) return this.getDefaultSettings();
            
            return { ...this.getDefaultSettings(), ...this.decompress(compressed) };
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.getDefaultSettings();
        }
    }

    getDefaultSettings() {
        return {
            theme: 'dark',
            autoRefresh: true,
            refreshInterval: 300000, // 5 minutes
            soundEnabled: true,
            notificationsEnabled: true,
            chartType: 'line',
            showAdvancedMetrics: false,
            compactView: false,
            animationsEnabled: true,
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    exportData() {
        try {
            const data = {
                settings: this.loadSettings(),
                assets: this.getAllHistoryAssets(),
                histories: {},
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            data.assets.forEach(asset => {
                data.histories[asset] = this.loadHistory(asset);
            });
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Failed to export data:', error);
            return null;
        }
    }

    importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.version && data.settings) {
                this.saveSettings(data.settings);
                
                if (data.histories) {
                    Object.keys(data.histories).forEach(asset => {
                        this.saveHistory(data.histories[asset], asset);
                    });
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    getStorageStats() {
        try {
            let totalSize = 0;
            let itemCount = 0;
            
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                    itemCount++;
                }
            }
            
            return {
                totalSize: totalSize,
                itemCount: itemCount,
                sizeInKB: Math.round(totalSize / 1024),
                maxSize: 5120, // 5MB typical limit
                usagePercent: Math.round((totalSize / (5120 * 1024)) * 100)
            };
        } catch (error) {
            return { error: 'Unable to calculate storage stats' };
        }
    }

    clearAllData() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.includes('priceTracker') || key.includes('priceHistory') || key.includes('appSettings')) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to clear data:', error);
            return false;
        }
    }
}

// ===== ANALYTICS CLASS =====
class Analytics {
    constructor() {
        this.indicators = {};
        this.patterns = [];
        this.predictions = {};
    }

    calculateMovingAverage(prices, period) {
        if (!prices || prices.length < period) return null;
        
        const validPrices = prices.filter(p => p && !isNaN(p)).slice(0, period);
        if (validPrices.length < period) return null;
        
        const sum = validPrices.reduce((acc, price) => acc + price, 0);
        return sum / validPrices.length;
    }

    calculateEMA(prices, period) {
        if (!prices || prices.length < period) return null;
        
        const validPrices = prices.filter(p => p && !isNaN(p));
        if (validPrices.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = validPrices[0];
        
        for (let i = 1; i < validPrices.length; i++) {
            ema = (validPrices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateRSI(prices, period = 14) {
        if (!prices || prices.length < period + 1) return null;
        
        const validPrices = prices.filter(p => p && !isNaN(p));
        if (validPrices.length < period + 1) return null;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = validPrices[i] - validPrices[i - 1];
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return Math.round(rsi * 100) / 100;
    }

    calculateVolatility(prices, period = 20) {
        if (!prices || prices.length < period) return 0;
        
        const validPrices = prices.filter(p => p && !isNaN(p)).slice(0, period);
        if (validPrices.length < 2) return 0;
        
        const returns = [];
        for (let i = 1; i < validPrices.length; i++) {
            const returnRate = (validPrices[i] - validPrices[i - 1]) / validPrices[i - 1];
            returns.push(returnRate);
        }
        
        const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
        
        return Math.round(volatility * 100) / 100;
    }

    calculateBollingerBands(prices, period = 20, stdDev = 2) {
        if (!prices || prices.length < period) return null;
        
        const validPrices = prices.filter(p => p && !isNaN(p)).slice(0, period);
        const sma = this.calculateMovingAverage(validPrices, period);
        
        if (!sma) return null;
        
        const squaredDiffs = validPrices.map(price => Math.pow(price - sma, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
        const standardDeviation = Math.sqrt(variance);
        
        return {
            upper: sma + (standardDeviation * stdDev),
            middle: sma,
            lower: sma - (standardDeviation * stdDev)
        };
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (!prices || prices.length < slowPeriod) return null;
        
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        if (!fastEMA || !slowEMA) return null;
        
        const macdLine = fastEMA - slowEMA;
        
        // For signal line, we'd need more historical MACD values
        // Simplified version
        return {
            macd: Math.round(macdLine * 10000) / 10000,
            signal: 0, // Would need historical data
            histogram: Math.round(macdLine * 10000) / 10000
        };
    }

    detectPatterns(prices) {
        if (!prices || prices.length < 10) return [];
        
        const patterns = [];
        const validPrices = prices.filter(p => p && !isNaN(p)).slice(0, 10);
        
        // Simple trend detection
        const firstHalf = validPrices.slice(0, 5);
        const secondHalf = validPrices.slice(5);
        
        const firstAvg = firstHalf.reduce((sum, p) => sum + p, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, p) => sum + p, 0) / secondHalf.length;
        
        const trendStrength = Math.abs((secondAvg - firstAvg) / firstAvg) * 100;
        
        if (secondAvg > firstAvg * 1.02) {
            patterns.push({
                type: 'uptrend',
                strength: Math.min(trendStrength, 100),
                confidence: trendStrength > 5 ? 'high' : 'medium'
            });
        } else if (secondAvg < firstAvg * 0.98) {
            patterns.push({
                type: 'downtrend',
                strength: Math.min(trendStrength, 100),
                confidence: trendStrength > 5 ? 'high' : 'medium'
            });
        } else {
            patterns.push({
                type: 'sideways',
                strength: 100 - trendStrength,
                confidence: 'medium'
            });
        }
        
        // Support/Resistance levels
        const maxPrice = Math.max(...validPrices);
        const minPrice = Math.min(...validPrices);
        const currentPrice = validPrices[0];
        
        if (currentPrice > maxPrice * 0.95) {
            patterns.push({
                type: 'near_resistance',
                level: maxPrice,
                distance: ((maxPrice - currentPrice) / currentPrice) * 100
            });
        }
        
        if (currentPrice < minPrice * 1.05) {
            patterns.push({
                type: 'near_support',
                level: minPrice,
                distance: ((currentPrice - minPrice) / currentPrice) * 100
            });
        }
        
        return patterns;
    }

    predictNextPrice(prices, method = 'linear') {
        if (!prices || prices.length < 3) return null;
        
        const validPrices = prices.filter(p => p && !isNaN(p)).slice(0, 10);
        if (validPrices.length < 3) return null;
        
        switch (method) {
            case 'linear':
                return this.linearRegression(validPrices);
            case 'moving_average':
                return this.movingAveragePrediction(validPrices);
            case 'exponential':
                return this.exponentialSmoothing(validPrices);
            default:
                return this.linearRegression(validPrices);
        }
    }

    linearRegression(prices) {
        const n = prices.length;
        const x = Array.from({ length: n }, (_, i) => i);
        const y = prices;
        
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        const nextX = n;
        const prediction = slope * nextX + intercept;
        
        return {
            value: Math.max(prediction, 0),
            confidence: this.calculatePredictionConfidence(prices, slope),
            method: 'linear_regression'
        };
    }

    movingAveragePrediction(prices) {
        const shortMA = this.calculateMovingAverage(prices, 3);
        const longMA = this.calculateMovingAverage(prices, 5);
        
        if (!shortMA || !longMA) return null;
        
        const trend = (shortMA - longMA) / longMA;
        const prediction = prices[0] * (1 + trend);
        
        return {
            value: Math.max(prediction, 0),
            confidence: Math.min(Math.abs(trend) * 100, 95),
            method: 'moving_average'
        };
    }

    exponentialSmoothing(prices, alpha = 0.3) {
        let smoothed = prices[prices.length - 1];
        
        for (let i = prices.length - 2; i >= 0; i--) {
            smoothed = alpha * prices[i] + (1 - alpha) * smoothed;
        }
        
        return {
            value: Math.max(smoothed, 0),
            confidence: 70,
            method: 'exponential_smoothing'
        };
    }

    calculatePredictionConfidence(prices, slope) {
        const volatility = this.calculateVolatility(prices);
        const trendStrength = Math.abs(slope) * 100;
        
        let confidence = 50; // Base confidence
        
        if (volatility < 10) confidence += 20;
        else if (volatility > 30) confidence -= 20;
        
        if (trendStrength > 5) confidence += 15;
        else if (trendStrength < 1) confidence -= 15;
        
        return Math.max(10, Math.min(95, confidence));
    }

    getMarketSentiment(priceHistory) {
        if (!priceHistory || priceHistory.length < 5) {
            return { sentiment: 'Neutral', confidence: 50 };
        }
        
        const recentPrices = priceHistory.slice(0, 5).map(h => h.price).filter(p => p && !isNaN(p));
        if (recentPrices.length < 3) {
            return { sentiment: 'Neutral', confidence: 50 };
        }
        
        const rsi = this.calculateRSI(recentPrices);
        const volatility = this.calculateVolatility(recentPrices);
        const trend = (recentPrices[0] - recentPrices[recentPrices.length - 1]) / recentPrices[recentPrices.length - 1];
        
        let sentiment = 'Neutral';
        let confidence = 50;
        
        if (rsi > 70) {
            sentiment = 'Overbought';
            confidence = Math.min(95, 60 + (rsi - 70));
        } else if (rsi < 30) {
            sentiment = 'Oversold';
            confidence = Math.min(95, 60 + (30 - rsi));
        } else if (trend > 0.05) {
            sentiment = 'Bullish';
            confidence = Math.min(95, 60 + (trend * 100));
        } else if (trend < -0.05) {
            sentiment = 'Bearish';
            confidence = Math.min(95, 60 + (Math.abs(trend) * 100));
        }
        
        // Adjust confidence based on volatility
        if (volatility > 20) {
            confidence = Math.max(30, confidence - 20);
        }
        
        return {
            sentiment: sentiment,
            confidence: Math.round(confidence),
            rsi: rsi,
            volatility: volatility,
            trend: Math.round(trend * 10000) / 100
        };
    }

    generateReport(asset, priceHistory) {
        if (!priceHistory || priceHistory.length < 5) return null;
        
        const prices = priceHistory.map(h => h.price).filter(p => p && !isNaN(p));
        if (prices.length < 5) return null;
        
        const report = {
            asset: asset,
            timestamp: new Date().toISOString(),
            currentPrice: prices[0],
            analysis: {
                sma_5: this.calculateMovingAverage(prices, 5),
                sma_10: this.calculateMovingAverage(prices, Math.min(10, prices.length)),
                ema_5: this.calculateEMA(prices, 5),
                rsi: this.calculateRSI(prices),
                volatility: this.calculateVolatility(prices),
                bollingerBands: this.calculateBollingerBands(prices),
                macd: this.calculateMACD(prices)
            },
            patterns: this.detectPatterns(prices),
            prediction: this.predictNextPrice(prices),
            sentiment: this.getMarketSentiment(priceHistory),
            summary: this.generateSummary(prices)
        };
        
        return report;
    }

    generateSummary(prices) {
        const current = prices[0];
        const previous = prices[1] || current;
        const change = ((current - previous) / previous) * 100;
        
        const volatility = this.calculateVolatility(prices);
        const rsi = this.calculateRSI(prices);
        
        let summary = [];
        
        if (Math.abs(change) > 5) {
            summary.push(`Strong ${change > 0 ? 'upward' : 'downward'} movement (${change.toFixed(2)}%)`);
        } else if (Math.abs(change) > 2) {
            summary.push(`Moderate ${change > 0 ? 'upward' : 'downward'} movement (${change.toFixed(2)}%)`);
        } else {
            summary.push(`Stable price action (${change.toFixed(2)}%)`);
        }
        
        if (volatility > 20) {
            summary.push('High volatility detected');
        } else if (volatility < 5) {
            summary.push('Low volatility environment');
        }
        
        if (rsi > 70) {
            summary.push('Potentially overbought conditions');
        } else if (rsi < 30) {
            summary.push('Potentially oversold conditions');
        }
        
        return summary.join('. ') + '.';
    }
}

// ===== ALERT SYSTEM CLASS =====
class AlertSystem {
    constructor() {
        this.alerts = JSON.parse(localStorage.getItem('priceAlerts') || '[]');
        this.soundEnabled = true;
        this.notificationPermission = 'default';
        this.alertHistory = [];
        this.init();
    }

    async init() {
        await this.requestNotificationPermission();
        this.loadSettings();
    }

    async requestNotificationPermission() {
        if ('Notification' in window) {
            this.notificationPermission = await Notification.requestPermission();
        }
    }

    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('alertSettings') || '{}');
        this.soundEnabled = settings.soundEnabled !== false;
    }

    saveSettings() {
        const settings = {
            soundEnabled: this.soundEnabled
        };
        localStorage.setItem('alertSettings', JSON.stringify(settings));
    }

    addAlert(asset, type, value, message = '') {
        const alert = {
            id: Date.now() + Math.random(),
            asset: asset,
            type: type, // 'above', 'below', 'change_up', 'change_down'
            value: value,
            message: message,
            active: true,
            created: new Date().toISOString(),
            triggered: false
        };
        
        this.alerts.push(alert);
        this.saveAlerts();
        return alert.id;
    }

    removeAlert(alertId) {
        this.alerts = this.alerts.filter(alert => alert.id !== alertId);
        this.saveAlerts();
    }

    toggleAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.active = !alert.active;
            this.saveAlerts();
        }
    }

    checkAlerts(currentPrices, previousPrices = {}) {
        const triggeredAlerts = [];
        
        this.alerts.forEach(alert => {
            if (!alert.active || alert.triggered) return;
            
            const currentPrice = currentPrices[alert.asset];
            const previousPrice = previousPrices[alert.asset] || currentPrice;
            
            if (!currentPrice || isNaN(currentPrice)) return;
            
            let shouldTrigger = false;
            let alertMessage = alert.message;
            
            switch (alert.type) {
                case 'above':
                    shouldTrigger = currentPrice > alert.value;
                    alertMessage = alertMessage || `${alert.asset.toUpperCase()} is above $${alert.value}`;
                    break;
                    
                case 'below':
                    shouldTrigger = currentPrice < alert.value;
                    alertMessage = alertMessage || `${alert.asset.toUpperCase()} is below $${alert.value}`;
                    break;
                    
                case 'change_up':
                    const upChange = ((currentPrice - previousPrice) / previousPrice) * 100;
                    shouldTrigger = upChange >= alert.value;
                    alertMessage = alertMessage || `${alert.asset.toUpperCase()} is up ${upChange.toFixed(2)}%`;
                    break;
                    
                case 'change_down':
                    const downChange = ((previousPrice - currentPrice) / previousPrice) * 100;
                    shouldTrigger = downChange >= alert.value;
                    alertMessage = alertMessage || `${alert.asset.toUpperCase()} is down ${downChange.toFixed(2)}%`;
                    break;
            }
            
            if (shouldTrigger) {
                alert.triggered = true;
                alert.triggeredAt = new Date().toISOString();
                alert.triggeredPrice = currentPrice;
                
                const triggeredAlert = {
                    ...alert,
                    message: alertMessage,
                    currentPrice: currentPrice
                };
                
                triggeredAlerts.push(triggeredAlert);
                this.alertHistory.push(triggeredAlert);
                
                this.showNotification(triggeredAlert);
                this.playSound();
            }
        });
        
        if (triggeredAlerts.length > 0) {
            this.saveAlerts();
            this.saveAlertHistory();
        }
        
        return triggeredAlerts;
    }

    showNotification(alert) {
        if (this.notificationPermission === 'granted') {
            const notification = new Notification('Price Alert', {
                body: alert.message,
                icon: '/static/favicon.ico',
                tag: `alert-${alert.id}`,
                requireInteraction: true
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            setTimeout(() => notification.close(), 10000);
        }
        
        // Also show in-app notification
        this.showInAppNotification(alert);
    }

    showInAppNotification(alert) {
        const notification = document.createElement('div');
        notification.className = 'alert-notification';
        notification.innerHTML = `
            <div class="alert-content">
                <strong>🚨 Price Alert</strong>
                <p>${alert.message}</p>
                <small>${new Date().toLocaleTimeString()}</small>
            </div>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-primary);
            color: #333;
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 8000);
    }

    playSound() {
        if (!this.soundEnabled) return;
        
        try {
            // Create audio context for sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.warn('Could not play alert sound:', error);
        }
    }

    saveAlerts() {
        localStorage.setItem('priceAlerts', JSON.stringify(this.alerts));
    }

    saveAlertHistory() {
        // Keep only last 100 triggered alerts
        const limitedHistory = this.alertHistory.slice(-100);
        localStorage.setItem('alertHistory', JSON.stringify(limitedHistory));
    }

    loadAlertHistory() {
        this.alertHistory = JSON.parse(localStorage.getItem('alertHistory') || '[]');
        return this.alertHistory;
    }

    getActiveAlerts() {
        return this.alerts.filter(alert => alert.active && !alert.triggered);
    }

    getTriggeredAlerts() {
        return this.alerts.filter(alert => alert.triggered);
    }

    resetTriggeredAlerts() {
        this.alerts.forEach(alert => {
            if (alert.triggered) {
                alert.triggered = false;
                delete alert.triggeredAt;
                delete alert.triggeredPrice;
            }
        });
        this.saveAlerts();
    }

    clearAllAlerts() {
        this.alerts = [];
        this.alertHistory = [];
        this.saveAlerts();
        this.saveAlertHistory();
    }

    exportAlerts() {
        return {
            alerts: this.alerts,
            history: this.alertHistory,
            settings: {
                soundEnabled: this.soundEnabled
            },
            exportDate: new Date().toISOString()
        };
    }

    importAlerts(data) {
        try {
            if (data.alerts) {
                this.alerts = data.alerts;
                this.saveAlerts();
            }
            
            if (data.history) {
                this.alertHistory = data.history;
                this.saveAlertHistory();
            }
            
            if (data.settings) {
                this.soundEnabled = data.settings.soundEnabled !== false;
                this.saveSettings();
            }
            
            return true;
        } catch (error) {
            console.error('Failed to import alerts:', error);
            return false;
        }
    }
}

// ===== THEME MANAGER CLASS =====
class ThemeManager {
    constructor() {
        this.currentTheme = localStorage.getItem('selectedTheme') || 'dark';
        this.themes = {
            dark: {
                name: 'Dark',
                colors: {
                    '--bg-primary': '#000000',
                    '--bg-secondary': '#313131',
                    '--bg-tertiary': 'rgba(255,255,255,0.1)',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#cccccc',
                    '--accent-primary': '#dbba00',
                    '--accent-secondary': '#91872c',
                    '--success': '#28a745',
                    '--danger': '#dc3545',
                    '--warning': '#ffc107'
                }
            },
            light: {
                name: 'Light',
                colors: {
                    '--bg-primary': '#ffffff',
                    '--bg-secondary': '#f8f9fa',
                    '--bg-tertiary': 'rgba(0,0,0,0.05)',
                    '--text-primary': '#333333',
                    '--text-secondary': '#666666',
                    '--accent-primary': '#dbba00',
                    '--accent-secondary': '#91872c',
                    '--success': '#28a745',
                    '--danger': '#dc3545',
                    '--warning': '#ffc107'
                }
            },
            gold: {
                name: 'Gold',
                colors: {
                    '--bg-primary': '#1a1a1a',
                    '--bg-secondary': '#2d2d2d',
                    '--bg-tertiary': 'rgba(219,186,0,0.1)',
                    '--text-primary': '#dbba00',
                    '--text-secondary': '#cccccc',
                    '--accent-primary': '#ffd700',
                    '--accent-secondary': '#b8860b',
                    '--success': '#32cd32',
                    '--danger': '#ff6347',
                    '--warning': '#ffa500'
                }
            },
            blue: {
                name: 'Blue',
                colors: {
                    '--bg-primary': '#0d1421',
                    '--bg-secondary': '#1e2a3a',
                    '--bg-tertiary': 'rgba(59,130,246,0.1)',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#94a3b8',
                    '--accent-primary': '#3b82f6',
                    '--accent-secondary': '#1d4ed8',
                    '--success': '#10b981',
                    '--danger': '#ef4444',
                    '--warning': '#f59e0b'
                }
            }
        };
    }

    loadTheme() {
        this.applyTheme(this.currentTheme);
    }

    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        const root = document.documentElement;
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        this.currentTheme = themeName;
        localStorage.setItem('selectedTheme', themeName);
        
        // Update theme selector if it exists
        const themeSelector = document.getElementById('themeSelector');
        if (themeSelector) {
            themeSelector.value = themeName;
        }
        
        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: themeName, colors: theme.colors } 
        }));
    }

    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            key: key,
            name: this.themes[key].name
        }));
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    createThemeSelector() {
        const selector = document.createElement('select');
        selector.id = 'themeSelector';
        selector.className = 'theme-selector';
        
        this.getAvailableThemes().forEach(theme => {
            const option = document.createElement('option');
            option.value = theme.key;
            option.textContent = theme.name;
            option.selected = theme.key === this.currentTheme;
            selector.appendChild(option);
        });
        
        selector.addEventListener('change', (e) => {
            this.applyTheme(e.target.value);
        });
        
        return selector;
    }

    addCustomTheme(name, colors) {
        this.themes[name] = {
            name: name,
            colors: colors
        };
        
        // Save custom themes to localStorage
        const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        customThemes[name] = this.themes[name];
        localStorage.setItem('customThemes', JSON.stringify(customThemes));
    }

    loadCustomThemes() {
        const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
        Object.assign(this.themes, customThemes);
    }

    exportTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return null;
        
        return {
            name: themeName,
            displayName: theme.name,
            colors: theme.colors,
            exportDate: new Date().toISOString()
        };
    }

    importTheme(themeData) {
        try {
            if (themeData.name && themeData.colors) {
                this.addCustomTheme(themeData.name, themeData.colors);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import theme:', error);
            return false;
        }
    }
}