/**
 * STOCK MODULE - CRUD OPERATIONS ONLY
 * 
 * ⚠️ CRITICAL: This module must NEVER refresh after sales!
 * 
 * DESIGN PRINCIPLE:
 * - Stock module: Shows ORIGINAL manual entries (e.g., 1000 units)
 * - StockList module: Shows CURRENT available quantities (e.g., 500 after selling 500)
 * 
 * RULES TO PREVENT BREAKING THIS:
 * 1. NEVER add event listener for 'stockUpdated' event in this file
 * 2. NEVER call loadStock() automatically after sales
 * 3. ALWAYS use cached data from sessionStorage when available
 * 4. ONLY refresh after CRUD operations (add/edit/delete on THIS page)
 * 5. Stock quantities here are MANUAL ENTRIES, not calculated from sales
 * 
 * If you need to show current quantities after sales, use StockList.jsx instead!
 */
import { useState, useEffect, useRef } from 'react'
import AddStockModal from '../components/AddStockModal'
import { stockService } from '../services/stockService'

function Stock() {
  const [stockItems, setStockItems] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStock, setEditingStock] = useState(null)
  const [selectedStockId, setSelectedStockId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const hasLoadedInitialData = useRef(false) // Track if we've loaded initial data

  // CRITICAL: This page is for CRUD operations ONLY
  // It does NOT refresh when sales are saved - quantities remain unchanged
  // Only StockList page shows decreased quantities after sales
  // This page ONLY refreshes when you add/edit/delete stock items on this page itself
  useEffect(() => {
    // ALWAYS use cached data first - never fetch fresh data that might be updated by sales
    // This ensures we show original stock entries, not updated quantities after sales
    const cachedStock = sessionStorage.getItem('stock_original_data')
    if (cachedStock) {
      try {
        const data = JSON.parse(cachedStock)
        setStockItems(data || [])
        setIsLoading(false)
        hasLoadedInitialData.current = true
        // Using cached original stock data
        return
      } catch (e) {
        // Failed to parse cached stock data
      }
    }
    
    // Only fetch if no cache exists (first time ever)
    if (!hasLoadedInitialData.current) {
      loadStockInitial()
      hasLoadedInitialData.current = true
    }
    // ⚠️ CRITICAL: DO NOT listen to stockUpdated events - this page should NEVER refresh after sales
    // This ensures Stock module shows original manual entries (e.g., 1000)
    // StockList module shows current available quantities after sales (e.g., 500)
    // DO NOT ADD: window.addEventListener('stockUpdated', ...) - THIS WILL BREAK THE DESIGN!
  }, [])

  // Load stock ONLY on initial mount - this data represents original stock entries
  // IMPORTANT: We cache this in sessionStorage so it persists even when navigating away
  // After sales, the database is updated, but we use cached original data
  // Only StockList will fetch fresh data to show decreased quantities
  const loadStockInitial = async () => {
    // Check if we have cached original stock data
    const cachedStock = sessionStorage.getItem('stock_original_data')
    if (cachedStock) {
      try {
        const data = JSON.parse(cachedStock)
        setStockItems(data || [])
        setIsLoading(false)
        // Using cached original stock data
        return
      } catch (e) {
        // Failed to parse cached stock data, fetching fresh data
      }
    }

    // No cached data - fetch from API and cache it
    setIsLoading(true)
    setError('')
    try {
      const data = await stockService.getAllStock()
      // Backend returns snake_case, we'll handle mapping in display
      // This data represents the original stock entries (for CRUD operations)
      // Cache it in sessionStorage so it persists across navigation
      sessionStorage.setItem('stock_original_data', JSON.stringify(data || []))
      setStockItems(data || [])
      // Initial stock data loaded and cached
    } catch (err) {
      setError(err.message || 'Failed to load stock items')
      console.error('Error loading stock:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load stock ONLY for CRUD operations (add/edit/delete on this page)
  // This is called manually after CRUD operations, NOT after sales
  // IMPORTANT: After CRUD, we update the cache with fresh data
  // But we NEVER fetch from database after sales - we always use cached data
  const loadStock = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await stockService.getAllStock()
      // Backend returns snake_case, we'll handle mapping in display
      // This is ONLY called after CRUD operations on this page (add/edit/delete)
      // Update cache with fresh data after CRUD operation
      sessionStorage.setItem('stock_original_data', JSON.stringify(data || []))
      setStockItems(data || [])
      // Stock data reloaded after CRUD operation
    } catch (err) {
      setError(err.message || 'Failed to load stock items')
      console.error('Error loading stock:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate next S.No
  const getNextSNo = () => {
    if (stockItems.length === 0) return 1
    const maxSNo = Math.max(...stockItems.map(item => item.s_no || item.sNo || 0))
    return maxSNo + 1
  }

  // Handle Add Stock
  const handleAddStock = () => {
    setEditingStock(null)
    setSelectedStockId(null)
    setIsModalOpen(true)
  }

  // Handle Edit Stock
  const handleEditStock = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedStockId) {
      alert('Please select a stock item to edit.\n\nClick on a row in the table first to select it.')
      return
    }

    // Find stock item with reliable ID comparison
    const stock = stockItems.find((s) => {
      return String(s.id) === String(selectedStockId) || s.id === selectedStockId
    })
    
    if (stock) {
      // Map backend format to frontend format for editing
      const mappedStock = mapStockDataForEdit(stock)
      setEditingStock(mappedStock)
      setIsModalOpen(true)
    } else {
      alert(`Stock item with ID ${selectedStockId} not found. Please select a valid item.`)
      setSelectedStockId(null)
    }
  }

  // Handle Delete Stock
  const handleDeleteStock = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedStockId) {
      alert('Please select a stock item to delete.\n\nClick on a row in the table first to select it.')
      return
    }

    // Find stock item with reliable ID comparison
    const stock = stockItems.find((s) => {
      return String(s.id) === String(selectedStockId) || s.id === selectedStockId
    })
    
    if (!stock) {
      alert(`Stock item with ID ${selectedStockId} not found. Please select a valid item.`)
      setSelectedStockId(null)
      return
    }

    const stockDescription = stock.description || `S.No ${stock.s_no || stock.sNo || 'N/A'}`
    const confirmDelete = window.confirm(
      `Are you sure you want to delete stock item "${stockDescription}"?\n\nThis action cannot be undone.`
    )
    
    if (confirmDelete) {
      try {
        setIsLoading(true)
        setError('')
        await stockService.deleteStock(stock.id)
        // Clear selection before reloading
        setSelectedStockId(null)
        // Reload stock after deletion (CRUD operation - this is allowed)
        await loadStock()
        // Update cached data after CRUD operation
        hasLoadedInitialData.current = false
        alert(`Stock item "${stockDescription}" deleted successfully.`)
      } catch (err) {
        const errorMessage = err.message || 'Failed to delete stock item. Please try again.'
        alert(errorMessage)
        setError(errorMessage)
        console.error('Error deleting stock:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Handle Save (Add or Update)
  const handleSaveStock = async (formData) => {
    try {
      setError('')
      // Map frontend field names (camelCase) to backend field names (snake_case)
      const stockData = {
        s_no: formData.sNo || getNextSNo(),
        description: formData.description.trim(),
        hsn_sac: formData.hsnSac && formData.hsnSac.trim() ? formData.hsnSac.trim() : null,
        batch_no: formData.batchNo && formData.batchNo.trim() ? formData.batchNo.trim() : null,
        exp_date: formData.expDate && formData.expDate.trim() ? formData.expDate.trim() : null,
        qty: formData.qty ? parseFloat(formData.qty) : 0,
        free: formData.free ? parseFloat(formData.free) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
        mrp: formData.mrp ? parseFloat(formData.mrp) : 0,
        rate: formData.rate ? parseFloat(formData.rate) : 0,
        cgst_igst: formData.cgstIgst ? parseFloat(formData.cgstIgst) : 0,
        sgst: formData.sgst ? parseFloat(formData.sgst) : 0,
        amount: formData.amount ? parseFloat(formData.amount) : 0,
      }

      if (editingStock && editingStock.id) {
        // Save ID before clearing
        const updatedStockId = editingStock.id
        
        // Update existing stock item
        await stockService.updateStock(updatedStockId, stockData)
        // Clear selection and editing state before reloading
        setEditingStock(null)
        setSelectedStockId(null)
        // Reload stock after update (CRUD operation - this is allowed)
        await loadStock()
        // Update cached data after CRUD operation
        hasLoadedInitialData.current = false
        
        // Trigger stock update event immediately - backend update is already complete
        // StockList listens to this event and will refresh to show updated quantities
        // Small delay ensures database commit is fully propagated to the view
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('stockUpdated'))
          // Stock update event dispatched
        }, 500) // Optimized: Reduced delay since await already ensures backend update completed
        
        return true
      } else {
        // Create new stock item
        await stockService.createStock(stockData)
        // Reload stock after creation (CRUD operation - this is allowed)
        await loadStock()
        // Update cached data after CRUD operation
        hasLoadedInitialData.current = false
        
        // Trigger stock update event immediately - backend create is already complete
        // This ensures new stock items appear in StockList
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('stockUpdated'))
          // Stock update event dispatched
        }, 500) // Optimized: Reduced delay since await already ensures backend create completed
        
        return true
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to save stock item. Please try again.'
      alert(errorMessage)
      setError(errorMessage)
      console.error('Error saving stock:', err)
      return false
    }
  }

  // Handle row selection
  const handleRowClick = (e, stockId) => {
    // Prevent selection when clicking on buttons or interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return
    }
    
    // Convert both to strings for reliable comparison
    const id = String(stockId)
    const currentId = selectedStockId ? String(selectedStockId) : null
    
    // Toggle selection: if same row clicked, deselect; otherwise select new row
    const newSelectedId = id === currentId ? null : stockId
    setSelectedStockId(newSelectedId)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingStock(null)
  }

  // Handle modal save success
  const handleModalSave = async (formData) => {
    const wasEditing = !!editingStock
    const success = await handleSaveStock(formData)
    if (success) {
      handleCloseModal()
      setTimeout(() => {
        if (wasEditing) {
          alert(`Stock item updated successfully!`)
        } else {
          alert(`Stock item added successfully!`)
        }
      }, 100)
    }
    return success
  }

  // Map backend response (snake_case) to frontend format (camelCase) for edit
  const mapStockDataForEdit = (stock) => {
    if (!stock) return null
    return {
      id: stock.id,
      sNo: stock.s_no || stock.sNo || 0,
      description: stock.description || '',
      hsnSac: stock.hsn_sac || stock.hsnSac || '',
      batchNo: stock.batch_no || stock.batchNo || '',
      expDate: stock.exp_date || stock.expDate || '',
      qty: stock.qty || '',
      free: stock.free || '',
      discount: stock.discount || '',
      mrp: stock.mrp || '',
      rate: stock.rate || '',
      cgstIgst: stock.cgst_igst || stock.cgstIgst || '',
      sgst: stock.sgst || '',
      amount: stock.amount || '',
    }
  }

  // Transform stock items list from backend format (snake_case) to frontend format (camelCase)
  const transformedStockItems = stockItems.map(item => ({
    id: item.id,
    sNo: item.s_no || item.sNo || 0,
    description: item.description || '',
    hsnSac: item.hsn_sac || item.hsnSac || '',
    batchNo: item.batch_no || item.batchNo || '',
    expDate: item.exp_date || item.expDate || '',
    qty: item.qty || 0,
    free: item.free || 0,
    discount: item.discount || 0,
    mrp: item.mrp || 0,
    rate: item.rate || 0,
    cgstIgst: item.cgst_igst || item.cgstIgst || 0,
    sgst: item.sgst || 0,
    amount: item.amount || 0,
  })).filter(item => item !== null)

  return (
    <div className="p-3 sm:p-6 h-full">
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Main Content Area - Table */}
        <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden min-w-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-300 text-sm">Loading stock items...</p>
            </div>
          ) : (
            <div className="overflow-x-auto h-full">
              <table className="w-full border-collapse min-w-[1200px]">
                {/* Table Header */}
                <thead>
                  <tr className="bg-slate-700 border-b border-slate-600">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      S.No
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Description & Packing
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      HSN/SAC
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Batch No.
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Exp Date
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Qty
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Free
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Disc%
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      MRP
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Rate
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      CGST/IGST
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      SGST
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white">
                      Amount
                    </th>
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody>
                  {transformedStockItems.length === 0 ? (
                    <tr>
                      <td 
                        colSpan="13" 
                        className="px-4 py-8 text-center text-slate-400 text-xs sm:text-sm"
                      >
                        No stock items found. Click "Add Stock" to create one.
                      </td>
                    </tr>
                  ) : (
                    transformedStockItems.map((item, index) => {
                      // Reliable ID comparison for selection highlighting
                      const isSelected = selectedStockId !== null && (
                        String(selectedStockId) === String(item.id) || 
                        selectedStockId === item.id
                      )
                      return (
                        <tr 
                          key={item.id || index}
                          onClick={(e) => handleRowClick(e, item.id)}
                          className={`border-b border-slate-700 hover:bg-slate-700/50 active:bg-slate-600/50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-600/20 ring-2 ring-blue-500 border-blue-400' : ''
                          }`}
                          style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                          }}
                          title={isSelected ? `Selected: ${item.description || 'Stock Item'}. Click again to deselect, or use Edit/Delete buttons.` : `Click to select ${item.description || 'Stock Item'}`}
                        >
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.sNo || index + 1}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.description || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.hsnSac || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.batchNo || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.expDate || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.qty || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.free || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.discount ? `${item.discount}%` : '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.mrp || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.rate || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.cgstIgst ? `${item.cgstIgst}%` : '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.sgst ? `${item.sgst}%` : '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm">
                            {item.amount ? `₹${parseFloat(item.amount).toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons - Right Side on Desktop, Below on Mobile */}
        <div className="flex flex-row lg:flex-col gap-3 lg:w-auto w-full">
          <button
            type="button"
            onClick={handleAddStock}
            disabled={isLoading}
            className="flex-1 lg:flex-none bg-slate-700 hover:bg-slate-600 active:bg-slate-800 disabled:bg-slate-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 whitespace-nowrap text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Stock
          </button>

          <button
            type="button"
            onClick={handleEditStock}
            disabled={!selectedStockId || transformedStockItems.length === 0 || isLoading}
            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-700 disabled:hover:bg-slate-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 whitespace-nowrap text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedStockId ? 'Please select a stock item first by clicking on a row' : 'Edit selected stock item'}
          >
            Edit Stock
          </button>

          <button
            type="button"
            onClick={handleDeleteStock}
            disabled={!selectedStockId || transformedStockItems.length === 0 || isLoading}
            className="flex-1 lg:flex-none bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-700 disabled:hover:bg-red-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 whitespace-nowrap text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedStockId ? 'Please select a stock item first by clicking on a row' : 'Delete selected stock item'}
          >
            Delete Stock
          </button>
        </div>
      </div>

      {/* Add/Edit Stock Modal */}
      <AddStockModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleModalSave}
        stockData={mapStockDataForEdit(editingStock)}
        isEdit={!!editingStock}
        nextSNo={getNextSNo()}
      />
    </div>
  )
}

export default Stock
