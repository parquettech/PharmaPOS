import { useState, useEffect } from 'react'
import FilterableDropdown from '../components/FilterableDropdown'
import AddPurchaseItemModal from '../components/AddPurchaseItemModal'
import { companyService } from '../services/companyService'
import { saleService } from '../services/saleService'
import { generateSalesNumbers } from '../utils/numberGenerator'

function Sales() {
  const [middlemen, setMiddlemen] = useState([])
  const [thirdParties, setThirdParties] = useState([])
  const [selectedMiddleman, setSelectedMiddleman] = useState(null)
  const [selectedThirdParty, setSelectedThirdParty] = useState(null)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [billNo, setBillNo] = useState('')
  const [date, setDate] = useState(() => {
    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  })
  const [orderDate, setOrderDate] = useState(() => {
    try {
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  })
  const [orderNo, setOrderNo] = useState('')
  const [terms, setTerms] = useState('CASH/CREDIT')
  const [useIGST, setUseIGST] = useState(false) // IGST checkbox state
  const [items, setItems] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedItemIndex, setSelectedItemIndex] = useState(null)
  const [paidAmount, setPaidAmount] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Load middlemen and third parties
  useEffect(() => {
    loadCompanies()
    loadSalesNumbers()
  }, [])

  // Load sales numbers to generate next sequence
  const loadSalesNumbers = async () => {
    try {
      const currentYear = new Date().getFullYear()
      const yearStart = `${currentYear}-01-01`
      const yearEnd = `${currentYear}-12-31`
      
      // Fetch sales for current year to determine next sequence
      const sales = await saleService.getAllSales(yearStart, yearEnd)
      
      // Generate next numbers
      const numbers = generateSalesNumbers(sales)
      
      // Auto-populate numbers (user can still manually edit them)
      setInvoiceNo(numbers.invoiceNo)
      setBillNo(numbers.billNo)
      setOrderNo(numbers.orderNo)
    } catch (error) {
      // If error (e.g., timeout), still generate default numbers
      // Don't log timeout errors as they're handled gracefully
      if (!error.isNetworkError || error.originalError?.code !== 'ECONNABORTED') {
        console.error('Error loading sales numbers:', error)
      }
      const numbers = generateSalesNumbers([])
      setInvoiceNo(numbers.invoiceNo)
      setBillNo(numbers.billNo)
      setOrderNo(numbers.orderNo)
    }
  }

  const loadCompanies = async () => {
    try {
      setIsLoading(true)
      const allCompanies = await companyService.getAllCompanies()
      const companiesList = allCompanies || []
      const fromOptions = companiesList
      const toOptions = [{ id: null, name: 'None' }, ...companiesList]
      setMiddlemen(fromOptions)
      setThirdParties(toOptions)
    } catch (error) {
      if (!error.isNetworkError || error.originalError?.code !== 'ECONNABORTED') {
        console.error('Error loading companies:', error)
      }
      setMiddlemen([])
      setThirdParties([{ id: null, name: 'None' }])
      // Only show alert if user tries to interact
      if (error.message && !error.message.includes('401')) {
        // Companies not loaded
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Get selected middleman and third party details
  const selectedMiddlemanDetails = middlemen.find(m => String(m.id) === String(selectedMiddleman))
  const selectedThirdPartyDetails = selectedThirdParty 
    ? thirdParties.find(t => t.id !== null && String(t.id) === String(selectedThirdParty))
    : { name: 'None', address: '' }

  // Calculate totals
  const calculateTotals = () => {
    let gross = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0

    items.forEach(item => {
      const cgstAmount = parseFloat(item.cgstAmount) || 0
      const sgstAmount = parseFloat(item.sgstAmount) || 0
      const totalAmount = parseFloat(item.amount) || 0
      // Gross = Total Amount - CGST - SGST (base amount before GST)
      const baseAmount = totalAmount - cgstAmount - sgstAmount
      gross += baseAmount
      totalCGST += cgstAmount
      totalSGST += sgstAmount
      totalIGST += (cgstAmount + sgstAmount) // IGST = CGST + SGST
    })

    return {
      gross: gross.toFixed(2),
      cgst: totalCGST.toFixed(2),
      sgst: totalSGST.toFixed(2),
      igst: totalIGST.toFixed(2),
      total: (gross + totalCGST + totalSGST).toFixed(2)
    }
  }

  const totals = calculateTotals()

  // Handle Add Item
  const handleAddItem = () => {
    setEditingItem(null)
    setSelectedItemIndex(null)
    setIsModalOpen(true)
  }

  // Handle Edit Item
  const handleEditItem = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (selectedItemIndex === null) {
      alert('Please select an item to edit.\n\nClick on a row in the table first to select it.')
      return
    }

    if (selectedItemIndex >= 0 && selectedItemIndex < items.length) {
      setEditingItem(items[selectedItemIndex])
      setIsModalOpen(true)
    } else {
      alert('Selected item not found. Please select a valid item.')
      setSelectedItemIndex(null)
    }
  }

  // Handle Delete Item
  const handleDeleteItem = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (selectedItemIndex === null) {
      alert('Please select an item to delete.\n\nClick on a row in the table first to select it.')
      return
    }

    if (selectedItemIndex >= 0 && selectedItemIndex < items.length) {
      const item = items[selectedItemIndex]
      const itemDescription = item.description || 'this item'
      const confirmDelete = window.confirm(
        `Are you sure you want to delete "${itemDescription}"?\n\nThis action cannot be undone.`
      )
      
      if (confirmDelete) {
        const newItems = items.filter((_, i) => i !== selectedItemIndex)
        setItems(newItems)
        setSelectedItemIndex(null)
        alert(`Item "${itemDescription}" deleted successfully.`)
      }
    } else {
      alert('Selected item not found. Please select a valid item.')
      setSelectedItemIndex(null)
    }
  }

  // Handle Save Item (Add or Update)
  const handleSaveItem = (formData) => {
    try {
      if (editingItem !== null && selectedItemIndex !== null) {
        // Update existing item
        const newItems = [...items]
        newItems[selectedItemIndex] = formData
        setItems(newItems)
        setEditingItem(null)
        setSelectedItemIndex(null)
        return true
      } else {
        // Create new item
        setItems([...items, formData])
        return true
      }
    } catch (err) {
      alert('Failed to save item. Please try again.')
      console.error('Error saving item:', err)
      return false
    }
  }

  // Handle row selection
  const handleRowClick = (e, index) => {
    // Prevent selection when clicking on buttons or interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return
    }
    
    // Toggle selection: if same row clicked, deselect; otherwise select new row
    const newSelectedIndex = index === selectedItemIndex ? null : index
    setSelectedItemIndex(newSelectedIndex)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingItem(null)
  }

  // Handle modal save success
  const handleModalSave = async (formData) => {
    const wasEditing = !!editingItem
    const success = handleSaveItem(formData)
    if (success) {
      handleCloseModal()
      setTimeout(() => {
        if (wasEditing) {
          alert(`Item updated successfully!`)
        } else {
          alert(`Item added successfully!`)
        }
      }, 100)
    }
    return success
  }

  // Handle save sales
  const handleSaveSales = async () => {
    if (!selectedMiddleman) {
      alert('Please select a company (From)')
      return
    }
    if (items.length === 0) {
      alert('Please add at least one item')
      return
    }

    // Validate all items have required fields
    const invalidItems = items.filter(item => !item.description || !item.qty || !item.price)
    if (invalidItems.length > 0) {
      alert('Please fill in all required fields for all items')
      return
    }

    try {
      setIsLoading(true)
      
      // Format items for API
      const formattedItems = items.map(item => {
        const cgstAmount = parseFloat(item.cgstAmount) || 0
        const sgstAmount = parseFloat(item.sgstAmount) || 0
        
        // If IGST is enabled, combine CGST and SGST into IGST (store in cgst_amount, set sgst_amount to 0)
        const finalCgst = useIGST ? (cgstAmount + sgstAmount) : cgstAmount
        const finalSgst = useIGST ? 0 : sgstAmount
        
        return {
          description: item.description,
          hsn: item.hsn && item.hsn.trim() ? item.hsn.trim() : null,
          batch: item.batch && item.batch.trim() ? item.batch.trim() : null,
          expiry: item.expiry && item.expiry.trim() ? item.expiry.trim() : null, // Will be parsed as date by backend
          qty: parseFloat(item.qty) || 0,
          free: parseFloat(item.free) || 0,
          disc_percent: parseFloat(item.discPercent) || 0,
          mrp: parseFloat(item.mrp) || 0,
          price: parseFloat(item.price) || 0,
          gst_percent: parseFloat(item.gstPercent) || 0,
          cgst_amount: finalCgst,
          sgst_amount: finalSgst,
          amount: parseFloat(item.amount) || 0
        }
      })

      const salesData = {
        middleman_id: selectedMiddleman,
        third_party_id: selectedThirdParty || null,
        invoice_no: invoiceNo || null,
        bill_no: billNo || null,
        sale_date: date, // Date is already in YYYY-MM-DD format from date input
        order_date: orderDate || null,
        order_no: orderNo || null,
        terms: terms || 'CASH/CREDIT',
        paid_amount: parseFloat(paidAmount) || 0,
        items: formattedItems
      }

      const result = await saleService.createSale(salesData)
      
      // Wait for backend stock update to complete, then trigger refresh
      // Increased delay to ensure backend has finished updating stock quantities
      setTimeout(() => {
        // ⚠️ IMPORTANT: Trigger stock update event to refresh StockList page ONLY
        // Stock.jsx (CRUD module) does NOT listen to this event - it shows original manual entries
        // StockList.jsx listens to this event and refreshes to show current available quantities
        // DO NOT modify Stock.jsx to listen to this event - it will break the design!
        window.dispatchEvent(new CustomEvent('stockUpdated'))
      }, 1000) // Increased to 1 second to ensure backend update completes
      
      alert('Sales saved successfully! Stock quantities have been updated in Stock List.')
      
      // Regenerate numbers for next entry
      await loadSalesNumbers()
      
      // Clear form after successful save (but keep generated numbers)
      setSelectedMiddleman(null)
      setSelectedThirdParty(null)
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      setDate(`${year}-${month}-${day}`)
      setOrderDate('')
      setTerms('CASH/CREDIT')
      setUseIGST(false)
      setItems([])
      setSelectedItemIndex(null)
      setEditingItem(null)
      setPaidAmount('')
    } catch (error) {
      console.error('Error saving sales:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      })
      alert(error.message || 'Failed to save sales. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle clear
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all data?')) {
      setSelectedMiddleman(null)
      setSelectedThirdParty(null)
      setBillNo('')
      const today = new Date()
      const year = today.getFullYear()
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const day = String(today.getDate()).padStart(2, '0')
      setDate(`${year}-${month}-${day}`)
      setOrderDate('')
      setTerms('CASH/CREDIT')
      setUseIGST(false)
      setItems([])
      setSelectedItemIndex(null)
      setEditingItem(null)
      setPaidAmount('')
      
      // Regenerate numbers after clear
      loadSalesNumbers()
    }
  }

  // Handle print preview
  const handlePrintPreview = () => {
    window.print()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F2' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault()
        handleAddItem()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Show loading state only if still loading and no data
  if (isLoading && middlemen.length === 0 && thirdParties.length === 0) {
    return (
      <div className="p-3 sm:p-4 md:p-6 bg-slate-900 min-h-screen">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Sales</h2>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-slate-300 mt-4">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-slate-900 min-h-screen">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Sales</h2>

        {/* Sales Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              From:
            </label>
            <FilterableDropdown
              options={middlemen}
              value={selectedMiddleman}
              onChange={setSelectedMiddleman}
              placeholder="Select Company"
              filterPlaceholder="Type to filter companies..."
              className="w-full"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              To:
            </label>
            <FilterableDropdown
              options={thirdParties}
              value={selectedThirdParty}
              onChange={(value) => setSelectedThirdParty(value === null ? null : value)}
              placeholder="Select Company"
              filterPlaceholder="Type to filter companies..."
              className="w-full"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Bill Date:
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Bill No:
            </label>
            <input
              type="text"
              value={billNo}
              onChange={(e) => setBillNo(e.target.value)}
              placeholder="Bill Number"
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Invoice No:
            </label>
            <input
              type="text"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Invoice Number"
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Order Date:
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Order No:
            </label>
            <input
              type="text"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              placeholder="Order Number"
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Terms:
            </label>
            <select
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              <option value="CASH/CREDIT" className="bg-slate-700">CASH/CREDIT</option>
              <option value="CASH" className="bg-slate-700">CASH</option>
              <option value="CREDIT" className="bg-slate-700">CREDIT</option>
            </select>
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              IGST:
            </label>
            <div className="flex items-center h-10">
              <input
                type="checkbox"
                checked={useIGST}
                onChange={(e) => setUseIGST(e.target.checked)}
                className="w-5 h-5 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                title="Enable IGST (CGST + SGST will be combined)"
              />
              <span className="ml-2 text-white text-xs sm:text-sm">Use IGST</span>
            </div>
          </div>
        </div>

        {/* Company Details Section */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-white text-sm sm:text-base font-semibold mb-2 sm:mb-3">Company Details:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                From:
              </label>
              <div className="px-3 py-2 text-sm bg-slate-700/30 border-2 border-slate-600 rounded-lg text-white min-h-10">
                {selectedMiddlemanDetails ? (
                  <div>
                    <div className="font-medium">{selectedMiddlemanDetails.name}</div>
                    {selectedMiddlemanDetails.address && (
                      <div className="text-xs text-slate-300 mt-1">{selectedMiddlemanDetails.address}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">No company selected</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                To:
              </label>
              <div className="px-3 py-2 text-sm bg-slate-700/30 border-2 border-slate-600 rounded-lg text-white min-h-10">
                {selectedThirdPartyDetails ? (
                  <div>
                    <div className="font-medium">{selectedThirdPartyDetails.name}</div>
                    {selectedThirdPartyDetails.address && (
                      <div className="text-xs text-slate-300 mt-1">{selectedThirdPartyDetails.address}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Item Details Table */}
        <div className="mb-4 sm:mb-6 overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-700 border-b border-slate-600">
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Description</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">HSN</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Batch</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Expiry</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Qty</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Free</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Disc %</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">MRP</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Price</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">GST %</th>
                {useIGST ? (
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600" colSpan="2">IGST ₹</th>
                ) : (
                  <>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">CGST ₹</th>
                    <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">SGST ₹</th>
                  </>
                )}
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={useIGST ? "12" : "13"} className="px-4 py-8 text-center text-slate-400 text-xs sm:text-sm">
                    No items added. Click "Add Item" or press F2 to add an item.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => {
                  const isSelected = selectedItemIndex === index
                  return (
                    <tr
                      key={index}
                      onClick={(e) => handleRowClick(e, index)}
                      className={`border-b border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-600/20 ring-2 ring-blue-500 border-blue-400' : ''
                      }`}
                      style={{
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                      }}
                      title={isSelected ? `Selected: ${item.description || 'Item'}. Click again to deselect, or use Edit/Delete buttons.` : `Click to select ${item.description || 'Item'}`}
                    >
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.description || '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.hsn || '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.batch || '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.expiry ? new Date(item.expiry).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.qty || '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.free || '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.discPercent ? `${item.discPercent}%` : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.mrp ? `₹${parseFloat(item.mrp).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.price ? `₹${parseFloat(item.price).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.gstPercent ? `${item.gstPercent}%` : '-'}
                      </td>
                      {useIGST ? (
                        <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700" colSpan="2">
                          {(() => {
                            const cgstAmount = parseFloat(item.cgstAmount) || 0
                            const sgstAmount = parseFloat(item.sgstAmount) || 0
                            const igstAmount = cgstAmount + sgstAmount
                            return igstAmount > 0 ? `₹${igstAmount.toFixed(2)}` : '-'
                          })()}
                        </td>
                      ) : (
                        <>
                          <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.cgstAmount ? `₹${parseFloat(item.cgstAmount).toFixed(2)}` : '-'}
                          </td>
                          <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {item.sgstAmount ? `₹${parseFloat(item.sgstAmount).toFixed(2)}` : '-'}
                          </td>
                        </>
                      )}
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm font-semibold">
                        {item.amount ? `₹${parseFloat(item.amount).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Item Actions */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6">
          <button
            type="button"
            onClick={handleAddItem}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm"
          >
            Add Item (F2)
          </button>
          <button
            type="button"
            onClick={handleEditItem}
            disabled={selectedItemIndex === null || items.length === 0}
            className="bg-slate-700 hover:bg-slate-600 active:bg-slate-800 disabled:bg-slate-700 disabled:hover:bg-slate-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedItemIndex === null ? 'Please select an item first by clicking on a row' : 'Edit selected item'}
          >
            Edit Item
          </button>
          <button
            type="button"
            onClick={handleDeleteItem}
            disabled={selectedItemIndex === null || items.length === 0}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-700 disabled:hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={selectedItemIndex === null ? 'Please select an item first by clicking on a row' : 'Delete selected item'}
          >
            Remove Item
          </button>
        </div>

        {/* Summary Totals */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base">
            <div className="text-white">
              <span className="font-semibold">Gross:</span> ₹{totals.gross}
            </div>
            {useIGST ? (
              <div className="text-white">
                <span className="font-semibold">IGST:</span> ₹{totals.igst}
              </div>
            ) : (
              <>
                <div className="text-white">
                  <span className="font-semibold">CGST:</span> ₹{totals.cgst}
                </div>
                <div className="text-white">
                  <span className="font-semibold">SGST:</span> ₹{totals.sgst}
                </div>
              </>
            )}
            <div className="text-white">
              <span className="font-semibold">Total:</span> ₹{totals.total}
            </div>
            {paidAmount !== '' && parseFloat(paidAmount) >= 0 && (
              <>
                <div className="text-white">
                  <span className="font-semibold">Paid:</span> ₹{parseFloat(paidAmount || 0).toFixed(2)}
                </div>
                <div className={`font-semibold ${
                  (parseFloat(totals.total) - parseFloat(paidAmount || 0)) > 0 
                    ? 'text-yellow-400' 
                    : 'text-green-400'
                }`}>
                  <span className="font-semibold">Balance:</span> ₹{(parseFloat(totals.total) - parseFloat(paidAmount || 0)).toFixed(2)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Paid Amount Section */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Paid Amount:
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || (!isNaN(value) && parseFloat(value) >= 0)) {
                    setPaidAmount(value)
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value
                  if (value === '' || isNaN(value) || parseFloat(value) < 0) {
                    setPaidAmount('')
                  } else {
                    setPaidAmount(parseFloat(value).toFixed(2))
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              {paidAmount !== '' && parseFloat(paidAmount) >= 0 && (
                <div className={`mt-1 text-xs font-medium ${
                  (parseFloat(totals.total) - parseFloat(paidAmount || 0)) > 0 
                    ? 'text-yellow-400' 
                    : 'text-green-400'
                }`}>
                  Balance: ₹{(parseFloat(totals.total) - parseFloat(paidAmount || 0)).toFixed(2)}
                </div>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
            <button
              type="button"
              onClick={handleSaveSales}
              className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm"
            >
              Save Sales
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 sm:flex-initial bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handlePrintPreview}
              className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm"
            >
              Print Preview
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      <AddPurchaseItemModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleModalSave}
        itemData={editingItem}
        isEdit={!!editingItem}
        isSales={true}
      />
    </div>
  )
}

export default Sales
