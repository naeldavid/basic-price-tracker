// Error checking and fixes for Basic Price Tracker

// Fix common JavaScript errors
(function() {
    'use strict';
    
    // Add error boundary for the entire application
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 10000;
            max-width: 300px;
            font-size: 14px;
        `;
        errorDiv.innerHTML = `
            <strong>Error:</strong> ${event.error?.message || 'An unexpected error occurred'}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; color: white; font-size: 18px; cursor: pointer;">×</button>
        `;
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 10000);
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        event.preventDefault(); // Prevent the default browser behavior
    });
    
    // Ensure DOM is ready before initializing
    function initializeApp() {
        try {
            // Check if required elements exist
            const requiredElements = ['mainApp', 'currentPrice', 'assetsGrid'];
            const missingElements = requiredElements.filter(id => !document.getElementById(id));
            
            if (missingElements.length > 0) {
                console.warn('Missing required elements:', missingElements);
                return;
            }
            
            // Initialize the app if not already initialized
            if (!window.universalTracker) {
                console.log('Initializing Universal Price Tracker...');
                window.universalTracker = new UniversalTracker();
            }
        } catch (error) {
            console.error('Failed to initialize app:', error);
            
            // Show fallback UI
            const mainApp = document.getElementById('mainApp');
            if (mainApp) {
                mainApp.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: var(--text-primary);">
                        <h2>⚠️ Application Error</h2>
                        <p>The application failed to load properly.</p>
                        <button onclick="window.location.reload()" style="padding: 10px 20px; background: var(--accent-primary); color: #333; border: none; border-radius: 5px; cursor: pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
        }
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }
    
    // Add polyfills for older browsers
    if (!Array.prototype.includes) {
        Array.prototype.includes = function(searchElement) {
            return this.indexOf(searchElement) !== -1;
        };
    }
    
    if (!String.prototype.includes) {
        String.prototype.includes = function(search) {
            return this.indexOf(search) !== -1;
        };
    }
    
    // Fix for missing fetch in older browsers
    if (!window.fetch) {
        console.warn('Fetch API not supported, using XMLHttpRequest fallback');
        window.fetch = function(url, options = {}) {
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open(options.method || 'GET', url);
                
                if (options.headers) {
                    Object.keys(options.headers).forEach(key => {
                        xhr.setRequestHeader(key, options.headers[key]);
                    });
                }
                
                xhr.onload = () => {
                    resolve({
                        ok: xhr.status >= 200 && xhr.status < 300,
                        status: xhr.status,
                        statusText: xhr.statusText,
                        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                        text: () => Promise.resolve(xhr.responseText)
                    });
                };
                
                xhr.onerror = () => reject(new Error('Network error'));
                xhr.send(options.body);
            });
        };
    }
    
})();