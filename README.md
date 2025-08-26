# 📜 Aldersbach Monastery Financial Dashboard

An interactive web application for exploring historical financial transactions from the Aldersbach monastery (Anno 1557).

## 🚀 Quick Start

1. **Start the local server:**
   ```bash
   cd depcha
   python -m http.server 8000
   ```

2. **Open in browser:**
   ```
   http://localhost:8000
   ```

3. **Load data:**
   - Select a data file from the dropdown
   - Click "Load Data" to parse transactions
   - Use filters and search to explore

## 📊 Features

### Core Functionality
- **Multi-file support** - Load different monastery record sets
- **Real-time search** - Find transactions by German text, people, or places  
- **Currency filtering** - Filter by Florin (f), Shilling (s), Denarius (d), or Groschen (gr)
- **Flexible sorting** - By date, amount, or entry text
- **Pagination** - Browse large datasets efficiently

### Analytics Dashboard
- **Total transactions** - Complete count across loaded dataset
- **Total value** - Sum converted to Florin base currency
- **Date range** - Time span of available records
- **People/Places** - Unique entities extracted from transaction text

### Data Visualization
- **Transaction categorization** - Income, expense, and trade classifications
- **Amount highlighting** - Visual emphasis on monetary values
- **Search highlighting** - Matched terms highlighted in results
- **Medieval styling** - Period-appropriate visual design

## 📁 Data Structure

The dashboard processes RDF/XML files containing:

- **bk:Transaction** - Individual financial records
- **bk:entry** - Original medieval German text
- **bk:when** - ISO date stamps (when available)
- **bk:Money** - Monetary amounts with currency units
- **bk:Commodity** - Goods and materials traded

See `data.md` for detailed schema documentation.

## 🏛️ Historical Context

**Aldersbach Monastery** was a Cistercian abbey in Bavaria, Germany. These records primarily cover 1557, capturing:

- **Grain sales** - Major income source (wheat, oats, peas)
- **Agricultural tools** - Equipment purchases and maintenance
- **Trade relationships** - Merchants, craftsmen, and local officials
- **Medieval currencies** - Complex monetary system with multiple units

## 🔧 Technical Details

### Architecture
- **Frontend-only** - No server-side processing required
- **Vanilla JavaScript** - No frameworks, maximum compatibility
- **XML parsing** - Browser-native DOMParser
- **Responsive design** - Mobile and desktop friendly

### Browser Support
- Modern browsers with ES6+ support
- XML parsing capabilities
- Local file access permissions required

### Performance
- **Pagination** - Handles 1000+ transactions efficiently
- **Lazy loading** - Data loaded only when selected
- **Search optimization** - Real-time filtering without lag

## 📊 Usage Examples

### Finding grain transactions:
Search: `waitz` or `Schaff`

### Exploring high-value trades:
Sort by: Amount (descending)

### Discovering people:
Search: Names like `Martin`, `Zinnsperger`

### Currency analysis:
Filter by: `f` (Florin) for major transactions

## 🔍 Data Files

- **o_depcha.aldersbach.1.xml** - Primary record set (2.3MB)
- **L341-L346** - Supplementary record collections
- **Test files** - Validation datasets

## ⚡ Performance Notes

- Large files (2MB+) may take 5-10 seconds to parse
- Pagination limits display to 50 transactions per page
- Search is case-insensitive and searches both German text and extracted names
- Currency conversion uses approximate historical rates

---

**Built for historical research and exploration of medieval financial records.**