import { useState, useEffect } from 'react'
import { stockService } from '../services/stockService'

function AddPurchaseItemModal({ isOpen, onClose, onSave, itemData = null, isEdit = false, isSales = false }) {
  const [formData, setFormData] = useState({
    description: '',
    hsn: '',
    batch: '',
    expiry: '',
    qty: '',
    free: '',
    discPercent: '',
    mrp: '',
    price: '',
    gstPercent: '',
    cgstAmount: '',
    sgstAmount: '',
    amount: '',
  })

  const [errors, setErrors] = useState({})
  const [allStockItems, setAllStockItems] = useState([])
  const [isLoadingStock, setIsLoadingStock] = useState(false)
  const [selectedStockId, setSelectedStockId] = useState(null)
  const [batchSearchValue, setBatchSearchValue] = useState('')
  const [isSearchingBatch, setIsSearchingBatch] = useState(false)
  const [batchSearchError, setBatchSearchError] = useState('')
  const [availableQuantity, setAvailableQuantity] = useState('')

  // Calculate GST and amount automatically when relevant fields change
  useEffect(() => {
    const qty = parseFloat(formData.qty) || 0
    const free = parseFloat(formData.free) || 0
    const price = parseFloat(formData.price) || 0
    const discPercent = parseFloat(formData.discPercent) || 0
    const gstPercent = parseFloat(formData.gstPercent) || 0

    if (qty > 0 && price > 0) {
      // Calculate base amount: (Price × (Qty - Free)) × (1 - Discount/100)
      const billableQty = qty - free
      let baseAmount = price * billableQty
      
      if (discPercent > 0) {
        baseAmount = baseAmount * (1 - discPercent / 100)
      }

      // Calculate GST amounts (assuming CGST and SGST are equal halves of GST%)
      const cgstPercent = gstPercent / 2
      const sgstPercent = gstPercent / 2
      const cgstAmount = baseAmount * (cgstPercent / 100)
      const sgstAmount = baseAmount * (sgstPercent / 100)

      // Total amount = base amount + CGST + SGST
      const totalAmount = baseAmount + cgstAmount + sgstAmount

      setFormData(prev => ({
        ...prev,
        cgstAmount: cgstAmount.toFixed(2),
        sgstAmount: sgstAmount.toFixed(2),
        amount: totalAmount.toFixed(2)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        cgstAmount: '',
        sgstAmount: '',
        amount: ''
      }))
    }
  }, [formData.qty, formData.free, formData.price, formData.discPercent, formData.gstPercent])

  // Load all stock items for dropdown when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllStock()
    }
  }, [isOpen])

  // Initialize form data when editing
  useEffect(() => {
    if (isEdit && itemData) {
      setFormData({
        description: itemData.description || '',
        hsn: itemData.hsn || '',
        batch: itemData.batch || '',
        expiry: itemData.expiry || '',
        qty: itemData.qty || '',
        free: itemData.free || '',
        discPercent: itemData.discPercent || '',
        mrp: itemData.mrp || '',
        price: itemData.price || '',
        gstPercent: itemData.gstPercent || '',
        cgstAmount: itemData.cgstAmount || '',
        sgstAmount: itemData.sgstAmount || '',
        amount: itemData.amount || '',
      })
      
      // Try to find matching stock item for edit mode
      if (itemData.batch && allStockItems.length > 0) {
        const matchingStock = allStockItems.find(s => 
          s.batch_no?.toUpperCase() === itemData.batch?.toUpperCase() ||
          s.description?.toUpperCase() === itemData.description?.toUpperCase()
        )
        if (matchingStock) {
          setSelectedStockId(matchingStock.id)
        }
      }
    } else {
      // Reset form for new item
      setFormData({
        description: '',
        hsn: '',
        batch: '',
        expiry: '',
        qty: '',
        free: '',
        discPercent: '',
        mrp: '',
        price: '',
        gstPercent: '',
        cgstAmount: '',
        sgstAmount: '',
        amount: '',
      })
      setSelectedStockId(null)
      setBatchSearchValue('')
      setBatchSearchError('')
      setAvailableQuantity('')
    }
    setErrors({})
  }, [isOpen, itemData, isEdit, allStockItems])

  // Load all stock items for dropdown
  const loadAllStock = async () => {
    try {
      setIsLoadingStock(true)
      const stockItems = await stockService.getAllStock()
      setAllStockItems(stockItems || [])
    } catch (error) {
      console.error('Error loading stock items:', error)
      // Don't show error to user, just continue without dropdown
      setAllStockItems([])
    } finally {
      setIsLoadingStock(false)
    }
  }

  // Handle stock item selection from dropdown
  const handleStockSelect = async (e) => {
    const stockId = e.target.value
    setSelectedStockId(stockId)
    setBatchSearchValue('') // Clear batch search when using dropdown
    setBatchSearchError('')
    
    if (stockId && stockId !== '') {
      const selectedStock = allStockItems.find(s => String(s.id) === String(stockId))
      if (selectedStock) {
        // CRITICAL: For Sales mode, fetch available quantities via batch API
        // Dropdown uses getAllStock() which returns original quantities (3600)
        // We need available quantities (300) to match Current Stock List
        if (isSales && selectedStock.batch_no) {
          try {
            const stockWithAvailable = await stockService.getStockByBatch(selectedStock.batch_no)
            autoFillFromStock(stockWithAvailable)
          } catch (error) {
            console.error('Error fetching available quantities, using dropdown data:', error)
            // Fallback to dropdown data if batch API fails
            autoFillFromStock(selectedStock)
          }
        } else {
          // For Purchase mode, original quantities are fine
          autoFillFromStock(selectedStock)
        }
      }
    } else {
      // Clear form if "Select Product" is chosen
      setFormData(prev => ({
        ...prev,
        batch: '',
        description: '',
        hsn: '',
        expiry: '',
        mrp: '',
        price: '',
        discPercent: '',
        gstPercent: '',
        qty: '',
        free: '',
      }))
    }
  }

  // Auto-fill from stock item
  const autoFillFromStock = (stock) => {
    // Convert exp_date (VARCHAR format like "MM-YY" or "DD-MM-YYYY") to date input format
    let expiryDate = ''
    if (stock.exp_date) {
      try {
        // Try to parse different date formats
        const expDateStr = stock.exp_date.trim()
        if (expDateStr.includes('-')) {
          const parts = expDateStr.split('-')
          if (parts.length === 2) {
            // Format: MM-YY
            const month = parts[0].padStart(2, '0')
            const year = '20' + parts[1].padStart(2, '0')
            expiryDate = `${year}-${month}-01` // Use first day of month
          } else if (parts.length === 3) {
            // Format: DD-MM-YYYY or DD-MM-YY
            const day = parts[0].padStart(2, '0')
            const month = parts[1].padStart(2, '0')
            const year = parts[2].length === 2 ? '20' + parts[2] : parts[2]
            expiryDate = `${year}-${month}-${day}`
          }
        }
      } catch {
        // Could not parse expiry date
      }
    }
    
    // Calculate total GST percent (cgst_igst + sgst)
    const totalGstPercent = (parseFloat(stock.cgst_igst) || 0) + (parseFloat(stock.sgst) || 0)
    
    // Calculate available quantity (qty + free)
    const stockQty = parseFloat(stock.qty || 0)
    const stockFree = parseFloat(stock.free || 0)
    const totalAvailable = stockQty + stockFree
    setAvailableQuantity(totalAvailable.toFixed(2))
    
    setFormData(prev => {
      // For Purchase: auto-fill quantity from stock route (as integer) - matches the quantity in stocks route
      // For Sales: don't auto-fill quantity (user enters manually)
      const purchaseQty = isSales ? prev.qty : (stock.qty !== null && stock.qty !== undefined ? parseInt(stock.qty, 10) : '')
      const purchaseFree = isSales ? prev.free : (stock.free !== null && stock.free !== undefined ? parseInt(stock.free, 10) : '')
      
      // Auto-filling from stock
      
      return {
        ...prev,
        batch: stock.batch_no || stock.batchNo || prev.batch,
        description: stock.description || prev.description,
        hsn: stock.hsn_sac || stock.hsnSac || prev.hsn,
        expiry: expiryDate || prev.expiry,
        mrp: stock.mrp || prev.mrp,
        price: stock.rate || prev.price,
        discPercent: stock.discount || prev.discPercent,
        gstPercent: totalGstPercent || prev.gstPercent,
        // Auto-fill qty and free for Purchase from stock route - matches the same quantity in stocks route
        qty: purchaseQty,
        free: purchaseFree,
      }
    })
  }

  // Handle batch number input (store value, don't search yet)
  const handleBatchInput = (e) => {
    const batchNo = e.target.value.trim()
    setBatchSearchValue(batchNo)
    setBatchSearchError('')
    setSelectedStockId(null) // Clear dropdown selection when using batch search
    setAvailableQuantity('') // Clear available quantity
    
    if (!batchNo) {
      // Clear form if batch number is empty
      setFormData(prev => ({
        ...prev,
        batch: '',
        description: '',
        hsn: '',
        expiry: '',
        mrp: '',
        price: '',
        discPercent: '',
        gstPercent: '',
        qty: '',
        free: '',
      }))
    }
  }

  // Handle batch number search - triggered on Enter key or button click
  const handleBatchSearch = async () => {
    const batchNo = batchSearchValue.trim()
    
    if (!batchNo) {
      setBatchSearchError('Please enter a batch number')
      return
    }
    
    try {
      setIsSearchingBatch(true)
      setBatchSearchError('')
      // Searching for batch
      
      // CRITICAL: For Sales, always use API to get AVAILABLE quantities (after sales)
      // For Purchase, can use cache (original quantities are fine)
      // The API now returns available quantities from stock_available view
      let stockItem = null
      
      if (isSales) {
        // For Sales: ALWAYS use API to get latest available quantities (after sales)
        // Don't use cache - cache contains original quantities, not available quantities
        stockItem = await stockService.getStockByBatch(batchNo)
      } else {
        // For Purchase: Can use cache (original quantities are fine for purchases)
        const cachedStock = sessionStorage.getItem('stock_original_data')
        
        if (cachedStock) {
          try {
            const cachedData = JSON.parse(cachedStock)
            const batchUpper = batchNo.toUpperCase().trim()
            
            // Case-insensitive search in cached data
            const matchingItems = []
            
            for (const item of cachedData) {
              const itemBatch = item.batch_no || item.batchNo || ''
              if (itemBatch) {
                const itemBatchUpper = itemBatch.toUpperCase().trim()
                if (itemBatchUpper === batchUpper) {
                  matchingItems.unshift(item)
                } else if (itemBatchUpper.startsWith(batchUpper)) {
                  const exactCount = matchingItems.filter(m => 
                    (m.batch_no || m.batchNo || '').toUpperCase().trim() === batchUpper
                  ).length
                  matchingItems.splice(exactCount, 0, item)
                } else if (itemBatchUpper.includes(batchUpper)) {
                  matchingItems.push(item)
                }
              }
            }
            
            if (matchingItems.length > 0) {
              stockItem = matchingItems[0]
              // Found stock item from cache
            }
          } catch (e) {
            // Failed to parse cached stock data, falling back to API
          }
        }
        
        // If not found in cache, use API
        if (!stockItem) {
          stockItem = await stockService.getStockByBatch(batchNo)
        }
      }
      
      if (stockItem) {
        // Auto-fill all fields including quantity from stock route (cached data)
        autoFillFromStock(stockItem)
        setSelectedStockId(stockItem.id) // Also set dropdown to match
        setBatchSearchError('')
      } else {
        setBatchSearchError('Batch number not found')
        setAvailableQuantity('')
      }
    } catch (error) {
      console.error('Error searching by batch:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      setBatchSearchError(error.message || 'Batch number not found')
      setAvailableQuantity('')
      // Clear form on error
      setFormData(prev => ({
        ...prev,
        batch: '',
        description: '',
        hsn: '',
        expiry: '',
        mrp: '',
        price: '',
        discPercent: '',
        gstPercent: '',
        qty: '',
        free: '',
      }))
    } finally {
      setIsSearchingBatch(false)
    }
  }

  // Handle Enter key in batch search field
  const handleBatchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBatchSearch()
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  // Prevent mouse wheel from changing number input values
  const handleWheel = (e) => {
    if (e.target.type === 'number') {
      e.target.blur()
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    // Validate quantity - different rules for Sales vs Purchase
    if (isSales) {
      // For Sales: quantity is mandatory and must be valid
      if (!formData.qty || formData.qty === '') {
        newErrors.qty = 'Quantity is required'
      } else if (isNaN(formData.qty) || parseFloat(formData.qty) < 0) {
        newErrors.qty = 'Quantity must be a valid number greater than or equal to 0'
      } else {
        const enteredQty = parseFloat(formData.qty)
        const enteredFree = parseFloat(formData.free || 0)
        const totalEntered = enteredQty + enteredFree

        // Validate against available quantity if available
        if (availableQuantity) {
          const availableQty = parseFloat(availableQuantity)
          
          if (totalEntered > availableQty) {
            newErrors.qty = `Entered quantity (${totalEntered}) exceeds available quantity (${availableQty}). Please enter a quantity less than or equal to ${availableQty}.`
            // Also set error on free if it contributes to exceeding
            if (enteredFree > 0) {
              newErrors.free = `Total quantity (qty + free) cannot exceed available quantity (${availableQty})`
            }
          } else if (enteredQty <= 0) {
            newErrors.qty = 'Quantity must be greater than 0'
          }
        } else if (enteredQty <= 0) {
          newErrors.qty = 'Quantity must be greater than 0'
        }
      }
    } else {
      // For Purchase: quantity validation (can be auto-filled or empty)
      if (formData.qty && (isNaN(formData.qty) || parseFloat(formData.qty) < 0)) {
        newErrors.qty = 'Quantity must be a valid number'
      }
    }

    // Validate free quantity
    if (formData.free && (isNaN(formData.free) || parseFloat(formData.free) < 0)) {
      newErrors.free = 'Free quantity must be a valid number'
    }

    if (formData.discPercent && (isNaN(formData.discPercent) || parseFloat(formData.discPercent) < 0 || parseFloat(formData.discPercent) > 100)) {
      newErrors.discPercent = 'Discount must be between 0 and 100'
    }

    if (formData.price && (isNaN(formData.price) || parseFloat(formData.price) < 0)) {
      newErrors.price = 'Price must be a valid number'
    }

    if (formData.gstPercent && (isNaN(formData.gstPercent) || parseFloat(formData.gstPercent) < 0 || parseFloat(formData.gstPercent) > 100)) {
      newErrors.gstPercent = 'GST must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      const success = onSave(formData)
      if (success === true) {
        // Reset form only after successful save (for add mode)
        if (!isEdit) {
          setFormData({
            description: '',
            hsn: '',
            batch: '',
            expiry: '',
            qty: '',
            free: '',
            discPercent: '',
            mrp: '',
            price: '',
            gstPercent: '',
            cgstAmount: '',
            sgstAmount: '',
            amount: '',
          })
          setSelectedStockId(null)
          setBatchSearchValue('')
          setBatchSearchError('')
          setErrors({})
        }
      }
    }
  }

  const handleCancel = () => {
    setFormData({
      description: '',
      hsn: '',
      batch: '',
      expiry: '',
      qty: '',
      free: '',
      discPercent: '',
      mrp: '',
      price: '',
      gstPercent: '',
      cgstAmount: '',
      sgstAmount: '',
      amount: '',
    })
    setSelectedStockId(null)
    setBatchSearchValue('')
    setBatchSearchError('')
    setAvailableQuantity('')
    setErrors({})
    onClose()
  }


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-slate-700 border-b border-slate-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {isEdit ? 'Edit Item' : 'Add Item'}
          </h2>
          <button
            onClick={handleCancel}
            className="text-slate-300 hover:text-white transition-colors text-xl sm:text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {/* Batch Number Search - Primary search method */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="batchSearch" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Search by Batch No. <span className="text-blue-400">(Enter full batch number and press Enter or click Search)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="batchSearch"
                    value={batchSearchValue}
                    onChange={handleBatchInput}
                    onKeyPress={handleBatchKeyPress}
                    placeholder="Enter full batch number (e.g., PB25104)"
                    className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                      batchSearchError ? 'border-red-500' : 'border-blue-500/50 focus:border-blue-500'
                    }`}
                    disabled={isSearchingBatch}
                  />
                  {isSearchingBatch && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleBatchSearch}
                  disabled={isSearchingBatch || !batchSearchValue.trim()}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 text-xs sm:text-sm whitespace-nowrap"
                >
                  {isSearchingBatch ? 'Searching...' : 'Search'}
                </button>
              </div>
              {batchSearchError && (
                <p className="text-xs text-red-400 mt-1">{batchSearchError}</p>
              )}
              {!batchSearchError && batchSearchValue && formData.description && (
                <p className="text-xs text-green-400 mt-1">✓ Found and auto-filled all fields</p>
              )}
              <p className="text-xs text-blue-300 mt-1">
                Enter the complete batch number and press Enter or click Search to auto-fill all fields{isSales ? ' (quantity must be entered manually)' : ' including quantity'}, description, HSN, MRP, Rate, Discount, GST, etc.
              </p>
            </div>

            {/* Stock Item Dropdown - Alternative method */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="stockSelect" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Or Select from Stock <span className="text-slate-400">(Alternative method)</span>
              </label>
              <div className="relative">
                <select
                  id="stockSelect"
                  value={selectedStockId || ''}
                  onChange={handleStockSelect}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={isLoadingStock}
                >
                  <option value="" className="bg-slate-700">Select Product from Stock...</option>
                  {allStockItems.map((stock) => (
                    <option key={stock.id} value={stock.id} className="bg-slate-700">
                      {stock.description} {stock.batch_no ? `(Batch: ${stock.batch_no})` : ''}
                    </option>
                  ))}
                </select>
                {isLoadingStock && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Batch Number (Auto-filled from search or selection) */}
            <div>
              <label htmlFor="batch" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Batch No.
              </label>
              <input
                type="text"
                id="batch"
                name="batch"
                value={formData.batch}
                onChange={handleChange}
                placeholder="Auto-filled from batch search"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${(selectedStockId || batchSearchValue) ? 'cursor-not-allowed opacity-75' : ''}`}
                readOnly={!!(selectedStockId || batchSearchValue)}
              />
            </div>

            {/* Available Quantity - Auto-filled from batch search (Only for Sales) */}
            {availableQuantity && isSales && (
              <div>
                <label htmlFor="availableQty" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                  Available Quantity <span className="text-green-400">(Auto-filled)</span>
                </label>
                <input
                  type="text"
                  id="availableQty"
                  value={availableQuantity}
                  readOnly
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-600/50 border-2 border-green-500/50 rounded-lg text-green-300 cursor-not-allowed font-medium"
                />
                <p className="text-xs text-green-400 mt-1">Current stock quantity</p>
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="description" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Description & Packing <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Auto-filled from batch search"
                readOnly={!!(selectedStockId || batchSearchValue)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.description ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                } ${(selectedStockId || batchSearchValue) ? 'cursor-not-allowed opacity-75' : ''}`}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* HSN */}
            <div>
              <label htmlFor="hsn" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                HSN/SAC
              </label>
              <input
                type="text"
                id="hsn"
                name="hsn"
                value={formData.hsn}
                onChange={handleChange}
                placeholder="Auto-filled from batch search"
                readOnly={!!(selectedStockId || batchSearchValue)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${(selectedStockId || batchSearchValue) ? 'cursor-not-allowed opacity-75' : ''}`}
              />
            </div>

            {/* Expiry */}
            <div>
              <label htmlFor="expiry" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Expiry
              </label>
              <input
                type="date"
                id="expiry"
                name="expiry"
                value={formData.expiry}
                onChange={handleChange}
                readOnly={!!(selectedStockId || batchSearchValue)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${(selectedStockId || batchSearchValue) ? 'cursor-not-allowed opacity-75' : ''}`}
              />
            </div>

            {/* Qty */}
            <div>
              <label htmlFor="qty" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Qty <span className="text-red-400">*</span>
                {!isSales && <span className="text-blue-400"> (Auto-filled from batch)</span>}
                {isSales && <span className="text-yellow-400"> (Enter manually)</span>}
              </label>
              <input
                type="number"
                id="qty"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder={isSales ? "Enter quantity to sell" : "Auto-filled from batch search"}
                min="0"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.qty ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                } ${batchSearchValue && !isSales ? 'border-blue-500/50' : ''}`}
              />
              {errors.qty && <p className="text-red-400 text-xs mt-1">{errors.qty}</p>}
              {batchSearchValue && formData.qty && !isSales && (
                <p className="text-xs text-green-400 mt-1">✓ Quantity auto-filled from stock</p>
              )}
              {isSales && availableQuantity && (
                <p className="text-xs text-yellow-400 mt-1">
                  Available: {availableQuantity} - Enter quantity to sell
                </p>
              )}
            </div>

            {/* Free */}
            <div>
              <label htmlFor="free" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Free
              </label>
              <input
                type="number"
                id="free"
                name="free"
                value={formData.free}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.free ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.free && <p className="text-red-400 text-xs mt-1">{errors.free}</p>}
            </div>

            {/* Disc %} */}
            <div>
              <label htmlFor="discPercent" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Disc %
              </label>
              <input
                type="number"
                id="discPercent"
                name="discPercent"
                value={formData.discPercent}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.discPercent ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.discPercent && <p className="text-red-400 text-xs mt-1">{errors.discPercent}</p>}
            </div>

            {/* MRP */}
            <div>
              <label htmlFor="mrp" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                MRP
              </label>
              <input
                type="number"
                id="mrp"
                name="mrp"
                value={formData.mrp}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Price */}
            <div>
              <label htmlFor="price" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Price
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.price ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.price && <p className="text-red-400 text-xs mt-1">{errors.price}</p>}
            </div>

            {/* GST %} */}
            <div>
              <label htmlFor="gstPercent" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                GST %
              </label>
              <input
                type="number"
                id="gstPercent"
                name="gstPercent"
                value={formData.gstPercent}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.gstPercent ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.gstPercent && <p className="text-red-400 text-xs mt-1">{errors.gstPercent}</p>}
            </div>

            {/* CGST ₹ (Auto calculated) */}
            <div>
              <label htmlFor="cgstAmount" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                CGST ₹ <span className="text-slate-400">(Auto)</span>
              </label>
              <input
                type="text"
                id="cgstAmount"
                name="cgstAmount"
                value={formData.cgstAmount}
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-600/50 border-2 border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
              />
            </div>

            {/* SGST ₹ (Auto calculated) */}
            <div>
              <label htmlFor="sgstAmount" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                SGST ₹ <span className="text-slate-400">(Auto)</span>
              </label>
              <input
                type="text"
                id="sgstAmount"
                name="sgstAmount"
                value={formData.sgstAmount}
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-600/50 border-2 border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
              />
            </div>

            {/* Amount (Auto calculated) */}
            <div>
              <label htmlFor="amount" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Amount <span className="text-slate-400">(Auto)</span>
              </label>
              <input
                type="text"
                id="amount"
                name="amount"
                value={formData.amount}
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-600/50 border-2 border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-700">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base"
            >
              {isEdit ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddPurchaseItemModal
