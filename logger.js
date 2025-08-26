/**
 * Compact Logging System for Aldersbach Dashboard
 * Provides structured logging, performance monitoring, and error tracking
 */

class AlderbachLogger {
    constructor() {
        this.logLevel = this.getLogLevel();
        this.sessionId = this.generateSessionId();
        this.startTime = performance.now();
        this.metrics = {
            dataLoads: 0,
            chartUpdates: 0,
            searches: 0,
            exports: 0,
            errors: 0
        };
        
        this.init();
    }

    init() {
        // Log session start
        this.info('Dashboard initialized', { 
            sessionId: this.sessionId,
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timestamp: new Date().toISOString()
        });

        // Set up error capture
        window.addEventListener('error', (event) => {
            this.error('Global error caught', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack
            });
        });

        // Performance observer for long tasks
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) { // Log tasks > 50ms
                        this.warn('Long task detected', {
                            name: entry.name,
                            duration: Math.round(entry.duration),
                            startTime: Math.round(entry.startTime)
                        });
                    }
                }
            });
            observer.observe({ entryTypes: ['longtask'] });
        }
    }

    getLogLevel() {
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');
        
        if (debugParam === 'verbose') return 4;
        if (debugParam === 'info') return 3;
        if (debugParam === 'warn') return 2;
        if (debugParam === 'error') return 1;
        
        // Production default
        return window.location.hostname === 'localhost' ? 3 : 2;
    }

    generateSessionId() {
        return 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    log(level, message, data = {}, color = '#666') {
        if (this.getNumericLevel(level) > this.logLevel) return;

        const timestamp = new Date().toISOString().substr(11, 12);
        const prefix = `[${timestamp}][${level.toUpperCase()}][ALDERS]`;
        
        if (data && Object.keys(data).length > 0) {
            console.groupCollapsed(`%c${prefix} ${message}`, `color: ${color}; font-weight: bold`);
            console.table(data);
            console.groupEnd();
        } else {
            console.log(`%c${prefix} ${message}`, `color: ${color}; font-weight: bold`);
        }

        // Store critical logs for debugging
        if (level === 'error' || level === 'warn') {
            this.storeCriticalLog({ level, message, data, timestamp });
        }
    }

    debug(message, data) {
        this.log('debug', message, data, '#999');
    }

    info(message, data) {
        this.log('info', message, data, '#2196F3');
    }

    warn(message, data) {
        this.log('warn', message, data, '#FF9800');
        this.metrics.errors++;
    }

    error(message, data) {
        this.log('error', message, data, '#F44336');
        this.metrics.errors++;
    }

    success(message, data) {
        this.log('info', `✓ ${message}`, data, '#4CAF50');
    }

    getNumericLevel(level) {
        const levels = { debug: 4, info: 3, warn: 2, error: 1 };
        return levels[level] || 0;
    }

    storeCriticalLog(logEntry) {
        try {
            const stored = JSON.parse(localStorage.getItem('aldersbach_logs') || '[]');
            stored.push(logEntry);
            
            // Keep only last 100 critical logs
            if (stored.length > 100) {
                stored.splice(0, stored.length - 100);
            }
            
            localStorage.setItem('aldersbach_logs', JSON.stringify(stored));
        } catch (e) {
            console.warn('Failed to store critical log:', e);
        }
    }

    // Performance Monitoring
    startTimer(operation) {
        const timerId = `${operation}_${Date.now()}`;
        performance.mark(`${timerId}_start`);
        return timerId;
    }

    endTimer(timerId, operation) {
        performance.mark(`${timerId}_end`);
        performance.measure(timerId, `${timerId}_start`, `${timerId}_end`);
        
        const measure = performance.getEntriesByName(timerId)[0];
        const duration = Math.round(measure.duration);
        
        if (duration > 100) {
            this.warn(`Slow ${operation}`, { duration: `${duration}ms` });
        } else {
            this.debug(`${operation} completed`, { duration: `${duration}ms` });
        }

        // Clean up marks
        performance.clearMarks(`${timerId}_start`);
        performance.clearMarks(`${timerId}_end`);
        performance.clearMeasures(timerId);

        return duration;
    }

    // Metrics tracking
    incrementMetric(metric, data = {}) {
        if (this.metrics.hasOwnProperty(metric)) {
            this.metrics[metric]++;
            this.debug(`Metric incremented: ${metric}`, { 
                count: this.metrics[metric],
                ...data 
            });
        }
    }

    // Data operation logging
    logDataLoad(filename, transactionCount, duration) {
        this.incrementMetric('dataLoads');
        this.success('Data loaded successfully', {
            file: filename,
            transactions: transactionCount,
            duration: `${duration}ms`,
            rate: `${Math.round(transactionCount / duration * 1000)} tx/s`
        });
    }

    logChartUpdate(chartType, dataPoints, duration) {
        this.incrementMetric('chartUpdates');
        this.debug('Chart updated', {
            type: chartType,
            dataPoints: dataPoints,
            duration: `${duration}ms`
        });
    }

    logSearch(query, results, duration) {
        this.incrementMetric('searches');
        this.debug('Search performed', {
            query: query.length > 50 ? query.substr(0, 50) + '...' : query,
            results: results,
            duration: `${duration}ms`
        });
    }

    logExport(type, format, size) {
        this.incrementMetric('exports');
        this.success('Export completed', {
            type: type,
            format: format,
            size: `${Math.round(size / 1024)}KB`
        });
    }

    // Session summary
    getSessionSummary() {
        const sessionDuration = Math.round((performance.now() - this.startTime) / 1000);
        return {
            sessionId: this.sessionId,
            duration: `${sessionDuration}s`,
            metrics: { ...this.metrics },
            memoryUsage: this.getMemoryUsage(),
            timestamp: new Date().toISOString()
        };
    }

    getMemoryUsage() {
        if ('memory' in performance) {
            return {
                used: `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB`,
                total: `${Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)}MB`,
                limit: `${Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)}MB`
            };
        }
        return 'Not available';
    }

    // Debug utilities
    exportLogs() {
        const logs = JSON.parse(localStorage.getItem('aldersbach_logs') || '[]');
        const summary = this.getSessionSummary();
        
        const exportData = {
            summary: summary,
            criticalLogs: logs,
            userAgent: navigator.userAgent,
            url: window.location.href,
            exportTime: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], 
            { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `aldersbach-logs-${this.sessionId}.json`;
        link.click();
        URL.revokeObjectURL(url);

        this.info('Debug logs exported', { filename: link.download });
    }

    clearLogs() {
        localStorage.removeItem('aldersbach_logs');
        this.info('Stored logs cleared');
    }
}

// Test runner for chart functionality
class ChartTester {
    constructor(dashboard, logger) {
        this.dashboard = dashboard;
        this.logger = logger;
        this.tests = [];
        this.results = { passed: 0, failed: 0, total: 0 };
    }

    // Add test case
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
        return this;
    }

    // Run all tests
    async runAll() {
        this.logger.info('Starting test suite', { testCount: this.tests.length });
        
        for (const test of this.tests) {
            await this.runTest(test);
        }

        this.logger.success('Test suite completed', this.results);
        return this.results;
    }

    async runTest(test) {
        const timerId = this.logger.startTimer('test');
        this.results.total++;

        try {
            await test.testFn();
            this.results.passed++;
            this.logger.success(`✓ ${test.name}`);
        } catch (error) {
            this.results.failed++;
            this.logger.error(`✗ ${test.name}`, { 
                error: error.message,
                stack: error.stack 
            });
        }

        this.logger.endTimer(timerId, `test: ${test.name}`);
    }

    // Assertion helpers
    assert(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message || 'Values not equal'}: expected ${expected}, got ${actual}`);
        }
    }

    assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(`${message || 'Value not greater'}: ${actual} <= ${expected}`);
        }
    }

    assertExists(value, message) {
        if (value == null || value === undefined) {
            throw new Error(`${message || 'Value does not exist'}: ${value}`);
        }
    }
}

// Global logger instance
window.Logger = new AlderbachLogger();

// Expose debug utilities
window.debugUtils = {
    exportLogs: () => window.Logger.exportLogs(),
    clearLogs: () => window.Logger.clearLogs(),
    getMetrics: () => window.Logger.getSessionSummary(),
    runTests: () => window.runDashboardTests()
};

// Console info for developers
console.log(
    '%cAldersbach Dashboard Debug Mode',
    'color: #8B4513; font-size: 16px; font-weight: bold; background: #f5f5dc; padding: 10px; border-radius: 5px;'
);
console.log('Debug utilities: debugUtils.exportLogs(), debugUtils.clearLogs(), debugUtils.getMetrics()');
console.log('Add ?debug=verbose to URL for detailed logging');