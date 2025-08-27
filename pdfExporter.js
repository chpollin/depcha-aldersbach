/**
 * PDF Export Module for Aldersbach Monastery Financial Dashboard
 * Generates professional research-quality PDF reports with charts and statistics
 */

class PDFExporter {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.logger = window.Logger || console;
        
        // Medieval-themed colors for consistency
        this.colors = {
            primary: '#8B4513',    // Saddle Brown
            secondary: '#D4A76A',  // Tan/Parchment
            accent: '#4B5320',     // Dark Olive Green
            text: '#2F1B14',       // Very Dark Brown
            lightBg: '#FFF8DC'     // Cornsilk
        };
        
        // Check if jsPDF is available
        this.jsPDFAvailable = typeof window.jspdf !== 'undefined';
        if (!this.jsPDFAvailable) {
            this.logger.warn('jsPDF library not loaded - PDF export will not be available');
        }
    }

    /**
     * Generate a comprehensive PDF report
     */
    async generateReport(transactions, options = {}) {
        if (!this.jsPDFAvailable) {
            this.logger.error('Cannot generate PDF - jsPDF library not loaded');
            return false;
        }

        const timerId = this.logger.startTimer('pdf_generation');
        
        try {
            // Initialize PDF document
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Set document properties
            doc.setProperties({
                title: 'Aldersbach Monastery Financial Records Report',
                subject: 'Historical Transaction Analysis',
                author: 'Aldersbach Monastery Dashboard',
                keywords: 'medieval, monastery, financial, records, 1557',
                creator: 'Aldersbach Dashboard v1.0'
            });

            let currentY = 20; // Track vertical position

            // Add header
            currentY = this.addHeader(doc, currentY);
            
            // Add summary statistics
            currentY = this.addSummarySection(doc, currentY, transactions);
            
            // Add currency distribution
            currentY = this.addCurrencySection(doc, currentY, transactions);
            
            // Check if we need a new page
            if (currentY > 200) {
                doc.addPage();
                currentY = 20;
            }
            
            // Add charts if available
            if (this.dashboard.charts) {
                currentY = await this.addChartsSection(doc, currentY);
            }
            
            // Add transaction table
            this.addTransactionTable(doc, transactions, currentY);
            
            // Add footer to all pages
            this.addFooters(doc);
            
            // Generate filename
            const date = new Date().toISOString().split('T')[0];
            const filename = options.filename || `aldersbach_report_${date}.pdf`;
            
            // Save the PDF
            doc.save(filename);
            
            const duration = this.logger.endTimer(timerId, 'PDF generation');
            this.logger.logExport('PDF', 'report', doc.internal.pages.length);
            this.logger.success(`Generated PDF report with ${doc.internal.pages.length - 1} pages`);
            
            return true;
            
        } catch (error) {
            this.logger.error('PDF generation failed', {
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Add document header with title and metadata
     */
    addHeader(doc, startY) {
        // Main title
        doc.setFontSize(24);
        doc.setTextColor(this.colors.primary);
        doc.setFont('helvetica', 'bold');
        doc.text('Aldersbach Monastery', 105, startY, { align: 'center' });
        
        startY += 10;
        doc.setFontSize(18);
        doc.text('Financial Records Analysis', 105, startY, { align: 'center' });
        
        startY += 8;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.colors.text);
        doc.text('Anno Domini 1557', 105, startY, { align: 'center' });
        
        // Add generation date
        startY += 10;
        doc.setFontSize(10);
        doc.setTextColor(100);
        const today = new Date().toLocaleDateString('en-GB', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        });
        doc.text(`Report Generated: ${today}`, 105, startY, { align: 'center' });
        
        // Add horizontal line
        startY += 8;
        doc.setDrawColor(this.colors.primary);
        doc.setLineWidth(0.5);
        doc.line(20, startY, 190, startY);
        
        return startY + 10;
    }

    /**
     * Add summary statistics section
     */
    addSummarySection(doc, startY, transactions) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.colors.primary);
        doc.text('Summary Statistics', 20, startY);
        
        startY += 10;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(this.colors.text);
        
        // Calculate statistics
        const stats = this.calculateStatistics(transactions);
        
        // Create two-column layout
        const leftCol = 30;
        const rightCol = 110;
        let row = startY;
        
        // Left column
        doc.text(`Total Transactions: ${stats.totalCount}`, leftCol, row);
        row += 7;
        doc.text(`Date Range: ${stats.dateRange}`, leftCol, row);
        row += 7;
        doc.text(`Total Value: ${stats.totalValue.toFixed(2)} florins`, leftCol, row);
        
        // Right column
        row = startY;
        doc.text(`Average Transaction: ${stats.averageValue.toFixed(2)} florins`, rightCol, row);
        row += 7;
        doc.text(`Unique Entities: ${stats.uniqueEntities}`, rightCol, row);
        row += 7;
        doc.text(`Most Common Currency: ${stats.mostCommonCurrency}`, rightCol, row);
        
        return row + 10;
    }

    /**
     * Add currency distribution section
     */
    addCurrencySection(doc, startY, transactions) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.colors.primary);
        doc.text('Currency Distribution', 20, startY);
        
        startY += 10;
        
        // Calculate currency distribution
        const distribution = this.getCurrencyDistribution(transactions);
        
        // Create a simple table
        const tableData = Object.entries(distribution).map(([currency, data]) => [
            this.getCurrencyName(currency),
            data.count.toString(),
            `${data.percentage.toFixed(1)}%`,
            `${data.totalValue.toFixed(2)} fl`
        ]);
        
        // Use autoTable plugin if available
        if (doc.autoTable) {
            doc.autoTable({
                startY: startY,
                head: [['Currency', 'Count', 'Percentage', 'Total (Florins)']],
                body: tableData,
                theme: 'grid',
                headStyles: { 
                    fillColor: [139, 69, 19], // RGB for Saddle Brown
                    textColor: 255,
                    fontStyle: 'bold'
                },
                styles: {
                    fontSize: 10,
                    cellPadding: 3
                },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 30, halign: 'right' },
                    2: { cellWidth: 35, halign: 'right' },
                    3: { cellWidth: 40, halign: 'right' }
                }
            });
            
            return doc.lastAutoTable.finalY + 10;
        } else {
            // Fallback to manual table drawing
            doc.setFontSize(10);
            let y = startY;
            
            tableData.forEach(row => {
                doc.text(row[0], 30, y);
                doc.text(row[1], 90, y, { align: 'right' });
                doc.text(row[2], 120, y, { align: 'right' });
                doc.text(row[3], 160, y, { align: 'right' });
                y += 7;
            });
            
            return y + 5;
        }
    }

    /**
     * Add charts section (convert canvas charts to images)
     */
    async addChartsSection(doc, startY) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.colors.primary);
        doc.text('Data Visualizations', 20, startY);
        
        startY += 10;
        
        try {
            // Add timeline chart if it exists
            if (this.dashboard.charts.timeline) {
                const timelineCanvas = document.getElementById('timelineChart');
                if (timelineCanvas) {
                    const imgData = timelineCanvas.toDataURL('image/jpeg', 0.8);
                    doc.addImage(imgData, 'JPEG', 20, startY, 170, 60);
                    startY += 65;
                    
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100);
                    doc.text('Figure 1: Transaction Timeline', 105, startY, { align: 'center' });
                    startY += 10;
                }
            }
            
            // Check if we need a new page
            if (startY > 200) {
                doc.addPage();
                startY = 20;
            }
            
            // Add currency distribution chart if it exists
            if (this.dashboard.charts.currency) {
                const currencyCanvas = document.getElementById('currencyChart');
                if (currencyCanvas) {
                    const imgData = currencyCanvas.toDataURL('image/jpeg', 0.8);
                    doc.addImage(imgData, 'JPEG', 50, startY, 110, 60);
                    startY += 65;
                    
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(100);
                    doc.text('Figure 2: Currency Distribution', 105, startY, { align: 'center' });
                    startY += 10;
                }
            }
            
        } catch (error) {
            this.logger.warn('Could not add charts to PDF', error);
        }
        
        return startY;
    }

    /**
     * Add transaction table with pagination
     */
    addTransactionTable(doc, transactions, startY) {
        // Add new page for transaction table
        doc.addPage();
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(this.colors.primary);
        doc.text('Transaction Records', 20, 20);
        
        // Prepare table data
        const tableData = transactions.slice(0, 100).map(t => [
            t.date || 'N/A',
            this.truncateText(t.entry || '', 40),
            t.amounts && t.amounts.length > 0 
                ? t.amounts.map(a => `${a.amount} ${a.currency}`).join(', ')
                : 'N/A',
            t.type || 'Unknown'
        ]);
        
        if (doc.autoTable) {
            doc.autoTable({
                startY: 30,
                head: [['Date', 'Entry', 'Amount', 'Type']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [139, 69, 19],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 10
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 2,
                    overflow: 'linebreak'
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 90 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 25 }
                },
                didDrawPage: (data) => {
                    // Add page number
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text(
                        `Page ${data.pageNumber} of ${pageCount}`,
                        105,
                        doc.internal.pageSize.height - 10,
                        { align: 'center' }
                    );
                }
            });
            
            // Add note if there are more transactions
            if (transactions.length > 100) {
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100);
                doc.text(
                    `Note: Showing first 100 of ${transactions.length} transactions. Export to CSV for complete data.`,
                    20, 
                    finalY
                );
            }
        }
    }

    /**
     * Add footers to all pages
     */
    addFooters(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            
            // Add footer text
            doc.text(
                'Aldersbach Monastery Financial Dashboard',
                20,
                doc.internal.pageSize.height - 10
            );
            
            // Add page number (if not already added by autoTable)
            if (i === 1) {
                doc.text(
                    `Page ${i} of ${pageCount}`,
                    doc.internal.pageSize.width - 30,
                    doc.internal.pageSize.height - 10
                );
            }
        }
    }

    /**
     * Calculate comprehensive statistics
     */
    calculateStatistics(transactions) {
        const stats = {
            totalCount: transactions.length,
            totalValue: 0,
            averageValue: 0,
            dateRange: 'N/A',
            uniqueEntities: 0,
            mostCommonCurrency: 'N/A'
        };
        
        if (transactions.length === 0) return stats;
        
        // Calculate total value in florins
        stats.totalValue = transactions.reduce((sum, t) => sum + (t.totalFlorinValue || 0), 0);
        stats.averageValue = stats.totalValue / transactions.length;
        
        // Get date range
        const dates = transactions
            .filter(t => t.date)
            .map(t => t.date)
            .sort();
        if (dates.length > 0) {
            stats.dateRange = `${dates[0]} to ${dates[dates.length - 1]}`;
        }
        
        // Count unique entities
        const entities = new Set();
        transactions.forEach(t => {
            if (t.people) {
                t.people.forEach(p => entities.add(p));
            }
        });
        stats.uniqueEntities = entities.size;
        
        // Find most common currency
        const currencyCount = {};
        transactions.forEach(t => {
            if (t.amounts) {
                t.amounts.forEach(a => {
                    currencyCount[a.currency] = (currencyCount[a.currency] || 0) + 1;
                });
            }
        });
        
        if (Object.keys(currencyCount).length > 0) {
            const sorted = Object.entries(currencyCount).sort((a, b) => b[1] - a[1]);
            stats.mostCommonCurrency = this.getCurrencyName(sorted[0][0]);
        }
        
        return stats;
    }

    /**
     * Get currency distribution
     */
    getCurrencyDistribution(transactions) {
        const distribution = {};
        let totalCount = 0;
        
        transactions.forEach(t => {
            if (t.amounts) {
                t.amounts.forEach(a => {
                    if (!distribution[a.currency]) {
                        distribution[a.currency] = {
                            count: 0,
                            totalValue: 0,
                            percentage: 0
                        };
                    }
                    distribution[a.currency].count++;
                    distribution[a.currency].totalValue += this.convertToFlorins(a.amount, a.currency);
                    totalCount++;
                });
            }
        });
        
        // Calculate percentages
        Object.keys(distribution).forEach(currency => {
            distribution[currency].percentage = (distribution[currency].count / totalCount) * 100;
        });
        
        return distribution;
    }

    /**
     * Convert currency to florins
     */
    convertToFlorins(amount, currency) {
        const rates = {
            'f': 1,
            's': 0.05,
            'd': 0.004167,
            'gr': 0.0625,
            't': 0.5,
            'l': 1,
            'p': 0.004167
        };
        
        return amount * (rates[currency] || 1);
    }

    /**
     * Get full currency name
     */
    getCurrencyName(code) {
        const names = {
            'f': 'Florin',
            's': 'Shilling',
            'd': 'Denarius',
            'gr': 'Groschen',
            't': 'Taler',
            'l': 'Pound',
            'p': 'Pfennig'
        };
        
        return names[code] || code.toUpperCase();
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFExporter;
}