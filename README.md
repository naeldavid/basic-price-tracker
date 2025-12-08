# Basic Price Tracker - Full Trading Platform

A complete real-time trading platform for cryptocurrencies, precious metals, and currencies with live buy/sell functionality, portfolio management, and advanced analytics powered by Yahoo Finance APIs.

## Key Features

### Live Trading Platform
- **Buy & Sell Assets**: Real-time trading for crypto, metals, and currencies
- **Market Orders**: Instant execution at current market prices
- **Limit Orders**: Set your desired price points
- **Portfolio Management**: Track holdings, P&L, and performance
- **Order History**: Complete transaction records
- **Trading Fees**: Transparent 0.1% fee structure
- **Virtual Balance**: Start with $10,000 demo account

### Multi-Asset Support
- **Cryptocurrencies**: Bitcoin, Ethereum, BNB, Cardano, Solana, XRP, Polkadot, Dogecoin, Avalanche, Polygon
- **Precious Metals**: Gold, Silver, Platinum, Palladium
- **Major Currencies**: EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, AED, BHD
- **Big Mac Index**: Economic indicator across 5 countries

### Real-Time Data
- **Yahoo Finance Integration**: Live market data without API keys
- **No Cached Data**: Always fresh, real-time prices
- **Error Handling**: Clean failures with user notifications
- **Auto-Refresh**: Configurable update intervals

### Advanced Interface
- **Category Navigation**: Organized tabs for crypto, metals, currencies, economic indicators
- **Asset Selection**: Customizable tracking with setup wizard
- **Portfolio Management**: Separate tracking vs portfolio selection
- **Professional Design**: Inter font, square edges, business-grade appearance

### Analytics & Charts
- **Custom SVG Charts**: Multi-asset comparison with proper scaling
- **Technical Indicators**: RSI, Moving Averages, Volatility, MACD
- **Market Sentiment**: Trend analysis and predictions
- **Price History**: Comprehensive historical data tracking

### Smart Alerts
- **Multiple Alert Types**: Price thresholds, percentage changes
- **Browser Notifications**: Desktop alerts with sound
- **Visual Notifications**: In-app alert system
- **Alert History**: Track triggered alerts

### Themes & Customization
- **4 Professional Themes**: Dark, Light, Gold, Blue
- **Theme Switching**: Instant theme changes
- **Custom Animations**: Configurable coin rain animation
- **Responsive Design**: Mobile-optimized interface

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Refresh Prices |
| `H` | Toggle History |
| `S` | Toggle Settings |
| `N` | Toggle News |
| `A` | Toggle Advanced Mode |
| `R` | Refresh Data |
| `T` | Switch Theme |
| `Esc` | Close All Panels |
| `Alt+H` | Show Help |

---

## Trading Features

### Real-Time Trading
- **Live Market Data**: 30-second price updates
- **Instant Execution**: Market orders execute immediately
- **Smart Validation**: Prevents insufficient funds/holdings
- **Fee Calculation**: Automatic 0.1% trading fee
- **Quick Amount Buttons**: 0.1, 1, 10, or Max shortcuts

### Portfolio Analytics
- **Total Portfolio Value**: Real-time valuation
- **Profit & Loss Tracking**: Overall and per-asset P&L
- **Average Buy Price**: Automatic cost basis calculation
- **Holdings Overview**: All positions at a glance
- **Cash Management**: Available balance tracking

### Order Management
- **Order History**: Complete transaction log
- **Filter Options**: View all, buys, sells, or pending
- **Order Details**: Timestamp, price, amount, total
- **Status Tracking**: Completed and pending orders

---

## Technical Architecture

### Frontend Stack
- **Vanilla JavaScript**: Modular ES6+ architecture
- **Custom SVG Charts**: Multi-asset visualization
- **CSS Variables**: Dynamic theming system
- **LocalStorage**: Data persistence and settings
- **Service Worker Ready**: PWA capabilities

### API Integration
- **Yahoo Finance**: Primary data source for all assets
- **Real-Time Quotes**: Live market data
- **Symbol Mapping**: Crypto (BTC-USD), Metals (GC=F), Forex (EURUSD=X)
- **Error Recovery**: Graceful API failure handling

### Core Classes
```javascript
UniversalAPI        // Yahoo Finance integration
TradingPlatform     // Buy/sell execution engine
DataStorage         // LocalStorage with compression
Analytics           // Technical analysis & indicators
AlertSystem         // Notification management
ThemeManager        // Dynamic theme switching
CustomChart         // SVG-based charting
UniversalTracker    // Main application controller
CoinAnimation       // Background animations
```

---

## Features Breakdown

### Setup & Onboarding
- **User Registration**: Name input and welcome
- **Asset Selection**: Choose from 40+ assets across 4 categories
- **Guided Setup**: Step-by-step configuration
- **Instant Preview**: Real-time price display during setup

### Main Dashboard
- **Live Price Display**: Current prices with change indicators
- **Category Tabs**: Crypto, Metals, Currencies, Big Mac Index
- **Asset Grid**: Overview of all selected assets
- **Status Bar**: Connection status, update counter, last refresh

### Advanced Analytics
- **Technical Indicators**: RSI, MACD, Bollinger Bands
- **Moving Averages**: 5-day and 10-day calculations
- **Volatility Analysis**: Market risk assessment
- **Trend Detection**: Pattern recognition and predictions

### Portfolio Management
- **Asset Tracking**: Monitor selected assets
- **Portfolio Selection**: Separate investment tracking
- **Performance Metrics**: P&L calculations
- **Historical Analysis**: Price trend visualization

### Data Management
- **Export/Import**: JSON backup system
- **Auto-Backup**: Hourly data preservation
- **Settings Sync**: Cross-session configuration
- **Data Compression**: Efficient storage utilization

---

## Getting Started

1. **Open Application**: Launch `nael.openlab.fr/basic-price-tracker` in a modern browser
2. **Complete Setup**: Enter name and select assets to track
3. **Explore Dashboard**: Navigate categories and view real-time prices
4. **Start Trading**: Click "Trade Now" to access the trading platform
5. **Buy/Sell Assets**: Execute trades with your $10,000 virtual balance
6. **Monitor Portfolio**: Track your holdings and performance
7. **Customize Experience**: Adjust themes, alerts, and settings

---

## Supported Assets

### Cryptocurrencies (10)
- Bitcoin (BTC), Ethereum (ETH), Binance Coin (BNB)
- Cardano (ADA), Solana (SOL), Ripple (XRP)
- Polkadot (DOT), Dogecoin (DOGE), Avalanche (AVAX), Polygon (MATIC)

### Precious Metals (4)
- Gold (XAU), Silver (XAG), Platinum (XPT), Palladium (XPD)

### Major Currencies (10)
- EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, AED, BHD

### Economic Indicators (5)
- Big Mac Index: USA, UK, Japan, EU, Canada

---

## Configuration

### Theme Options
- **Dark**: Professional dark mode
- **Light**: Clean light interface
- **Gold**: Luxury gold theme
- **Blue**: Corporate blue design

### Alert Settings
- **Price Thresholds**: Above/below specific values
- **Percentage Changes**: Up/down movement alerts
- **Sound Notifications**: Configurable audio alerts
- **Browser Notifications**: Desktop notification support

### Performance Settings
- **Auto-Refresh**: 1-60 minute intervals
- **Animation Speed**: Coin rain customization
- **Data Retention**: Historical data limits
- **Compression**: Storage optimization

---

## Advanced Features

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and announcements
- **High Contrast**: Automatic detection and support
- **Reduced Motion**: Animation preferences respected

### Performance Monitoring
- **API Call Tracking**: Request monitoring
- **Success/Failure Rates**: Performance metrics
- **Response Time**: API latency tracking
- **Error Logging**: Comprehensive error handling

### Mobile Optimization
- **Touch Interface**: Mobile-friendly controls
- **Responsive Layout**: Adaptive design
- **Gesture Support**: Touch navigation
- **Offline Indicators**: Connection status

---

## Use Cases

- **Trading Practice**: Learn trading with virtual money
- **Portfolio Simulation**: Test investment strategies risk-free
- **Market Research**: Analyze trends and patterns
- **Educational Tool**: Learn about different asset classes
- **Professional Trading**: Monitor multiple markets simultaneously
- **Economic Analysis**: Big Mac Index and currency tracking
- **Day Trading Practice**: Execute multiple trades and track performance

---

## Privacy & Security

- **No External Accounts**: No registration required
- **Local Data Storage**: All data stored locally
- **No API Keys**: Free Yahoo Finance integration
- **Privacy First**: No user tracking or analytics

---

## Future Enhancements

- Additional asset classes (commodities, indices)
- Advanced charting tools and indicators
- Portfolio performance analytics
- Social features and market sentiment
- Mobile app development
- API rate limiting optimization

---

## File Structure

```
basic-price-tracker/
├── index.html          # Main dashboard
├── setup.html          # Onboarding wizard
├── buysell.html        # Trading platform
├── static/
│   ├── core.js         # Backend classes (2000+ lines)
│   ├── app.js          # Dashboard logic (2000+ lines)
│   ├── trading.js      # Trading engine
│   ├── trading.css     # Trading platform styles
│   └── style.css       # Main styling
└── README.md           # This file
```

---

## Trading Security

- **Virtual Trading**: All trades use demo money (no real funds)
- **Local Storage**: Portfolio data stored locally in browser
- **No Registration**: No account creation required
- **Privacy First**: No data sent to external servers
- **Reset Anytime**: Clear portfolio and start fresh

---

## Trading Statistics

- **Assets Available**: 40+ tradable assets
- **Asset Classes**: Crypto, Metals, Currencies, Economic Indicators
- **Starting Balance**: $10,000 virtual USD
- **Trading Fee**: 0.1% per transaction
- **Price Updates**: Every 30 seconds
- **Order Types**: Market and Limit orders

---

**Built with Vanilla JavaScript and Yahoo Finance APIs**

**Trade responsibly. This is a simulation platform for educational purposes.**
