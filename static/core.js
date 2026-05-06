// ===== UNIVERSAL API CLASS =====
class UniversalAPI {
    constructor() {
        this.baseCurrency = localStorage.getItem('baseCurrency') || 'USD';
        this.displayCurrency = localStorage.getItem('displayCurrency') || 'USD';
        this.forexRates = {};
        
        this.assets = {
            // Cryptocurrencies
            btc: { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
            eth: { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
            bnb: { symbol: 'BNB', name: 'Binance Coin', type: 'crypto' },
            ada: { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
            sol: { symbol: 'SOL', name: 'Solana', type: 'crypto' },
            xrp: { symbol: 'XRP', name: 'Ripple', type: 'crypto' },
            dot: { symbol: 'DOT', name: 'Polkadot', type: 'crypto' },
            doge: { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto' },
            avax: { symbol: 'AVAX', name: 'Avalanche', type: 'crypto' },
            matic: { symbol: 'MATIC', name: 'Polygon', type: 'crypto' },
            
            // Precious Metals
            gold: { symbol: 'XAU', name: 'Gold', type: 'metal' },
            silver: { symbol: 'XAG', name: 'Silver', type: 'metal' },
            platinum: { symbol: 'XPT', name: 'Platinum', type: 'metal' },
            palladium: { symbol: 'XPD', name: 'Palladium', type: 'metal' },
            
            // Major Currencies
            usd_eur: { symbol: 'EUR', name: 'USD to Euro', type: 'currency' },
            usd_gbp: { symbol: 'GBP', name: 'USD to Pound', type: 'currency' },
            usd_jpy: { symbol: 'JPY', name: 'USD to Yen', type: 'currency' },
            usd_cad: { symbol: 'CAD', name: 'USD to Canadian Dollar', type: 'currency' },
            usd_aud: { symbol: 'AUD', name: 'USD to Australian Dollar', type: 'currency' },
            usd_chf: { symbol: 'CHF', name: 'USD to Swiss Franc', type: 'currency' },
            usd_cny: { symbol: 'CNY', name: 'USD to Chinese Yuan', type: 'currency' },
            usd_inr: { symbol: 'INR', name: 'USD to Indian Rupee', type: 'currency' },
            usd_aed: { symbol: 'AED', name: 'USD to UAE Dirham', type: 'currency' },
            usd_bhd: { symbol: 'BHD', name: 'USD to Bahraini Dinar', type: 'currency' },
            
            // World Currencies
            usd_krw: { symbol: 'KRW', name: 'USD to Korean Won', type: 'currency' },
            usd_brl: { symbol: 'BRL', name: 'USD to Brazilian Real', type: 'currency' },
            usd_mxn: { symbol: 'MXN', name: 'USD to Mexican Peso', type: 'currency' },
            usd_rub: { symbol: 'RUB', name: 'USD to Russian Ruble', type: 'currency' },
            usd_try: { symbol: 'TRY', name: 'USD to Turkish Lira', type: 'currency' },
            usd_zar: { symbol: 'ZAR', name: 'USD to South African Rand', type: 'currency' },
            usd_nok: { symbol: 'NOK', name: 'USD to Norwegian Krone', type: 'currency' },
            usd_sek: { symbol: 'SEK', name: 'USD to Swedish Krona', type: 'currency' },
            
            // Big Mac Index
            bigmac_us: { symbol: 'US', name: 'Big Mac USA', type: 'bigmac' },
            bigmac_uk: { symbol: 'UK', name: 'Big Mac UK', type: 'bigmac' },
            bigmac_jp: { symbol: 'JP', name: 'Big Mac Japan', type: 'bigmac' },
            bigmac_eu: { symbol: 'EU', name: 'Big Mac EU', type: 'bigmac' },
            bigmac_ca: { symbol: 'CA', name: 'Big Mac Canada', type: 'bigmac' }
        };
        
        this.apiKeys = {
            metalprice: '16b5a1613fae4f9c92989092b4bb75e7'
        };
        this.fallbackPrices = {
            // Crypto (mid-2025 approximate)
            btc: 103000, eth: 2500, bnb: 640, ada: 0.77, sol: 170, xrp: 2.35, dot: 4.5, doge: 0.22, avax: 23, matic: 0.25,
            // Metals — USD per troy oz
            gold: 3300, silver: 33, platinum: 990, palladium: 980,
            // Major Currencies
            usd_eur: 0.88, usd_gbp: 0.75, usd_jpy: 145, usd_cad: 1.36, usd_aud: 1.55, usd_chf: 0.89, usd_cny: 7.27, usd_inr: 84.5, usd_aed: 3.67, usd_bhd: 0.376,
            // World Currencies
            usd_krw: 1380, usd_brl: 5.7, usd_mxn: 19.5, usd_rub: 88, usd_try: 38, usd_zar: 18.5, usd_nok: 10.5, usd_sek: 10.3,
            // Big Mac
            bigmac_us: 5.69, bigmac_uk: 4.89, bigmac_jp: 450, bigmac_eu: 5.15, bigmac_ca: 6.77
        };
        
        this.lastPrices = JSON.parse(localStorage.getItem('lastAssetPrices')) || {};
        this.userSelectedAssets = JSON.parse(localStorage.getItem('userSelectedAssets')) || [];
        this.apiCallCount = 0;
        this.maxRetries = 3;
        this.circuitBreaker = {
            failures: 0,
            threshold: 5,
            timeout: 30000,
            state: 'CLOSED'
        };
        this.setupServiceWorker();
    }

    async setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./static/sw.js');
                window.logger && window.logger.debug('Service Worker registered:', registration);
                
                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.origin && event.origin !== window.location.origin) return;
                    this.handleServiceWorkerMessage(event.data);
                });
                
                // Check for updates
                registration.addEventListener('updatefound', () => {
                    window.logger && window.logger.debug('Service Worker update found');
                });
            } catch (error) {
                window.logger && window.logger.warn('Service Worker registration failed:', error);
            }
        }
    }

    handleServiceWorkerMessage(data) {
        if (data.type === 'BACKGROUND_SYNC' && data.action === 'PRICE_UPDATE_AVAILABLE') {
            this.notifyPriceUpdate();
        }
    }

    notifyPriceUpdate() {
        // Notify the main app about background price updates
        window.dispatchEvent(new CustomEvent('backgroundPriceUpdate'));
    }

    async fetchWithTimeout(url, timeout = 8000) {
        const ALLOWED_HOSTS = [
            'api.binance.com',
            'open.er-api.com',
            'api.metalpriceapi.com',
            'api.allorigins.win',
            'api.rss2json.com'
        ];
        try {
            const { hostname } = new URL(url);
            if (!ALLOWED_HOSTS.includes(hostname)) {
                throw new Error(`Blocked request to disallowed host: ${hostname}`);
            }
        } catch (e) {
            if (e.message.startsWith('Blocked')) throw e;
            throw new Error(`Invalid URL: ${url}`);
        }

        if (this.circuitBreaker.state === 'OPEN') {
            if (Date.now() - this.circuitBreaker.lastFailure < this.circuitBreaker.timeout) {
                throw new Error('Circuit breaker is OPEN');
            } else {
                this.circuitBreaker.state = 'HALF_OPEN';
            }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal, mode: 'cors' });
            clearTimeout(timeoutId);
            if (response.ok) {
                this.apiCallCount++;
                this.resetCircuitBreaker();
                return await response.json();
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        } catch (error) {
            clearTimeout(timeoutId);
            this.recordCircuitBreakerFailure();
            throw error;
        }
    }

    async requestWithRetry(url, attempts = 3, timeout = 8000) {
        let lastError;
        for (let i = 0; i < attempts; i++) {
            try {
                return await this.fetchWithTimeout(url, timeout);
            } catch (err) {
                lastError = err;
                if (i < attempts - 1) {
                    const backoff = Math.pow(2, i) * 1000;
                    await new Promise(res => setTimeout(res, backoff));
                }
            }
        }
        throw lastError;
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
            window.logger && window.logger.warn('Circuit breaker opened due to repeated failures');
        }
    }

    async fetchCryptoPrice(asset = 'btc') {
        const symbols = {
            btc: 'BTCUSDT', eth: 'ETHUSDT', bnb: 'BNBUSDT', ada: 'ADAUSDT',
            sol: 'SOLUSDT', xrp: 'XRPUSDT', dot: 'DOTUSDT', doge: 'DOGEUSDT',
            avax: 'AVAXUSDT', matic: 'MATICUSDT'
        };
        const symbol = symbols[asset];
        if (!symbol) throw new Error(`Unsupported crypto: ${asset}`);

        const data = await this.requestWithRetry(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const price = parseFloat(data.price);
        if (price > 0) {
            window.logger && window.logger.debug(`${asset.toUpperCase()}: $${price}`);
            return price;
        }
        throw new Error(`Failed to fetch ${asset} price`);
    }

    async fetchMetalPrice(asset) {
        const codeMap = { gold: 'XAU', silver: 'XAG', platinum: 'XPT', palladium: 'XPD' };
        const currencyCode = codeMap[asset];
        if (!currencyCode) throw new Error(`Unsupported metal: ${asset}`);

        const apiUrl = `https://api.metalpriceapi.com/v1/latest?api_key=${this.apiKeys.metalprice}&base=USD&currencies=${currencyCode}`;
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(apiUrl)}`;
        const data = await this.requestWithRetry(proxyUrl);
        const rate = data.rates?.[currencyCode];
        // MetalPriceAPI returns units-of-metal per 1 USD, so invert to get USD per unit
        if (rate && rate > 0) {
            const price = 1 / rate;
            window.logger && window.logger.debug(`${asset}: $${price}`);
            return price;
        }
        throw new Error(`Failed to fetch ${asset} price`);
    }

    async fetchForexPrice(asset) {
        const pairs = {
            usd_eur: 'EUR', usd_gbp: 'GBP', usd_jpy: 'JPY', usd_cad: 'CAD',
            usd_aud: 'AUD', usd_chf: 'CHF', usd_cny: 'CNY', usd_inr: 'INR',
            usd_aed: 'AED', usd_bhd: 'BHD', usd_krw: 'KRW', usd_brl: 'BRL',
            usd_mxn: 'MXN', usd_rub: 'RUB', usd_try: 'TRY', usd_zar: 'ZAR',
            usd_nok: 'NOK', usd_sek: 'SEK'
        };
        const currency = pairs[asset];
        if (!currency) throw new Error(`Unsupported forex: ${asset}`);

        // Reuse cached rates from fetchForexRates(); fetch fresh only if cache is empty
        if (!this.forexRates[currency]) {
            await this.fetchForexRates();
        }
        const rate = this.forexRates[currency];
        if (rate && rate > 0) {
            window.logger && window.logger.debug(`${asset}: ${rate}`);
            return rate;
        }
        throw new Error(`Failed to fetch ${asset} rate`);
    }

    getBigMacPrice(asset) {
        const prices = {
            bigmac_us: 5.69, bigmac_uk: 4.89, bigmac_jp: 450,
            bigmac_eu: 5.15, bigmac_ca: 6.77
        };
        const price = prices[asset];
        if (price === undefined) throw new Error(`Missing BigMac price for ${asset}`);
        return price;
    }

    async fetchPrice(asset) {
        const assetInfo = this.assets[asset];
        if (!assetInfo) return 0;

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
                    return 0;
            }
        } catch (error) {
            window.logger && window.logger.warn(`${asset} fetch failed:`, error);
            return this.lastPrices[asset] || 0;
        }
    }

    async fetchNews() {
        try {
            const data = await this.requestWithRetry('https://api.rss2json.com/v1/api.json?rss_url=https://www.coindesk.com/arc/outboundfeeds/rss/');
            if (data.items && data.items.length > 0) {
                return data.items.slice(0, 10).map(item => ({
                    title: item.title,
                    source: { name: 'CoinDesk' },
                    publishedAt: item.pubDate,
                    url: item.link
                }));
            }
        } catch (error) {
            window.logger && window.logger.warn('News feed failed:', error);
        }
        
        // Fallback news
        return [
            { title: "Bitcoin reaches new monthly high", source: { name: "CoinDesk" }, publishedAt: new Date().toISOString(), url: "https://www.coindesk.com/price/bitcoin/" },
            { title: "Gold prices surge amid uncertainty", source: { name: "Reuters" }, publishedAt: new Date(Date.now() - 3600000).toISOString(), url: "https://www.reuters.com/markets/commodities/" },
            { title: "USD strengthens against major currencies", source: { name: "Bloomberg" }, publishedAt: new Date(Date.now() - 7200000).toISOString(), url: "https://www.bloomberg.com/markets/currencies" },
            { title: "Ethereum network upgrade completed", source: { name: "CoinTelegraph" }, publishedAt: new Date(Date.now() - 10800000).toISOString(), url: "https://cointelegraph.com/tags/ethereum" },
            { title: "Cryptocurrency market shows resilience", source: { name: "CoinDesk" }, publishedAt: new Date(Date.now() - 14400000).toISOString(), url: "https://www.coindesk.com/markets/" }
        ];
    }

    saveLastPrices() {
        try {
            localStorage.setItem('lastAssetPrices', JSON.stringify(this.lastPrices));
        } catch (error) {
            window.logger && window.logger.warn('Failed to save prices to localStorage:', error);
        }
    }

    saveUserSelection(selectedAssets) {
        this.userSelectedAssets = selectedAssets;
        try {
            localStorage.setItem('userSelectedAssets', JSON.stringify(selectedAssets));
        } catch (error) {
            window.logger && window.logger.warn('Failed to save user selection:', error);
        }
    }

    getUserSelectedAssets() {
        return this.userSelectedAssets;
    }

    setDisplayCurrency(currency) {
        this.displayCurrency = currency;
        localStorage.setItem('displayCurrency', currency);
    }

    getDisplayCurrency() {
        return this.displayCurrency;
    }

    async fetchForexRates() {
        // open.er-api.com: free, no key, CORS-enabled, all currencies in one call
        try {
            const data = await this.requestWithRetry('https://open.er-api.com/v6/latest/USD');
            if (data.rates) {
                this.forexRates = { ...data.rates, USD: 1 };
            }
        } catch (error) {
            window.logger && window.logger.warn('Failed to fetch forex rates for conversion:', error);
        }
    }

    convertPrice(priceUSD, targetCurrency) {
        if (!targetCurrency || targetCurrency === 'USD') return priceUSD;
        const rate = this.forexRates[targetCurrency];
        if (!rate) return priceUSD;
        return priceUSD * rate;
    }

    getAssetInfo(asset) {
        return this.assets[asset];
    }

    getAssetsByType(type) {
        return Object.keys(this.assets).filter(asset => this.assets[asset].type === type);
    }
}

// ===== DATA STORAGE CLASS =====
class DataStorage {
    constructor() {
        this.storageKey = 'priceTrackerData';
        this.historyKey = 'priceHistory';
        this.settingsKey = 'appSettings';
        this.maxHistoryItems = 10000;
    }

    saveHistory(history, asset = 'default') {
        try {
            const key = `${this.historyKey}_${asset}`;
            const limitedHistory = history.slice(0, this.maxHistoryItems);
            localStorage.setItem(key, JSON.stringify(limitedHistory));
            this.updateHistoryIndex(asset);
        } catch (error) {
            window.logger && window.logger.error('Failed to save history:', error);
            this.clearOldHistory();
        }
    }

    loadHistory(asset = 'default') {
        try {
            const key = `${this.historyKey}_${asset}`;
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch (error) {
            window.logger && window.logger.error('Failed to load history:', error);
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
            window.logger && window.logger.warn('Failed to update history index:', error);
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
            window.logger && window.logger.error('Failed to clear old history:', error);
        }
    }

    saveSettings(settings) {
        try {
            localStorage.setItem(this.settingsKey, JSON.stringify(settings));
        } catch (error) {
            window.logger && window.logger.error('Failed to save settings:', error);
        }
    }

    loadSettings() {
        try {
            const raw = localStorage.getItem(this.settingsKey);
            if (!raw) return this.getDefaultSettings();
            return { ...this.getDefaultSettings(), ...JSON.parse(raw) };
        } catch (error) {
            window.logger && window.logger.error('Failed to load settings:', error);
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
            window.logger && window.logger.error('Failed to export data:', error);
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
            window.logger && window.logger.error('Failed to import data:', error);
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
            window.logger && window.logger.error('Failed to clear data:', error);
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
            id: Date.now(),
            asset,
            type,
            value,
            message,
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
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 15px;
            border-radius: 5px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideIn 0.3s ease-out;
        `;
        const strong = document.createElement('strong');
        strong.textContent = `Hey ${localStorage.getItem('userName') || ''}!`;
        const p = document.createElement('p');
        p.textContent = alert.message;
        const small = document.createElement('small');
        small.textContent = new Date().toLocaleTimeString();
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:1.2rem;float:right;';
        closeBtn.onclick = () => notification.remove();
        notification.appendChild(closeBtn);
        notification.appendChild(strong);
        notification.appendChild(p);
        notification.appendChild(small);
        document.body.appendChild(notification);
        setTimeout(() => { if (notification.parentElement) notification.remove(); }, 8000);
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
            window.logger && window.logger.warn('Could not play alert sound:', error);
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
            window.logger && window.logger.error('Failed to import alerts:', error);
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
                    '--bg-secondary': '#111111',
                    '--bg-tertiary': '#1c1c1c',
                    '--text-primary': '#ffffff',
                    '--text-secondary': '#888888',
                    '--accent': '#ffffff',
                    '--positive': '#ffffff',
                    '--negative': '#888888',
                    '--border': '#2a2a2a',
                    '--shadow': 'rgba(0, 0, 0, 0.6)'
                }
            },
            light: {
                name: 'Light',
                colors: {
                    '--bg-primary': '#ffffff',
                    '--bg-secondary': '#f5f5f5',
                    '--bg-tertiary': '#e8e8e8',
                    '--text-primary': '#000000',
                    '--text-secondary': '#666666',
                    '--accent': '#000000',
                    '--positive': '#000000',
                    '--negative': '#666666',
                    '--border': '#d0d0d0',
                    '--shadow': 'rgba(0, 0, 0, 0.1)'
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
        selector.style.cssText = `
            padding: 8px 12px;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-family: inherit;
            font-size: 14px;
        `;
        
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
            window.logger && window.logger.error('Failed to import theme:', error);
            return false;
        }
    }
}