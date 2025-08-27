class AlderbachDashboard {
    constructor() {
        this.transactions = [];
        this.filteredTransactions = [];
        this.currentPage = 1;
        this.transactionsPerPage = 50;
        this.charts = {
            timeline: null,
            currency: null,
            histogram: null,
            seasonal: null
        };
        this.logger = window.Logger;
        
        this.logger.info('Dashboard constructor started');
        
        // Initialize export manager
        this.exportManager = new ExportManager(this);
        
        this.initializeElements();
        this.bindEvents();
        this.initializeCharts();
        
        this.logger.success('Dashboard initialized successfully');
        
        // Make dashboard globally accessible for compatibility
        window.dashboard = this;
        
        // Add error reporting to help debug issues
        window.onerror = (msg, url, line, col, error) => {
            this.logger.error('JavaScript error caught', {
                message: msg,
                source: url,
                line: line,
                column: col,
                error: error ? error.stack : 'No error object'
            });
            return false;
        };
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
        this.histogramCanvas = document.getElementById('histogramChart');
        this.seasonalCanvas = document.getElementById('seasonalChart');
        this.timelineAggregation = document.getElementById('timelineAggregation');
        this.currencyMetric = document.getElementById('currencyMetric');
        this.histogramBuckets = document.getElementById('histogramBuckets');
        this.histogramCurrency = document.getElementById('histogramCurrency');
        this.seasonalView = document.getElementById('seasonalView');
        this.timelineExport = document.getElementById('timelineExport');
        this.currencyExport = document.getElementById('currencyExport');
        this.histogramExport = document.getElementById('histogramExport');
        this.seasonalExport = document.getElementById('seasonalExport');
        this.timelineReset = document.getElementById('timelineReset');
        
        // Modal elements
        this.modal = document.getElementById('transactionModal');
        this.modalClose = document.getElementById('modalClose');
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // Export buttons
        this.exportCSVBtn = document.getElementById('exportCSV');
        this.exportJSONBtn = document.getElementById('exportJSON');
        this.exportPDFBtn = document.getElementById('exportPDF');
        
        // Check if modal elements exist
        if (!this.modal || !this.modalClose) {
            this.logger.warn('Modal elements not found, modal functionality may not work');
        }
    }

    bindEvents() {
        this.loadButton.addEventListener('click', () => this.loadData());
        this.searchBox.addEventListener('input', () => this.applyFilters());
        this.currencyFilter.addEventListener('change', () => this.applyFilters());
        this.sortBy.addEventListener('change', () => this.applyFilters());
        this.prevButton.addEventListener('click', () => this.changePage(-1));
        this.nextButton.addEventListener('click', () => this.changePage(1));
        
        // Chart events
        if (this.timelineAggregation) {
            this.timelineAggregation.addEventListener('change', () => this.updateTimelineChart());
        }
        if (this.currencyMetric) {
            this.currencyMetric.addEventListener('change', () => this.updateCurrencyChart());
        }
        if (this.histogramBuckets) {
            this.histogramBuckets.addEventListener('change', () => this.updateHistogramChart());
        }
        if (this.histogramCurrency) {
            this.histogramCurrency.addEventListener('change', () => this.updateHistogramChart());
        }
        if (this.seasonalView) {
            this.seasonalView.addEventListener('change', () => this.updateSeasonalChart());
        }
        if (this.timelineExport) {
            this.timelineExport.addEventListener('click', () => this.exportChart('timeline'));
        }
        if (this.currencyExport) {
            this.currencyExport.addEventListener('click', () => this.exportChart('currency'));
        }
        if (this.histogramExport) {
            this.histogramExport.addEventListener('click', () => this.exportChart('histogram'));
        }
        if (this.seasonalExport) {
            this.seasonalExport.addEventListener('click', () => this.exportChart('seasonal'));
        }
        if (this.timelineReset) {
            this.timelineReset.addEventListener('click', () => this.resetTimelineZoom());
        }
        
        // Add chart reset zoom functionality
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' && e.ctrlKey && this.charts.timeline) {
                this.resetTimelineZoom();
            }
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeTransactionModal();
            }
        });
        
        // Export events
        if (this.exportCSVBtn) {
            this.exportCSVBtn.addEventListener('click', () => this.handleCSVExport());
        }
        if (this.exportJSONBtn) {
            this.exportJSONBtn.addEventListener('click', () => this.handleJSONExport());
        }
        if (this.exportPDFBtn) {
            this.exportPDFBtn.addEventListener('click', () => this.handlePDFExport());
        }
        
        // Modal events
        if (this.modalClose) {
            this.modalClose.addEventListener('click', () => this.closeTransactionModal());
        }
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.closeTransactionModal();
                }
            });
        }
        
        // Event delegation for Details buttons in transaction table
        this.transactionsBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('action-btn')) {
                const transactionId = parseInt(e.target.dataset.transactionId);
                if (!isNaN(transactionId)) {
                    this.openTransactionModal(transactionId);
                }
            }
        });
        
        // Tab switching
        if (this.tabBtns.length > 0) {
            this.tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabName = btn.dataset.tab;
                    this.switchModalTab(tabName);
                });
            });
        }
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
        this.transactionsBody.innerHTML = '<tr><td colspan="6" class="no-data">Loading...</td></tr>';

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
                    const transactionId = this.transactions.length;
                    this.transactions.push({
                        id: transactionId,
                        originalId: `T${index + 1}`,
                        date: when || '',
                        entry: entry,
                        amounts: amounts,
                        totalFlorinValue: totalFlorinValue,
                        type: type,
                        people: people,
                        rawXML: transaction ? transaction.outerHTML : ''
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
            this.transactionsBody.innerHTML = '<tr><td colspan="6" class="no-data">No transactions found</td></tr>';
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
                    <td><button class="action-btn" data-transaction-id="${transaction.id}">Details</button></td>
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

            // Register the zoom plugin - try multiple possible references
            let zoomPluginRegistered = false;
            
            if (typeof window.ChartZoom !== 'undefined') {
                Chart.register(window.ChartZoom);
                this.logger.info('Chart zoom plugin registered successfully (window.ChartZoom)');
                zoomPluginRegistered = true;
            } else if (typeof ChartZoom !== 'undefined') {
                Chart.register(ChartZoom);
                this.logger.info('Chart zoom plugin registered successfully (ChartZoom)');
                zoomPluginRegistered = true;
            } else if (window.chartjs && window.chartjs.plugins && window.chartjs.plugins.zoom) {
                Chart.register(window.chartjs.plugins.zoom);
                this.logger.info('Chart zoom plugin registered successfully (chartjs.plugins.zoom)');
                zoomPluginRegistered = true;
            } else {
                this.logger.warn('Chart zoom plugin not available, zoom functionality disabled');
            }
            
            this.zoomPluginAvailable = zoomPluginRegistered;
            
            this.initializeTimelineChart();
            this.initializeCurrencyChart();
            this.initializeHistogramChart();
            this.initializeSeasonalChart();
            
            this.logger.success('Charts initialized successfully');
            
        } catch (error) {
            this.logger.error('Chart initialization failed', {
                error: error.message,
                stack: error.stack
            });
            
            // Set fallback for missing charts
            this.charts = { timeline: null, currency: null, histogram: null, seasonal: null };
        }
    }

    initializeTimelineChart() {
        try {
            const ctx = this.timelineCanvas.getContext('2d');
            
            // Check if zoom plugin is available
            const zoomConfig = this.zoomPluginAvailable ? {
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                        onZoomComplete: ({chart}) => {
                            this.logger.info('Chart zoomed', {
                                xMin: chart.scales.x.min,
                                xMax: chart.scales.x.max
                            });
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                        onPanComplete: ({chart}) => {
                            this.logger.info('Chart panned', {
                                xMin: chart.scales.x.min,
                                xMax: chart.scales.x.max
                            });
                        }
                    },
                    limits: {
                        x: {min: 'original', max: 'original'}
                    }
                }
            } : {};
            
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
                                const dateStr = new Date(context.parsed.x).toLocaleDateString();
                                const transactionCount = this.getTransactionCountForDate(context.parsed.x);
                                const avgAmount = this.getAverageAmountForDate(context.parsed.x);
                                return [
                                    `Total: ${context.parsed.y.toFixed(2)} florins`,
                                    `Transactions: ${transactionCount}`,
                                    `Average: ${avgAmount.toFixed(2)} florins`,
                                    `Click to filter by this date`
                                ];
                            },
                            afterLabel: (context) => {
                                const data = context.dataset.data[context.dataIndex];
                                if (data.originalEntry) {
                                    return `Entry: ${data.originalEntry.substring(0, 50)}...`;
                                }
                                return '';
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
                },
                onClick: (event, activeElements) => {
                    if (activeElements.length > 0) {
                        const elementIndex = activeElements[0].index;
                        const datasetIndex = activeElements[0].datasetIndex;
                        const data = this.charts.timeline.data.datasets[datasetIndex].data[elementIndex];
                        
                        // Filter by clicked date
                        const date = new Date(data.x);
                        const dateStr = date.toISOString().split('T')[0];
                        this.searchBox.value = dateStr;
                        this.applyFilters();
                        
                        // Scroll to filtered results
                        this.transactionTable.scrollIntoView({ behavior: 'smooth' });
                        
                        this.logger.info('Timeline click - filtering by date', { date: dateStr });
                    }
                },
                plugins: Object.keys(zoomConfig).length > 0 ? zoomConfig : {}
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

    initializeHistogramChart() {
        try {
            if (!this.histogramCanvas) {
                this.logger.warn('Histogram canvas element not found');
                return;
            }
            
            const ctx = this.histogramCanvas.getContext('2d');
            
            this.charts.histogram = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Transaction Count',
                        data: [],
                        backgroundColor: 'rgba(139, 69, 19, 0.6)',
                        borderColor: this.medievalColors.primary,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Distribution of Transaction Amounts',
                            color: this.medievalColors.primary,
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(139, 69, 19, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            callbacks: {
                                title: (context) => {
                                    return `Amount Range: ${context[0].label}`;
                                },
                                label: (context) => {
                                    const percentage = ((context.parsed.y / this.filteredTransactions.length) * 100).toFixed(1);
                                    return [
                                        `Transactions: ${context.parsed.y}`,
                                        `Percentage: ${percentage}%`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Amount Range (Florins)',
                                color: this.medievalColors.primary
                            },
                            grid: { color: 'rgba(139, 69, 19, 0.1)' },
                            ticks: { 
                                color: this.medievalColors.primary,
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Number of Transactions',
                                color: this.medievalColors.primary
                            },
                            grid: { color: 'rgba(139, 69, 19, 0.1)' },
                            ticks: { color: this.medievalColors.primary }
                        }
                    }
                }
            });
            
            this.logger.debug('Histogram chart created successfully');
            
        } catch (error) {
            this.logger.error('Histogram chart creation failed', {
                error: error.message,
                stack: error.stack
            });
            this.charts.histogram = null;
        }
    }

    initializeSeasonalChart() {
        try {
            if (!this.seasonalCanvas) {
                this.logger.warn('Seasonal canvas element not found');
                return;
            }
            
            const ctx = this.seasonalCanvas.getContext('2d');
            
            this.charts.seasonal = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Average Transaction Value',
                        data: [],
                        borderColor: this.medievalColors.primary,
                        backgroundColor: 'rgba(139, 69, 19, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }, {
                        label: 'Transaction Count',
                        data: [],
                        borderColor: this.medievalColors.secondary,
                        backgroundColor: 'rgba(139, 69, 19, 0.05)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Seasonal Transaction Patterns',
                            color: this.medievalColors.primary,
                            font: { size: 16, weight: 'bold' }
                        },
                        legend: {
                            labels: { color: this.medievalColors.primary }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(139, 69, 19, 0.9)',
                            titleColor: '#fff',
                            bodyColor: '#fff'
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Period',
                                color: this.medievalColors.primary
                            },
                            grid: { color: 'rgba(139, 69, 19, 0.1)' },
                            ticks: { color: this.medievalColors.primary }
                        },
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Average Value (Florins)',
                                color: this.medievalColors.primary
                            },
                            grid: { color: 'rgba(139, 69, 19, 0.1)' },
                            ticks: { color: this.medievalColors.primary }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Transaction Count',
                                color: this.medievalColors.secondary
                            },
                            grid: { drawOnChartArea: false },
                            ticks: { color: this.medievalColors.secondary }
                        }
                    }
                }
            });
            
            this.logger.debug('Seasonal chart created successfully');
            
        } catch (error) {
            this.logger.error('Seasonal chart creation failed', {
                error: error.message,
                stack: error.stack
            });
            this.charts.seasonal = null;
        }
    }

    updateCharts() {
        if (this.transactions.length === 0) return;
        
        this.updateTimelineChart();
        this.updateCurrencyChart();
        this.updateHistogramChart();
        this.updateSeasonalChart();
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

    updateHistogramChart() {
        const timerId = this.logger.startTimer('histogram_update');
        
        if (!this.charts.histogram || !this.histogramBuckets || !this.histogramCurrency) return;
        
        const bucketCount = parseInt(this.histogramBuckets.value);
        const selectedCurrency = this.histogramCurrency.value;
        
        // Extract all individual amounts from the RDF data structure
        let allAmounts = [];
        this.filteredTransactions.forEach(t => {
            if (t.amounts && t.amounts.length > 0) {
                t.amounts.forEach(amountObj => {
                    if (selectedCurrency === 'all' || amountObj.currency === selectedCurrency) {
                        allAmounts.push(amountObj.amount);
                    }
                });
            }
        });
        
        // Filter out invalid amounts
        const amounts = allAmounts.filter(a => a > 0);
        if (amounts.length === 0) {
            this.charts.histogram.data.labels = [];
            this.charts.histogram.data.datasets[0].data = [];
            this.charts.histogram.update();
            return;
        }
        
        const minAmount = Math.min(...amounts);
        const maxAmount = Math.max(...amounts);
        const bucketSize = (maxAmount - minAmount) / bucketCount;
        
        // Create buckets
        const buckets = new Array(bucketCount).fill(0);
        const labels = [];
        
        for (let i = 0; i < bucketCount; i++) {
            const rangeStart = minAmount + (i * bucketSize);
            const rangeEnd = minAmount + ((i + 1) * bucketSize);
            labels.push(`${rangeStart.toFixed(1)}-${rangeEnd.toFixed(1)}`);
            
            // Count transactions in this bucket
            amounts.forEach(amount => {
                if (amount >= rangeStart && amount < rangeEnd) {
                    buckets[i]++;
                } else if (i === bucketCount - 1 && amount >= rangeStart) {
                    // Include max value in last bucket
                    buckets[i]++;
                }
            });
        }
        
        // Update chart
        this.charts.histogram.data.labels = labels;
        this.charts.histogram.data.datasets[0].data = buckets;
        
        const currencyLabel = selectedCurrency === 'all' ? 'All Currencies' : selectedCurrency.toUpperCase();
        this.charts.histogram.options.plugins.title.text = `Distribution of Transaction Amounts (${currencyLabel})`;
        this.charts.histogram.update();
        
        const duration = this.logger.endTimer(timerId, 'histogram chart update');
        this.logger.logChartUpdate('histogram', bucketCount, duration);
    }

    updateSeasonalChart() {
        const timerId = this.logger.startTimer('seasonal_update');
        
        if (!this.charts.seasonal || !this.seasonalView) return;
        
        const view = this.seasonalView.value;
        let labels = [];
        let avgValues = [];
        let counts = [];
        
        if (view === 'monthly') {
            // Group by month
            const monthlyData = new Map();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            
            // Initialize all months
            monthNames.forEach((month, idx) => {
                monthlyData.set(idx, { total: 0, count: 0 });
            });
            
            this.filteredTransactions.forEach(t => {
                if (t.date) {  // Using 'date' from RDF structure, not 'when'
                    const month = new Date(t.date).getMonth();
                    const data = monthlyData.get(month);
                    // Sum all amounts (converted to florins) from the transaction
                    const transactionTotal = t.totalFlorinValue || 0;
                    data.total += transactionTotal;
                    data.count++;
                }
            });
            
            monthNames.forEach((month, idx) => {
                const data = monthlyData.get(idx);
                labels.push(month);
                avgValues.push(data.count > 0 ? data.total / data.count : 0);
                counts.push(data.count);
            });
            
        } else if (view === 'quarterly') {
            // Group by quarter
            const quarterlyData = new Map();
            const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
            
            quarterNames.forEach((quarter, idx) => {
                quarterlyData.set(idx, { total: 0, count: 0 });
            });
            
            this.filteredTransactions.forEach(t => {
                if (t.date) {  // Using 'date' from RDF structure
                    const month = new Date(t.date).getMonth();
                    const quarter = Math.floor(month / 3);
                    const data = quarterlyData.get(quarter);
                    // Use totalFlorinValue from RDF data
                    data.total += t.totalFlorinValue || 0;
                    data.count++;
                }
            });
            
            quarterNames.forEach((quarter, idx) => {
                const data = quarterlyData.get(idx);
                labels.push(quarter);
                avgValues.push(data.count > 0 ? data.total / data.count : 0);
                counts.push(data.count);
            });
            
        } else if (view === 'weekday') {
            // Group by day of week
            const weekdayData = new Map();
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            dayNames.forEach((day, idx) => {
                weekdayData.set(idx, { total: 0, count: 0 });
            });
            
            this.filteredTransactions.forEach(t => {
                if (t.date) {  // Using 'date' from RDF structure
                    const dayOfWeek = new Date(t.date).getDay();
                    const data = weekdayData.get(dayOfWeek);
                    // Use totalFlorinValue from RDF data
                    data.total += t.totalFlorinValue || 0;
                    data.count++;
                }
            });
            
            dayNames.forEach((day, idx) => {
                const data = weekdayData.get(idx);
                labels.push(day);
                avgValues.push(data.count > 0 ? data.total / data.count : 0);
                counts.push(data.count);
            });
        }
        
        // Update chart
        this.charts.seasonal.data.labels = labels;
        this.charts.seasonal.data.datasets[0].data = avgValues;
        this.charts.seasonal.data.datasets[1].data = counts;
        
        const viewLabel = view.charAt(0).toUpperCase() + view.slice(1);
        this.charts.seasonal.options.plugins.title.text = `${viewLabel} Transaction Patterns`;
        this.charts.seasonal.update();
        
        const duration = this.logger.endTimer(timerId, 'seasonal chart update');
        this.logger.logChartUpdate('seasonal', labels.length, duration);
    }

    resetTimelineZoom() {
        if (this.charts.timeline) {
            if (typeof this.charts.timeline.resetZoom === 'function') {
                this.charts.timeline.resetZoom();
                this.logger.info('Timeline chart zoom reset');
            } else {
                this.logger.warn('Zoom reset not available - zoom plugin not loaded');
                // Fallback: recreate the chart
                this.updateTimelineChart();
            }
        }
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

    // Helper function to get transaction count for a specific date timestamp
    getTransactionCountForDate(timestamp) {
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        return this.filteredTransactions.filter(t => {
            if (!t.when) return false;
            const tDate = new Date(t.when);
            const tDateStr = tDate.toISOString().split('T')[0];
            return tDateStr === dateStr;
        }).length;
    }

    // Helper function to get average amount for a specific date timestamp
    getAverageAmountForDate(timestamp) {
        const date = new Date(timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTransactions = this.filteredTransactions.filter(t => {
            if (!t.when) return false;
            const tDate = new Date(t.when);
            const tDateStr = tDate.toISOString().split('T')[0];
            return tDateStr === dateStr;
        });
        
        if (dayTransactions.length === 0) return 0;
        
        const total = dayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        return total / dayTransactions.length;
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

    openTransactionModal(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) {
            this.logger.warn('Transaction not found for modal', { id: transactionId });
            return;
        }
        
        this.logger.info('Opening transaction modal', { 
            id: transactionId, 
            originalId: transaction.originalId 
        });
        
        // Fill overview tab
        document.getElementById('modalDate').textContent = transaction.date || 'Unknown';
        document.getElementById('modalAmount').textContent = 
            transaction.amounts.length > 0 
                ? transaction.amounts.map(a => `${a.amount} ${a.currency}`).join(', ')
                : 'Not specified';
        document.getElementById('modalCurrency').textContent = 
            transaction.amounts.length > 0
                ? [...new Set(transaction.amounts.map(a => a.currency))].join(', ')
                : 'None';
        document.getElementById('modalType').textContent = transaction.type || 'Unknown';
        document.getElementById('modalEntry').textContent = transaction.entry || 'No entry text';
        
        // Fill raw XML tab
        document.getElementById('modalXML').textContent = 
            transaction.rawXML || 'No raw XML data available';
        
        // Fill entities tab
        this.loadEntitiesTab(transaction);
        
        // Fill related transactions tab
        this.loadRelatedTab(transaction);
        
        // Show modal and switch to overview tab
        this.modal.style.display = 'block';
        this.switchModalTab('overview');
    }
    
    closeTransactionModal() {
        this.modal.style.display = 'none';
        this.logger.info('Transaction modal closed');
    }
    
    // Export handlers
    handleCSVExport() {
        if (this.filteredTransactions.length === 0) {
            this.showNotification('No transactions to export', 'warning');
            return;
        }
        
        const filename = `aldersbach_transactions_${new Date().toISOString().split('T')[0]}.csv`;
        const success = this.exportManager.exportToCSV(this.filteredTransactions, filename);
        
        if (success) {
            this.showNotification(`Exported ${this.filteredTransactions.length} transactions to CSV`, 'success');
        } else {
            this.showNotification('CSV export failed', 'error');
        }
    }
    
    handleJSONExport() {
        if (this.filteredTransactions.length === 0) {
            this.showNotification('No transactions to export', 'warning');
            return;
        }
        
        const metadata = {
            searchQuery: this.searchBox.value,
            currencyFilter: this.currencyFilter.value,
            sortBy: this.sortBy.value,
            totalTransactions: this.transactions.length,
            filteredTransactions: this.filteredTransactions.length
        };
        
        const filename = `aldersbach_transactions_${new Date().toISOString().split('T')[0]}.json`;
        const success = this.exportManager.exportToJSON(this.filteredTransactions, metadata, filename);
        
        if (success) {
            this.showNotification(`Exported ${this.filteredTransactions.length} transactions to JSON with metadata`, 'success');
        } else {
            this.showNotification('JSON export failed', 'error');
        }
    }
    
    handlePDFExport() {
        this.showNotification('PDF export coming soon!', 'info');
        // This will be implemented when jsPDF is integrated
    }
    
    switchModalTab(tabName) {
        // Update tab buttons
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab contents
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
        
        this.logger.debug('Modal tab switched', { tab: tabName });
    }
    
    loadEntitiesTab(transaction) {
        const entitiesDiv = document.getElementById('modalEntities');
        
        if (!transaction.entry) {
            entitiesDiv.innerHTML = '<div class="no-data">No text available for entity extraction</div>';
            return;
        }
        
        const text = transaction.entry;
        const entities = {
            people: [],
            places: [],
            commodities: [],
            amounts: []
        };
        
        // Extract person names (medieval German patterns)
        const namePatterns = [
            /\b([A-ZÄÖÜ][a-zäöüß]+)\s+(?:von\s+)?([A-ZÄÖÜ][a-zäöüß]+)\b/g,
            /\b([A-ZÄÖÜ][a-zäöüß]+)\s+([A-ZÄÖÜ][a-zäöüß]+mann|mayer|bauer|schmidt|müller|weber)\b/gi,
            /\bHerr\s+([A-ZÄÖÜ][a-zäöüß]+)\b/g
        ];
        
        namePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const fullName = match[0];
                if (!entities.people.includes(fullName)) {
                    entities.people.push(fullName);
                }
            }
        });
        
        // Extract place names
        const placePatterns = [
            /\b(?:zu|von|aus|in|nach)\s+([A-ZÄÖÜ][a-zäöüß]+)\b/g,
            /\b(Aldersbach|München|Regensburg|Passau|Landshut)\b/gi
        ];
        
        placePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const place = match[1] || match[0];
                if (!entities.places.includes(place)) {
                    entities.places.push(place);
                }
            }
        });
        
        // Extract commodities
        const commodityKeywords = [
            'Korn', 'Weizen', 'Gerste', 'Hafer', 'Wein', 'Bier',
            'Holz', 'Salz', 'Fleisch', 'Käse', 'Butter',
            'Rind', 'Schwein', 'Schaf', 'Leder', 'Wolle', 'Tuch'
        ];
        
        commodityKeywords.forEach(commodity => {
            const regex = new RegExp(`\\b${commodity}\\b`, 'gi');
            if (regex.test(text)) {
                entities.commodities.push(commodity);
            }
        });
        
        // Build HTML display
        let html = '<div class="entities-container">';
        
        if (entities.people.length > 0) {
            html += '<div class="entity-section"><h4>👥 People</h4>';
            entities.people.forEach(person => {
                html += `<div class="entity-item">👤 ${person}</div>`;
            });
            html += '</div>';
        }
        
        if (entities.places.length > 0) {
            html += '<div class="entity-section"><h4>📍 Places</h4>';
            entities.places.forEach(place => {
                html += `<div class="entity-item">🏛️ ${place}</div>`;
            });
            html += '</div>';
        }
        
        if (entities.commodities.length > 0) {
            html += '<div class="entity-section"><h4>📦 Commodities</h4>';
            entities.commodities.forEach(commodity => {
                html += `<div class="entity-item">🌾 ${commodity}</div>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
        
        if (entities.people.length === 0 && entities.places.length === 0 && entities.commodities.length === 0) {
            html = '<div class="no-entities">No entities could be extracted from this transaction.</div>';
        }
        
        entitiesDiv.innerHTML = html;
    }
    
    loadRelatedTab(transaction) {
        const relatedDiv = document.getElementById('modalRelated');
        
        // Extract entities from current transaction for comparison
        const currentEntities = this.extractEntitiesFromText(transaction.entry || '');
        
        // Find related transactions
        const related = this.transactions.filter(t => {
            if (t === transaction) return false;
            
            let score = 0;
            
            // Date proximity (within 7 days)
            if (transaction.date && t.date) {
                const date1 = new Date(transaction.date);
                const date2 = new Date(t.date);
                const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
                if (daysDiff <= 7) score += 2;
                if (daysDiff <= 1) score += 3;
            }
            
            // Similar total florin values (within 20%)
            if (transaction.totalFlorinValue && t.totalFlorinValue) {
                const ratio = Math.min(transaction.totalFlorinValue, t.totalFlorinValue) / 
                             Math.max(transaction.totalFlorinValue, t.totalFlorinValue);
                if (ratio > 0.8) score += 2;
            }
            
            // Check for same currencies in amounts arrays
            if (transaction.amounts && t.amounts) {
                const transCurrencies = transaction.amounts.map(a => a.currency);
                const tCurrencies = t.amounts.map(a => a.currency);
                const sameCurrency = transCurrencies.some(c => tCurrencies.includes(c));
                if (sameCurrency) score += 1;
            }
            
            // Extract and compare entities from related transaction
            if (t.entry && currentEntities && currentEntities.people.length > 0) {
                const relatedEntities = this.extractEntitiesFromText(t.entry);
                
                // Check for shared people
                const sharedPeople = currentEntities.people.some(p => 
                    relatedEntities.people.some(rp => 
                        rp.toLowerCase().includes(p.toLowerCase()) || 
                        p.toLowerCase().includes(rp.toLowerCase())
                    )
                );
                if (sharedPeople) score += 3;
                
                // Check for shared places
                const sharedPlaces = currentEntities.places.some(p => 
                    relatedEntities.places.some(rp => 
                        rp.toLowerCase() === p.toLowerCase()
                    )
                );
                if (sharedPlaces) score += 2;
                
                // Check for shared commodities
                const sharedCommodities = currentEntities.commodities.some(c => 
                    relatedEntities.commodities.includes(c)
                );
                if (sharedCommodities) score += 1;
            }
            
            return score > 0 ? { transaction: t, score: score } : null;
        })
        .filter(r => r !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
        
        if (related.length > 0) {
            const relatedHtml = related.map(item => {
                // Safety check for item structure
                if (!item || !item.transaction) {
                    console.warn('Invalid related item structure', item);
                    return '';
                }
                const t = item.transaction;
                // Additional safety check for transaction object
                if (!t) {
                    console.warn('Transaction is undefined in related item');
                    return '';
                }
                const relevanceLabel = item.score > 5 ? '⭐ High' : item.score > 2 ? '✨ Medium' : '💫 Low';
                return `
                    <div class="related-item">
                        <div class="related-header">
                            <span class="related-date">${t.date || 'Unknown date'}</span>
                            <span class="relevance-badge">${relevanceLabel}</span>
                        </div>
                        <div class="related-entry">${(t.entry || '').substring(0, 100)}${(t.entry || '').length > 100 ? '...' : ''}</div>
                        <div class="related-amount">
                            ${t.amounts && t.amounts.length > 0 
                                ? t.amounts.map(a => `${a.amount} ${a.currency}`).join(', ')
                                : 'No amount'}
                        </div>
                    </div>
                `;
            }).filter(html => html !== '').join('');
            
            relatedDiv.innerHTML = `
                <div class="related-section">
                    <h4>Found ${related.length} Related Transaction${related.length > 1 ? 's' : ''}</h4>
                    ${relatedHtml}
                </div>
            `;
        } else {
            relatedDiv.innerHTML = '<div class="no-related">No related transactions found.</div>';
        }
    }
    
    // Helper method to extract entities from text
    extractEntitiesFromText(text) {
        const entities = {
            people: [],
            places: [],
            commodities: []
        };
        
        if (!text) return entities;
        
        // Extract person names
        const namePatterns = [
            /\b([A-ZÄÖÜ][a-zäöüß]+)\s+(?:von\s+)?([A-ZÄÖÜ][a-zäöüß]+)\b/g,
            /\bHerr\s+([A-ZÄÖÜ][a-zäöüß]+)\b/g
        ];
        
        namePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.people.push(match[0]);
            }
        });
        
        // Extract places
        const placePattern = /\b(?:zu|von|aus|in)\s+([A-ZÄÖÜ][a-zäöüß]+)\b/g;
        let placeMatch;
        while ((placeMatch = placePattern.exec(text)) !== null) {
            entities.places.push(placeMatch[1]);
        }
        
        // Extract commodities
        ['Korn', 'Weizen', 'Gerste', 'Wein', 'Bier', 'Holz', 'Salz'].forEach(commodity => {
            if (text.includes(commodity)) {
                entities.commodities.push(commodity);
            }
        });
        
        return entities;
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new AlderbachDashboard();
    
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