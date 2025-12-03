// Enhanced Features for Price Tracker

// Sound Manager for Alert Sounds
class SoundManager {
    constructor() {
        this.sounds = {
            up: this.createTone(800, 0.1),
            down: this.createTone(400, 0.1),
            alert: this.createTone(600, 0.2)
        };
    }

    createTone(frequency, duration) {
        return () => {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        };
    }

    play(type) {
        if (this.sounds[type]) {
            this.sounds[type]();
        }
    }
}

// Auto-Switch Manager
class AutoSwitchManager {
    constructor(tracker) {
        this.tracker = tracker;
        this.isActive = false;
        this.interval = null;
        this.currentIndex = 0;
    }

    start(intervalMs = 5000) {
        if (this.isActive) return;
        
        this.isActive = true;
        const assets = this.tracker.api.getUserSelectedAssets();
        
        this.interval = setInterval(() => {
            if (assets.length > 1) {
                this.currentIndex = (this.currentIndex + 1) % assets.length;
                this.tracker.switchAsset(assets[this.currentIndex]);
            }
        }, intervalMs);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isActive = false;
    }

    toggle() {
        if (this.isActive) {
            this.stop();
        } else {
            const interval = parseInt(document.getElementById('autoSwitchInterval')?.value || 5000);
            if (interval > 0) this.start(interval);
        }
    }
}

// Portfolio Calculator
class PortfolioCalculator {
    constructor(tracker) {
        this.tracker = tracker;
        this.holdings = JSON.parse(localStorage.getItem('portfolioHoldings') || '{}');
    }

    updateHolding(asset, quantity) {
        this.holdings[asset] = parseFloat(quantity) || 0;
        localStorage.setItem('portfolioHoldings', JSON.stringify(this.holdings));
        this.updateSummary();
    }

    calculateTotal() {
        let totalValue = 0;
        let totalChange = 0;

        Object.entries(this.holdings).forEach(([asset, quantity]) => {
            const price = this.tracker.allPrices[asset] || 0;
            const change = this.tracker.calculateChange(asset);
            const value = price * quantity;
            const changeValue = (value * change) / 100;

            totalValue += value;
            totalChange += changeValue;
        });

        return { totalValue, totalChange, changePercent: (totalChange / (totalValue - totalChange)) * 100 };
    }

    updateSummary() {
        const { totalValue, totalChange, changePercent } = this.calculateTotal();
        
        document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString()}`;
        const changeEl = document.getElementById('totalChange');
        changeEl.textContent = `${totalChange >= 0 ? '+' : ''}$${Math.abs(totalChange).toLocaleString()} (${changePercent.toFixed(2)}%)`;
        changeEl.className = totalChange >= 0 ? 'positive' : 'negative';
    }

    renderForm() {
        const form = document.getElementById('calcForm');
        const assets = this.tracker.api.getUserSelectedAssets();
        
        form.innerHTML = assets.map(asset => {
            const assetInfo = this.tracker.api.getAssetInfo(asset);
            const price = this.tracker.allPrices[asset] || 0;
            const holding = this.holdings[asset] || 0;
            
            return `
                <div class="calc-item">
                    <div class="asset-info">
                        <span>${assetInfo.emoji} ${assetInfo.name}</span>
                        <span class="asset-price">$${price.toLocaleString()}</span>
                    </div>
                    <input type="number" 
                           placeholder="Quantity" 
                           value="${holding}"
                           step="0.00001"
                           onchange="window.portfolioCalc.updateHolding('${asset}', this.value)">
                </div>
            `;
        }).join('');
        
        this.updateSummary();
    }
}

// Correlation Matrix Calculator
class CorrelationMatrix {
    constructor(tracker) {
        this.tracker = tracker;
    }

    calculateCorrelation(asset1, asset2) {
        const history1 = this.tracker.storage.loadHistory(asset1).slice(0, 30);
        const history2 = this.tracker.storage.loadHistory(asset2).slice(0, 30);
        
        if (history1.length < 10 || history2.length < 10) return 0;
        
        const prices1 = history1.map(h => h.price);
        const prices2 = history2.map(h => h.price);
        
        const n = Math.min(prices1.length, prices2.length);
        const mean1 = prices1.reduce((a, b) => a + b) / n;
        const mean2 = prices2.reduce((a, b) => a + b) / n;
        
        let numerator = 0;
        let sum1 = 0;
        let sum2 = 0;
        
        for (let i = 0; i < n; i++) {
            const diff1 = prices1[i] - mean1;
            const diff2 = prices2[i] - mean2;
            numerator += diff1 * diff2;
            sum1 += diff1 * diff1;
            sum2 += diff2 * diff2;
        }
        
        const denominator = Math.sqrt(sum1 * sum2);
        return denominator === 0 ? 0 : numerator / denominator;
    }

    render() {
        const assets = this.tracker.api.getUserSelectedAssets().slice(0, 6);
        const matrix = document.getElementById('correlationMatrix');
        
        let html = '<table class="correlation-table"><tr><th></th>';
        assets.forEach(asset => {
            const info = this.tracker.api.getAssetInfo(asset);
            html += `<th>${info.emoji}</th>`;
        });
        html += '</tr>';
        
        assets.forEach(asset1 => {
            const info1 = this.tracker.api.getAssetInfo(asset1);
            html += `<tr><td>${info1.emoji} ${info1.name}</td>`;
            
            assets.forEach(asset2 => {
                const correlation = asset1 === asset2 ? 1 : this.calculateCorrelation(asset1, asset2);
                const color = correlation > 0.5 ? 'strong-positive' : 
                             correlation > 0.2 ? 'positive' :
                             correlation < -0.5 ? 'strong-negative' :
                             correlation < -0.2 ? 'negative' : 'neutral';
                
                html += `<td class="correlation-cell ${color}">${correlation.toFixed(2)}</td>`;
            });
            html += '</tr>';
        });
        html += '</table>';
        
        matrix.innerHTML = html;
    }
}

// Mini Chart Generator
class MiniChart {
    static generate(prices, width = 60, height = 20) {
        if (!prices || prices.length < 2) return '';
        
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        const range = max - min || 1;
        
        let path = '';
        prices.forEach((price, i) => {
            const x = (i / (prices.length - 1)) * width;
            const y = height - ((price - min) / range) * height;
            path += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
        });
        
        return `<svg width="${width}" height="${height}" class="mini-chart">
                    <path d="${path}" stroke="currentColor" fill="none" stroke-width="1"/>
                </svg>`;
    }
}

// Global Functions
function quickRefresh() {
    window.universalTracker?.fetchAllPrices();
    window.soundManager?.play('alert');
}

function toggleFavorite() {
    const asset = window.universalTracker?.currentAsset;
    if (!asset) return;
    
    let favorites = JSON.parse(localStorage.getItem('favoriteAssets') || '[]');
    const index = favorites.indexOf(asset);
    
    if (index > -1) {
        favorites.splice(index, 1);
        window.universalTracker.notifications.info(`Removed ${asset.toUpperCase()} from favorites`);
    } else {
        favorites.push(asset);
        window.universalTracker.notifications.success(`Added ${asset.toUpperCase()} to favorites`);
    }
    
    localStorage.setItem('favoriteAssets', JSON.stringify(favorites));
}

function sharePrice() {
    const tracker = window.universalTracker;
    if (!tracker) return;
    
    const asset = tracker.api.getAssetInfo(tracker.currentAsset);
    const price = tracker.formatPrice(tracker.currentPrice, tracker.currentAsset);
    const change = tracker.calculateChange(tracker.currentAsset);
    
    const text = `${asset.emoji} ${asset.name}: ${price} (${change >= 0 ? '+' : ''}${change.toFixed(2)}%) - Basic Price Tracker`;
    
    if (navigator.share) {
        navigator.share({ title: 'Price Update', text, url: window.location.href });
    } else {
        navigator.clipboard.writeText(text);
        tracker.notifications.success('Price copied to clipboard!');
    }
}

function toggleAutoSwitch() {
    if (!window.autoSwitchManager) {
        window.autoSwitchManager = new AutoSwitchManager(window.universalTracker);
    }
    window.autoSwitchManager.toggle();
    
    const btn = document.querySelector('[onclick="toggleAutoSwitch()"]');
    btn.style.opacity = window.autoSwitchManager.isActive ? '1' : '0.6';
}

function togglePortfolioCalc() {
    const modal = document.getElementById('portfolioCalcModal');
    const isVisible = modal.style.display === 'block';
    modal.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        if (!window.portfolioCalc) {
            window.portfolioCalc = new PortfolioCalculator(window.universalTracker);
        }
        window.portfolioCalc.renderForm();
    }
}

// Initialize enhanced features
document.addEventListener('DOMContentLoaded', () => {
    window.soundManager = new SoundManager();
    
    // Add mini charts to portfolio cards
    const observer = new MutationObserver(() => {
        document.querySelectorAll('.asset-card').forEach(card => {
            if (!card.querySelector('.mini-chart')) {
                const asset = card.onclick?.toString().match(/'(\w+)'/)?.[1];
                if (asset) {
                    const history = window.universalTracker?.storage.loadHistory(asset) || [];
                    const prices = history.slice(0, 10).map(h => h.price);
                    if (prices.length > 1) {
                        const chartHtml = MiniChart.generate(prices);
                        const priceDiv = card.querySelector('[style*="font-size: 1.1em"]');
                        if (priceDiv) priceDiv.insertAdjacentHTML('afterend', chartHtml);
                    }
                }
            }
        });
    });
    
    observer.observe(document.getElementById('assetsGrid') || document.body, { childList: true, subtree: true });
});

// Enhanced alert system with sounds
if (window.universalTracker) {
    const originalCheckAlerts = window.universalTracker.checkPriceAlerts;
    window.universalTracker.checkPriceAlerts = function() {
        const result = originalCheckAlerts.call(this);
        if (result && result.length > 0) {
            window.soundManager?.play('alert');
        }
        return result;
    };
}