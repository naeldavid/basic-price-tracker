class PriceTracker {
    constructor() {
        this.currentAsset = 'btc';
        this.currentCategory = 'crypto';
        this.allPrices = {};
        this.priceHistory = {};
        this.chart = null;
        this.api = new UniversalAPI();
        this.storage = new DataStorage();
        this.settings = this.storage.loadSettings();
        this.refreshInterval = null;
        this.init();
    }

    init() {
        const userAssets = this.api.getUserSelectedAssets();
        if (userAssets.length === 0) {
            this.api.saveUserSelection(['btc', 'eth', 'gold', 'usd_eur']);
        }
        
        this.setupCategoryTabs();
        this.setupAssetTabs();
        this.allPrices = { ...this.api.fallbackPrices };
        this.initChart();
        this.updateDisplay();
        this.updateAssetsGrid();
        this.loadNews();
        this.setupHotkeys();
        
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
        try {
            const userAssets = this.api.getUserSelectedAssets();
            const newPrices = {};
            
            for (const asset of userAssets) {
                try {
                    const price = await this.api.fetchPrice(asset);
                    newPrices[asset] = price > 0 ? price : this.api.fallbackPrices[asset];
                } catch {
                    newPrices[asset] = this.api.fallbackPrices[asset];
                }
            }
            
            this.allPrices = newPrices;
            this.api.lastPrices = { ...newPrices };
            this.api.saveLastPrices();
            
            this.updatePriceHistory();
            this.updateDisplay();
            this.updateAssetsGrid();
            this.updateChart();
            this.updateLastUpdateTime();
        } catch (error) {
            console.error('Error fetching prices:', error);
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
            if (this.priceHistory[asset].length > 20) {
                this.priceHistory[asset] = this.priceHistory[asset].slice(0, 20);
            }
        });
    }

    initChart() {
        const ctx = document.getElementById('priceChart');
        if (!ctx) return;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: '#374151' }
                    },
                    y: {
                        ticks: { color: '#9ca3af' },
                        grid: { color: '#374151' }
                    }
                }
            }
        });
    }

    updateChart() {
        if (!this.chart) return;
        
        const history = this.priceHistory[this.currentAsset] || [];
        const labels = history.slice().reverse().map((h, i) => i === 0 ? 'Now' : `${i * 5}m`);
        const data = history.slice().reverse().map(h => h.price);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
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
    const type = prompt('Alert type (above/below/change_up/change_down):');
    if (!type || !['above', 'below', 'change_up', 'change_down'].includes(type)) return;
    
    const value = parseFloat(prompt('Alert value:'));
    if (isNaN(value)) return;
    
    const info = window.tracker.api.getAssetInfo(asset);
    const message = `${info.name} alert triggered`;
    
    window.tracker.alertSystem.addAlert(asset, type, value, message);
    alert('Alert added!');
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
