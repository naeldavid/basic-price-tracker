// ===== LOGGING UTILITY =====
class Logger {
    constructor() {
        this.isProduction = window.location.hostname !== 'localhost' && 
                           !window.location.hostname.includes('127.0.0.1') &&
                           !window.location.hostname.includes('dev');
        this.logLevel = this.isProduction ? 'error' : 'debug';
        this.logs = [];
        this.maxLogs = 100;
    }

    setLevel(level) {
        this.logLevel = level;
    }

    _shouldLog(level) {
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        return levels[level] >= levels[this.logLevel];
    }

    _formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        return {
            timestamp,
            level,
            message,
            data,
            url: window.location.href
        };
    }

    _saveLog(logEntry) {
        this.logs.unshift(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
    }

    debug(message, data = null) {
        if (!this._shouldLog('debug')) return;
        
        const logEntry = this._formatMessage('debug', message, data);
        this._saveLog(logEntry);
        
        if (!this.isProduction) {
            console.log(`%c[DEBUG] ${message}`, 'color: #3b82f6', data || '');
        }
    }

    info(message, data = null) {
        if (!this._shouldLog('info')) return;
        
        const logEntry = this._formatMessage('info', message, data);
        this._saveLog(logEntry);
        
        if (!this.isProduction) {
            console.info(`%c[INFO] ${message}`, 'color: #10b981', data || '');
        }
    }

    warn(message, data = null) {
        if (!this._shouldLog('warn')) return;
        
        const logEntry = this._formatMessage('warn', message, data);
        this._saveLog(logEntry);
        
        console.warn(`[WARN] ${message}`, data || '');
    }

    error(message, error = null) {
        if (!this._shouldLog('error')) return;
        
        const logEntry = this._formatMessage('error', message, {
            error: error?.message,
            stack: error?.stack
        });
        this._saveLog(logEntry);
        
        console.error(`[ERROR] ${message}`, error || '');
        
        // In production, could send to error tracking service
        if (this.isProduction) {
            this._reportError(logEntry);
        }
    }

    _reportError(logEntry) {
        // Placeholder for error reporting service integration
        // Example: Send to Sentry, LogRocket, etc.
        try {
            const errorData = JSON.stringify(logEntry);
            // Store in localStorage for later retrieval
            const errors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            errors.unshift(logEntry);
            localStorage.setItem('errorLogs', JSON.stringify(errors.slice(0, 50)));
        } catch (e) {
            // Silently fail if can't report
        }
    }

    getLogs(level = null) {
        if (level) {
            return this.logs.filter(log => log.level === level);
        }
        return this.logs;
    }

    clearLogs() {
        this.logs = [];
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    performance(label, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        this.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        
        return result;
    }

    async performanceAsync(label, fn) {
        const start = performance.now();
        const result = await fn();
        const duration = performance.now() - start;
        
        this.debug(`Performance: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        
        return result;
    }
}

// Create global logger instance
window.logger = new Logger();

// Replace console methods in production
if (window.logger.isProduction) {
    const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error
    };

    console.log = (...args) => window.logger.debug(args.join(' '));
    console.info = (...args) => window.logger.info(args.join(' '));
    console.warn = (...args) => window.logger.warn(args.join(' '));
    console.error = (...args) => window.logger.error(args.join(' '));
}
