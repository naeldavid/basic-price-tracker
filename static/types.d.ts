// Type definitions for Basic Price Tracker v2.0

interface Asset {
  symbol: string;
  name: string;
  emoji: string;
  type: 'crypto' | 'metal' | 'currency' | 'bigmac';
}

interface PriceData {
  price: number;
  timestamp: string;
  change?: number;
  asset: string;
  volume?: number;
  marketCap?: number;
}

interface AlertConfig {
  id: string | number;
  asset: string;
  type: 'above' | 'below' | 'change_up' | 'change_down';
  value: number;
  message: string;
  active: boolean;
  created: string;
  triggered: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
}

interface PerformanceMetrics {
  apiCalls: number;
  successfulCalls: number;
  failedCalls: number;
  totalResponseTime: number;
  averageResponseTime: number;
  memoryUsage: any;
  cacheHits: number;
  cacheMisses: number;
  uptime: number;
  successRate: number;
  cacheHitRate: number;
}

interface UserSettings {
  theme: string;
  autoRefresh: boolean;
  refreshInterval: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  chartType: string;
  showAdvancedMetrics: boolean;
  compactView: boolean;
  animationsEnabled: boolean;
  language: string;
  timezone: string;
}

interface TechnicalIndicators {
  sma_5?: number;
  sma_10?: number;
  ema_5?: number;
  rsi?: number;
  volatility?: number;
  bollingerBands?: {
    upper: number;
    middle: number;
    lower: number;
  };
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
}

interface MarketSentiment {
  sentiment: string;
  confidence: number;
  rsi?: number;
  volatility?: number;
  trend?: number;
}

interface PricePrediction {
  value: number;
  confidence: number;
  method: string;
}

interface AnalyticsReport {
  asset: string;
  timestamp: string;
  currentPrice: number;
  analysis: TechnicalIndicators;
  patterns: any[];
  prediction: PricePrediction | null;
  sentiment: MarketSentiment;
  summary: string;
}

interface WebSocketConnection {
  ws: WebSocket;
  url: string;
  options: any;
}

interface CircuitBreaker {
  failures: number;
  threshold: number;
  timeout: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailure?: number;
}

interface NotificationOptions {
  type?: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
  actions?: Array<{
    label: string;
    callback: () => void;
  }>;
}

// Global interfaces
declare global {
  interface Window {
    universalTracker: UniversalTracker;
  }
}

// Class definitions
declare class WebSocketManager {
  connections: Map<string, WebSocketConnection>;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  isOnline: boolean;
  
  connect(url: string, options?: any): string | null;
  send(connectionId: string, data: any): boolean;
  closeAll(): void;
}

declare class PerformanceMonitor {
  metrics: PerformanceMetrics;
  startTime: number;
  observers: Array<(metrics: PerformanceMetrics) => void>;
  
  recordApiCall(responseTime: number, success?: boolean): void;
  recordCacheHit(hit?: boolean): void;
  getMetrics(): PerformanceMetrics;
  addObserver(callback: (metrics: PerformanceMetrics) => void): void;
  reset(): void;
}

declare class UniversalAPI {
  baseCurrency: string;
  assets: Record<string, Asset>;
  wsManager: WebSocketManager;
  performanceMonitor: PerformanceMonitor;
  circuitBreaker: CircuitBreaker;
  
  fetchPrice(asset: string): Promise<number>;
  fetchAllPrices(): Promise<Record<string, number>>;
  fetchNews(): Promise<any[]>;
  getUserSelectedAssets(): string[];
  saveUserSelection(assets: string[]): void;
  getAssetInfo(asset: string): Asset | undefined;
}

declare class DataStorage {
  saveHistory(history: PriceData[], asset?: string): void;
  loadHistory(asset?: string): PriceData[];
  saveSettings(settings: UserSettings): void;
  loadSettings(): UserSettings;
  exportData(): string | null;
  importData(jsonData: string): boolean;
}

declare class Analytics {
  calculateMovingAverage(prices: number[], period: number): number | null;
  calculateRSI(prices: number[], period?: number): number | null;
  calculateVolatility(prices: number[], period?: number): number;
  predictNextPrice(prices: number[], method?: string): PricePrediction | null;
  generateReport(asset: string, priceHistory: PriceData[]): AnalyticsReport | null;
  getMarketSentiment(priceHistory: PriceData[]): MarketSentiment;
}

declare class AlertSystem {
  alerts: AlertConfig[];
  
  addAlert(asset: string, type: string, value: number, message?: string): string | number;
  removeAlert(alertId: string | number): void;
  toggleAlert(alertId: string | number): void;
  checkAlerts(currentPrices: Record<string, number>, previousPrices?: Record<string, number>): AlertConfig[];
  getActiveAlerts(): AlertConfig[];
}

declare class ThemeManager {
  currentTheme: string;
  themes: Record<string, any>;
  
  applyTheme(themeName: string): void;
  getCurrentTheme(): string;
  getAvailableThemes(): Array<{ key: string; name: string }>;
}

declare class NotificationManager {
  show(message: string, type?: string, duration?: number, actions?: any[]): string;
  remove(id: string): void;
  success(message: string, duration?: number): string;
  error(message: string, duration?: number): string;
  warning(message: string, duration?: number): string;
  info(message: string, duration?: number): string;
}

declare class FullscreenManager {
  isFullscreen: boolean;
  toggle(): Promise<void>;
}

declare class UniversalTracker {
  currentAsset: string;
  currentCategory: string;
  currentPrice: number;
  allPrices: Record<string, number>;
  api: UniversalAPI;
  storage: DataStorage;
  analytics: Analytics;
  alerts: AlertSystem;
  themes: ThemeManager;
  notifications: NotificationManager;
  fullscreenManager: FullscreenManager;
  
  fetchAllPrices(): Promise<void>;
  updateDisplay(): void;
  switchAsset(asset: string): void;
  exportData(): void;
  importData(file: File): void;
}

// Global functions
declare function refreshPrice(): void;
declare function toggleHistory(): void;
declare function toggleSettings(): void;
declare function toggleNews(): void;
declare function toggleAdvanced(): void;
declare function toggleAlerts(): void;
declare function toggleFullscreen(): void;
declare function createAlert(): void;
declare function clearCache(): void;
declare function exportData(): void;
declare function importData(): void;

export {};