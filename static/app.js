class PriceTracker {
    constructor() {
        this.currentAsset = 'btc';
        this.currentCategory = 'crypto';
        this.allPrices = {};
        this.api = new UniversalAPI();
        this.storage = new DataStorage();
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
        this.updateDisplay();
        this.updateAssetsGrid();
        
        setTimeout(() => {
            this.fetchAllPrices();
            this.startAutoRefresh();
        }, 100);
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
            this.updateDisplay();
            this.updateAssetsGrid();
        } catch (error) {
            console.error('Error fetching prices:', error);
        }
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

    calculateChange(asset) {
        const current = this.allPrices[asset] || 0;
        const previous = this.api.lastPrices[asset] || current;
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
        setInterval(() => {
            if (navigator.onLine) this.fetchAllPrices();
        }, 300000);
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
}

function refreshPrice() {
    if (window.tracker) window.tracker.fetchAllPrices();
}

function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';
        if (!isVisible && window.tracker) window.tracker.setupAssetSelection();
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
