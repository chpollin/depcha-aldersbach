class AlderbachDashboard {
    constructor() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentPage = 1;
        this.transactionsPerPage = 50;
        this.charts = {};
        this.logger = window.Logger;
        
        this.logger.info('Dashboard constructor started');
        
        this.initializeElements();
        this.bindEvents();
        this.initializeCharts();
        
        this.logger.success('Dashboard initialized successfully');
    }

    initializeElements() {
        this.fileSelect = document.getElementById('fileSelect');
        this.loadButton = document.getElementById('loadData');
        this.searchBox = document.getElementById('searchBox');
        this.currencyFilter = document.getElementById('currencyFilter');
        this.sortBy = document.getElementById('sortBy');
        this.loading = document.getElementById('loading');
        this.transactionsBody = document.getElementById('transactionsBody');
        this.prevButton = document.getElementById('prevPage');
        this.nextButton = document.getElementById('nextPage');
        this.pageInfo = document.getElementById('pageInfo');
        
        this.totalTransactions = document.getElementById('totalTransactions');
        this.totalValue = document.getElementById('totalValue');
        this.dateRange = document.getElementById('dateRange');
        this.uniquePeople = document.getElementById('uniquePeople');
        
        // Chart elements
        this.timelineCanvas = document.getElementById('timelineChart');
        this.currencyCanvas = document.getElementById('currencyChart');
        this.timelineAggregation = document.getElementById('timelineAggregation');
        this.currencyMetric = document.getElementById('currencyMetric');
        this.timelineExport = document.getElementById('timelineExport');
        this.currencyExport = document.getElementById('currencyExport');
    }

    bindEvents() {
        this.loadButton.addEventListener('click', () => this.loadData());
        this.searchBox.addEventListener('input', () => this.applyFilters());
        this.currencyFilter.addEventListener('change', () => this.applyFilters());
        this.sortBy.addEventListener('change', () => this.applyFilters());
        this.prevButton.addEventListener('click', () => this.changePage(-1));
        this.nextButton.addEventListener('click', () => this.changePage(1));
        
        // Chart events
        this.timelineAggregation.addEventListener('change', () => this.updateTimelineChart());
        this.currencyMetric.addEventListener('change', () => this.updateCurrencyChart());
        this.timelineExport.addEventListener('click', () => this.exportChart('timeline'));
        this.currencyExport.addEventListener('click', () => this.exportChart('currency'));
    }

    async loadData() {
        const selectedFile = this.fileSelect.value;
        if (!selectedFile) {
            this.logger.warn('No file selected for loading');
            alert('Please select a data file');
            return;
        }

        const timerId = this.logger.startTimer('data_load');
        this.logger.info('Starting data load', { file: selectedFile });

        this.loading.style.display = 'block';
        this.transactionsBody.innerHTML = '<tr><td colspan="5" class="no-data">Loading...</td></tr>';

        try {
            const response = await fetch(selectedFile);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const xmlText = await response.text();
            const fileSize = new Blob([xmlText]).size;
            
            this.logger.debug('XML data fetched', { 
                fileSize: `${Math.round(fileSize / 1024)}KB`,
                xmlLength: xmlText.length 
            });
            
            this.parseXMLData(xmlText);
            this.applyFilters();
            this.updateStats();
            this.updateCharts();
            
            const duration = this.logger.endTimer(timerId, 'data loading');
            this.logger.logDataLoad(selectedFile, this.transactions.length, duration);
            
        } catch (error) {
            this.logger.error('Data loading failed', { 
                file: selectedFile,
                error: error.message,
                stack: error.stack
            });
            this.transactionsBody.innerHTML = `<tr><td colspan="5" class="error">Error loading data: ${error.message}<br>Please ensure the data files are accessible.</td></tr>`;
        } finally {
            this.loading.style.display = 'none';
        }
    }

    parseXMLData(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        const transactions = xmlDoc.querySelectorAll('bk\\:Transaction, Transaction');
        this.transactions = [];

        transactions.forEach((transaction, index) => {
            try {
                const entry = this.getTextContent(transaction, 'entry');
                const when = this.validateAndParseDate(this.getTextContent(transaction, 'when'));
                
                // Extract money amounts and currencies with validation
                const moneyElements = transaction.querySelectorAll('bk\\:Money, Money');
                let amounts = [];
                let totalFlorinValue = 0;

                moneyElements.forEach(money => {
                    try {
                        const quantityText = this.getTextContent(money, 'quantity');
                        const unitElement = money.querySelector('bk\\:unit') || money.querySelector('unit');
                        let currency = 'unknown';
                        
                        if (unitElement) {
                            const unitResource = unitElement.getAttribute('rdf:resource');
                            if (unitResource) {
                                currency = unitResource.split('#').pop(); // Extract currency code
                            }
                        }
                        
                        // Validate and parse quantity
                        if (quantityText && currency !== 'unknown') {
                            const amount = this.validateNumericValue(quantityText);
                            if (amount !== null && this.isValidCurrency(currency)) {
                                amounts.push({ amount, currency });
                                totalFlorinValue += this.convertToFlorin(amount, currency);
                            }
                        }
                    } catch (error) {
                        this.logger.debug('Money element parsing error', { 
                            error: error.message,
                            transactionIndex: index
                        });
                    }
                });

                // Determine transaction type
                let type = 'trade';
                const entryLower = entry.toLowerCase();
                if (entryLower.includes('recepimus') || entryLower.includes('einnahmen')) {
                    type = 'income';
                } else if (entryLower.includes('für') || entryLower.includes('dabimus')) {
                    type = 'expense';
                }

                // Extract people/places from entry
                const people = this.extractPeopleAndPlaces(entry);

                if (entry) {  // Only add transactions with entry text
                    this.transactions.push({
                        id: `T${index + 1}`,
                        date: when || '',
                        entry: entry,
                        amounts: amounts,
                        totalFlorinValue: totalFlorinValue,
                        type: type,
                        people: people
                    });
                }
            } catch (error) {
                this.logger.warn(`Transaction parsing error`, { 
                    transactionIndex: index,
                    error: error.message 
                });
            }
        });

        this.logger.success(`XML parsing completed`, {
            totalTransactions: this.transactions.length,
            validTransactions: this.transactions.filter(t => t.entry).length,
            transactionsWithDates: this.transactions.filter(t => t.date).length
        });
    }

    getTextContent(element, tagName) {
        // Try namespaced version first, then fallback to non-namespaced
        let found = element.querySelector(`bk\\:${tagName}`) || 
                   element.querySelector(tagName) ||
                   element.getElementsByTagName(`bk:${tagName}`)[0] ||
                   element.getElementsByTagName(tagName)[0];
        return found ? found.textContent.trim() : '';
    }

    validateAndParseDate(dateString) {
        if (!dateString || dateString === '') return '';
        
        try {
            // Handle various date formats
            let normalizedDate = dateString;
            
            // Check if it's already in ISO format (YYYY-MM-DD)
            if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
                const year = parseInt(normalizedDate.substring(0, 4));
                
                // Validate reasonable date range for monastery records (1200-1800)
                if (year >= 1200 && year <= 1800) {
                    return normalizedDate;
                }
            }
            
            // Try to parse other common formats
            const date = new Date(normalizedDate);
            
            // Check if date is valid and within reasonable range
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                if (year >= 1200 && year <= 1800) {
                    return date.toISOString().split('T')[0];
                }
            }
            
            this.logger.debug('Invalid date found, skipping', { 
                originalDate: dateString,
                reason: 'Outside valid range (1200-1800)'
            });
            
            return ''; // Return empty string for invalid dates
            
        } catch (error) {
            this.logger.warn('Date parsing error', { 
                dateString: dateString,
                error: error.message 
            });
            return '';
        }
    }

    validateNumericValue(valueString) {
        if (!valueString || valueString.trim() === '') return null;
        
        try {
            const numValue = parseFloat(valueString.trim());
            
            // Check for reasonable bounds (avoid extreme values)
            if (isNaN(numValue) || numValue < 0 || numValue > 100000) {
                this.logger.debug('Invalid numeric value', { value: valueString });
                return null;
            }
            
            return numValue;
        } catch (error) {
            this.logger.debug('Numeric parsing error', { 
                value: valueString,
                error: error.message 
            });
            return null;
        }
    }

    isValidCurrency(currency) {
        const validCurrencies = ['f', 's', 'd', 'gr', 't', 'l', 'p'];
        return validCurrencies.includes(currency);
    }

    convertToFlorin(amount, currency) {
        // Rough historical conversion rates to florin
        const rates = {
            'f': 1,      // florin base
            's': 1/30,   // ~30 shillings per florin
            'd': 1/240,  // ~240 denarius per florin
            'gr': 1/20,  // ~20 groschen per florin
            't': 1/8,    // ~8 talents per florin (estimated)
            'l': 1/4,    // ~4 libra per florin (estimated)
            'p': 1/240   // same as denarius
        };
        
        const rate = rates[currency];
        if (rate === undefined) {
            this.logger.debug('Unknown currency conversion', { currency });
            return 0;
        }
        
        return amount * rate;
    }

    extractPeopleAndPlaces(text) {
        // Simple regex to find capitalized names and places
        const matches = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g);
        return matches ? matches.filter(match => 
            match.length > 2 && 
            !['Item', 'Maii', 'Aprilis', 'Anno'].includes(match)
        ) : [];
    }

    applyFilters() {
        let filtered = [...this.transactions];

        // Search filter
        const searchTerm = this.searchBox.value.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.entry.toLowerCase().includes(searchTerm) ||
                t.people.some(p => p.toLowerCase().includes(searchTerm))
            );
        }

        // Currency filter
        const currency = this.currencyFilter.value;
        if (currency) {
            filtered = filtered.filter(t => 
                t.amounts.some(a => a.currency === currency)
            );
        }

        // Sort
        const sortBy = this.sortBy.value;
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return (b.date || '9999').localeCompare(a.date || '9999');
                case 'amount':
                    return b.totalFlorinValue - a.totalFlorinValue;
                case 'entry':
                    return a.entry.localeCompare(b.entry);
                default:
                    return 0;
            }
        });

        this.filteredTransactions = filtered;
        this.currentPage = 1;
        this.renderTransactions();
        this.updatePagination();
    }

    renderTransactions() {
        if (this.filteredTransactions.length === 0) {
            this.transactionsBody.innerHTML = '<tr><td colspan="5" class="no-data">No transactions found</td></tr>';
            return;
        }

        const start = (this.currentPage - 1) * this.transactionsPerPage;
        const end = start + this.transactionsPerPage;
        const pageTransactions = this.filteredTransactions.slice(start, end);

        const searchTerm = this.searchBox.value.toLowerCase();
        
        this.transactionsBody.innerHTML = pageTransactions.map(transaction => {
            let entryText = transaction.entry;
            
            // Highlight search terms
            if (searchTerm) {
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                entryText = entryText.replace(regex, '<span class="highlight">$1</span>');
            }

            // Format amounts
            const amountDisplay = transaction.amounts.length > 0 
                ? transaction.amounts.map(a => `${a.amount}`).join(' + ')
                : '-';
                
            const currencyDisplay = transaction.amounts.length > 0
                ? [...new Set(transaction.amounts.map(a => a.currency))].join(', ')
                : '-';

            return `
                <tr>
                    <td class="date">${transaction.date || 'N/A'}</td>
                    <td class="entry-text">${entryText}</td>
                    <td class="amount">${amountDisplay}</td>
                    <td><span class="currency">${currencyDisplay}</span></td>
                    <td><span class="transaction-type type-${transaction.type}">${transaction.type}</span></td>
                </tr>
            `;
        }).join('');
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.transactionsPerPage);
        
        this.prevButton.disabled = this.currentPage <= 1;
        this.nextButton.disabled = this.currentPage >= totalPages;
        this.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
    }

    changePage(direction) {
        this.currentPage += direction;
        this.renderTransactions();
        this.updatePagination();
    }

    updateStats() {
        // Total transactions
        this.totalTransactions.textContent = this.transactions.length.toLocaleString();

        // Total value in florins
        const totalValue = this.transactions.reduce((sum, t) => sum + t.totalFlorinValue, 0);
        this.totalValue.textContent = totalValue.toFixed(0);

        // Date range
        const dates = this.transactions.filter(t => t.date).map(t => t.date).sort();
        if (dates.length > 0) {
            this.dateRange.textContent = dates.length > 1 
                ? `${dates[0]} to ${dates[dates.length - 1]}`
                : dates[0];
        } else {
            this.dateRange.textContent = 'N/A';
        }

        // Unique people/places
        const allPeople = new Set();
        this.transactions.forEach(t => {
            t.people.forEach(p => allPeople.add(p));
        });
        this.uniquePeople.textContent = allPeople.size;
    }

    initializeCharts() {
        try {
            // Check if Chart.js is available
            if (typeof Chart === 'undefined') {
                this.logger.error('Chart.js library not loaded');
                return;
            }

            // Check if canvas elements exist
            if (!this.timelineCanvas || !this.currencyCanvas) {
                this.logger.error('Chart canvas elements not found');
                return;
            }

            // Medieval color scheme for charts
            this.medievalColors = {
                primary: '#8B4513',
                secondary: '#A0522D', 
                tertiary: '#CD853F',
                quaternary: '#D2691E',
                accent: '#B8860B',
                backgrounds: [
                    'rgba(139, 69, 19, 0.8)',
                    'rgba(160, 82, 45, 0.8)',
                    'rgba(205, 133, 63, 0.8)',
                    'rgba(210, 105, 30, 0.8)',
                    'rgba(184, 134, 11, 0.8)'
                ]
            };

            this.initializeTimelineChart();
            this.initializeCurrencyChart();
            
            this.logger.success('Charts initialized successfully');
            
        } catch (error) {
            this.logger.error('Chart initialization failed', {
                error: error.message,
                stack: error.stack
            });
            
            // Set fallback for missing charts
            this.charts = { timeline: null, currency: null };
        }
    }

    initializeTimelineChart() {
        try {
            const ctx = this.timelineCanvas.getContext('2d');
            
            this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Transaction Value (Florins)',
                    data: [],
                    borderColor: this.medievalColors.primary,
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: this.medievalColors.primary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Monastery Financial Activity Over Time',
                        color: this.medievalColors.primary,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        labels: { color: this.medievalColors.primary }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(139, 69, 19, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            title: (context) => {
                                const date = new Date(context[0].parsed.x);
                                return date.toLocaleDateString('en-GB', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                });
                            },
                            label: (context) => {
                                return `${context.parsed.y.toFixed(2)} florins (${this.getTransactionCount(context.parsed.x)} transactions)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'month',
                            displayFormats: {
                                month: 'MMM yyyy'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Date',
                            color: this.medievalColors.primary
                        },
                        grid: { color: 'rgba(139, 69, 19, 0.1)' },
                        ticks: { color: this.medievalColors.primary }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Value (Florins)',
                            color: this.medievalColors.primary
                        },
                        grid: { color: 'rgba(139, 69, 19, 0.1)' },
                        ticks: { color: this.medievalColors.primary }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
            
            this.logger.debug('Timeline chart created successfully');
            
        } catch (error) {
            this.logger.error('Timeline chart creation failed', {
                error: error.message,
                stack: error.stack
            });
            this.charts.timeline = null;
        }
    }

    initializeCurrencyChart() {
        try {
            const ctx = this.currencyCanvas.getContext('2d');
            
            this.charts.currency = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Florin (f)', 'Shilling (s)', 'Denarius (d)', 'Groschen (gr)'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: this.medievalColors.backgrounds,
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Currency Distribution in Monastery Records',
                        color: this.medievalColors.primary,
                        font: { size: 16, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: this.medievalColors.primary,
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(139, 69, 19, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                const metric = this.currencyMetric.value === 'value' ? 'florins' : 'transactions';
                                return `${context.label}: ${context.parsed.toFixed(2)} ${metric} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
            
            this.logger.debug('Currency chart created successfully');
            
        } catch (error) {
            this.logger.error('Currency chart creation failed', {
                error: error.message,
                stack: error.stack
            });
            this.charts.currency = null;
        }
    }

    updateCharts() {
        if (this.transactions.length === 0) return;
        
        this.updateTimelineChart();
        this.updateCurrencyChart();
    }

    updateTimelineChart() {
        const timerId = this.logger.startTimer('timeline_update');
        const aggregation = this.timelineAggregation.value;
        const timelineData = this.aggregateTimelineData(this.filteredTransactions, aggregation);
        
        this.charts.timeline.data.datasets[0].data = timelineData;
        this.charts.timeline.options.scales.x.time.unit = aggregation;
        this.charts.timeline.update();
        
        const duration = this.logger.endTimer(timerId, 'timeline chart update');
        this.logger.logChartUpdate('timeline', timelineData.length, duration);
    }

    updateCurrencyChart() {
        const timerId = this.logger.startTimer('currency_update');
        const metric = this.currencyMetric.value;
        const currencyData = this.aggregateCurrencyData(this.filteredTransactions, metric);
        
        this.charts.currency.data.datasets[0].data = [
            currencyData.f,
            currencyData.s, 
            currencyData.d,
            currencyData.gr
        ];
        
        const metricLabel = metric === 'value' ? 'Value Distribution' : 'Transaction Count Distribution';
        this.charts.currency.options.plugins.title.text = `Currency ${metricLabel} in Monastery Records`;
        this.charts.currency.update();
        
        const duration = this.logger.endTimer(timerId, 'currency chart update');
        this.logger.logChartUpdate('currency', 4, duration);
    }

    aggregateTimelineData(transactions, unit) {
        const data = new Map();
        
        transactions.forEach(transaction => {
            if (!transaction.date) return;
            
            const date = new Date(transaction.date);
            let key;
            
            switch(unit) {
                case 'day':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                    break;
                case 'year':
                    key = `${date.getFullYear()}-01-01`;
                    break;
                default:
                    key = date.toISOString().split('T')[0];
            }
            
            if (!data.has(key)) {
                data.set(key, 0);
            }
            
            data.set(key, data.get(key) + transaction.totalFlorinValue);
        });
        
        return Array.from(data.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, value]) => ({
                x: date,
                y: value
            }));
    }

    aggregateCurrencyData(transactions, metric) {
        const totals = { f: 0, s: 0, d: 0, gr: 0 };
        
        transactions.forEach(transaction => {
            transaction.amounts.forEach(amount => {
                if (totals.hasOwnProperty(amount.currency)) {
                    if (metric === 'value') {
                        totals[amount.currency] += this.convertToFlorin(amount.amount, amount.currency);
                    } else {
                        totals[amount.currency] += 1;
                    }
                }
            });
        });
        
        return totals;
    }

    getTransactionCount(dateString) {
        const targetDate = new Date(dateString).toISOString().split('T')[0];
        return this.filteredTransactions.filter(t => t.date && t.date.startsWith(targetDate)).length;
    }

    exportChart(chartType) {
        const chart = this.charts[chartType];
        if (!chart) {
            this.logger.warn('Chart export failed - chart not found', { chartType });
            return;
        }
        
        const timerId = this.logger.startTimer('chart_export');
        
        try {
            // Create download link
            const url = chart.toBase64Image('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `aldersbach-${chartType}-chart.png`;
            link.href = url;
            link.click();
            
            const duration = this.logger.endTimer(timerId, 'chart export');
            const size = Math.round(url.length * 0.75); // Rough base64 to bytes conversion
            
            this.logger.logExport(chartType, 'PNG', size);
            this.showNotification(`${chartType} chart exported successfully!`, 'success');
            
        } catch (error) {
            this.logger.error('Chart export failed', { 
                chartType,
                error: error.message,
                stack: error.stack
            });
            this.showNotification('Failed to export chart', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
            border-radius: 8px;
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Override applyFilters to update charts
    applyFilters() {
        const timerId = this.logger.startTimer('apply_filters');
        const searchTerm = this.searchBox.value.toLowerCase();
        
        let filtered = [...this.transactions];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.entry.toLowerCase().includes(searchTerm) ||
                t.people.some(p => p.toLowerCase().includes(searchTerm))
            );
        }

        // Currency filter
        const currency = this.currencyFilter.value;
        if (currency) {
            filtered = filtered.filter(t => 
                t.amounts.some(a => a.currency === currency)
            );
        }

        // Sort
        const sortBy = this.sortBy.value;
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return (b.date || '9999').localeCompare(a.date || '9999');
                case 'amount':
                    return b.totalFlorinValue - a.totalFlorinValue;
                case 'entry':
                    return a.entry.localeCompare(b.entry);
                default:
                    return 0;
            }
        });

        this.filteredTransactions = filtered;
        this.currentPage = 1;
        this.renderTransactions();
        this.updatePagination();
        
        // Update charts with filtered data
        if (this.charts.timeline && this.charts.currency) {
            this.updateCharts();
        }
        
        const duration = this.logger.endTimer(timerId, 'filter application');
        
        if (searchTerm) {
            this.logger.logSearch(searchTerm, filtered.length, duration);
        }
        
        this.logger.debug('Filters applied', {
            searchTerm: searchTerm || 'none',
            currencyFilter: currency || 'none',
            sortBy: sortBy,
            resultCount: filtered.length,
            originalCount: this.transactions.length
        });
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardInstance = new AlderbachDashboard();
    
    // Enable performance monitoring in development
    if (window.location.hostname === 'localhost') {
        window.performanceMonitor.startMonitoring();
    }
    
    // Log initialization complete
    window.Logger.success('Application ready for use', {
        mode: window.location.hostname === 'localhost' ? 'development' : 'production',
        debugUtilities: 'Available in console: debugUtils.*'
    });
});