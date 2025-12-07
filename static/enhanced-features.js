// ===== ENHANCED FEATURES =====

// Real-time Price Ticker
class PriceTicker {
    constructor() {
        this.container = null;
        this.isRunning = false;
        this.speed = 50;
        this.init();
    }

    init() {
        this.createTicker();
        this.startTicker();
    }

    createTicker() {
        this.container = document.createElement('div');
        this.container.id = 'priceTicker';
        this.container.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: var(--bg-secondary);
            border-top: 1px solid var(--accent-primary);
            overflow: hidden;
            z-index: 1000;
            display: flex;
            align-items: center;
        `;

        const tickerContent = document.createElement('div');
        tickerContent.id = 'tickerContent';
        tickerContent.style.cssText = `
            display: flex;
            animation: scroll 30s linear infinite;
            white-space: nowrap;
            gap: 40px;
        `;

        this.container.appendChild(tickerContent);
        document.body.appendChild(this.container);

        // Add CSS animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scroll {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
            }
        `;
        document.head.appendChild(style);
    }

    updateTicker(prices) {
        const content = document.getElementById('tickerContent');
        if (!content || !prices) return;

        const items = Object.entries(prices).map(([asset, price]) => {
            const assetInfo = window.universalTracker?.api.getAssetInfo(asset);
            if (!assetInfo) return '';
            
            const change = window.universalTracker?.calculateChange(asset) || 0;
            const changeClass = change >= 0 ? 'positive' : 'negative';
            
            return `
                <span class="ticker-item">
                    ${assetInfo.emoji} ${assetInfo.name}: 
                    <strong>${window.universalTracker?.formatPrice(price, asset) || '$0'}</strong>
                    <span class="${changeClass}">(${change >= 0 ? '+' : ''}${change.toFixed(2)}%)</span>
                </span>
            `;
        }).join('');

        content.innerHTML = items;
    }

    startTicker() {
        this.isRunning = true;
        setInterval(() => {
            if (window.universalTracker?.allPrices) {
                this.updateTicker(window.universalTracker.allPrices);
            }
        }, 5000);
    }

    toggle() {
        this.container.style.display = this.container.style.display === 'none' ? 'flex' : 'none';
    }
}

// Advanced Chart with Technical Indicators
class AdvancedChart extends CustomChart {
    constructor(containerId) {
        super(containerId);
        this.indicators = {
            sma: true,
            ema: false,
            bollinger: false,
            rsi: false
        };
        this.timeframe = '1d';
        this.chartType = 'candlestick';
    }

    renderCandlestick(data) {
        if (!data || !Array.isArray(data) || data.length === 0) return;

        const candleWidth = (this.width - this.margin.left - this.margin.right) / data.length * 0.8;
        
        data.forEach((candle, index) => {
            const x = this.margin.left + (index * (this.width - this.margin.left - this.margin.right) / data.length);
            const high = this.scales.y(candle.high);
            const low = this.scales.y(candle.low);
            const open = this.scales.y(candle.open);
            const close = this.scales.y(candle.close);
            
            const isGreen = candle.close > candle.open;
            const color = isGreen ? var(--positive) : var(--negative);
            
            // High-Low line
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', String(x + candleWidth / 2));
            line.setAttribute('y1', String(high));
            line.setAttribute('x2', String(x + candleWidth / 2));
            line.setAttribute('y2', String(low));
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '1');
            
            // Body rectangle
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', String(x));
            rect.setAttribute('y', String(Math.min(open, close)));
            rect.setAttribute('width', String(candleWidth));
            rect.setAttribute('height', String(Math.abs(close - open)));
            rect.setAttribute('fill', isGreen ? 'none' : color);
            rect.setAttribute('stroke', color);
            rect.setAttribute('stroke-width', '1');
            
            this.svg?.appendChild(line);
            this.svg?.appendChild(rect);
        });
    }

    addIndicator(type, params = {}) {
        this.indicators[type] = true;
        this.render();
    }

    removeIndicator(type) {
        this.indicators[type] = false;
        this.render();
    }
}

// Smart Notifications with Priority
class SmartNotificationManager extends NotificationManager {
    constructor() {
        super();
        this.priorities = {
            critical: 1,
            high: 2,
            medium: 3,
            low: 4
        };
        this.queue = [];
        this.isProcessing = false;
    }

    show(message, type = 'info', duration = 5000, priority = 'medium', actions = []) {
        const notification = {
            message,
            type,
            duration,
            priority: this.priorities[priority] || 3,
            actions,
            timestamp: Date.now()
        };

        this.queue.push(notification);
        this.queue.sort((a, b) => a.priority - b.priority);
        
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            const notification = this.queue.shift();
            await this.displayNotification(notification);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        this.isProcessing = false;
    }

    async displayNotification(notification) {
        return new Promise(resolve => {
            const id = super.show(
                notification.message,
                notification.type,
                notification.duration,
                notification.actions
            );
            
            setTimeout(resolve, notification.duration || 5000);
        });
    }

    critical(message, actions = []) {
        return this.show(message, 'error', 0, 'critical', actions);
    }

    high(message, duration = 8000) {
        return this.show(message, 'warning', duration, 'high');
    }
}

// Performance Analytics Dashboard
class PerformanceDashboard {
    constructor() {
        this.metrics = {
            loadTime: 0,
            apiResponseTime: [],
            memoryUsage: 0,
            errorRate: 0,
            cacheHitRate: 0
        };
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createDashboard();
        this.startMonitoring();
    }

    createDashboard() {
        const dashboard = document.createElement('div');
        dashboard.id = 'performanceDashboard';
        dashboard.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            width: 300px;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            z-index: 10000;
            display: none;
            font-size: 12px;
        `;

        dashboard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h4 style="margin: 0; color: var(--accent-primary);">Performance</h4>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="background: none; border: none; color: var(--text-primary); cursor: pointer;">×</button>
            </div>
            <div id="performanceMetrics"></div>
        `;

        document.body.appendChild(dashboard);
    }

    updateMetrics(newMetrics) {
        Object.assign(this.metrics, newMetrics);
        this.render();
    }

    render() {
        const container = document.getElementById('performanceMetrics');
        if (!container) return;

        const avgResponseTime = this.metrics.apiResponseTime.length > 0 
            ? this.metrics.apiResponseTime.reduce((a, b) => a + b, 0) / this.metrics.apiResponseTime.length 
            : 0;

        container.innerHTML = `
            <div style="margin: 8px 0;">
                <strong>Load Time:</strong> ${this.metrics.loadTime}ms
            </div>
            <div style="margin: 8px 0;">
                <strong>API Response:</strong> ${avgResponseTime.toFixed(0)}ms
            </div>
            <div style="margin: 8px 0;">
                <strong>Memory:</strong> ${this.metrics.memoryUsage}MB
            </div>
            <div style="margin: 8px 0;">
                <strong>Error Rate:</strong> ${this.metrics.errorRate.toFixed(1)}%
            </div>
            <div style="margin: 8px 0;">
                <strong>Cache Hit:</strong> ${this.metrics.cacheHitRate.toFixed(1)}%
            </div>
        `;
    }

    startMonitoring() {
        setInterval(() => {
            if (window.universalTracker?.performanceMetrics) {
                this.updateMetrics({
                    apiResponseTime: [window.universalTracker.performanceMetrics.averageResponseTime],
                    errorRate: window.universalTracker.performanceMetrics.failedUpdates / 
                              (window.universalTracker.performanceMetrics.successfulUpdates + window.universalTracker.performanceMetrics.failedUpdates) * 100
                });
            }

            if (performance.memory) {
                this.updateMetrics({
                    memoryUsage: Math.round(performance.memory.usedJSHeapSize / 1048576)
                });
            }
        }, 2000);
    }

    toggle() {
        const dashboard = document.getElementById('performanceDashboard');
        if (dashboard) {
            this.isVisible = !this.isVisible;
            dashboard.style.display = this.isVisible ? 'block' : 'none';
        }
    }
}

// Voice Commands
class VoiceCommands {
    constructor() {
        this.recognition = null;
        this.isListening = false;
        this.commands = {
            'refresh prices': () => window.universalTracker?.fetchAllPrices(),
            'show history': () => toggleHistory(),
            'open settings': () => toggleSettings(),
            'show news': () => toggleNews(),
            'switch theme': () => window.universalTracker?.themes.applyTheme(window.universalTracker.getNextTheme()),
            'show bitcoin': () => window.universalTracker?.switchAsset('btc'),
            'show gold': () => window.universalTracker?.switchAsset('gold'),
            'show ethereum': () => window.universalTracker?.switchAsset('eth')
        };
        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const command = event.results[0][0].transcript.toLowerCase();
                this.processCommand(command);
            };

            this.recognition.onerror = (event) => {
                console.warn('Speech recognition error:', event.error);
            };

            this.addVoiceButton();
        }
    }

    addVoiceButton() {
        const button = document.createElement('button');
        button.innerHTML = '🎤';
        button.className = 'btn-secondary';
        button.style.cssText = `
            position: fixed;
            bottom: 60px;
            right: 20px;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            z-index: 1000;
        `;
        button.onclick = () => this.toggleListening();
        document.body.appendChild(button);
    }

    toggleListening() {
        if (this.isListening) {
            this.recognition?.stop();
            this.isListening = false;
        } else {
            this.recognition?.start();
            this.isListening = true;
        }
    }

    processCommand(command) {
        const matchedCommand = Object.keys(this.commands).find(cmd => 
            command.includes(cmd.toLowerCase())
        );

        if (matchedCommand) {
            this.commands[matchedCommand]();
            window.universalTracker?.notifications?.success(`Executed: ${matchedCommand}`, 2000);
        } else {
            window.universalTracker?.notifications?.warning('Command not recognized', 2000);
        }
    }
}

// Market Sentiment Analyzer
class SentimentAnalyzer {
    constructor() {
        this.sentimentData = {};
        this.newsKeywords = {
            bullish: ['surge', 'rally', 'bull', 'rise', 'gain', 'up', 'high', 'positive'],
            bearish: ['crash', 'fall', 'bear', 'drop', 'decline', 'down', 'low', 'negative'],
            neutral: ['stable', 'steady', 'unchanged', 'flat', 'sideways']
        };
    }

    analyzeNews(articles) {
        if (!articles || !Array.isArray(articles)) return { sentiment: 'neutral', confidence: 50 };

        let bullishScore = 0;
        let bearishScore = 0;
        let totalWords = 0;

        articles.forEach(article => {
            const text = (article.title + ' ' + (article.description || '')).toLowerCase();
            const words = text.split(/\s+/);
            totalWords += words.length;

            words.forEach(word => {
                if (this.newsKeywords.bullish.some(keyword => word.includes(keyword))) {
                    bullishScore++;
                }
                if (this.newsKeywords.bearish.some(keyword => word.includes(keyword))) {
                    bearishScore++;
                }
            });
        });

        const totalSentimentWords = bullishScore + bearishScore;
        if (totalSentimentWords === 0) return { sentiment: 'neutral', confidence: 50 };

        const bullishRatio = bullishScore / totalSentimentWords;
        const confidence = Math.min(95, (totalSentimentWords / totalWords) * 100 * 10);

        if (bullishRatio > 0.6) {
            return { sentiment: 'bullish', confidence: Math.round(confidence) };
        } else if (bullishRatio < 0.4) {
            return { sentiment: 'bearish', confidence: Math.round(confidence) };
        } else {
            return { sentiment: 'neutral', confidence: Math.round(confidence) };
        }
    }

    displaySentiment(sentiment) {
        const container = document.getElementById('marketSentiment');
        if (!container) return;

        const emoji = {
            bullish: '🐂',
            bearish: '🐻',
            neutral: '😐'
        };

        const color = {
            bullish: 'var(--positive)',
            bearish: 'var(--negative)',
            neutral: 'var(--text-secondary)'
        };

        container.innerHTML = `
            <div style="text-align: center; padding: 16px; background: var(--bg-tertiary); border-radius: 8px;">
                <div style="font-size: 2em; margin-bottom: 8px;">${emoji[sentiment.sentiment]}</div>
                <div style="font-weight: 600; color: ${color[sentiment.sentiment]}; text-transform: capitalize;">
                    ${sentiment.sentiment} Sentiment
                </div>
                <div style="font-size: 0.9em; color: var(--text-secondary); margin-top: 4px;">
                    ${sentiment.confidence}% Confidence
                </div>
            </div>
        `;
    }
}

// Initialize Enhanced Features
document.addEventListener('DOMContentLoaded', () => {
    // Wait for main app to initialize
    setTimeout(() => {
        if (window.universalTracker) {
            // Initialize enhanced features
            window.priceTicker = new PriceTicker();
            window.smartNotifications = new SmartNotificationManager();
            window.performanceDashboard = new PerformanceDashboard();
            window.voiceCommands = new VoiceCommands();
            window.sentimentAnalyzer = new SentimentAnalyzer();

            // Replace default notification manager
            window.universalTracker.notifications = window.smartNotifications;

            console.log('Enhanced features initialized');
        }
    }, 2000);
});

// Global functions for enhanced features
function togglePerformanceDashboard() {
    window.performanceDashboard?.toggle();
}

function togglePriceTicker() {
    window.priceTicker?.toggle();
}

function startVoiceCommands() {
    window.voiceCommands?.toggleListening();
}