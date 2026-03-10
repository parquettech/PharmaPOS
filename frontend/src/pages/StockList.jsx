/**
 * STOCK LIST MODULE - CURRENT QUANTITIES (Calculated)
 * 
 * DESIGN PRINCIPLE:
 * - StockList: Shows CURRENT quantities calculated as: Original Qty - Sold Qty = Current Qty
 * - Stock module: Shows/manages RAW stock quantities (original entries)
 * 
 * Functionalities:
 * 1. When stock is updated in Stock module → Current Stock List refreshes and shows new Current Qty
 * 2. Current Qty = Original Qty (from stock table) - Sold Qty (from sales_items)
 * 
 * This module:
 * - Reads from stock_available view which calculates: available_qty = original_qty - sold_qty
 * - Listens to 'stockUpdated' events to refresh when stock is updated in Stock module
 * - Shows calculated current quantities that reflect updates from Stock module
 */
import { useState, useEffect, useMemo } from 'react'
import { stockService } from '../services/stockService'
import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'

function StockList() {
  const [stockItems, setStockItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // 'all', 'today', 'tomorrow', 'custom'
  const [customDate, setCustomDate] = useState('')

  // Load stock from API on mount and when stock is updated
  useEffect(() => {
    loadStock()
    
    // Listen for stock update events (triggered when stock is updated or sales/purchases are saved)
    const handleStockUpdate = () => {
      // Stock update event received - refreshing stock list
      // Optimized: Event is dispatched after backend update completes, so shorter delay is sufficient
      // The stock_available view reads directly from stock table and will reflect updates
      setTimeout(() => {
        loadStock()
      }, 800) // Optimized: Reduced delay since event is dispatched after backend update completes
    }
    
    window.addEventListener('stockUpdated', handleStockUpdate)
    
    return () => {
      window.removeEventListener('stockUpdated', handleStockUpdate)
    }
  }, [])

  const loadStock = async () => {
    setIsLoading(true)
    setError('')
    try {
      // Fetch stock with calculated Current Qty = Original Qty - Sold Qty
      // ALWAYS fetches fresh data from database via stock_available view (NO CACHE)
      // The view reads directly from stock table, so updates are immediately reflected
      // When stock is updated in Stock module, original_qty in view changes → Current Qty updates
      const data = await stockService.getAvailableStock()
      
      // Backend returns: original_qty, sold_qty, available_qty (calculated)
      // Backend already sets: qty = available_qty, free = available_free
      // So we just need to use the values directly - no recalculation needed
      const mappedData = (data || []).map(item => {
        // Backend already calculated: available_qty = original_qty - sold_qty
        // Backend already set: qty = available_qty, free = available_free
        // So item.qty is already the Current Qty (Original - Sold)
        const originalQty = parseFloat(item.original_qty || 0)
        const originalFree = parseFloat(item.original_free || 0)
        const soldQty = parseFloat(item.sold_qty || 0)
        const soldFree = parseFloat(item.sold_free || 0)
        
        // Current Qty is already in item.qty (backend set it to available_qty)
        const currentQty = parseFloat(item.qty || item.available_qty || 0)
        const currentFree = parseFloat(item.free || item.available_free || 0)
        
        return {
          ...item,
          // Store all values for display/reference
          original_qty: originalQty,
          original_free: originalFree,
          sold_qty: soldQty,
          sold_free: soldFree,
          // Current Qty = Original - Sold (already calculated by backend)
          qty: currentQty,
          free: currentFree,
          // Ensure available_qty/available_free are set
          available_qty: currentQty,
          available_free: currentFree
        }
      })
      
      setStockItems(mappedData)
    } catch (err) {
      // Ensure error is always a string, not an object
      let errorMessage = 'Failed to load stock items'
      
      if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = String(err.message)
      } else if (err?.detail) {
        errorMessage = String(err.detail)
      } else if (err?.response?.data?.detail) {
        errorMessage = String(err.response.data.detail)
      } else if (err?.response?.data?.message) {
        errorMessage = String(err.response.data.message)
      } else if (err) {
        // Last resort: try to stringify the error
        try {
          errorMessage = JSON.stringify(err)
        } catch {
          errorMessage = 'An unknown error occurred while loading stock items'
        }
      }
      
      setError(errorMessage)
      console.error('Error loading stock:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Parse update date to get date string
  const parseUpdateDate = (dateStr) => {
    if (!dateStr) return null
    try {
      // Handle ISO format or other date formats
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return null
      return date.toISOString().split('T')[0] // Returns YYYY-MM-DD
    } catch (e) {
      // Could not parse update date
      return null
    }
  }

  // Format update date for display
  const formatUpdateDate = (dateStr) => {
    if (!dateStr) return 'No Update Date'
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return dateStr
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch (e) {
      return dateStr
    }
  }

  // Get date filter function
  const getDateFilterFunction = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    switch (dateFilter) {
      case 'today':
        return (item) => {
          const updatedAt = item.updated_at || item.created_at
          if (!updatedAt) return false
          const itemDate = new Date(updatedAt)
          itemDate.setHours(0, 0, 0, 0)
          return itemDate.getTime() === today.getTime()
        }
      case 'tomorrow':
        return (item) => {
          const updatedAt = item.updated_at || item.created_at
          if (!updatedAt) return false
          const itemDate = new Date(updatedAt)
          itemDate.setHours(0, 0, 0, 0)
          return itemDate.getTime() === tomorrow.getTime()
        }
      case 'custom':
        if (!customDate) return () => true
        return (item) => {
          const updatedAt = item.updated_at || item.created_at
          if (!updatedAt) return false
          const itemDate = parseUpdateDate(updatedAt)
          return itemDate === customDate
        }
      default:
        return () => true
    }
  }

  // Filter stock items by date and search
  const filteredStockItems = useMemo(() => {
    // First filter by search term
    let filtered = stockItems.filter(item => {
      // Safely handle undefined/null searchTerm
      if (!searchTerm || (typeof searchTerm === 'string' && !searchTerm.trim())) return true
      
      // Ensure searchTerm is a string before calling toLowerCase
      const safeSearchTerm = typeof searchTerm === 'string' ? searchTerm : String(searchTerm || '')
      const search = safeSearchTerm.toLowerCase().trim()
      // Safely handle potentially undefined/null values
      const description = item?.description ? String(item.description).toLowerCase() : ''
      const batchNo = (item?.batch_no || item?.batchNo) ? String(item.batch_no || item.batchNo).toLowerCase() : ''
      
      return description.includes(search) || batchNo.includes(search)
    })

    // Apply date filter
    const dateFilterFn = getDateFilterFunction()
    filtered = filtered.filter(dateFilterFn)

    // Sort items by description
    filtered.sort((a, b) => {
      const descA = (a.description || '').toUpperCase()
      const descB = (b.description || '').toUpperCase()
      return descA.localeCompare(descB)
    })

    return filtered
  }, [stockItems, searchTerm, dateFilter, customDate])

  // Export to PDF
  const handleSaveReportPDF = () => {
    if (filteredStockItems.length === 0) {
      alert('No stock data to export.')
      return
    }

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      let yPos = 10

      // Title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Current Stock List Report', 105, yPos, { align: 'center' })
      yPos += 10

      // Date
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const reportDate = new Date().toLocaleDateString('en-GB')
      doc.text(`Generated on: ${reportDate}`, 105, yPos, { align: 'center' })
      yPos += 8

      // Table data - Use filteredStockItems (the data currently displayed)
      const tableData = []
      let sNo = 1

      filteredStockItems.forEach(item => {
        const qty = parseInt(item.qty || 0, 10)
        const free = parseInt(item.free || 0, 10)
        const totalQty = qty + free

        tableData.push([
          sNo++,
          item.description || '-',
          item.batch_no || item.batchNo || '-',
          totalQty > 0 ? totalQty : 0
        ])
      })

      autoTable(doc, {
        head: [['S.No', 'Stock Name', 'Batch No.', 'Current Quantity']],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 80 },
          2: { cellWidth: 40 },
          3: { cellWidth: 40, halign: 'right' }
        }
      })

      // Generate filename
      const fileName = `Stock_List_Report_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
      alert('Stock list report exported to PDF successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert(`Failed to generate PDF report: ${error.message || 'Unknown error'}`)
    }
  }


  return (
    <div className="p-3 sm:p-4 md:p-6 h-full">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 h-full flex flex-col">
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white">Current Stock List</h2>
            
            {/* Search Box */}
            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search by stock name or batch number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
              />
            </div>
          </div>

          {/* Date Filter Options */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Date Filter */}
            <div className="flex items-center gap-2">
              <label className="text-white text-sm font-medium">Filter by update date:</label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value)
                  if (e.target.value !== 'custom') {
                    setCustomDate('')
                  }
                }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="tomorrow">Tomorrow</option>
                <option value="custom">Custom Date</option>
              </select>
            </div>

            {/* Custom Date Input */}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <label className="text-white text-sm font-medium">Select Date:</label>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
            {typeof error === 'string' ? error : (error?.message || error?.detail || 'An error occurred')}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-slate-300 text-sm">Loading stock items...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto mb-4">
            {filteredStockItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-400 text-sm">
                  {searchTerm || dateFilter !== 'all' ? 'No stock items found matching your filters.' : 'No stock items available.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[600px]">
                  {/* Table Header */}
                  <thead>
                    <tr className="bg-slate-700 border-b border-slate-600">
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                        S.No
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                        Stock Name
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                        Batch No.
                      </th>
                      <th className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm font-semibold text-white">
                        Current Quantity
                      </th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody>
                    {filteredStockItems.map((item, itemIndex) => {
                      // Display Current Qty = Original Qty - Sold Qty (calculated)
                      // When stock is updated in Stock module, Original Qty changes → Current Qty updates
                      // Use integers for quantity (no floating point)
                      const qty = parseInt(item.qty || 0, 10) // Current Qty = Original - Sold
                      const free = parseInt(item.free || 0, 10)
                      const totalQty = qty + free
                      
                      return (
                        <tr
                          key={item.id || `item-${itemIndex}`}
                          className="border-b border-slate-700 hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-slate-300 border-r border-slate-700">
                            {itemIndex + 1}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-white border-r border-slate-700">
                            {item.description || '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-slate-300 border-r border-slate-700">
                            {item.batch_no || item.batchNo || '-'}
                          </td>
                          <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-white text-right font-medium">
                            {totalQty > 0 ? totalQty : 0}
                            {free > 0 && (
                              <span className="text-slate-400 text-xs ml-1">
                                (Free: {free})
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Save Report Button Section */}
        <div className="mt-4 pt-4 border-t border-slate-700 flex flex-wrap gap-3 justify-center sm:justify-end">
          <button
            onClick={handleSaveReportPDF}
            disabled={filteredStockItems.length === 0 || isLoading}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-700 disabled:hover:bg-red-700 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Report as PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default StockList
