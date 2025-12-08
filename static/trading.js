// Trading Platform Core
class TradingPlatform {
    constructor() {
        this.api = new UniversalAPI();
        this.portfolio = this.loadPortfolio();
        this.orders = this.loadOrders();
        this.currentAction = 'buy';
        this.currentAsset = null;
        this.prices = {};
        this.init();
    }

    init() {
        this.loadUserData();
        this.setupEventListeners();
        this.loadMarketData();
        this.updatePortfolio();
        this.renderOrders();
        this.showQuickStartIfNeeded();
        setInterval(() => this.loadMarketData(), 30000);
    }

    showQuickStartIfNeeded() {
        const dontShow = localStorage.getItem('hideQuickStart');
        if (!dontShow) {
            document.getElementById('quickStartModal').style.display = 'flex';
        }
    }

    loadUserData() {
        const userName = localStorage.getItem('userName') || 'User';
        const navUserNameEl = document.getElementById('navUserName');
        const userBalanceEl = document.getElementById('userBalance');
        if (navUserNameEl) navUserNameEl.textContent = userName;
        if (userBalanceEl) userBalanceEl.textContent = this.formatCurrency(this.portfolio.cash);
    }

    loadPortfolio() {
        const saved = localStorage.getItem('tradingPortfolio');
        return saved ? JSON.parse(saved) : {
            cash: 10000,
            holdings: {},
            totalValue: 10000,
            totalPnL: 0
        };
    }

    savePortfolio() {
        localStorage.setItem('tradingPortfolio', JSON.stringify(this.portfolio));
    }

    loadOrders() {
        const saved = localStorage.getItem('tradingOrders');
        return saved ? JSON.parse(saved) : [];
    }

    saveOrders() {
        localStorage.setItem('tradingOrders', JSON.stringify(this.orders));
    }

    setupEventListeners() {
        const self = this;
        document.querySelectorAll('.trade-tab').forEach(function(tab) {
            tab.addEventListener('click', function(e) {
                document.querySelectorAll('.trade-tab').forEach(function(t) { t.classList.remove('active'); });
                if (e.target) {
                    e.target.classList.add('active');
                    self.currentAction = e.target.dataset.action;
                    self.updateTradeButton();
                }
            });
        });
    }

    async loadMarketData() {
        try {
            this.prices = await this.api.fetchAllPrices();
            this.renderMarketGrid();
            this.populateAssetSelect();
            this.updatePortfolioValues();
        } catch (error) {
            console.error('Failed to load market data:', error);
        }
    }

    renderMarketGrid() {
        const grid = document.getElementById('marketGrid');
        if (!grid) return;
        const assets = this.api.getUserSelectedAssets();
        
        grid.innerHTML = assets.map(asset => {
            const info = this.api.getAssetInfo(asset);
            const price = this.prices[asset] || 0;
            const change = this.calculateChange(asset);
            
            return `
                <div class="market-card" onclick="trading.selectAsset('${asset}')">
                    <div class="market-card-header">
                        <span class="asset-symbol">${info.symbol}</span>
                    </div>
                    <div class="market-price">${this.formatPrice(price, asset)}</div>
                    <div class="market-change ${change >= 0 ? 'positive' : 'negative'}">
                        ${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%
                    </div>
                </div>
            `;
        }).join('');
    }

    populateAssetSelect() {
        const select = document.getElementById('assetSelect');
        if (!select) return;
        const assets = this.api.getUserSelectedAssets();
        
        select.innerHTML = '<option value="">Choose asset...</option>' + 
            assets.map(asset => {
                const info = this.api.getAssetInfo(asset);
                return `<option value="${asset}">${info.name} (${info.symbol})</option>`;
            }).join('');
    }

    selectAsset(asset) {
        this.currentAsset = asset;
        const select = document.getElementById('assetSelect');
        if (select) select.value = asset;
        this.updateTradeInfo();
    }

    updateTradeInfo() {
        const assetSelect = document.getElementById('assetSelect');
        if (!assetSelect) return;
        const asset = assetSelect.value;
        if (!asset) {
            const assetInfo = document.getElementById('assetInfo');
            if (assetInfo) assetInfo.style.display = 'none';
            return;
        }

        this.currentAsset = asset;
        const price = this.prices[asset] || 0;
        const holdings = this.portfolio.holdings[asset] || 0;
        const change = this.calculateChange(asset);

        const assetInfo = document.getElementById('assetInfo');
        const currentPriceEl = document.getElementById('currentPrice');
        const priceChangeEl = document.getElementById('priceChange');
        const holdingsEl = document.getElementById('holdings');
        
        if (assetInfo) assetInfo.style.display = 'block';
        if (currentPriceEl) currentPriceEl.textContent = this.formatPrice(price, asset);
        if (priceChangeEl) {
            priceChangeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            priceChangeEl.className = `info-row ${change >= 0 ? 'positive' : 'negative'}`;
        }
        if (holdingsEl) holdingsEl.textContent = holdings.toFixed(4);
        
        this.calculateTotal();
    }

    calculateChange(asset) {
        const current = this.prices[asset] || 0;
        const previous = this.api.lastPrices[asset] || current;
        return ((current - previous) / previous) * 100;
    }

    calculateTotal() {
        const tradeAmountEl = document.getElementById('tradeAmount');
        const amount = tradeAmountEl ? parseFloat(tradeAmountEl.value) || 0 : 0;
        if (!this.currentAsset || amount <= 0) {
            const totalCostEl = document.getElementById('totalCost');
            const tradeFeeEl = document.getElementById('tradeFee');
            const finalAmountEl = document.getElementById('finalAmount');
            if (totalCostEl) totalCostEl.textContent = '$0.00';
            if (tradeFeeEl) tradeFeeEl.textContent = '$0.00';
            if (finalAmountEl) finalAmountEl.textContent = '$0.00';
            return;
        }

        const price = this.prices[this.currentAsset] || 0;
        const total = amount * price;
        const fee = total * 0.001;
        const final = this.currentAction === 'buy' ? total + fee : total - fee;

        const totalCostEl = document.getElementById('totalCost');
        const tradeFeeEl = document.getElementById('tradeFee');
        const finalAmountEl = document.getElementById('finalAmount');
        if (totalCostEl) totalCostEl.textContent = this.formatCurrency(total);
        if (tradeFeeEl) tradeFeeEl.textContent = this.formatCurrency(fee);
        if (finalAmountEl) finalAmountEl.textContent = this.formatCurrency(final);
    }

    setAmount(value) {
        const input = document.getElementById('tradeAmount');
        if (!input) return;
        if (value === 'max') {
            if (this.currentAction === 'buy') {
                const price = this.prices[this.currentAsset] || 1;
                input.value = (this.portfolio.cash / price * 0.999).toFixed(4);
            } else {
                input.value = (this.portfolio.holdings[this.currentAsset] || 0).toFixed(4);
            }
        } else {
            input.value = value;
        }
        this.calculateTotal();
    }

    toggleLimitPrice() {
        const orderTypeEl = document.getElementById('orderType');
        const limitGroup = document.getElementById('limitPriceGroup');
        if (!orderTypeEl || !limitGroup) return;
        limitGroup.style.display = orderTypeEl.value === 'limit' ? 'block' : 'none';
    }

    updateTradeButton() {
        const btn = document.getElementById('tradeBtn');
        const text = document.getElementById('tradeBtnText');
        if (!btn || !text) return;
        
        if (this.currentAction === 'buy') {
            btn.className = 'btn-trade buy';
            text.textContent = 'Buy Now';
        } else {
            btn.className = 'btn-trade sell';
            text.textContent = 'Sell Now';
        }
    }

    executeTrade() {
        const asset = this.currentAsset;
        const tradeAmountEl = document.getElementById('tradeAmount');
        const orderTypeEl = document.getElementById('orderType');
        if (!tradeAmountEl || !orderTypeEl) return;
        const amount = parseFloat(tradeAmountEl.value);
        const orderType = orderTypeEl.value;
        
        if (!asset || !amount || amount <= 0) {
            this.showNotification('Please select an asset and enter amount', 'error');
            return;
        }

        const price = this.prices[asset];
        const total = amount * price;
        const fee = total * 0.001;

        if (this.currentAction === 'buy') {
            if (this.portfolio.cash < total + fee) {
                this.showNotification('Insufficient funds', 'error');
                return;
            }
            
            this.portfolio.cash -= (total + fee);
            this.portfolio.holdings[asset] = (this.portfolio.holdings[asset] || 0) + amount;
            
        } else {
            if (!this.portfolio.holdings[asset] || this.portfolio.holdings[asset] < amount) {
                this.showNotification('Insufficient holdings', 'error');
                return;
            }
            
            this.portfolio.holdings[asset] -= amount;
            this.portfolio.cash += (total - fee);
            
            if (this.portfolio.holdings[asset] === 0) {
                delete this.portfolio.holdings[asset];
            }
        }

        const order = {
            id: Date.now(),
            asset: asset,
            action: this.currentAction,
            amount: amount,
            price: price,
            total: total,
            fee: fee,
            orderType: orderType,
            status: 'completed',
            timestamp: new Date().toISOString()
        };

        this.orders.unshift(order);
        this.savePortfolio();
        this.saveOrders();
        
        this.showNotification(`${this.currentAction === 'buy' ? 'Bought' : 'Sold'} ${amount} ${asset.toUpperCase()}`, 'success');
        
        const tradeAmountEl2 = document.getElementById('tradeAmount');
        if (tradeAmountEl2) tradeAmountEl2.value = '';
        this.updatePortfolio();
        this.updateTradeInfo();
        this.renderOrders();
    }

    updatePortfolio() {
        this.updatePortfolioValues();
        this.renderHoldings();
    }

    updatePortfolioValues() {
        let totalValue = this.portfolio.cash;
        let totalPnL = 0;

        Object.keys(this.portfolio.holdings).forEach(asset => {
            const amount = this.portfolio.holdings[asset];
            const currentPrice = this.prices[asset] || 0;
            totalValue += amount * currentPrice;
        });

        this.portfolio.totalValue = totalValue;
        this.portfolio.totalPnL = totalValue - 10000;

        const userBalanceEl = document.getElementById('userBalance');
        const portfolioValueEl = document.getElementById('portfolioValue');
        const totalPnLEl = document.getElementById('totalPnL');
        const availableCashEl = document.getElementById('availableCash');
        
        if (userBalanceEl) userBalanceEl.textContent = this.formatCurrency(this.portfolio.cash);
        if (portfolioValueEl) portfolioValueEl.textContent = this.formatCurrency(totalValue);
        if (totalPnLEl) {
            totalPnLEl.textContent = this.formatCurrency(this.portfolio.totalPnL);
            totalPnLEl.className = `stat-value ${this.portfolio.totalPnL >= 0 ? 'positive' : 'negative'}`;
        }
        if (availableCashEl) availableCashEl.textContent = this.formatCurrency(this.portfolio.cash);
    }

    renderHoldings() {
        const list = document.getElementById('holdingsList');
        if (!list) return;
        const holdings = Object.keys(this.portfolio.holdings);

        if (holdings.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No holdings yet</p>';
            return;
        }

        list.innerHTML = holdings.map(asset => {
            const amount = this.portfolio.holdings[asset];
            const info = this.api.getAssetInfo(asset);
            const price = this.prices[asset] || 0;
            const value = amount * price;
            const avgBuyPrice = this.getAverageBuyPrice(asset);
            const pnl = ((price - avgBuyPrice) / avgBuyPrice) * 100;

            return `
                <div class="holding-item">
                    <div class="holding-info">
                        <div class="holding-name">${info.emoji} ${info.name}</div>
                        <div class="holding-amount">${amount.toFixed(4)} ${info.symbol}</div>
                    </div>
                    <div class="holding-value">
                        <div class="holding-price">${this.formatCurrency(value)}</div>
                        <div class="holding-pnl ${pnl >= 0 ? 'positive' : 'negative'}">
                            ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getAverageBuyPrice(asset) {
        const buyOrders = this.orders.filter(o => o.asset === asset && o.action === 'buy');
        if (buyOrders.length === 0) return this.prices[asset] || 0;
        
        const totalCost = buyOrders.reduce((sum, o) => sum + o.total, 0);
        const totalAmount = buyOrders.reduce((sum, o) => sum + o.amount, 0);
        return totalAmount > 0 ? totalCost / totalAmount : this.prices[asset] || 0;
    }

    renderOrders(filter) {
        filter = filter || 'all';
        const list = document.getElementById('ordersList');
        if (!list) return;
        let filtered = this.orders;

        if (filter !== 'all') {
            filtered = this.orders.filter(function(o) { return o.action === filter || o.status === filter; });
        }

        if (filtered.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-secondary)">No orders yet</p>';
            return;
        }

        const self = this;
        list.innerHTML = filtered.slice(0, 50).map(function(order) {
            const info = this.api.getAssetInfo(order.asset);
            const date = new Date(order.timestamp);

            return `
                <div class="order-item">
                    <span class="order-badge ${order.action}">${order.action.toUpperCase()}</span>
                    <div class="order-details">
                        <div class="order-asset">${info.name}</div>
                        <div class="order-time">${date.toLocaleString()}</div>
                    </div>
                    <div class="order-amount">${order.amount.toFixed(4)} @ ${self.formatPrice(order.price, order.asset)}</div>
                    <div class="order-total">${self.formatCurrency(order.total)}</div>
                </div>
            `;
        }).join('');
    }

    filterOrders(filter) {
        document.querySelectorAll('.filter-btn').forEach(function(btn) { btn.classList.remove('active'); });
        if (window.event && window.event.target) {
            window.event.target.classList.add('active');
        }
        this.renderOrders(filter);
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    formatPrice(price, asset) {
        const info = this.api.getAssetInfo(asset);
        if (info.type === 'currency') {
            return price.toFixed(4);
        }
        return this.formatCurrency(price);
    }

    showNotification(message, type) {
        type = type || 'success';
        const notification = document.getElementById('notification');
        if (!notification) return;
        notification.textContent = message;
        notification.className = `notification ${type} show`;
        
        setTimeout(function() {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Global instance
let trading;

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    trading = new TradingPlatform();
});

// Global functions for HTML onclick
function updateTradeInfo() {
    trading.updateTradeInfo();
}

function calculateTotal() {
    trading.calculateTotal();
}

function setAmount(value) {
    trading.setAmount(value);
}

function toggleLimitPrice() {
    trading.toggleLimitPrice();
}

function executeTrade() {
    trading.executeTrade();
}

function filterOrders(filter) {
    trading.filterOrders(filter);
}

function showPortfolio() {
    window.scrollTo({ top: document.getElementById('portfolioPanel').offsetTop - 100, behavior: 'smooth' });
}

function closeQuickStart() {
    const dontShowEl = document.getElementById('dontShowAgain');
    const modalEl = document.getElementById('quickStartModal');
    if (dontShowEl && dontShowEl.checked) {
        localStorage.setItem('hideQuickStart', 'true');
    }
    if (modalEl) modalEl.style.display = 'none';
}
