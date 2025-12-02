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
        
        // Update portfolio metrics
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