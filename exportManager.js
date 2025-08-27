class ExportManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.logger = window.Logger || console;
    }

    // CSV Export with UTF-8 BOM for proper German character encoding
    exportToCSV(transactions, filename = 'aldersbach_transactions.csv') {
        const timerId = this.logger.startTimer('csv_export');
        
        try {
            // Prepare CSV headers
            const headers = [
                'Date',
                'Entry (German)',
                'Amount',
                'Currency',
                'Type',
                'Florin Equivalent',
                'People/Places',
                'URI'
            ];
            
            // Convert transactions to CSV rows
            const rows = transactions.map(t => {
                const date = t.when || t.date || '';
                const entry = this.escapeCSV(t.entry || '');
                const amount = t.amount || '';
                const currency = t.currency || '';
                const type = t.type || 'Transfer';
                const florinEquiv = this.convertToFlorins(t.amount, t.currency).toFixed(2);
                const entities = this.extractEntities(t.entry || '').join('; ');
                const uri = t.uri || '';
                
                return [
                    date,
                    entry,
                    amount,
                    currency,
                    type,
                    florinEquiv,
                    entities,
                    uri
                ].join(',');
            });
            
            // Combine headers and rows
            const csvContent = [headers.join(','), ...rows].join('\n');
            
            // Add UTF-8 BOM for proper encoding of German characters
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            const duration = this.logger.endTimer(timerId, 'CSV export');
            this.logger.logExport('CSV', 'file', blob.size);
            this.logger.success(`Exported ${transactions.length} transactions to CSV`);
            
            return true;
            
        } catch (error) {
            this.logger.error('CSV export failed', {
                error: error.message,
                transactionCount: transactions.length
            });
            return false;
        }
    }

    // JSON Export with full metadata
    exportToJSON(transactions, metadata = {}, filename = 'aldersbach_transactions.json') {
        const timerId = this.logger.startTimer('json_export');
        
        try {
            // Prepare export data with metadata
            const exportData = {
                metadata: {
                    exportDate: new Date().toISOString(),
                    source: 'Aldersbach Monastery Financial Dashboard',
                    recordCount: transactions.length,
                    dateRange: this.getDateRange(transactions),
                    currencies: this.getUniqueCurrencies(transactions),
                    ...metadata
                },
                transactions: transactions.map(t => ({
                    date: t.when || t.date || null,
                    entry: t.entry || '',
                    amount: t.amount || null,
                    currency: t.currency || null,
                    type: t.type || 'Transfer',
                    florinEquivalent: this.convertToFlorins(t.amount, t.currency),
                    entities: this.extractEntities(t.entry || ''),
                    uri: t.uri || null,
                    raw: t.raw || null
                })),
                statistics: {
                    totalValue: this.calculateTotalValue(transactions),
                    averageTransaction: this.calculateAverageTransaction(transactions),
                    currencyDistribution: this.getCurrencyDistribution(transactions),
                    monthlyAverages: this.getMonthlyAverages(transactions)
                }
            };
            
            // Convert to JSON with pretty printing
            const jsonContent = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            const duration = this.logger.endTimer(timerId, 'JSON export');
            this.logger.logExport('JSON', 'file', blob.size);
            this.logger.success(`Exported ${transactions.length} transactions to JSON with metadata`);
            
            return true;
            
        } catch (error) {
            this.logger.error('JSON export failed', {
                error: error.message,
                transactionCount: transactions.length
            });
            return false;
        }
    }

    // Helper function to escape CSV special characters
    escapeCSV(str) {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    }

    // Helper function to convert currency to florins
    convertToFlorins(amount, currency) {
        if (!amount || !currency) return 0;
        
        const conversionRates = {
            'f': 1,
            's': 0.05,
            'd': 0.004167,
            'gr': 0.0625,
            't': 0.5,
            'l': 1,
            'p': 0.004167
        };
        
        return amount * (conversionRates[currency] || 1);
    }

    // Helper function to extract entities from German text
    extractEntities(text) {
        const entities = [];
        
        // Extract person names (simplified pattern for medieval German names)
        const namePattern = /\b[A-ZÄÖÜ][a-zäöüß]+\s+(?:von\s+)?[A-ZÄÖÜ][a-zäöüß]+\b/g;
        const names = text.match(namePattern);
        if (names) {
            entities.push(...names);
        }
        
        // Extract place names (common patterns)
        const placePattern = /\b(?:zu|von|aus|in)\s+([A-ZÄÖÜ][a-zäöüß]+)\b/g;
        let match;
        while ((match = placePattern.exec(text)) !== null) {
            entities.push(match[1]);
        }
        
        // Extract commodity mentions (common medieval trade goods)
        const commodities = ['Korn', 'Weizen', 'Gerste', 'Hafer', 'Wein', 'Bier', 'Holz', 'Salz', 'Fleisch', 'Käse'];
        commodities.forEach(commodity => {
            if (text.includes(commodity)) {
                entities.push(commodity);
            }
        });
        
        return [...new Set(entities)]; // Remove duplicates
    }

    // Helper function to get date range
    getDateRange(transactions) {
        const dates = transactions
            .map(t => t.when || t.date)
            .filter(d => d)
            .map(d => new Date(d));
        
        if (dates.length === 0) return null;
        
        return {
            start: new Date(Math.min(...dates)).toISOString(),
            end: new Date(Math.max(...dates)).toISOString()
        };
    }

    // Helper function to get unique currencies
    getUniqueCurrencies(transactions) {
        return [...new Set(transactions.map(t => t.currency).filter(c => c))];
    }

    // Helper function to calculate total value in florins
    calculateTotalValue(transactions) {
        return transactions.reduce((sum, t) => {
            return sum + this.convertToFlorins(t.amount, t.currency);
        }, 0);
    }

    // Helper function to calculate average transaction value
    calculateAverageTransaction(transactions) {
        const total = this.calculateTotalValue(transactions);
        return transactions.length > 0 ? total / transactions.length : 0;
    }

    // Helper function to get currency distribution
    getCurrencyDistribution(transactions) {
        const distribution = {};
        
        transactions.forEach(t => {
            if (t.currency) {
                if (!distribution[t.currency]) {
                    distribution[t.currency] = { count: 0, totalValue: 0 };
                }
                distribution[t.currency].count++;
                distribution[t.currency].totalValue += this.convertToFlorins(t.amount, t.currency);
            }
        });
        
        return distribution;
    }

    // Helper function to get monthly averages
    getMonthlyAverages(transactions) {
        const monthlyData = {};
        
        transactions.forEach(t => {
            if (t.when) {
                const date = new Date(t.when);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { count: 0, total: 0 };
                }
                
                monthlyData[monthKey].count++;
                monthlyData[monthKey].total += this.convertToFlorins(t.amount, t.currency);
            }
        });
        
        // Calculate averages
        Object.keys(monthlyData).forEach(key => {
            const data = monthlyData[key];
            monthlyData[key].average = data.count > 0 ? data.total / data.count : 0;
        });
        
        return monthlyData;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExportManager;
}