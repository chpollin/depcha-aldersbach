# 🔧 Technical Specifications - Aldersbach Monastery Dashboard

## 📋 Overview

This document defines the detailed technical requirements for implementing the complete Aldersbach Monastery Financial Dashboard. All features are specified with implementation details, data structures, and acceptance criteria.

## 🏗️ Core System Requirements

### Performance Requirements
- **Data Loading:** Parse 2MB XML files in <5 seconds
- **Search Response:** Filter 1000+ transactions in <500ms
- **Chart Rendering:** Display visualizations in <2 seconds
- **Memory Usage:** Maintain <100MB browser memory footprint
- **Concurrent Users:** Support 50+ simultaneous users (client-side)

### Browser Compatibility
- **Primary:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile:** iOS Safari 14+, Chrome Mobile 90+
- **Features:** ES6+, Web APIs, Canvas 2D, Local Storage
- **Fallbacks:** Graceful degradation for older browsers

### Data Format Support
- **Input:** RDF/XML (primary), XML, JSON (future)
- **Output:** CSV, JSON, PDF, PNG/SVG (charts)
- **Encoding:** UTF-8 with medieval character support
- **Size Limits:** 10MB max file size, 10,000 max transactions

## 📊 Feature Specifications

### 1. Advanced Data Visualization

#### 1.1 Transaction Timeline Chart
**Implementation:** Chart.js line/area chart with time series data

**Technical Details:**
```javascript
// Data Structure
{
  type: 'line',
  data: {
    datasets: [{
      label: 'Transaction Volume',
      data: [
        {x: '1557-01-01', y: 45.2}, // Date, florin value
        {x: '1557-02-01', y: 67.8}
      ]
    }]
  },
  options: {
    scales: {
      x: { type: 'time', time: { unit: 'month' } },
      y: { beginAtZero: true, title: { text: 'Florins' } }
    },
    plugins: {
      zoom: { enabled: true },
      tooltip: { callbacks: { /* custom formatting */ } }
    }
  }
}
```

**Features:**
- Aggregation by day/week/month/year
- Multiple data series (income vs expense)
- Interactive zoom and pan
- Seasonal trend highlighting
- Export as PNG/SVG

**Performance:** Handle 365+ data points smoothly

#### 1.2 Currency Distribution Chart
**Implementation:** Chart.js doughnut chart with percentage calculations

**Technical Details:**
```javascript
// Currency aggregation function
function aggregateCurrencies(transactions) {
  const totals = { f: 0, s: 0, d: 0, gr: 0 };
  transactions.forEach(t => {
    t.amounts.forEach(a => {
      totals[a.currency] += convertToFlorin(a.amount, a.currency);
    });
  });
  return totals;
}

// Chart configuration
{
  type: 'doughnut',
  data: {
    labels: ['Florin', 'Shilling', 'Denarius', 'Groschen'],
    datasets: [{
      data: [65, 20, 10, 5], // percentage values
      backgroundColor: ['#8B4513', '#A0522D', '#CD853F', '#D2691E']
    }]
  }
}
```

**Features:**
- Real-time updates with filtering
- Hover details with exact amounts
- Toggle between count and value
- Historical currency information tooltips

#### 1.3 Entity Relationship Network
**Implementation:** D3.js force-directed graph

**Technical Details:**
```javascript
// Node structure
const nodes = [
  { id: 'person_1', name: 'Martin Öder', type: 'person', transactions: 5 },
  { id: 'place_1', name: 'Aitenpach', type: 'place', transactions: 3 }
];

// Link structure  
const links = [
  { source: 'person_1', target: 'place_1', value: 18.0, currency: 'f' }
];

// D3.js simulation
const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id))
  .force('charge', d3.forceManyBody())
  .force('center', d3.forceCenter(width/2, height/2));
```

**Features:**
- Interactive node dragging
- Relationship strength visualization
- Entity filtering and highlighting
- Export as SVG with embedded data

### 2. Data Export System

#### 2.1 CSV Export
**Implementation:** Client-side CSV generation with proper escaping

**Technical Details:**
```javascript
class CSVExporter {
  export(transactions, filters = {}) {
    const headers = ['Date', 'Entry_German', 'Amount', 'Currency', 'Type', 'People'];
    const rows = transactions.map(t => [
      t.date || '',
      `"${t.entry.replace(/"/g, '""')}"`, // Escape quotes
      t.amounts.map(a => a.amount).join(';'),
      t.amounts.map(a => a.currency).join(';'),
      t.type,
      t.people.join(';')
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    // Add BOM for UTF-8
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    return this.downloadBlob(blob, 'aldersbach-transactions.csv');
  }
  
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

**Features:**
- UTF-8 encoding with BOM
- Medieval character preservation
- Filtered data export
- Metadata header inclusion
- Large dataset chunking (>10MB)

#### 2.2 PDF Report Generation
**Implementation:** jsPDF with custom templates

**Technical Details:**
```javascript
class PDFReporter {
  generateReport(data, options = {}) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Aldersbach Monastery Financial Report', 20, 30);
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
    
    // Summary statistics
    this.addSummarySection(doc, data.stats);
    
    // Charts (as base64 images)
    if (options.includeCharts) {
      this.addChartsSection(doc, data.charts);
    }
    
    // Transaction table
    this.addTransactionTable(doc, data.transactions);
    
    return doc.save('aldersbach-report.pdf');
  }
  
  addTransactionTable(doc, transactions) {
    const columns = ['Date', 'Entry', 'Amount', 'Currency'];
    const rows = transactions.map(t => [
      t.date || 'N/A',
      t.entry.substring(0, 50) + '...',
      t.amounts.map(a => a.amount).join(', '),
      t.amounts.map(a => a.currency).join(', ')
    ]);
    
    doc.autoTable({
      head: [columns],
      body: rows,
      startY: 100,
      styles: { fontSize: 8 },
      columnStyles: { 1: { cellWidth: 100 } }
    });
  }
}
```

**Features:**
- Professional report templates
- Chart image embedding
- Multi-page support
- Citation formatting
- Watermarking capability

### 3. Advanced Search and Filtering

#### 3.1 Full-Text Search Engine
**Implementation:** Client-side inverted index with fuzzy matching

**Technical Details:**
```javascript
class SearchEngine {
  constructor(transactions) {
    this.index = this.buildInvertedIndex(transactions);
    this.fuzzyMatcher = new FuzzyMatcher();
  }
  
  buildInvertedIndex(transactions) {
    const index = {};
    transactions.forEach((transaction, id) => {
      const words = this.tokenize(transaction.entry);
      words.forEach(word => {
        if (!index[word]) index[word] = [];
        index[word].push(id);
      });
    });
    return index;
  }
  
  search(query, options = {}) {
    const tokens = this.tokenize(query);
    const results = tokens.map(token => {
      // Exact matches
      let matches = this.index[token] || [];
      
      // Fuzzy matches if enabled
      if (options.fuzzy) {
        Object.keys(this.index).forEach(indexToken => {
          if (this.fuzzyMatcher.match(token, indexToken, 0.8)) {
            matches = matches.concat(this.index[indexToken]);
          }
        });
      }
      
      return new Set(matches);
    });
    
    // Intersection for AND logic
    return options.operator === 'OR' 
      ? this.union(results)
      : this.intersection(results);
  }
  
  tokenize(text) {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }
}
```

**Features:**
- Boolean operators (AND, OR, NOT)
- Fuzzy string matching
- Medieval German language support
- Phrase search with quotes
- Search result ranking

#### 3.2 Advanced Filtering Panel
**Implementation:** Dynamic filter UI with range sliders and multi-select

**Technical Details:**
```javascript
class FilterPanel {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.filters = {};
    this.render();
  }
  
  render() {
    // Date range slider
    this.addDateRangeFilter();
    
    // Amount range slider
    this.addAmountRangeFilter();
    
    // Multi-select for currencies
    this.addCurrencyFilter();
    
    // Entity selection
    this.addEntityFilter();
    
    // Transaction type checkboxes
    this.addTypeFilter();
  }
  
  addDateRangeFilter() {
    const dates = this.data.transactions
      .filter(t => t.date)
      .map(t => new Date(t.date))
      .sort();
    
    if (dates.length === 0) return;
    
    const slider = noUiSlider.create(this.container.querySelector('.date-range'), {
      start: [dates[0], dates[dates.length - 1]],
      connect: true,
      range: {
        min: dates[0].getTime(),
        max: dates[dates.length - 1].getTime()
      },
      format: {
        to: value => new Date(value).toISOString().split('T')[0],
        from: value => new Date(value).getTime()
      }
    });
    
    slider.on('update', values => {
      this.filters.dateRange = values;
      this.applyFilters();
    });
  }
}
```

### 4. Transaction Detail System

#### 4.1 Modal Transaction View
**Implementation:** Dynamic modal with tabbed interface

**Technical Details:**
```javascript
class TransactionModal {
  show(transactionId) {
    const transaction = this.getTransactionById(transactionId);
    
    const modal = document.createElement('div');
    modal.className = 'transaction-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Transaction Details</h2>
          <button class="close">&times;</button>
        </div>
        
        <div class="modal-tabs">
          <button class="tab-btn active" data-tab="overview">Overview</button>
          <button class="tab-btn" data-tab="xml">Raw XML</button>
          <button class="tab-btn" data-tab="analysis">Analysis</button>
          <button class="tab-btn" data-tab="related">Related</button>
        </div>
        
        <div class="modal-body">
          <div class="tab-content active" id="overview">
            ${this.renderOverviewTab(transaction)}
          </div>
          <div class="tab-content" id="xml">
            <pre><code>${this.escapeHtml(transaction.rawXML)}</code></pre>
          </div>
          <div class="tab-content" id="analysis">
            ${this.renderAnalysisTab(transaction)}
          </div>
          <div class="tab-content" id="related">
            ${this.renderRelatedTab(transaction)}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.bindModalEvents(modal);
  }
  
  renderAnalysisTab(transaction) {
    return `
      <div class="analysis-section">
        <h3>Entity Analysis</h3>
        <div class="entities">
          ${transaction.people.map(person => 
            `<span class="entity person">${person}</span>`
          ).join('')}
        </div>
        
        <h3>Currency Analysis</h3>
        <div class="currency-breakdown">
          ${transaction.amounts.map(amount => `
            <div class="amount-detail">
              <span class="value">${amount.amount}</span>
              <span class="currency">${amount.currency}</span>
              <span class="florin-equiv">(≈${this.convertToFlorin(amount.amount, amount.currency).toFixed(2)} f)</span>
            </div>
          `).join('')}
        </div>
        
        <h3>Historical Context</h3>
        <p>Transaction from ${transaction.date || 'unknown date'} represents 
           ${this.getHistoricalContext(transaction)}</p>
      </div>
    `;
  }
}
```

### 5. Performance Optimization

#### 5.1 Web Workers for Data Processing
**Implementation:** Background processing for large datasets

**Technical Details:**
```javascript
// worker.js
self.onmessage = function(e) {
  const { xmlData, action } = e.data;
  
  switch(action) {
    case 'parseXML':
      const transactions = parseXMLData(xmlData);
      self.postMessage({ action: 'parseComplete', data: transactions });
      break;
      
    case 'buildSearchIndex':
      const index = buildSearchIndex(e.data.transactions);
      self.postMessage({ action: 'indexComplete', data: index });
      break;
  }
};

function parseXMLData(xmlText) {
  // Heavy XML parsing logic moved to worker
  // Progress updates sent back to main thread
  let progress = 0;
  const parser = new DOMParser();
  // ... parsing logic with periodic progress updates
}

// main.js
class DataProcessor {
  constructor() {
    this.worker = new Worker('worker.js');
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
  }
  
  processLargeFile(xmlData) {
    return new Promise((resolve) => {
      this.pendingPromises = { resolve };
      this.worker.postMessage({ xmlData, action: 'parseXML' });
    });
  }
}
```

#### 5.2 Virtual Scrolling for Large Tables
**Implementation:** Render only visible rows

**Technical Details:**
```javascript
class VirtualTable {
  constructor(container, data) {
    this.container = container;
    this.data = data;
    this.rowHeight = 50;
    this.visibleRows = Math.ceil(container.clientHeight / this.rowHeight);
    this.scrollTop = 0;
    
    this.render();
    this.bindScrollEvents();
  }
  
  render() {
    const startIndex = Math.floor(this.scrollTop / this.rowHeight);
    const endIndex = Math.min(startIndex + this.visibleRows + 5, this.data.length);
    
    const visibleData = this.data.slice(startIndex, endIndex);
    
    this.container.innerHTML = `
      <div class="table-spacer" style="height: ${startIndex * this.rowHeight}px"></div>
      ${visibleData.map((row, index) => this.renderRow(row, startIndex + index)).join('')}
      <div class="table-spacer" style="height: ${(this.data.length - endIndex) * this.rowHeight}px"></div>
    `;
  }
  
  bindScrollEvents() {
    this.container.addEventListener('scroll', () => {
      this.scrollTop = this.container.scrollTop;
      this.render();
    });
  }
}
```

## 🔒 Security and Data Privacy

### Input Validation
- **XML Parsing:** Prevent XXE attacks with secure parser configuration
- **File Upload:** Validate file types and size limits
- **Search Input:** Sanitize user input to prevent XSS

### Data Handling
- **Local Storage:** No sensitive data persistence
- **Session Management:** Client-side only, no server sessions
- **Export Security:** Validate export parameters

### Privacy Considerations
- **No Tracking:** No analytics or user behavior tracking
- **Data Minimization:** Process only necessary data fields
- **Consent:** Clear data usage disclosure

## 📱 Mobile Optimization

### Responsive Design
- **Breakpoints:** 320px, 768px, 1024px, 1440px
- **Touch Targets:** Minimum 44px touch areas
- **Gestures:** Swipe navigation, pinch-to-zoom charts

### Performance on Mobile
- **Image Optimization:** Responsive images, lazy loading
- **Bundle Size:** <2MB total JavaScript
- **Caching:** Aggressive browser caching strategy

## 🧪 Testing Specifications

### Unit Testing
- **Data Processing:** XML parsing, currency conversion
- **Search Engine:** Query parsing, result ranking
- **Export Functions:** CSV generation, PDF creation

### Integration Testing
- **User Workflows:** Complete user journey scenarios
- **Browser Compatibility:** Automated cross-browser testing
- **Performance Testing:** Load time measurements

### Test Data Requirements
- **Small Dataset:** 100 transactions for quick testing
- **Medium Dataset:** 1,000 transactions for performance testing
- **Large Dataset:** 5,000+ transactions for stress testing
- **Edge Cases:** Malformed XML, missing data, special characters

---

**Implementation Priority:** High-priority features marked in roadmap
**Review Cycle:** Weekly technical review during development
**Performance Benchmarks:** Measured against MVP baseline