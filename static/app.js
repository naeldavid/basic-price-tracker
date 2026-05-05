class PriceTracker {
    constructor() {
        this.currentAsset = 'btc';
        this.currentCategory = 'crypto';
        this.allPrices = {};
        this.priceHistory = {};
        this.chart = null;
        this.api = new UniversalAPI();
        this.storage = new DataStorage();
        this.analytics = new Analytics();
        this.alertSystem = new AlertSystem();
        this.themeManager = new ThemeManager();
        this.settings = this.storage.loadSettings();
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
        
        setTimeout(() => {
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
            
            // Parallel fetching for better performance
            const pricePromises = userAssets.map(async asset => {
                try {
                    const price = await this.api.fetchPrice(asset);
                    return { asset, price: price > 0 ? price : this.api.fallbackPrices[asset] };
                } catch {
                    return { asset, price: this.api.fallbackPrices[asset] };
                }
            });
            
            const results = await Promise.all(pricePromises);
            
            const newPrices = {};
            results.forEach(({ asset, price }) => {
                newPrices[asset] = price;
            });
            
            this.allPrices = newPrices;
            this.api.lastPrices = { ...newPrices };
            this.api.saveLastPrices();
            
            this.updatePriceHistory();
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
            // Increased from 20 to 100 for better historical data
            if (this.priceHistory[asset].length > 100) {
                this.priceHistory[asset] = this.priceHistory[asset].slice(0, 100);
            }
            
            // Save history to storage periodically
            if (this.priceHistory[asset].length % 10 === 0) {
                this.storage.saveHistory(this.priceHistory[asset], asset);
            }
            
            // Check price alerts
            this.alertSystem.checkAlerts(asset, this.allPrices[asset]);
        });
    }

    initChart() {
        // Replace Chart.js with TradingView widget
        const canvas = document.getElementById('priceChart');
        if (!canvas) return;
        const container = canvas.parentElement;
        const widgetDiv = document.createElement('div');
        widgetDiv.id = 'tradingviewWidget';
        widgetDiv.style.width = '100%';
        widgetDiv.style.height = '400px';
        container.replaceChild(widgetDiv, canvas);
        // Load TradingView library if not present
        if (!window.TradingView) {
            const script = document.createElement('script');
            script.src = 'https://s3.tradingview.com/tv.js';
            script.async = true;
            script.onload = () => this.loadTradingView(this.currentAsset);
            document.head.appendChild(script);
        } else {
            this.loadTradingView(this.currentAsset);
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
            const { rsi, volatility, bollingerBands } = report.analysis;
            let html = '<div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border);">';
            html += '<div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Technical Indicators</div>';
            html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; font-size: 0.85rem;">';
            
            if (rsi) {
                const rsiColor = rsi > 70 ? 'var(--negative)' : rsi < 30 ? 'var(--positive)' : 'var(--text-secondary)';
                html += `<div><span style="color: var(--text-secondary);">RSI:</span> <span style="color: ${rsiColor}; font-weight: 600;">${rsi.toFixed(1)}</span></div>`;
            }
            if (volatility) {
                html += `<div><span style="color: var(--text-secondary);">Volatility:</span> <span style="font-weight: 600;">${volatility.toFixed(1)}%</span></div>`;
            }
            if (report.sentiment) {
                const sentimentColor = report.sentiment.sentiment === 'Bullish' ? 'var(--positive)' : 
                                      report.sentiment.sentiment === 'Bearish' ? 'var(--negative)' : 'var(--text-secondary)';
                html += `<div><span style="color: var(--text-secondary);">Sentiment:</span> <span style="color: ${sentimentColor}; font-weight: 600;">${report.sentiment.sentiment}</span></div>`;
            }
            
            html += '</div></div>';
            analyticsEl.innerHTML = html;
        }
    }
    
    showLoadingState() {
        const priceEl = document.getElementById('currentPrice');
        if (priceEl && !this.priceHistory[this.currentAsset]) {
            priceEl.innerHTML = '<span style="opacity: 0.5;">Loading...</span>';
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
        
        userAssets.forEach(asset => {
            const info = this.api.getAssetInfo(asset);
            if (!info) return;
            
            const price = this.allPrices[asset] || 0;
            const change = this.calculateChange(asset);
            
            const card = document.createElement('div');
            card.className = `asset-card ${asset === this.currentAsset ? 'selected' : ''}`;
            card.onclick = () => {
                if (info.type !== this.currentCategory) {
                    this.currentCategory = info.type;
                    document.querySelectorAll('.category-tab').forEach(tab => {
                        tab.classList.toggle('active', tab.dataset.category === info.type);
                    });
                    this.setupAssetTabs();
                }
                this.switchAsset(asset);
            };
            
            card.innerHTML = `
                <div style="font-weight: 600; margin-bottom: 0.5rem;">${info.name}</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem;">${this.formatPrice(price, asset)}</div>
                <div class="${change >= 0 ? 'positive' : 'negative'}" style="font-weight: 500;">
                    ${change >= 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(2)}%
                </div>
            `;
            
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
                item.innerHTML = `
                    <a href="${newsUrl}" target="_blank" rel="noopener noreferrer" class="news-title">${article.title}</a>
                    <div class="news-meta">${article.source.name} • ${new Date(article.publishedAt).toLocaleDateString()}</div>
                `;
                container.appendChild(item);
            });
        } catch (error) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Unable to load news</p>';
        }
    }

    calculateChange(asset) {
        const history = this.priceHistory[asset];
        if (!history || history.length < 2) return 0;
        
        const current = history[0].price;
        const previous = history[1].price;
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    }

    formatPrice(price, asset) {
        if (!price || isNaN(price)) return 'N/A';
        
        const info = this.api.getAssetInfo(asset);
        if (info?.type === 'bigmac') {
            if (asset.includes('jp')) return `¥${price.toFixed(0)}`;
            if (asset.includes('eu')) return `€${price.toFixed(2)}`;
            if (asset.includes('uk')) return `£${price.toFixed(2)}`;
            return `$${price.toFixed(2)}`;
        }
        
        if (price < 1) return `$${price.toFixed(6)}`;
        if (price < 100) return `$${price.toFixed(4)}`;
        if (price < 1000) return `$${price.toFixed(2)}`;
        return `$${price.toLocaleString()}`;
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
                label.innerHTML = `
                    <input type="checkbox" value="${asset}" ${selected.includes(asset) ? 'checked' : ''}>
                    ${info.name}
                `;
                container.appendChild(label);
            });
        });
    }

    setupSettings() {
        const autoRefreshEl = document.getElementById('autoRefresh');
        const refreshIntervalEl = document.getElementById('refreshInterval');
        const soundEnabledEl = document.getElementById('soundEnabled');
        const notificationsEl = document.getElementById('notificationsEnabled');
        
        if (autoRefreshEl) autoRefreshEl.checked = this.settings.autoRefresh;
        if (refreshIntervalEl) refreshIntervalEl.value = this.settings.refreshInterval / 1000;
        if (soundEnabledEl) soundEnabledEl.checked = this.settings.soundEnabled;
        if (notificationsEl) notificationsEl.checked = this.settings.notificationsEnabled;
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
        alert('Please select at least one asset.');
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
    
    window.tracker.settings = {
        ...window.tracker.settings,
        autoRefresh,
        refreshInterval,
        soundEnabled,
        notificationsEnabled
    };
    
    window.tracker.storage.saveSettings(window.tracker.settings);
    window.tracker.startAutoRefresh();
    
    if (notificationsEnabled && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    alert('Settings saved!');
}

function addPriceAlert() {
    if (!window.tracker) return;
    
    const asset = window.tracker.currentAsset;
    const info = window.tracker.api.getAssetInfo(asset);
    const currentPrice = window.tracker.allPrices[asset];
    
    // Better UI for alert creation
    const type = prompt(`Alert Type for ${info.name}:\n1. Price Above\n2. Price Below\n3. Change Up %\n4. Change Down %\n\nEnter 1-4:`);
    
    const typeMap = { '1': 'above', '2': 'below', '3': 'change_up', '4': 'change_down' };
    const alertType = typeMap[type];
    
    if (!alertType) {
        window.tracker.showErrorMessage('Invalid alert type');
        return;
    }
    
    const promptMsg = alertType.includes('change') 
        ? `Enter percentage change (current price: ${window.tracker.formatPrice(currentPrice, asset)}):`
        : `Enter target price (current: ${window.tracker.formatPrice(currentPrice, asset)}):`;
    
    const value = parseFloat(prompt(promptMsg));
    if (isNaN(value) || value <= 0) {
        window.tracker.showErrorMessage('Invalid value');
        return;
    }
    
    const message = `${info.name} ${alertType.replace('_', ' ')} ${value}`;
    
    window.tracker.alertSystem.addAlert(asset, alertType, value, message);
    window.tracker.showSuccessMessage('Price alert created successfully!');
    
    // Update alerts display
    updateAlertsDisplay();
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
    
    container.innerHTML = alerts.map((alert, idx) => {
        const info = window.tracker.api.getAssetInfo(alert.asset);
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--bg-tertiary); border-radius: 0.25rem; margin-bottom: 0.5rem;">
                <div>
                    <div style="font-weight: 500;">${info?.name || alert.asset}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${alert.type}: ${alert.value}</div>
                </div>
                <button onclick="removeAlert(${idx})" style="background: var(--negative); color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Remove</button>
            </div>
        `;
    }).join('');
}

function removeAlert(index) {
    if (!window.tracker) return;
    window.tracker.alertSystem.removeAlert(index);
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
    if (confirm('Reset all settings and return to setup?')) {
        ['setupComplete', 'userName', 'userSelectedAssets', 'lastAssetPrices'].forEach(key => {
            localStorage.removeItem(key);
        });
        window.location.href = 'setup.html';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tracker = new PriceTracker();
    });
} else {
    window.tracker = new PriceTracker();
}
