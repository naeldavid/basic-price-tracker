function sanitize(str) {
    const d = document.createElement('div');
    d.textContent = String(str ?? '');
    return d.innerHTML;
}

class PriceTracker {
    constructor() {
        this.currentAsset = 'btc';
        this.currentCategory = 'crypto';
        this.allPrices = {};
        this.previousPrices = {};
        this.priceHistory = {};
        this.api = new UniversalAPI();
        this.storage = new DataStorage();
        this.analytics = new Analytics();
        this.alertSystem = new AlertSystem();
        this.themeManager = new ThemeManager();
        this.settings = this.storage.loadSettings();
        this.pinnedAssets = JSON.parse(localStorage.getItem('pinnedAssets') || '[]');
        this.refreshInterval = null;
        this.isLoading = false;
        this.init();
    }

    init() {
        const userAssets = this.api.getUserSelectedAssets();
        if (userAssets.length === 0) {
            this.api.saveUserSelection(['btc', 'eth', 'gold', 'usd_eur']);
        }
        
        // Apply saved theme
        this.themeManager.applyTheme(this.settings.theme || 'dark');
        
        this.setupCategoryTabs();
        this.setupAssetTabs();
        this.allPrices = { ...this.api.fallbackPrices };
        this.initChart();
        this.updateDisplay();
        this.updateAssetsGrid();
        this.loadNews();
        this.setupHotkeys();
        
        // Load saved price history
        userAssets.forEach(asset => {
            const savedHistory = this.storage.loadHistory(asset);
            if (savedHistory && savedHistory.length > 0) {
                this.priceHistory[asset] = savedHistory;
            }
        });
        
        setTimeout(async () => {
            await this.api.fetchForexRates();
            this.fetchAllPrices();
            this.startAutoRefresh();
        }, 100);
    }

    setupHotkeys() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                refreshPrice();
            } else if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                document.querySelector('.chart-container')?.scrollIntoView({ behavior: 'smooth' });
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                toggleSettings();
            }
        });
    }

    setupCategoryTabs() {
        const tabs = document.querySelectorAll('.category-tab');
        const userAssets = this.api.getUserSelectedAssets();
        
        tabs.forEach(tab => {
            const category = tab.dataset.category;
            const hasAssets = userAssets.some(asset => {
                const info = this.api.getAssetInfo(asset);
                return info && info.type === category;
            });
            
            tab.style.display = hasAssets ? 'block' : 'none';
            tab.onclick = () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = category;
                this.setupAssetTabs();
            };
        });
        
        const firstVisible = Array.from(tabs).find(t => t.style.display !== 'none');
        if (firstVisible) {
            this.currentCategory = firstVisible.dataset.category;
            firstVisible.classList.add('active');
        }
    }

    setupAssetTabs() {
        const container = document.getElementById('assetTabs');
        if (!container) return;
        
        container.innerHTML = '';
        const userAssets = this.api.getUserSelectedAssets();
        const assets = userAssets.filter(asset => {
            const info = this.api.getAssetInfo(asset);
            return info && info.type === this.currentCategory;
        });
        
        assets.forEach(asset => {
            const info = this.api.getAssetInfo(asset);
            if (!info) return;
            
            const tab = document.createElement('button');
            tab.className = `asset-tab ${asset === this.currentAsset ? 'active' : ''}`;
            tab.textContent = info.name;
            tab.onclick = () => this.switchAsset(asset);
            container.appendChild(tab);
        });

        if (!assets.includes(this.currentAsset) && assets.length > 0) {
            this.switchAsset(assets[0]);
        }
    }

    switchAsset(asset) {
        this.currentAsset = asset;
        document.querySelectorAll('.asset-tab').forEach(tab => {
            tab.classList.toggle('active', tab.textContent === this.api.getAssetInfo(asset)?.name);
        });
        this.updateDisplay();
        this.updateChart();
    }

    async fetchAllPrices() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();
        
        try {
            const userAssets = this.api.getUserSelectedAssets();
            
            const pricePromises = userAssets.map(async asset => {
                try {
                    const price = await this.api.fetchPrice(asset);
                    return { asset, price: price > 0 ? price : this.api.fallbackPrices[asset] };
                } catch {
                    return { asset, price: this.api.fallbackPrices[asset] };
                }
            });
            
            const results = await Promise.all(pricePromises);
            
            this.previousPrices = { ...this.allPrices };
            const newPrices = {};
            results.forEach(({ asset, price }) => {
                newPrices[asset] = price;
            });
            
            this.allPrices = newPrices;
            this.api.lastPrices = { ...newPrices };
            this.api.saveLastPrices();
            
            this.updatePriceHistory();
            this.alertSystem.checkAlerts(this.allPrices, this.previousPrices);
            this.updateDisplay();
            this.updateAssetsGrid();
            this.updateChart();
            this.updateLastUpdateTime();
            this.showSuccessMessage('Prices updated successfully');
        } catch (error) {
            this.showErrorMessage('Failed to fetch prices. Using cached data.');
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    }

    updateLastUpdateTime() {
        const el = document.getElementById('lastUpdate');
        if (el) {
            el.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    updatePriceHistory() {
        const timestamp = Date.now();
        Object.keys(this.allPrices).forEach(asset => {
            if (!this.priceHistory[asset]) {
                this.priceHistory[asset] = [];
            }
            this.priceHistory[asset].unshift({
                time: timestamp,
                price: this.allPrices[asset]
            });
            if (this.priceHistory[asset].length > 100) {
                this.priceHistory[asset] = this.priceHistory[asset].slice(0, 100);
            }
            if (this.priceHistory[asset].length % 10 === 0) {
                this.storage.saveHistory(this.priceHistory[asset], asset);
            }
        });
    }

    initChart() {
        const canvas = document.getElementById('priceChart');
        if (!canvas) return;
        const container = canvas.parentElement;
        const widgetDiv = document.createElement('div');
        widgetDiv.id = 'tradingviewWidget';
        widgetDiv.style.cssText = 'width:100%;height:400px;';
        container.replaceChild(widgetDiv, canvas);
        if (window.TradingView) {
            this.loadTradingView(this.currentAsset);
        } else {
            window.addEventListener('tradingview-ready', () => this.loadTradingView(this.currentAsset), { once: true });
        }
    }

    updateChart() {
        // Refresh TradingView widget for the selected asset
        if (window.TradingView) {
            this.loadTradingView(this.currentAsset);
        }
    }

    // Load TradingView widget for a specific asset
    loadTradingView(asset) {
        const symbolMap = {
            btc: 'BINANCE:BTCUSDT',
            eth: 'BINANCE:ETHUSDT',
            bnb: 'BINANCE:BNBUSDT',
            ada: 'BINANCE:ADAUSDT',
            sol: 'BINANCE:SOLUSDT',
            xrp: 'BINANCE:XRPUSDT',
            dot: 'BINANCE:DOTUSDT',
            doge: 'BINANCE:DOGEUSDT',
            avax: 'BINANCE:AVAXUSDT',
            matic: 'BINANCE:MATICUSDT',
            gold: 'COMEX:XAUUSD',
            silver: 'COMEX:XAGUSD',
            platinum: 'COMEX:XPTUSD',
            palladium: 'COMEX:XPDUUSD',
            // Add more mappings as needed
        };
        const symbol = symbolMap[asset];
        const container = document.getElementById('tradingviewWidget');
        if (!symbol || !container) return;
        // Clear previous widget
        container.innerHTML = '';
        new TradingView.widget({
            autosize: true,
            symbol: symbol,
            interval: 'D',
            timezone: 'Etc/UTC',
            theme: 'dark',
            style: '1',
            locale: 'en',
            toolbar_bg: '#f1f3f6',
            enable_publishing: false,
            hide_side_toolbar: false,
            container_id: 'tradingviewWidget'
        });
    }

    updateDisplay() {
        const nameEl = document.getElementById('assetName');
        const priceEl = document.getElementById('currentPrice');
        const changeEl = document.getElementById('priceChange');
        
        const info = this.api.getAssetInfo(this.currentAsset);
        const price = this.allPrices[this.currentAsset] || 0;
        const change = this.calculateChange(this.currentAsset);
        
        if (nameEl) nameEl.textContent = info?.name || '';
        if (priceEl) priceEl.textContent = this.formatPrice(price, this.currentAsset);
        if (changeEl) {
            changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeEl.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
        
        // Update analytics indicators
        this.updateAnalyticsDisplay();
    }
    
    updateAnalyticsDisplay() {
        const history = this.priceHistory[this.currentAsset];
        if (!history || history.length < 5) return;
        
        const prices = history.map(h => h.price);
        const report = this.analytics.generateReport(this.currentAsset, history);
        
        if (!report) return;
        
        // Display analytics in the price card or create a new section
        const analyticsEl = document.getElementById('analyticsIndicators');
        if (analyticsEl && report.analysis) {
            const { rsi, volatility } = report.analysis;
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);';
            const label = document.createElement('div');
            label.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);margin-bottom:0.5rem;';
            label.textContent = 'Technical Indicators';
            const grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;font-size:0.85rem;';
            if (rsi) {
                const rsiColor = rsi > 70 ? 'var(--negative)' : rsi < 30 ? 'var(--positive)' : 'var(--text-secondary)';
                const el = document.createElement('div');
                const lbl = document.createElement('span');
                lbl.style.color = 'var(--text-secondary)';
                lbl.textContent = 'RSI: ';
                const val = document.createElement('span');
                val.style.cssText = `color:${rsiColor};font-weight:600;`;
                val.textContent = rsi.toFixed(1);
                el.appendChild(lbl); el.appendChild(val);
                grid.appendChild(el);
            }
            if (volatility) {
                const el = document.createElement('div');
                const lbl = document.createElement('span');
                lbl.style.color = 'var(--text-secondary)';
                lbl.textContent = 'Volatility: ';
                const val = document.createElement('span');
                val.style.fontWeight = '600';
                val.textContent = volatility.toFixed(1) + '%';
                el.appendChild(lbl); el.appendChild(val);
                grid.appendChild(el);
            }
            if (report.sentiment) {
                const s = report.sentiment.sentiment;
                const sentimentColor = s === 'Bullish' ? 'var(--positive)' : s === 'Bearish' ? 'var(--negative)' : 'var(--text-secondary)';
                const el = document.createElement('div');
                const lbl = document.createElement('span');
                lbl.style.color = 'var(--text-secondary)';
                lbl.textContent = 'Sentiment: ';
                const val = document.createElement('span');
                val.style.cssText = `color:${sentimentColor};font-weight:600;`;
                val.textContent = s;
                el.appendChild(lbl); el.appendChild(val);
                grid.appendChild(el);
            }
            wrapper.appendChild(label);
            wrapper.appendChild(grid);
            analyticsEl.textContent = '';
            analyticsEl.appendChild(wrapper);
        }
    }
    
    showLoadingState() {
        const priceEl = document.getElementById('currentPrice');
        if (priceEl && !this.priceHistory[this.currentAsset]) {
            priceEl.textContent = 'Loading...';
        }
    }
    
    hideLoadingState() {
        // Loading state cleared by updateDisplay
    }
    
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    }
    
    showErrorMessage(message) {
        this.showToast(message, 'error');
    }
    
    showToast(message, type = 'info') {
        const existingToast = document.getElementById('toast-notification');
        if (existingToast) existingToast.remove();
        
        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--positive)' : type === 'error' ? 'var(--negative)' : 'var(--accent)'};
            color: white;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 500;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    updateAssetsGrid() {
        const grid = document.getElementById('assetsGrid');
        if (!grid) return;
        
        grid.innerHTML = '';
        const userAssets = this.api.getUserSelectedAssets();
        const sorted = [
            ...userAssets.filter(a => this.pinnedAssets.includes(a)),
            ...userAssets.filter(a => !this.pinnedAssets.includes(a))
        ];
        
        sorted.forEach(asset => {
            const info = this.api.getAssetInfo(asset);
            if (!info) return;
            
            const price = this.allPrices[asset] || 0;
            const change = this.calculateChange(asset);
            const isPinned = this.pinnedAssets.includes(asset);
            const history = this.priceHistory[asset];
            const changeLabel = history && history.length >= 2 ? '24h' : 'chg';
            
            const card = document.createElement('div');
            card.className = `asset-card ${asset === this.currentAsset ? 'selected' : ''}`;

            const topRow = document.createElement('div');
            topRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;';
            const nameDiv = document.createElement('div');
            nameDiv.style.fontWeight = '600';
            nameDiv.textContent = info.name;
            const pinBtn = document.createElement('button');
            pinBtn.className = 'pin-btn';
            pinBtn.title = isPinned ? 'Unpin' : 'Pin';
            pinBtn.textContent = '📌';
            pinBtn.style.cssText = `background:none;border:none;cursor:pointer;font-size:1rem;opacity:${isPinned ? '1' : '0.35'};`;
            topRow.appendChild(nameDiv);
            topRow.appendChild(pinBtn);

            const priceDiv = document.createElement('div');
            priceDiv.style.cssText = 'font-size:1.5rem;font-weight:700;margin-bottom:0.25rem;';
            priceDiv.textContent = this.formatPrice(price, asset);

            const changeDiv = document.createElement('div');
            changeDiv.className = change >= 0 ? 'positive' : 'negative';
            changeDiv.style.fontWeight = '500';
            const arrow = document.createTextNode(`${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}% `);
            const changeSpan = document.createElement('span');
            changeSpan.style.cssText = 'font-size:0.75rem;opacity:0.6;';
            changeSpan.textContent = `(${changeLabel})`;
            changeDiv.appendChild(arrow);
            changeDiv.appendChild(changeSpan);

            card.appendChild(topRow);
            card.appendChild(priceDiv);
            card.appendChild(changeDiv);

            pinBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePin(asset);
            });

            card.addEventListener('click', () => {
                if (info.type !== this.currentCategory) {
                    this.currentCategory = info.type;
                    document.querySelectorAll('.category-tab').forEach(tab => {
                        tab.classList.toggle('active', tab.dataset.category === info.type);
                    });
                    this.setupAssetTabs();
                }
                this.switchAsset(asset);
            });
            
            grid.appendChild(card);
        });
    }

    async loadNews() {
        const container = document.getElementById('newsContainer');
        if (!container) return;
        
        try {
            const news = await this.api.fetchNews();
            container.innerHTML = '';
            
            news.forEach(article => {
                const item = document.createElement('div');
                item.className = 'news-item';
                const newsUrl = article.url || article.link || '#';
                const a = document.createElement('a');
                a.href = newsUrl;
                a.target = '_blank';
                a.rel = 'noopener noreferrer';
                a.className = 'news-title';
                a.textContent = article.title;
                const meta = document.createElement('div');
                meta.className = 'news-meta';
                meta.textContent = `${article.source.name} • ${new Date(article.publishedAt).toLocaleDateString()}`;
                item.appendChild(a);
                item.appendChild(meta);
                container.appendChild(item);
            });
        } catch (error) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Unable to load news</p>';
        }
    }

    calculateChange(asset) {
        const history = this.priceHistory[asset];
        if (!history || history.length < 2) return 0;

        const current = history[0];
        const cutoff = current.time - 24 * 60 * 60 * 1000;
        // Find the oldest entry within the last 24h, or fall back to the oldest available
        const baseline = history.find(h => h.time <= cutoff) || history[history.length - 1];

        if (!baseline || baseline.price === 0) return 0;
        return ((current.price - baseline.price) / baseline.price) * 100;
    }

    formatPrice(priceUSD, asset) {
        if (!priceUSD || isNaN(priceUSD)) return 'N/A';

        const info = this.api.getAssetInfo(asset);
        // Big Mac prices have their own native currencies — don't convert
        if (info?.type === 'bigmac') {
            if (asset.includes('jp')) return `¥${priceUSD.toFixed(0)}`;
            if (asset.includes('eu')) return `€${priceUSD.toFixed(2)}`;
            if (asset.includes('uk')) return `£${priceUSD.toFixed(2)}`;
            return `$${priceUSD.toFixed(2)}`;
        }
        // Forex assets are already a rate, not a USD price — don't double-convert
        if (info?.type === 'currency') {
            return priceUSD.toFixed(4);
        }

        const displayCurrency = this.api.getDisplayCurrency();
        const price = this.api.convertPrice(priceUSD, displayCurrency);
        const symbols = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'CA$', AUD: 'A$', CHF: 'Fr', CNY: '¥', INR: '₹', AED: 'د.إ', BHD: 'BD', KRW: '₩', BRL: 'R$', MXN: 'MX$', RUB: '₽', TRY: '₺', ZAR: 'R', NOK: 'kr', SEK: 'kr' };
        const sym = symbols[displayCurrency] || displayCurrency + ' ';

        if (price < 1) return `${sym}${price.toFixed(6)}`;
        if (price < 100) return `${sym}${price.toFixed(4)}`;
        if (price < 1000) return `${sym}${price.toFixed(2)}`;
        return `${sym}${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        
        if (this.settings.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                if (navigator.onLine) {
                    this.fetchAllPrices();
                    this.loadNews();
                }
            }, this.settings.refreshInterval);
        }
    }

    setupAssetSelection() {
        const container = document.getElementById('assetSelection');
        if (!container) return;
        
        container.innerHTML = '';
        const selected = this.api.getUserSelectedAssets();
        const types = ['crypto', 'metal', 'currency', 'bigmac'];
        
        types.forEach(type => {
            const assets = this.api.getAssetsByType(type);
            const header = document.createElement('div');
            header.style.fontWeight = 'bold';
            header.style.marginTop = '10px';
            header.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            container.appendChild(header);
            
            assets.forEach(asset => {
                const info = this.api.getAssetInfo(asset);
                if (!info) return;

                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = asset;
                checkbox.checked = selected.includes(asset);
                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(' ' + info.name));
                container.appendChild(label);
            });
        });
    }

    togglePin(asset) {
        const idx = this.pinnedAssets.indexOf(asset);
        if (idx === -1) {
            this.pinnedAssets.push(asset);
        } else {
            this.pinnedAssets.splice(idx, 1);
        }
        localStorage.setItem('pinnedAssets', JSON.stringify(this.pinnedAssets));
        this.updateAssetsGrid();
    }

    setupSettings() {
        const autoRefreshEl = document.getElementById('autoRefresh');
        const refreshIntervalEl = document.getElementById('refreshInterval');
        const soundEnabledEl = document.getElementById('soundEnabled');
        const notificationsEl = document.getElementById('notificationsEnabled');
        const currencyEl = document.getElementById('displayCurrency');
        
        if (autoRefreshEl) autoRefreshEl.checked = this.settings.autoRefresh;
        if (refreshIntervalEl) refreshIntervalEl.value = this.settings.refreshInterval / 1000;
        if (soundEnabledEl) soundEnabledEl.checked = this.settings.soundEnabled;
        if (notificationsEl) notificationsEl.checked = this.settings.notificationsEnabled;
        if (currencyEl) currencyEl.value = this.api.getDisplayCurrency();
    }
}

function refreshPrice() {
    if (window.tracker) {
        window.tracker.fetchAllPrices();
        window.tracker.loadNews();
    }
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible && window.tracker) {
            window.tracker.setupAssetSelection();
            window.tracker.setupSettings();
            updateAlertsDisplay();
        }
    }
}

function saveAssetSelection() {
    const checkboxes = document.querySelectorAll('#assetSelection input[type="checkbox"]:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);

    if (selected.length === 0) {
        window.tracker.showErrorMessage('Please select at least one asset.');
        return;
    }

    if (window.tracker) {
        window.tracker.api.saveUserSelection(selected);
        window.tracker.fetchAllPrices();
        window.tracker.setupCategoryTabs();
        window.tracker.setupAssetTabs();
        window.tracker.updateAssetsGrid();
        toggleSettings();
    }
}

function saveSettings() {
    if (!window.tracker) return;
    
    const autoRefresh = document.getElementById('autoRefresh')?.checked ?? true;
    const refreshInterval = (document.getElementById('refreshInterval')?.value ?? 300) * 1000;
    const soundEnabled = document.getElementById('soundEnabled')?.checked ?? true;
    const notificationsEnabled = document.getElementById('notificationsEnabled')?.checked ?? true;
    const displayCurrency = document.getElementById('displayCurrency')?.value || 'USD';
    
    window.tracker.settings = {
        ...window.tracker.settings,
        autoRefresh,
        refreshInterval,
        soundEnabled,
        notificationsEnabled
    };
    
    window.tracker.api.setDisplayCurrency(displayCurrency);
    window.tracker.storage.saveSettings(window.tracker.settings);
    window.tracker.startAutoRefresh();

    if (notificationsEnabled && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    window.tracker.updateDisplay();
    window.tracker.updateAssetsGrid();
    window.tracker.showSuccessMessage('Settings saved!');
}

function addPriceAlert() {
    if (!window.tracker) return;

    const asset = window.tracker.currentAsset;
    const info = window.tracker.api.getAssetInfo(asset);
    const currentPrice = window.tracker.allPrices[asset];

    // Build inline modal instead of prompt()
    const existing = document.getElementById('alert-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'alert-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:20000;';

    const box = document.createElement('div');
    box.style.cssText = 'background:var(--bg-secondary);border:1px solid var(--border);border-radius:0.75rem;padding:1.5rem;width:320px;';

    const title = document.createElement('h4');
    title.style.marginBottom = '1rem';
    title.textContent = `Add Alert — ${info.name}`;

    const typeLabel = document.createElement('label');
    typeLabel.style.cssText = 'display:block;margin-bottom:0.5rem;';
    typeLabel.textContent = 'Type';
    const typeSelect = document.createElement('select');
    typeSelect.id = 'alert-type';
    typeSelect.style.cssText = 'width:100%;padding:0.5rem;margin-top:0.25rem;background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-primary);border-radius:0.25rem;';
    [['above','Price Above'],['below','Price Below'],['change_up','Change Up %'],['change_down','Change Down %']].forEach(([val, txt]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = txt;
        typeSelect.appendChild(opt);
    });
    typeLabel.appendChild(typeSelect);

    const valueLabel = document.createElement('label');
    valueLabel.style.cssText = 'display:block;margin-bottom:1rem;';
    valueLabel.textContent = `Value (current: ${window.tracker.formatPrice(currentPrice, asset)})`;
    const valueInput = document.createElement('input');
    valueInput.id = 'alert-value';
    valueInput.type = 'number';
    valueInput.min = '0';
    valueInput.step = 'any';
    valueInput.style.cssText = 'width:100%;padding:0.5rem;margin-top:0.25rem;background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-primary);border-radius:0.25rem;';
    valueLabel.appendChild(valueInput);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:0.5rem;';
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Add';
    confirmBtn.className = 'btn-primary';
    confirmBtn.style.flex = '1';
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.className = 'btn-primary';
    cancelBtn.style.cssText = 'flex:1;background:var(--bg-tertiary);color:var(--text-primary);';
    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);

    box.appendChild(title);
    box.appendChild(typeLabel);
    box.appendChild(valueLabel);
    box.appendChild(btnRow);
    modal.appendChild(box);
    document.body.appendChild(modal);

    cancelBtn.onclick = () => modal.remove();
    confirmBtn.onclick = () => {
        const alertType = typeSelect.value;
        const value = parseFloat(valueInput.value);
        if (isNaN(value) || value <= 0) {
            window.tracker.showErrorMessage('Enter a valid value greater than 0.');
            return;
        }
        const message = `${info.name} ${alertType.replace('_', ' ')} ${value}`;
        window.tracker.alertSystem.addAlert(asset, alertType, value, message);
        window.tracker.showSuccessMessage('Price alert created!');
        updateAlertsDisplay();
        modal.remove();
    };
}

function updateAlertsDisplay() {
    if (!window.tracker) return;
    
    const container = document.getElementById('activeAlerts');
    if (!container) return;
    
    const alerts = window.tracker.alertSystem.getActiveAlerts();
    
    if (alerts.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">No active alerts</p>';
        return;
    }
    
    container.innerHTML = alerts.map(alert => {
        const info = window.tracker.api.getAssetInfo(alert.asset);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 0.25rem; margin-bottom: 0.5rem;">
                <div>
                    <div style="font-weight: 500;">${sanitize(info?.name || alert.asset)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${sanitize(alert.type)}: ${sanitize(String(alert.value))}</div>
                </div>
                <button data-alert-id="${sanitize(String(alert.id))}" class="remove-alert-btn" style="background: var(--negative); color: var(--bg-primary); border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Remove</button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.remove-alert-btn').forEach(btn => {
        btn.addEventListener('click', () => removeAlert(btn.dataset.alertId));
    });
}

function removeAlert(alertId) {
    if (!window.tracker) return;
    window.tracker.alertSystem.removeAlert(Number(alertId));
    updateAlertsDisplay();
    window.tracker.showSuccessMessage('Alert removed');
}

function toggleTheme() {
    if (!window.tracker) return;
    
    const currentTheme = window.tracker.settings.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    window.tracker.themeManager.applyTheme(newTheme);
    window.tracker.settings.theme = newTheme;
    window.tracker.storage.saveSettings(window.tracker.settings);
    
    // Update button icon
    const btn = document.querySelector('[onclick="toggleTheme()"]');
    if (btn) btn.textContent = newTheme === 'dark' ? '🌙' : '☀️';
}

function exportData() {
    if (!window.tracker) return;
    
    const data = window.tracker.storage.exportData();
    if (!data) {
        window.tracker.showErrorMessage('Failed to export data');
        return;
    }
    
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    window.tracker.showSuccessMessage('Data exported successfully!');
}

function importData() {
    if (!window.tracker) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const success = window.tracker.storage.importData(event.target.result);
                if (success) {
                    window.tracker.showSuccessMessage('Data imported successfully! Reloading...');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    window.tracker.showErrorMessage('Invalid backup file format');
                }
            } catch (error) {
                window.tracker.showErrorMessage('Failed to import data');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

function resetConfiguration() {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:20000;';
    modal.innerHTML = `
        <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:0.75rem;padding:1.5rem;width:300px;text-align:center;">
            <p style="margin-bottom:1.5rem;">Reset all settings and return to setup?</p>
            <div style="display:flex;gap:0.5rem;">
                <button id="reset-confirm" class="btn-danger" style="flex:1;">Reset</button>
                <button id="reset-cancel" class="btn-primary" style="flex:1;background:var(--bg-tertiary);color:var(--text-primary);">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('reset-cancel').onclick = () => modal.remove();
    document.getElementById('reset-confirm').onclick = () => {
        ['setupComplete', 'userName', 'userSelectedAssets', 'lastAssetPrices'].forEach(key => localStorage.removeItem(key));
        window.location.href = 'setup.html';
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tracker = new PriceTracker();
    });
} else {
    window.tracker = new PriceTracker();
}
