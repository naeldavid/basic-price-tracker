// ===== COIN ANIMATION CLASS =====
class CoinAnimation {
    constructor() {
        this.coins = [];
        this.coinEmojis = ['💰', '🥇', '💎', '₿'];
        this.animationSpeed = 500; // milliseconds between coins
        this.fallDuration = { min: 4, max: 9 }; // seconds
        this.isRunning = false;
        this.intervalId = null;
        this.init();
    }

    init() {
        this.createCoinContainer();
        this.startAnimation();
    }

    createCoinContainer() {
        const container = document.createElement('div');
        container.id = 'coinContainer';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
            overflow: hidden;
        `;
        document.body.appendChild(container);
    }

    createCoin() {
        const coin = document.createElement('div');
        const emoji = this.coinEmojis[Math.floor(Math.random() * this.coinEmojis.length)];
        
        coin.textContent = emoji;
        coin.style.cssText = `
            position: absolute;
            font-size: ${Math.random() * 20 + 15}px;
            left: ${Math.random() * 100}%;
            top: -50px;
            animation: fall ${Math.random() * (this.fallDuration.max - this.fallDuration.min) + this.fallDuration.min}s linear forwards;
            opacity: ${Math.random() * 0.7 + 0.3};
        `;

        const container = document.getElementById('coinContainer');
        if (container) {
            container.appendChild(coin);
            
            setTimeout(() => {
                if (coin.parentNode) {
                    coin.parentNode.removeChild(coin);
                }
            }, this.fallDuration.max * 1000 + 1000);
        }
    }

    startAnimation() {
        if (this.isRunning) return;
        
        if (!document.getElementById('coinAnimationCSS')) {
            const style = document.createElement('style');
            style.id = 'coinAnimationCSS';
            style.textContent = `
                @keyframes fall {
                    to {
                        transform: translateY(100vh) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.createCoin();
        }, this.animationSpeed);
    }

    stopAnimation() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }

    setSpeed(speed) {
        this.animationSpeed = speed;
        if (this.isRunning) {
            this.stopAnimation();
            this.startAnimation();
        }
    }

    toggleAnimation() {
        if (this.isRunning) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }
}

// ===== CUSTOM CHART CLASS =====
class CustomChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.data = {};
        this.colors = ['#dbba00', '#91872c', '#28a745', '#dc3545', '#ffc107', '#17a2b8'];
        this.width = 800;
        this.height = 400;
        this.margin = { top: 20, right: 80, bottom: 40, left: 60 };
        this.svg = null;
        this.scales = {};
        this.init();
    }

    init() {
        if (!this.container) return;
        
        this.container.innerHTML = '';
        this.createSVG();
        this.setupEventListeners();
    }

    createSVG() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', String(this.width));
        this.svg.setAttribute('height', String(this.height));
        this.svg.style.cssText = 'background: var(--bg-tertiary); border: 1px solid var(--accent-secondary);';
        
        // Add grid
        this.createGrid();
        
        this.container.appendChild(this.svg);
    }

    createGrid() {
        const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gridGroup.setAttribute('class', 'grid');
        
        // Vertical grid lines
        for (let i = 0; i <= 10; i++) {
            const x = this.margin.left + (i * (this.width - this.margin.left - this.margin.right) / 10);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(x));
            line.setAttribute('y1', String(this.margin.top));
            line.setAttribute('x2', String(x));
            line.setAttribute('y2', String(this.height - this.margin.bottom));
            line.setAttribute('stroke', 'var(--bg-tertiary)');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('opacity', '0.3');
            gridGroup.appendChild(line);
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 8; i++) {
            const y = this.margin.top + (i * (this.height - this.margin.top - this.margin.bottom) / 8);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(this.margin.left));
            line.setAttribute('y1', String(y));
            line.setAttribute('x2', String(this.width - this.margin.right));
            line.setAttribute('y2', String(y));
            line.setAttribute('stroke', 'var(--bg-tertiary)');
            line.setAttribute('stroke-width', '1');
            line.setAttribute('opacity', '0.3');
            gridGroup.appendChild(line);
        }
        
        this.svg.appendChild(gridGroup);
    }

    update(data) {
        this.data = data;
        this.render();
    }

    render() {
        if (!this.data || Object.keys(this.data).length === 0) return;
        
        // Clear previous chart data
        const existingPaths = this.svg.querySelectorAll('.chart-line, .chart-legend');
        existingPaths.forEach(el => el.remove());
        
        const assets = Object.keys(this.data);
        const allPrices = [];
        
        // Collect all prices for scaling
        assets.forEach(asset => {
            if (this.data[asset] && Array.isArray(this.data[asset])) {
                this.data[asset].forEach(point => {
                    if (point.price && !isNaN(point.price)) {
                        allPrices.push(point.price);
                    }
                });
            }
        });
        
        if (allPrices.length === 0) return;
        
        const minPrice = Math.min(...allPrices);
        const maxPrice = Math.max(...allPrices);
        const priceRange = maxPrice - minPrice;
        
        // Create scales
        this.scales.x = (index, maxIndex) => {
            return this.margin.left + (index / maxIndex) * (this.width - this.margin.left - this.margin.right);
        };
        
        this.scales.y = (price) => {
            const normalized = (price - minPrice) / (priceRange || 1);
            return this.height - this.margin.bottom - (normalized * (this.height - this.margin.top - this.margin.bottom));
        };
        
        // Draw lines for each asset
        assets.forEach((asset, assetIndex) => {
            const assetData = this.data[asset];
            if (!assetData || !Array.isArray(assetData) || assetData.length === 0) return;
            
            const validPoints = assetData.filter(point => point.price && !isNaN(point.price));
            if (validPoints.length < 2) return;
            
            const color = this.colors[assetIndex % this.colors.length];
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            let pathData = '';
            validPoints.forEach((point, index) => {
                const x = this.scales.x(index, validPoints.length - 1);
                const y = this.scales.y(point.price);
                
                if (index === 0) {
                    pathData += `M ${x} ${y}`;
                } else {
                    pathData += ` L ${x} ${y}`;
                }
            });
            
            path.setAttribute('d', pathData);
            path.setAttribute('stroke', color);
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('class', 'chart-line');
            path.style.filter = 'drop-shadow(0 0 3px rgba(0,0,0,0.3))';
            
            this.svg.appendChild(path);
            
            // Add legend
            this.createLegendItem(asset, color, assetIndex);
        });
        
        // Add axes labels
        this.createAxesLabels(minPrice, maxPrice);
    }

    createLegendItem(asset = '', color = '#000', index = 0) {
        const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        legendGroup.setAttribute('class', 'chart-legend');
        
        const y = this.margin.top + (index * 20);
        const x = this.width - this.margin.right + 10;
        
        // Legend color box
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y - 8));
        rect.setAttribute('width', '12');
        rect.setAttribute('height', '12');
        rect.setAttribute('fill', color);
        legendGroup.appendChild(rect);
        
        // Legend text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x + 18));
        text.setAttribute('y', String(y + 3));
        text.setAttribute('fill', 'var(--text-primary)');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.textContent = asset.toUpperCase();
        legendGroup.appendChild(text);
        
        this.svg?.appendChild(legendGroup);
    }

    createAxesLabels(minPrice = 0, maxPrice = 100) {
        // Y-axis labels
        for (let i = 0; i <= 4; i++) {
            const price = minPrice + (i * (maxPrice - minPrice) / 4);
            const y = this.height - this.margin.bottom - (i * (this.height - this.margin.top - this.margin.bottom) / 4);
            
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', String(this.margin.left - 10));
            text.setAttribute('y', String(y + 4));
            text.setAttribute('text-anchor', 'end');
            text.setAttribute('fill', 'var(--text-secondary)');
            text.setAttribute('font-size', '10');
            text.setAttribute('font-family', 'Inter, sans-serif');
            text.textContent = `$${price.toFixed(0)}`;
            
            this.svg?.appendChild(text);
        }
        
        // X-axis label
        const xLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        xLabel.setAttribute('x', String(this.width / 2));
        xLabel.setAttribute('y', String(this.height - 10));
        xLabel.setAttribute('text-anchor', 'middle');
        xLabel.setAttribute('fill', 'var(--text-secondary)');
        xLabel.setAttribute('font-size', '12');
        xLabel.setAttribute('font-family', 'Inter, sans-serif');
        xLabel.textContent = 'Time →';
        
        this.svg?.appendChild(xLabel);
    }

    setupEventListeners() {
        if (!this.svg) return;
        
        // Add hover effects
        this.svg.addEventListener('mousemove', (e) => {
            const rect = this.svg.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Show tooltip with price information
            this.showTooltip(x, y);
        });
        
        this.svg.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    showTooltip(x = 0, y = 0) {
        // Remove existing tooltip
        this.hideTooltip();
        
        if (x < this.margin.left || x > this.width - this.margin.right) return;
        
        const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tooltip.setAttribute('id', 'chart-tooltip');
        
        // Tooltip background
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('x', String(x + 10));
        bg.setAttribute('y', String(y - 20));
        bg.setAttribute('width', '80');
        bg.setAttribute('height', '30');
        bg.setAttribute('fill', 'var(--bg-secondary)');
        bg.setAttribute('stroke', 'var(--accent-primary)');
        bg.setAttribute('rx', '3');
        tooltip.appendChild(bg);
        
        // Tooltip text
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x + 15));
        text.setAttribute('y', String(y - 5));
        text.setAttribute('fill', 'var(--text-primary)');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-family', 'Inter, sans-serif');
        text.textContent = 'Hover data';
        tooltip.appendChild(text);
        
        this.svg?.appendChild(tooltip);
    }

    hideTooltip() {
        const tooltip = this.svg?.querySelector('#chart-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    resize(width = 800, height = 400) {
        this.width = width || this.width;
        this.height = height || this.height;
        this.init();
        this.render();
    }

    exportChart() {
        if (!this.svg) return null;
        
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(this.svg);
        
        return {
            svg: svgString,
            data: this.data,
            timestamp: new Date().toISOString()
        };
    }
}

// ===== NOTIFICATION MANAGER CLASS =====
class NotificationManager {
    constructor() {
        this.container = null;
        this.notifications = new Map();
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        this.container = document.getElementById('notificationContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notificationContainer';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message = '', type = 'info', duration = this.defaultDuration, actions = []) {
        const id = Date.now() + Math.random();
        const notification = this.createNotification(id, message, type, actions);
        
        this.container?.appendChild(notification);
        this.notifications.set(id, notification);
        
        // Auto-remove old notifications
        if (this.notifications.size > this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.remove(oldestId);
        }
        
        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
        
        return id;
    }

    createNotification(id = '', message = '', type = 'info', actions = []) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const messageEl = document.createElement('div');
        messageEl.className = 'notification-message';
        messageEl.textContent = message;
        content.appendChild(messageEl);
        
        if (actions.length > 0) {
            const actionsEl = document.createElement('div');
            actionsEl.className = 'notification-actions';
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.label;
                button.className = 'notification-action';
                button.onclick = () => {
                    action.callback();
                    this.remove(id);
                };
                actionsEl.appendChild(button);
            });
            
            content.appendChild(actionsEl);
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.remove(id);
        closeBtn.setAttribute('aria-label', 'Close notification');
        
        notification.appendChild(content);
        notification.appendChild(closeBtn);
        
        return notification;
    }

    remove(id = '') {
        const notification = this.notifications.get(id);
        if (notification) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.notifications.delete(id);
            }, 300);
        }
    }

    clear() {
        this.notifications.forEach((_, id) => this.remove(id));
    }

    success(message = '', duration = 3000) {
        return this.show(message, 'success', duration);
    }

    error(message = '', duration = 8000) {
        return this.show(message, 'error', duration);
    }

    warning(message = '', duration = 5000) {
        return this.show(message, 'warning', duration);
    }

    info(message = '', duration = 5000) {
        return this.show(message, 'info', duration);
    }
}

// ===== FULLSCREEN MANAGER CLASS =====
class FullscreenManager {
    constructor() {
        this.isFullscreen = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateUI();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    async toggle() {
        try {
            if (this.isFullscreen) {
                await document.exitFullscreen();
            } else {
                await document.documentElement.requestFullscreen();
            }
        } catch (error) {
            console.warn('Fullscreen operation failed:', error);
        }
    }

    updateUI() {
        const fullscreenBtn = document.querySelector('[onclick="toggleFullscreen()"]');
        if (fullscreenBtn) {
            const icon = fullscreenBtn.querySelector('.btn-icon');
            if (icon) {
                icon.textContent = this.isFullscreen ? '⛶' : '⛶';
            }
        }
        
        document.body.classList.toggle('fullscreen', this.isFullscreen);
    }
}

// ===== UNIVERSAL TRACKER MAIN CLASS =====
class UniversalTracker {
    constructor() {
        this.currentAsset = 'btc';
        this.currentCategory = 'crypto';
        this.currentPrice = 0;
        this.previousPrice = 0;
        this.allPrices = {};
        this.api = new UniversalAPI();
        this.storage = new DataStorage();
        this.analytics = new Analytics();
        this.alerts = new AlertSystem();
        this.themes = new ThemeManager();
        this.coinAnimation = new CoinAnimation();
        this.notifications = new NotificationManager();
        this.fullscreenManager = new FullscreenManager();
        
        this.priceHistory = this.storage.loadHistory();
        this.settings = this.storage.loadSettings();
        this.chart = null;
        this.refreshInterval = null;
        this.lastUpdateTime = null;
        this.updateCounter = 0;
        this.performanceMetrics = {
            apiCalls: 0,
            successfulUpdates: 0,
            failedUpdates: 0,
            averageResponseTime: 0
        };
        this.isVisible = true;
        this.backgroundSyncEnabled = false;
        this.webSocketConnections = new Map();
        
        this.init();
    }

    init() {
        this.themes.loadTheme();
        this.setupVisibilityAPI();
        this.setupBackgroundSync();
        this.setupWebSocketConnections();
        this.setupCategoryTabs();
        this.setupAssetTabs();
        this.setupUI();
        this.setupKeyboardShortcuts();
        this.setupAdvancedFeatures();
        this.setupPWAFeatures();
        
        setTimeout(() => {
            this.fetchAllPrices();
            this.startAutoRefresh();
            this.loadNews();
            this.initializeAlerts();
            this.hideLoadingSkeletons();
        }, 100);
    }

    setupVisibilityAPI() {
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden;
            
            if (this.isVisible) {
                this.fetchAllPrices();
                this.startAutoRefresh();
            } else {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                }
            }
        });
    }

    setupBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            this.backgroundSyncEnabled = true;
            
            window.addEventListener('backgroundPriceUpdate', () => {
                this.notifications.info('New price data available', 3000);
                if (this.isVisible) {
                    this.fetchAllPrices();
                }
            });
        }
    }

    setupWebSocketConnections() {
        const wsUrls = [
            'wss://ws.finnhub.io?token=demo',
            'wss://stream.binance.com:9443/ws/btcusdt@ticker'
        ];
        
        wsUrls.forEach(url => {
            try {
                const connectionId = this.api.wsManager.connect(url, {
                    onMessage: (data) => this.handleWebSocketMessage(data),
                    onOpen: () => console.log('WebSocket connected:', url),
                    onClose: () => console.log('WebSocket disconnected:', url),
                    onError: (error) => console.warn('WebSocket error:', error)
                });
                
                if (connectionId) {
                    this.webSocketConnections.set(url, connectionId);
                }
            } catch (error) {
                console.warn('WebSocket connection failed:', url, error);
            }
        });
    }

    handleWebSocketMessage(data) {
        if (data.symbol && data.price) {
            const asset = this.mapSymbolToAsset(data.symbol);
            if (asset && this.allPrices[asset] !== data.price) {
                this.allPrices[asset] = data.price;
                this.updateDisplay();
                this.updateAssetsOverview();
            }
        }
    }

    mapSymbolToAsset(symbol) {
        const symbolMap = {
            'BTCUSDT': 'btc',
            'ETHUSDT': 'eth',
            'BNBUSDT': 'bnb'
        };
        return symbolMap[symbol] || null;
    }

    setupPWAFeatures() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.showInstallPrompt(deferredPrompt);
        });
        
        window.addEventListener('appinstalled', () => {
            this.notifications.success('App installed successfully!', 3000);
            deferredPrompt = null;
        });
    }

    showInstallPrompt(deferredPrompt) {
        const installId = this.notifications.show(
            'Install Price Tracker for offline access and better performance',
            'info',
            0,
            [
                {
                    label: 'Install',
                    callback: async () => {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                        }
                        deferredPrompt = null;
                    }
                },
                {
                    label: 'Later',
                    callback: () => {}
                }
            ]
        );
    }

    hideLoadingSkeletons() {
        const skeletons = document.querySelectorAll('.skeleton, .loading-skeleton');
        skeletons.forEach(skeleton => {
            skeleton.style.display = 'none';
        });
        
        const priceValue = document.querySelector('.price-value');
        if (priceValue) {
            priceValue.style.display = 'block';
        }
    }

    setupAdvancedFeatures() {
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Setup data backup
        this.setupAutoBackup();
        
        // Setup error handling
        this.setupErrorHandling();
        
        // Setup accessibility features
        this.setupAccessibility();
        
        // Setup analytics tabs
        this.setupAnalyticsTabs();
        
        // Setup alerts management
        this.setupAlertsManagement();
    }

    setupAnalyticsTabs() {
        const analyticsTabs = document.querySelectorAll('.analytics-tab');
        analyticsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                this.switchAnalyticsTab(targetTab);
            });
        });
    }

    switchAnalyticsTab(tabName) {
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.analytics-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}Panel`);
        });
        
        switch (tabName) {
            case 'charts':
                this.updateCharts();
                break;
            case 'indicators':
                this.updateAdvancedAnalytics();
                break;
            case 'portfolio':
                this.updatePortfolioAnalytics();
                break;
            case 'predictions':
                this.updatePredictions();
                break;
            case 'correlation':
                if (!window.correlationMatrix) {
                    window.correlationMatrix = new CorrelationMatrix(this);
                }
                window.correlationMatrix.render();
                break;
        }
    }

    setupAlertsManagement() {
        const alertAssetSelect = document.getElementById('alertAsset');
        if (alertAssetSelect) {
            const userAssets = this.api.getUserSelectedAssets();
            userAssets.forEach(asset => {
                const assetInfo = this.api.getAssetInfo(asset);
                if (assetInfo) {
                    const option = document.createElement('option');
                    option.value = asset;
                    option.textContent = `${assetInfo.emoji} ${assetInfo.name}`;
                    alertAssetSelect.appendChild(option);
                }
            });
        }
        
        this.updateActiveAlerts();
    }

    updateCharts() {
        if (!this.chart) {
            this.chart = new CustomChart('customChart');
        }
        
        const sampleData = {};
        const userAssets = this.api.getUserSelectedAssets().slice(0, 4);
        userAssets.forEach(asset => {
            sampleData[asset] = this.generateSampleHistory(asset);
        });
        
        if (this.chart && this.chart.update) {
            this.chart.update(sampleData);
        }
    }

    updatePortfolioAnalytics() {
        const userAssets = this.api.getUserSelectedAssets();
        let totalValue = 0;
        let totalChange = 0;
        let bestPerformer = { asset: '', change: -Infinity };
        let worstPerformer = { asset: '', change: Infinity };
        
        userAssets.forEach(asset => {
            const price = this.allPrices[asset] || 0;
            const change = this.calculateChange(asset);
            
            totalValue += price;
            totalChange += change;
            
            if (change > bestPerformer.change) {
                bestPerformer = { asset, change };
            }
            
            if (change < worstPerformer.change) {
                worstPerformer = { asset, change };
            }
        });
        
        const portfolioValue = document.getElementById('portfolioValue');
        const portfolioChange = document.getElementById('portfolioChange');
        const bestPerformerEl = document.getElementById('bestPerformer');
        const worstPerformerEl = document.getElementById('worstPerformer');
        
        if (portfolioValue) portfolioValue.textContent = `$${totalValue.toLocaleString()}`;
        if (portfolioChange) {
            const avgChange = totalChange / userAssets.length;
            portfolioChange.textContent = `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(2)}%`;
            portfolioChange.className = `metric-value ${avgChange >= 0 ? 'positive' : 'negative'}`;
        }
        if (bestPerformerEl) {
            const assetInfo = this.api.getAssetInfo(bestPerformer.asset);
            bestPerformerEl.textContent = assetInfo ? `${assetInfo.emoji} ${assetInfo.name} (+${bestPerformer.change.toFixed(2)}%)` : '-';
        }
        if (worstPerformerEl) {
            const assetInfo = this.api.getAssetInfo(worstPerformer.asset);
            worstPerformerEl.textContent = assetInfo ? `${assetInfo.emoji} ${assetInfo.name} (${worstPerformer.change.toFixed(2)}%)` : '-';
        }
    }

    updatePredictions() {
        const predictionCards = document.getElementById('predictionCards');
        if (!predictionCards) return;
        
        predictionCards.innerHTML = '';
        
        const userAssets = this.api.getUserSelectedAssets().slice(0, 4);
        userAssets.forEach(asset => {
            const assetInfo = this.api.getAssetInfo(asset);
            const history = this.storage.loadHistory(asset);
            const prices = history.map(h => h.price).filter(p => p && !isNaN(p));
            
            if (prices.length > 0) {
                const prediction = this.analytics.predictNextPrice(prices);
                
                const card = document.createElement('div');
                card.className = 'prediction-card';
                card.innerHTML = `
                    <div class="prediction-header">
                        <span class="prediction-asset">${assetInfo.emoji} ${assetInfo.name}</span>
                        <span class="prediction-confidence">${prediction?.confidence || 0}% confidence</span>
                    </div>
                    <div class="prediction-value">
                        Predicted: ${this.formatPrice(prediction?.value || 0, asset)}
                    </div>
                    <div class="prediction-method">
                        Method: ${prediction?.method || 'N/A'}
                    </div>
                `;
                
                predictionCards.appendChild(card);
            }
        });
    }

    updateActiveAlerts() {
        const activeAlerts = document.getElementById('activeAlerts');
        if (!activeAlerts) return;
        
        const alerts = this.alerts.getActiveAlerts();
        
        if (alerts.length === 0) {
            activeAlerts.innerHTML = '<p>No active alerts</p>';
            return;
        }
        
        activeAlerts.innerHTML = alerts.map(alert => {
            const assetInfo = this.api.getAssetInfo(alert.asset);
            return `
                <div class="alert-item">
                    <div class="alert-info">
                        <span class="alert-asset">${assetInfo?.emoji} ${assetInfo?.name}</span>
                        <span class="alert-condition">${alert.type} ${alert.value}</span>
                    </div>
                    <div class="alert-actions">
                        <button onclick="window.universalTracker.alerts.toggleAlert('${alert.id}')" class="btn-tertiary">
                            ${alert.active ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="window.universalTracker.alerts.removeAlert('${alert.id}'); window.universalTracker.updateActiveAlerts()" class="btn-danger">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupPerformanceMonitoring() {
        // Monitor API performance
        setInterval(() => {
            const stats = this.api.getApiStats();
            this.performanceMetrics.apiCalls = stats.totalCalls;
            
            // Log performance metrics
            if (this.updateCounter % 10 === 0) {
                console.log('Performance Metrics:', this.performanceMetrics);
            }
        }, 60000); // Every minute
    }

    setupAutoBackup() {
        // Auto-backup data every hour
        setInterval(() => {
            try {
                const backup = {
                    timestamp: new Date().toISOString(),
                    settings: this.storage.loadSettings(),
                    alerts: this.alerts.exportAlerts(),
                    theme: this.themes.getCurrentTheme(),
                    userAssets: this.api.getUserSelectedAssets()
                };
                
                localStorage.setItem('autoBackup', JSON.stringify(backup));
                console.log('Auto-backup completed');
            } catch (error) {
                console.warn('Auto-backup failed:', error);
            }
        }, 3600000); // Every hour
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showErrorNotification('An unexpected error occurred');
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorNotification('A network error occurred');
        });
    }

    setupAccessibility() {
        // Add ARIA labels and keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'h') {
                this.showHelpDialog();
            }
        });
        
        // High contrast mode detection
        if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
            document.body.classList.add('high-contrast');
        }
        
        // Reduced motion detection
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.coinAnimation.stopAnimation();
        }
    }

    setupCategoryTabs() {
        const categoryTabs = document.querySelectorAll('.category-tab');
        const userSelectedAssets = this.api.getUserSelectedAssets();
        
        categoryTabs.forEach(tab => {
            const category = tab.dataset.category;
            
            const hasAssetsInCategory = userSelectedAssets.some(asset => {
                const assetInfo = this.api.getAssetInfo(asset);
                return assetInfo && assetInfo.type === category;
            });
            
            tab.style.display = hasAssetsInCategory ? 'block' : 'none';
            
            tab.onclick = () => {
                this.currentCategory = category;
                categoryTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.setupAssetTabs();
                this.updateURL();
            };
        });
        
        const firstVisibleTab = Array.from(categoryTabs).find(tab => tab.style.display !== 'none');
        if (firstVisibleTab) {
            this.currentCategory = firstVisibleTab.dataset.category;
            categoryTabs.forEach(t => t.classList.remove('active'));
            firstVisibleTab.classList.add('active');
        }
    }

    setupAssetTabs() {
        const assetTabs = document.getElementById('assetTabs');
        if (!assetTabs) return;
        
        assetTabs.innerHTML = '';
        
        const userSelectedAssets = this.api.getUserSelectedAssets();
        const assets = userSelectedAssets.filter(asset => {
            const assetInfo = this.api.getAssetInfo(asset);
            return assetInfo && assetInfo.type === this.currentCategory;
        });
        
        assets.forEach((asset) => {
            const assetInfo = this.api.getAssetInfo(asset);
            if (!assetInfo) return;
            
            const tab = document.createElement('button');
            tab.className = `asset-tab ${asset === this.currentAsset ? 'active' : ''}`;
            tab.dataset.asset = asset;
            tab.textContent = `${assetInfo.emoji} ${assetInfo.name}`;
            tab.setAttribute('aria-label', `Select ${assetInfo.name}`);
            tab.onclick = () => this.switchAsset(asset);
            
            // Add hover effects
            tab.addEventListener('mouseenter', () => {
                if (asset !== this.currentAsset) {
                    tab.style.transform = 'translateY(-2px)';
                }
            });
            
            tab.addEventListener('mouseleave', () => {
                if (asset !== this.currentAsset) {
                    tab.style.transform = 'translateY(0)';
                }
            });
            
            assetTabs.appendChild(tab);
        });

        if (!assets.includes(this.currentAsset) && assets.length > 0) {
            this.switchAsset(assets[0]);
        }
    }

    switchAsset(asset) {
        this.currentAsset = asset;
        document.querySelectorAll('.asset-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.asset === asset);
            tab.style.transform = 'translateY(0)';
        });
        
        const assetInfo = this.api.getAssetInfo(asset);
        const header = document.getElementById('metalHeader');
        if (header && assetInfo) {
            header.textContent = `${assetInfo.emoji} ${assetInfo.name}`;
        }
        
        // Update current price from allPrices and refresh display
        this.currentPrice = this.allPrices[asset] || 0;
        this.updateDisplay();
        this.loadAssetHistory(asset);
        this.updateURL();
        
        // Announce to screen readers
        this.announceToScreenReader(`Selected ${assetInfo?.name || asset}`);
    }

    async fetchAllPrices() {
        const startTime = Date.now();
        
        try {
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.style.display = 'block';
                loadingText.textContent = 'Fetching latest prices...';
            }
            
            this.allPrices = await this.api.fetchAllPrices();
            
            if (!this.allPrices || Object.keys(this.allPrices).length === 0) {
                console.warn('API failed, using cached prices');
                this.allPrices = this.api.lastPrices || this.api.fallbackPrices;
            }
            
            this.previousPrice = this.currentPrice;
            this.currentPrice = this.allPrices[this.currentAsset] || 0;
            
            this.updateDisplay();
            this.updateAssetsOverview();
            this.saveToHistory();
            this.checkPriceAlerts();
            
            this.performanceMetrics.successfulUpdates++;
            this.performanceMetrics.averageResponseTime = Date.now() - startTime;
            this.lastUpdateTime = new Date();
            this.updateCounter++;
            
            if (loadingText) {
                loadingText.style.display = 'none';
            }
            
            this.showUpdateNotification('Prices updated successfully');
            
        } catch (error) {
            console.error('Error fetching prices:', error);
            this.performanceMetrics.failedUpdates++;
            
            // Use cached prices as fallback
            this.allPrices = this.api.lastPrices || this.api.fallbackPrices;
            this.currentPrice = this.allPrices[this.currentAsset] || 0;
            this.updateDisplay();
            this.updateAssetsOverview();
            
            const loadingText = document.getElementById('loadingText');
            if (loadingText) {
                loadingText.style.display = 'none';
            }
            
            this.showErrorNotification('Using cached prices - API temporarily unavailable');
        }
    }

    updateAssetsOverview() {
        const assetsGrid = document.getElementById('assetsGrid');
        if (!assetsGrid) return;
        
        assetsGrid.innerHTML = '';
        
        const assetsToShow = this.api.getUserSelectedAssets();
        
        assetsToShow.forEach(asset => {
            const assetInfo = this.api.getAssetInfo(asset);
            if (!assetInfo) return;
            
            const price = this.allPrices[asset] || 0;
            const change = this.calculateChange(asset);
            const trend = this.calculateTrend(asset);
            
            const card = document.createElement('div');
            card.className = `asset-card ${asset === this.currentAsset ? 'selected' : ''}`;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', `${assetInfo.name}: ${this.formatPrice(price, asset)}`);
            
            card.onclick = () => {
                if (assetInfo.type !== this.currentCategory) {
                    this.currentCategory = assetInfo.type;
                    document.querySelectorAll('.category-tab').forEach(tab => {
                        tab.classList.toggle('active', tab.dataset.category === assetInfo.type);
                    });
                    this.setupAssetTabs();
                }
                this.switchAsset(asset);
            };
            
            card.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    card.click();
                }
            };
            
            const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️';
            
            card.innerHTML = `
                <div style="font-size: 1.5em;">${assetInfo.emoji}</div>
                <div style="font-weight: 600; font-size: 0.9em;">${assetInfo.name}</div>
                <div style="font-size: 1.1em; margin: 5px 0;">${this.formatPrice(price, asset)}</div>
                <div class="${change >= 0 ? 'positive' : 'negative'}" style="font-size: 0.8em;">
                    ${trendIcon} ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
                </div>
                <div class="asset-type-badge">${assetInfo.type.toUpperCase()}</div>
                <div class="asset-last-update" style="font-size: 0.7em; opacity: 0.7;">
                    Updated: ${new Date().toLocaleTimeString()}
                </div>
            `;
            
            // Add animation on price change
            if (Math.abs(change) > 1) {
                card.style.animation = 'pulse 0.5s ease-in-out';
                setTimeout(() => {
                    card.style.animation = '';
                }, 500);
            }
            
            assetsGrid.appendChild(card);
        });
    }

    calculateTrend(asset) {
        const history = this.storage.loadHistory(asset);
        if (!Array.isArray(history) || history.length < 3) return 0;
        
        const recent = history.slice(0, 3).map(h => h.price);
        const older = history.slice(3, 6).map(h => h.price);
        
        if (recent.length < 2 || older.length < 2) return 0;
        
        const recentAvg = recent.reduce((sum, p) => sum + p, 0) / recent.length;
        const olderAvg = older.reduce((sum, p) => sum + p, 0) / older.length;
        
        return ((recentAvg - olderAvg) / olderAvg) * 100;
    }

    formatPrice(price, asset) {
        if (!price || isNaN(price)) return 'N/A';
        
        const assetInfo = this.api.getAssetInfo(asset);
        const baseCurrency = this.api.getBaseCurrency();
        
        if (assetInfo && assetInfo.type === 'bigmac') {
            if (asset.includes('jp')) return `¥${price.toFixed(0)}`;
            if (asset.includes('eu')) return `€${price.toFixed(2)}`;
            if (asset.includes('uk')) return `£${price.toFixed(2)}`;
            return `$${price.toFixed(2)}`;
        }
        
        // Format based on price magnitude
        if (price < 1) {
            return `$${price.toFixed(6)}`;
        } else if (price < 100) {
            return `$${price.toFixed(4)}`;
        } else if (price < 1000) {
            return `$${price.toFixed(2)}`;
        } else {
            return `$${price.toLocaleString()}`;
        }
    }

    calculateChange(asset) {
        const history = this.storage.loadHistory(asset);
        const current = this.allPrices[asset] || 0;
        
        if (history.length < 2) {
            // Use a small random variation for demo purposes
            return (Math.random() - 0.5) * 10;
        }
        
        const previous = history[1]?.price || history[0]?.price;
        if (!previous || previous === 0) return 0;
        
        return ((current - previous) / previous) * 100;
    }

    updateDisplay() {
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (!priceElement) return;
        
        // Get the current price for the selected asset
        const currentAssetPrice = this.allPrices[this.currentAsset];
        
        if (!currentAssetPrice || isNaN(currentAssetPrice) || currentAssetPrice <= 0) {
            priceElement.textContent = 'Loading price...';
            return;
        }
        
        // Update the current price and display it
        this.currentPrice = currentAssetPrice;
        priceElement.textContent = this.formatPrice(this.currentPrice, this.currentAsset);
        
        // Update price targets
        this.updatePriceTargets();

        if (changeElement) {
            // Use the same calculation as in the portfolio overview for consistency
            const change = this.calculateChange(this.currentAsset);
            
            if (!isNaN(change)) {
                const changeValue = (this.currentPrice * change) / 100;
                changeElement.textContent = `${change >= 0 ? '+' : ''}${this.formatPrice(Math.abs(changeValue), this.currentAsset)} (${change.toFixed(2)}%)`;
                changeElement.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
                
                // Add animation for significant changes
                if (Math.abs(change) > 2) {
                    changeElement.style.animation = 'flash 0.5s ease-in-out';
                    setTimeout(() => {
                        changeElement.style.animation = '';
                    }, 500);
                }
            } else {
                changeElement.textContent = '';
            }
        }
        
        // Update page title with current price
        document.title = `${this.formatPrice(this.currentPrice, this.currentAsset)} - ${this.api.getAssetInfo(this.currentAsset)?.name || this.currentAsset} | Basic Price Tracker`;
    }
    
    updatePriceTargets() {
        const targetsEl = document.getElementById('priceTargets');
        if (!targetsEl) return;
        
        const history = this.storage.loadHistory(this.currentAsset);
        if (history.length < 10) {
            targetsEl.innerHTML = '';
            return;
        }
        
        const prices = history.slice(0, 24).map(h => h.price);
        const high24h = Math.max(...prices);
        const low24h = Math.min(...prices);
        const support = low24h * 1.02;
        const resistance = high24h * 0.98;
        
        targetsEl.innerHTML = `
            <div class="price-target support">Support: ${this.formatPrice(support, this.currentAsset)}</div>
            <div class="price-target">24h Range</div>
            <div class="price-target resistance">Resistance: ${this.formatPrice(resistance, this.currentAsset)}</div>
        `;
    }

    async loadNews() {
        const newsList = document.getElementById('newsList');
        if (!newsList) return;
        
        try {
            newsList.innerHTML = '<p>Loading latest market news...</p>';
            const news = await this.api.fetchNews();
            this.displayNews(news);
        } catch (error) {
            console.warn('Failed to load news:', error);
            newsList.innerHTML = '<p>News temporarily unavailable. Please try again later.</p>';
        }
    }

    displayNews(articles) {
        const newsList = document.getElementById('newsList');
        if (!newsList) return;
        
        if (!articles || articles.length === 0) {
            newsList.innerHTML = '<p>No news available at the moment.</p>';
            return;
        }

        newsList.innerHTML = articles.slice(0, 8).map((article, index) => `
            <div class="news-item" onclick="window.open('${article.url}', '_blank')" 
                 role="button" tabindex="0" 
                 onkeydown="if(event.key==='Enter') this.click()"
                 style="animation-delay: ${index * 0.1}s">
                <div class="news-title">${article.title}</div>
                <div class="news-source">${article.source.name} • ${new Date(article.publishedAt).toLocaleDateString()}</div>
                <div class="news-summary" style="font-size: 0.8em; opacity: 0.8; margin-top: 5px;">
                    ${article.description ? article.description.substring(0, 100) + '...' : 'Click to read more'}
                </div>
            </div>
        `).join('');
        
        // Add CSS animation for news items
        const style = document.createElement('style');
        style.textContent = `
            .news-item {
                animation: slideInLeft 0.3s ease-out forwards;
                opacity: 0;
                transform: translateX(-20px);
            }
            @keyframes slideInLeft {
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    saveToHistory() {
        if (!this.currentPrice || this.currentPrice <= 0) return;
        
        const timestamp = new Date().toLocaleString();
        const historyItem = {
            price: this.currentPrice,
            timestamp: timestamp,
            change: this.previousPrice > 0 ? this.currentPrice - this.previousPrice : 0,
            asset: this.currentAsset,
            volume: Math.random() * 1000000, // Simulated volume
            marketCap: this.currentPrice * Math.random() * 1000000 // Simulated market cap
        };

        this.priceHistory.unshift(historyItem);
        
        if (this.priceHistory.length > 1000) {
            this.priceHistory = this.priceHistory.slice(0, 1000);
        }

        this.storage.saveHistory(this.priceHistory, this.currentAsset);
        this.displayHistory();
    }

    loadAssetHistory(asset) {
        this.priceHistory = this.storage.loadHistory(asset) || [];
        this.displayHistory();
    }

    displayHistory() {
        const historyList = document.getElementById('historyList');
        if (!historyList) return;
        
        if (!Array.isArray(this.priceHistory)) {
            this.priceHistory = [];
        }
        
        if (this.priceHistory.length === 0) {
            historyList.innerHTML = '<p>No price history available yet. Data will appear after the first price update.</p>';
            return;
        }

        historyList.innerHTML = this.priceHistory.slice(0, 50).map((item, index) => `
            <div class="history-item" style="animation-delay: ${index * 0.05}s">
                <span class="history-price">${this.formatPrice(item.price, item.asset || this.currentAsset)}</span>
                <span class="history-time">${item.timestamp}</span>
                <span class="history-change ${item.change >= 0 ? 'positive' : 'negative'}">
                    ${item.change >= 0 ? '+' : ''}${this.formatPrice(Math.abs(item.change), item.asset || this.currentAsset)}
                </span>
                ${item.volume ? `<span class="history-volume">Vol: ${(item.volume / 1000).toFixed(0)}K</span>` : ''}
            </div>
        `).join('');
        
        const advancedMode = document.getElementById('advancedMode');
        if (advancedMode && advancedMode.style.display === 'block') {
            this.updateAdvancedAnalytics();
        }
    }

    updateAdvancedAnalytics() {
        if (!this.priceHistory || this.priceHistory.length === 0) return;
        
        const prices = this.priceHistory.map(h => h.price).filter(p => p && !isNaN(p));
        if (prices.length === 0) return;
        
        try {
            const analytics = this.analytics.generateReport(this.currentAsset, this.priceHistory);
            
            if (!analytics) return;
            
            const high = Math.max(...prices.slice(0, 24));
            const low = Math.min(...prices.slice(0, 24));
            
            const elements = {
                dayHigh: document.getElementById('dayHigh'),
                dayLow: document.getElementById('dayLow'),
                volatility: document.getElementById('volatility'),
                ma7: document.getElementById('ma7'),
                ma30: document.getElementById('ma30'),
                sentiment: document.getElementById('sentiment')
            };
            
            if (elements.dayHigh) elements.dayHigh.textContent = this.formatPrice(high, this.currentAsset);
            if (elements.dayLow) elements.dayLow.textContent = this.formatPrice(low, this.currentAsset);
            if (elements.volatility) elements.volatility.textContent = `${analytics.analysis.volatility?.toFixed(2) || 0}%`;
            if (elements.ma7) elements.ma7.textContent = analytics.analysis.sma_5 ? this.formatPrice(analytics.analysis.sma_5, this.currentAsset) : 'N/A';
            if (elements.ma30) elements.ma30.textContent = analytics.analysis.sma_10 ? this.formatPrice(analytics.analysis.sma_10, this.currentAsset) : 'N/A';
            if (elements.sentiment) {
                const sentiment = analytics.sentiment;
                elements.sentiment.textContent = `${sentiment.sentiment} (${sentiment.confidence}%)`;
                elements.sentiment.className = sentiment.sentiment.toLowerCase();
            }
            
        } catch (error) {
            console.error('Analytics update failed:', error);
        }
    }

    setupUI() {
        const baseCurrencySelect = document.getElementById('baseCurrencySelect');
        if (baseCurrencySelect) {
            baseCurrencySelect.value = this.api.getBaseCurrency();
        }

        this.setupAssetSelection();
        this.setupAdvancedControls();
        this.setupStatusBar();
    }

    setupAdvancedControls() {
        // Add theme selector
        const themeContainer = document.querySelector('.setting-group');
        if (themeContainer) {
            const themeSelector = this.themes.createThemeSelector();
            const themeLabel = document.createElement('label');
            themeLabel.textContent = 'Theme: ';
            themeLabel.appendChild(themeSelector);
            themeContainer.appendChild(themeLabel);
        }
        
        // Add animation controls
        const animationControls = document.createElement('div');
        animationControls.innerHTML = `
            <h4>Animation Settings</h4>
            <label>
                <input type="checkbox" id="animationToggle" ${this.coinAnimation.isRunning ? 'checked' : ''}> 
                Enable coin animation
            </label>
            <label>
                Animation Speed: 
                <input type="range" id="animationSpeed" min="100" max="2000" value="${this.coinAnimation.animationSpeed}">
            </label>
        `;
        
        const settingsGrid = document.querySelector('.settings-grid');
        if (settingsGrid) {
            const settingGroup = document.createElement('div');
            settingGroup.className = 'setting-group';
            settingGroup.appendChild(animationControls);
            settingsGrid.appendChild(settingGroup);
        }
        
        // Setup animation controls
        const animationToggle = document.getElementById('animationToggle');
        const animationSpeed = document.getElementById('animationSpeed');
        
        if (animationToggle) {
            animationToggle.onchange = () => {
                this.coinAnimation.toggleAnimation();
            };
        }
        
        if (animationSpeed) {
            animationSpeed.oninput = () => {
                this.coinAnimation.setSpeed(parseInt(animationSpeed.value));
            };
        }
    }

    setupStatusBar() {
        const statusBar = document.createElement('div');
        statusBar.id = 'statusBar';
        statusBar.className = 'status-bar';
        statusBar.innerHTML = `
            <span id="connectionStatus">🟢 Connected</span>
            <span id="lastUpdate">Last update: Never</span>
            <span id="updateCounter">Updates: 0</span>
        `;
        
        statusBar.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg-secondary);
            padding: 5px 20px;
            font-size: 0.8em;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid var(--accent-secondary);
            z-index: 100;
        `;
        
        document.body.appendChild(statusBar);
        
        // Update status bar periodically
        setInterval(() => {
            this.updateStatusBar();
        }, 1000);
    }

    updateStatusBar() {
        const connectionStatus = document.getElementById('connectionStatus');
        const lastUpdate = document.getElementById('lastUpdate');
        const updateCounter = document.getElementById('updateCounter');
        
        if (connectionStatus) {
            const isOnline = navigator.onLine;
            connectionStatus.textContent = isOnline ? '🟢 Connected' : '🔴 Offline';
        }
        
        if (lastUpdate && this.lastUpdateTime) {
            const timeDiff = Date.now() - this.lastUpdateTime.getTime();
            const minutes = Math.floor(timeDiff / 60000);
            lastUpdate.textContent = `Last update: ${minutes}m ago`;
        }
        
        if (updateCounter) {
            updateCounter.textContent = `Updates: ${this.updateCounter}`;
        }
    }

    setupAssetSelection() {
        const assetSelection = document.getElementById('assetSelection');
        if (!assetSelection) return;
        
        const selectedAssets = this.api.getUserSelectedAssets();
        
        assetSelection.innerHTML = '';
        
        const types = ['crypto', 'metal', 'currency', 'bigmac'];
        types.forEach(type => {
            const typeAssets = this.api.getAssetsByType(type);
            
            const typeHeader = document.createElement('div');
            typeHeader.style.fontWeight = 'bold';
            typeHeader.style.marginTop = '10px';
            typeHeader.style.marginBottom = '5px';
            typeHeader.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            assetSelection.appendChild(typeHeader);
            
            typeAssets.forEach(asset => {
                const assetInfo = this.api.getAssetInfo(asset);
                if (!assetInfo) return;
                
                const label = document.createElement('label');
                label.style.display = 'block';
                label.style.marginBottom = '3px';
                label.innerHTML = `
                    <input type="checkbox" value="${asset}" ${selectedAssets.includes(asset) ? 'checked' : ''}>
                    ${assetInfo.emoji} ${assetInfo.name}
                `;
                assetSelection.appendChild(label);
            });
        });
    }

    generateSampleHistory(asset) {
        const basePrice = this.allPrices[asset] || this.api.fallbackPrices[asset] || 100;
        const history = [];
        
        for (let i = 0; i < 50; i++) {
            const variation = (Math.random() - 0.5) * 0.1;
            const trend = Math.sin(i * 0.1) * 0.05;
            const price = Math.max(basePrice * (1 + variation + trend * (i / 25)), 0.01);
            history.push({
                price: price,
                timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                asset: asset,
                change: i > 0 ? price - history[i-1]?.price || 0 : 0,
                volume: Math.random() * 1000000
            });
        }
        
        return history.reverse();
    }

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        
        const refreshRate = this.settings.refreshInterval || 300000; // 5 minutes default
        this.refreshInterval = setInterval(() => {
            if (navigator.onLine) {
                this.fetchAllPrices();
            }
        }, refreshRate);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.fetchAllPrices();
                    break;
                case 'h':
                    toggleHistory();
                    break;
                case 's':
                    toggleSettings();
                    break;
                case 'n':
                    toggleNews();
                    break;
                case 'a':
                    toggleAdvanced();
                    break;
                case 'r':
                    this.fetchAllPrices();
                    break;
                case 't':
                    this.themes.applyTheme(this.getNextTheme());
                    break;
                case 'escape':
                    this.closeAllPanels();
                    break;
            }
        });
    }

    getNextTheme() {
        const themes = this.themes.getAvailableThemes();
        const currentIndex = themes.findIndex(t => t.key === this.themes.getCurrentTheme());
        const nextIndex = (currentIndex + 1) % themes.length;
        return themes[nextIndex].key;
    }

    closeAllPanels() {
        ['historySection', 'settingsPanel', 'newsFeed', 'advancedMode'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    }

    initializeAlerts() {
        // Setup default alerts for significant price changes
        const userAssets = this.api.getUserSelectedAssets();
        userAssets.forEach(asset => {
            // Add 10% change alerts
            this.alerts.addAlert(asset, 'change_up', 10, `${asset.toUpperCase()} increased by 10%`);
            this.alerts.addAlert(asset, 'change_down', 10, `${asset.toUpperCase()} decreased by 10%`);
        });
    }

    checkPriceAlerts() {
        const triggeredAlerts = this.alerts.checkAlerts(this.allPrices, this.previousPrices || {});
        
        if (triggeredAlerts.length > 0) {
            console.log(`${triggeredAlerts.length} alerts triggered`);
        }
    }

    showUpdateNotification(message) {
        this.notifications.success(message, 2000);
    }

    showErrorNotification(message) {
        this.notifications.error(message, 5000);
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.cssText = `
            position: absolute;
            left: -10000px;
            width: 1px;
            height: 1px;
            overflow: hidden;
        `;
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => announcement.remove(), 1000);
    }

    showHelpDialog() {
        const helpDialog = document.createElement('div');
        helpDialog.className = 'help-dialog';
        helpDialog.innerHTML = `
            <div class="help-content">
                <h3>Keyboard Shortcuts</h3>
                <ul>
                    <li><kbd>Space</kbd> - Refresh prices</li>
                    <li><kbd>H</kbd> - Toggle history</li>
                    <li><kbd>S</kbd> - Toggle settings</li>
                    <li><kbd>N</kbd> - Toggle news</li>
                    <li><kbd>A</kbd> - Toggle advanced mode</li>
                    <li><kbd>T</kbd> - Switch theme</li>
                    <li><kbd>Esc</kbd> - Close all panels</li>
                    <li><kbd>Alt+H</kbd> - Show this help</li>
                </ul>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        `;
        
        helpDialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        document.body.appendChild(helpDialog);
    }

    updateURL() {
        const url = new URL(window.location);
        url.searchParams.set('asset', this.currentAsset);
        url.searchParams.set('category', this.currentCategory);
        window.history.replaceState({}, '', url);
    }

    exportData() {
        const data = {
            settings: this.storage.loadSettings(),
            alerts: this.alerts.exportAlerts(),
            theme: this.themes.getCurrentTheme(),
            userAssets: this.api.getUserSelectedAssets(),
            priceHistory: this.storage.exportData(),
            exportDate: new Date().toISOString(),
            version: '2.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `price-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.settings) {
                    this.storage.saveSettings(data.settings);
                }
                
                if (data.alerts) {
                    this.alerts.importAlerts(data.alerts);
                }
                
                if (data.theme) {
                    this.themes.applyTheme(data.theme);
                }
                
                if (data.userAssets) {
                    this.api.saveUserSelection(data.userAssets);
                }
                
                if (data.priceHistory) {
                    this.storage.importData(data.priceHistory);
                }
                
                this.showUpdateNotification('Data imported successfully');
                setTimeout(() => window.location.reload(), 1000);
                
            } catch (error) {
                this.showErrorNotification('Failed to import data');
                console.error('Import error:', error);
            }
        };
        reader.readAsText(file);
    }
}

// ===== NEW GLOBAL FUNCTIONS =====
function toggleAlerts() {
    const alertsPanel = document.getElementById('alertsPanel');
    if (alertsPanel) {
        const isVisible = alertsPanel.style.display === 'block';
        alertsPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && window.universalTracker) {
            window.universalTracker.setupAlertsManagement();
        }
    }
}

function createAlert() {
    const assetSelect = document.getElementById('alertAsset');
    const typeSelect = document.getElementById('alertType');
    const valueInput = document.getElementById('alertValue');
    
    if (!assetSelect.value || !typeSelect.value || !valueInput.value) {
        window.universalTracker.notifications.warning('Please fill all alert fields', 3000);
        return;
    }
    
    const asset = assetSelect.value;
    const type = typeSelect.value;
    const value = parseFloat(valueInput.value);
    
    if (isNaN(value) || value <= 0) {
        window.universalTracker.notifications.error('Please enter a valid value', 3000);
        return;
    }
    
    const assetInfo = window.universalTracker.api.getAssetInfo(asset);
    const message = `${assetInfo.name} ${type} ${value}`;
    
    window.universalTracker.alerts.addAlert(asset, type, value, message);
    window.universalTracker.notifications.success('Alert created successfully!', 3000);
    
    // Clear form
    valueInput.value = '';
    
    // Update alerts list
    window.universalTracker.updateActiveAlerts();
}

function toggleFullscreen() {
    if (window.universalTracker) {
        window.universalTracker.fullscreenManager.toggle();
    }
}

function clearCache() {
    if (confirm('Clear all cached data? This will remove price history and settings.')) {
        // Clear localStorage
        Object.keys(localStorage).forEach(key => {
            if (key.includes('priceTracker') || key.includes('priceHistory') || key.includes('appSettings')) {
                localStorage.removeItem(key);
            }
        });
        
        // Clear service worker cache
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        }
        
        window.universalTracker.notifications.success('Cache cleared successfully!', 3000);
        setTimeout(() => window.location.reload(), 1000);
    }
}

function toggleShortcuts() {
    const panel = document.getElementById('shortcutsPanel');
    const toggle = document.getElementById('shortcutsToggle');
    
    if (panel && toggle) {
        panel.classList.toggle('collapsed');
        toggle.textContent = panel.classList.contains('collapsed') ? '▶' : '▼';
    }
}

// ===== GLOBAL FUNCTIONS =====
function refreshPrice() {
    if (window.universalTracker) {
        window.universalTracker.fetchAllPrices();
    }
}

function toggleHistory() {
    const historySection = document.getElementById('historySection');
    if (historySection) {
        const isVisible = historySection.style.display === 'block';
        historySection.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && window.universalTracker) {
            window.universalTracker.displayHistory();
        }
    }
}

function toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsPanel) {
        const isVisible = settingsPanel.style.display === 'block';
        settingsPanel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && window.universalTracker) {
            window.universalTracker.setupAssetSelection();
        }
    }
}

function toggleNews() {
    const newsFeed = document.getElementById('newsFeed');
    if (newsFeed) {
        const isHidden = newsFeed.style.display === 'none' || !newsFeed.style.display;
        newsFeed.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden && window.universalTracker) {
            window.universalTracker.loadNews();
        }
    }
}

function toggleAdvanced() {
    const advancedMode = document.getElementById('advancedMode');
    if (advancedMode) {
        const isHidden = advancedMode.style.display === 'none' || !advancedMode.style.display;
        advancedMode.style.display = isHidden ? 'block' : 'none';
        
        if (isHidden && window.universalTracker) {
            setTimeout(() => {
                if (!window.universalTracker.chart) {
                    window.universalTracker.chart = new CustomChart('customChart');
                }
                
                const sampleData = {};
                const userAssets = window.universalTracker.api.getUserSelectedAssets().slice(0, 4);
                userAssets.forEach(asset => {
                    sampleData[asset] = window.universalTracker.generateSampleHistory(asset);
                });
                
                if (window.universalTracker.chart && window.universalTracker.chart.update) {
                    window.universalTracker.chart.update(sampleData);
                }
                
                window.universalTracker.updateAdvancedAnalytics();
            }, 200);
        }
    }
}

function changeBaseCurrency() {
    const currency = document.getElementById('baseCurrencySelect').value;
    if (window.universalTracker) {
        window.universalTracker.api.setBaseCurrency(currency);
        window.universalTracker.updateDisplay();
        window.universalTracker.updateAssetsOverview();
    }
}

function saveAssetSelection() {
    const checkboxes = document.querySelectorAll('#assetSelection input[type="checkbox"]:checked');
    const selectedAssets = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedAssets.length === 0) {
        alert('Please select at least one asset to track.');
        return;
    }
    
    if (window.universalTracker) {
        window.universalTracker.api.saveUserSelection(selectedAssets);
        window.universalTracker.fetchAllPrices();
        window.universalTracker.setupCategoryTabs();
        window.universalTracker.setupAssetTabs();
        window.universalTracker.updateAssetsOverview();
        window.universalTracker.showUpdateNotification('✅ Asset selection saved!');
    }
}

function resetConfiguration() {
    if (confirm('⚠️ Are you sure you want to reset all settings? This will clear your name, asset selection, and return you to the setup page.')) {
        ['setupComplete', 'userName', 'userSelectedAssets', 'baseCurrency', 'lastAssetPrices', 'selectedTheme', 'priceAlerts', 'appSettings'].forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        window.location.href = 'setup.html';
    }
}

function exportData() {
    if (window.universalTracker) {
        window.universalTracker.exportData();
    }
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file && window.universalTracker) {
            window.universalTracker.importData(file);
        }
    };
    input.click();
}

// ===== INITIALIZATION =====
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            window.universalTracker = new UniversalTracker();
            console.log('Universal Price Tracker initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            document.body.innerHTML = '<div style="text-align:center;padding:50px;color:white;">Application failed to load. Please refresh the page.</div>';
        }
    });
} else {
    try {
        window.universalTracker = new UniversalTracker();
        console.log('Universal Price Tracker initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.body.innerHTML = '<div style="text-align:center;padding:50px;color:white;">Application failed to load. Please refresh the page.</div>';
    }
}