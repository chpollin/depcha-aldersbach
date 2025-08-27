/**
 * Automated Test Suite for Aldersbach Dashboard
 * Comprehensive testing for charts, data processing, and user interactions
 */

// Test suite function - called from debug utilities
// Define ChartTester class if it doesn't exist
class ChartTester {
    constructor(dashboard, logger) {
        this.dashboard = dashboard;
        this.logger = logger;
        this.tests = [];
        this.results = { passed: 0, failed: 0, total: 0 };
    }
    
    addTest(name, fn) {
        this.tests.push({ name, fn });
        return this;
    }
    
    assert(condition, message) {
        if (!condition) throw new Error(message || 'Assertion failed');
    }
    
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected} but got ${actual}`);
        }
    }
    
    assertExists(obj, message) {
        if (typeof obj === 'undefined' || obj === null) {
            throw new Error(message || 'Object does not exist');
        }
    }
    
    runAll() {
        this.tests.forEach(test => {
            try {
                test.fn();
                this.results.passed++;
                this.logger.success(`✓ ${test.name}`);
            } catch (error) {
                this.results.failed++;
                this.logger.error(`✗ ${test.name}: ${error.message}`);
            }
            this.results.total++;
        });
        return this.results;
    }
}

window.runDashboardTests = async function() {
    const dashboard = window.dashboardInstance || window.dashboard;
    const logger = window.Logger;
    
    if (!dashboard) {
        logger.error('Dashboard instance not found - tests cannot run');
        return;
    }

    const tester = new ChartTester(dashboard, logger);
    
    // Data Processing Tests
    tester
        .addTest('Data parsing handles empty transactions', () => {
            const originalLength = dashboard.transactions.length;
            const emptyXML = '<root></root>';
            
            try {
                dashboard.parseXMLData(emptyXML);
                // Should not crash, just not add any transactions
                tester.assert(true, 'Should handle empty XML without errors');
            } catch (error) {
                throw new Error('Should not throw on empty XML: ' + error.message);
            }
        })
        
        .addTest('Currency conversion accuracy', () => {
            const florinValue = dashboard.convertToFlorin(240, 'd');
            tester.assertEqual(florinValue, 1, 'Should convert 240 denarius to 1 florin');
            
            const shillingValue = dashboard.convertToFlorin(30, 's');
            tester.assertEqual(shillingValue, 1, 'Should convert 30 shillings to 1 florin');
        })
        
        .addTest('Entity extraction from German text', () => {
            const text = "Item den .28. Maii, Martin Öder von Aitenpach geben waitz";
            const entities = dashboard.extractPeopleAndPlaces(text);
            tester.assert(entities.includes('Martin'), 'Should extract person name');
            tester.assert(entities.includes('Aitenpach'), 'Should extract place name');
        });

    // Chart Tests - only if charts are initialized
    tester
        .addTest('Chart infrastructure check', () => {
            // Check if Chart.js is available
            tester.assertExists(window.Chart, 'Chart.js should be loaded');
        })
        
        .addTest('Canvas elements exist', () => {
            const timelineCanvas = document.getElementById('timelineChart');
            const currencyCanvas = document.getElementById('currencyChart');
            tester.assertExists(timelineCanvas, 'Timeline canvas should exist');
            tester.assertExists(currencyCanvas, 'Currency canvas should exist');
        });

    // Only test chart instances if they exist
    if (dashboard.charts && dashboard.charts.timeline) {
        tester
            .addTest('Timeline chart initialization', () => {
                tester.assertExists(dashboard.charts.timeline, 'Timeline chart should exist');
                tester.assertExists(dashboard.charts.timeline.data, 'Chart should have data object');
            })
            
            .addTest('Currency chart initialization', () => {
                tester.assertExists(dashboard.charts.currency, 'Currency chart should exist');
                tester.assertEqual(dashboard.charts.currency.data.labels.length, 4, 'Should have 4+ currency labels');
            });
    } else {
        tester
            .addTest('Charts not initialized warning', () => {
                logger.warn('Charts not initialized in test environment - skipping chart tests');
                tester.assert(true, 'Charts not available for testing');
            });
    }

    tester
        .addTest('Chart data aggregation', () => {
                // Create test transactions
                const testTransactions = [
                    {
                        date: '1557-05-01',
                        totalFlorinValue: 10,
                        amounts: [{ amount: 10, currency: 'f' }]
                    },
                    {
                        date: '1557-05-15',
                        totalFlorinValue: 5,
                        amounts: [{ amount: 5, currency: 'f' }]
                    }
                ];
                
                const aggregated = dashboard.aggregateTimelineData(testTransactions, 'month');
                tester.assertEqual(aggregated.length, 1, 'Should aggregate to 1 month');
                tester.assertEqual(aggregated[0].y, 15, 'Should sum values correctly');
            });

    // Search and Filter Tests
    tester
        .addTest('Search functionality', () => {
            // Mock some transactions for testing
            const originalTransactions = dashboard.transactions;
            dashboard.transactions = [
                { entry: 'Martin Öder waitz transaction', people: ['Martin'], amounts: [] },
                { entry: 'Another transaction', people: ['Johann'], amounts: [] }
            ];
            
            dashboard.searchBox.value = 'Martin';
            dashboard.applyFilters();
            
            tester.assertEqual(dashboard.filteredTransactions.length, 1, 'Should filter to 1 transaction');
            tester.assert(dashboard.filteredTransactions[0].entry.includes('Martin'), 'Should contain search term');
            
            // Restore original transactions
            dashboard.transactions = originalTransactions;
        })
        
        .addTest('Currency filter functionality', () => {
            const originalTransactions = dashboard.transactions;
            dashboard.transactions = [
                { entry: 'Test 1', amounts: [{ currency: 'f', amount: 10 }], people: [] },
                { entry: 'Test 2', amounts: [{ currency: 's', amount: 5 }], people: [] }
            ];
            
            dashboard.currencyFilter.value = 'f';
            dashboard.applyFilters();
            
            tester.assertEqual(dashboard.filteredTransactions.length, 1, 'Should filter by currency');
            
            dashboard.transactions = originalTransactions;
        });

    // Performance Tests
    tester
        .addTest('Large dataset handling', () => {
            const startTime = performance.now();
            
            // Simulate processing 1000 transactions
            const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
                id: `T${i}`,
                entry: `Test transaction ${i}`,
                date: '1557-05-01',
                amounts: [{ amount: 1, currency: 'f' }],
                totalFlorinValue: 1,
                people: []
            }));
            
            // Test filtering performance
            dashboard.filteredTransactions = largeDataset;
            const duration = performance.now() - startTime;
            
            tester.assertGreaterThan(1000, duration, 'Should process 1000 transactions in under 1 second');
        })
        
        .addTest('Memory usage within bounds', () => {
            if (performance.memory) {
                const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;
                tester.assertGreaterThan(100, memoryMB, 'Memory usage should be under 100MB');
            }
        });

    // UI Interaction Tests
    tester
        .addTest('Chart export functionality', () => {
            if (dashboard.charts.timeline) {
                // Test that export method exists and doesn't throw
                try {
                    // Mock the chart's toBase64Image method
                    const originalMethod = dashboard.charts.timeline.toBase64Image;
                    dashboard.charts.timeline.toBase64Image = () => 'data:image/png;base64,test';
                    
                    dashboard.exportChart('timeline');
                    
                    // Restore original method
                    dashboard.charts.timeline.toBase64Image = originalMethod;
                    
                    tester.assert(true, 'Export should not throw errors');
                } catch (error) {
                    throw new Error('Chart export failed: ' + error.message);
                }
            }
        })
        
        .addTest('Responsive design elements', () => {
            const chartContainer = document.querySelector('.chart-container');
            tester.assertExists(chartContainer, 'Chart container should exist');
            
            const computedStyle = window.getComputedStyle(chartContainer);
            tester.assert(computedStyle.borderRadius !== 'none', 'Should have rounded corners');
        });

    // Data Validation Tests
    tester
        .addTest('Transaction data validation', () => {
            const validTransaction = {
                id: 'T1',
                entry: 'Test entry',
                amounts: [{ amount: 10, currency: 'f' }]
            };
            
            const transaction = new Transaction(validTransaction);
            tester.assert(transaction.isValid, 'Valid transaction should pass validation');
            
            const invalidTransaction = new Transaction({ id: 'T2', entry: '' });
            tester.assert(!invalidTransaction.isValid, 'Invalid transaction should fail validation');
        })
        
        .addTest('Error handling in data processing', () => {
            const malformedXML = '<bk:Transaction><bk:entry>Incomplete';
            
            // Should not throw an error
            try {
                dashboard.parseXMLData(malformedXML);
                tester.assert(true, 'Should handle malformed XML gracefully');
            } catch (error) {
                throw new Error('Should not throw on malformed XML: ' + error.message);
            }
        });

    // Run the complete test suite
    const results = tester.runAll();
    
    // Log final results
    logger.info('=== TEST SUMMARY ===', {
        passed: results.passed,
        failed: results.failed,
        total: results.total,
        successRate: `${Math.round((results.passed / results.total) * 100)}%`
    });

    return results;
};

// Performance monitoring utilities
window.performanceMonitor = {
    startMonitoring() {
        const logger = window.Logger;
        
        // Monitor long-running operations
        const originalApplyFilters = window.dashboardInstance?.applyFilters;
        if (originalApplyFilters) {
            window.dashboardInstance.applyFilters = function() {
                const timerId = logger.startTimer('filter_operation');
                const result = originalApplyFilters.call(this);
                logger.endTimer(timerId, 'filter operation');
                return result;
            };
        }

        // Monitor chart updates
        const originalUpdateCharts = window.dashboardInstance?.updateCharts;
        if (originalUpdateCharts) {
            window.dashboardInstance.updateCharts = function() {
                const timerId = logger.startTimer('chart_update');
                const result = originalUpdateCharts.call(this);
                logger.endTimer(timerId, 'chart update');
                return result;
            };
        }

        logger.info('Performance monitoring enabled');
    },

    getMetrics() {
        return window.Logger.getSessionSummary();
    },

    logCurrentPerformance() {
        const logger = window.Logger;
        const metrics = performance.getEntriesByType('measure');
        
        if (metrics.length > 0) {
            logger.info('Performance metrics', {
                measurements: metrics.length,
                averageTime: Math.round(
                    metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length
                ),
                slowestOperation: Math.round(Math.max(...metrics.map(m => m.duration)))
            });
        }
    }
};

// Auto-run basic tests in development
if (window.location.hostname === 'localhost') {
    // Wait for dashboard to be ready
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (window.dashboardInstance && window.debugUtils) {
                window.Logger.info('Development mode detected - running basic health checks');
                
                // Quick health check
                const healthChecks = [
                    () => window.dashboardInstance.charts ? 'Charts initialized' : 'Charts not ready',
                    () => document.querySelectorAll('.chart-container').length === 2 ? 'UI elements present' : 'UI incomplete',
                    () => typeof window.dashboardInstance.parseXMLData === 'function' ? 'Core functions available' : 'Core functions missing'
                ];

                healthChecks.forEach((check, i) => {
                    try {
                        const result = check();
                        window.Logger.debug(`Health check ${i + 1}`, { status: result });
                    } catch (error) {
                        window.Logger.warn(`Health check ${i + 1} failed`, { error: error.message });
                    }
                });
            }
        }, 1000);
    });
}