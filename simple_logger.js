// Simple logger that always works
window.Logger = {
    info: function(message, data) {
        console.log('INFO:', message, data || '');
    },
    warn: function(message, data) {
        console.warn('WARN:', message, data || '');
    },
    error: function(message, data) {
        console.error('ERROR:', message, data || '');
    },
    success: function(message, data) {
        console.log('SUCCESS:', message, data || '');
    },
    debug: function(message, data) {
        console.log('DEBUG:', message, data || '');
    },
    startTimer: function(name) {
        const timerId = 'timer_' + name + '_' + Date.now();
        console.time(timerId);
        return timerId;
    },
    endTimer: function(timerId, description) {
        console.timeEnd(timerId);
        return 0; // Simple placeholder
    },
    logChartUpdate: function(type, count, duration) {
        console.log('CHART:', type, 'updated with', count, 'data points in', duration, 'ms');
    },
    logSearch: function(term, results, duration) {
        console.log('SEARCH:', term, 'found', results, 'results in', duration, 'ms');
    }
};

console.log('Simple logger initialized');