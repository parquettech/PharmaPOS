import { useState, useEffect } from 'react'

function AddStockModal({ isOpen, onClose, onSave, stockData = null, isEdit = false, nextSNo = 1 }) {
  const [formData, setFormData] = useState({
    sNo: nextSNo,
    description: '',
    hsnSac: '',
    batchNo: '',
    expDate: '',
    qty: '',
    free: '',
    discount: '',
    mrp: '',
    rate: '',
    cgstIgst: '',
    sgst: '',
    amount: '',
  })

  const [errors, setErrors] = useState({})

  // Calculate amount automatically when rate, qty, discount, free, or GST changes
  useEffect(() => {
    const rate = parseFloat(formData.rate) || 0
    const qty = parseFloat(formData.qty) || 0
    const free = parseFloat(formData.free) || 0
    const discount = parseFloat(formData.discount) || 0
    const cgstIgst = parseFloat(formData.cgstIgst) || 0
    const sgst = parseFloat(formData.sgst) || 0

    if (rate && qty) {
      // Pharmacy billing: Base Amount = (Rate × (Qty - Free)) × (1 - Discount/100)
      const billableQty = qty - free
      let baseAmount = rate * billableQty
      
      // Apply discount if provided
      if (discount > 0) {
        baseAmount = baseAmount * (1 - discount / 100)
      }
      
      // Add GST amounts: CGST/IGST + SGST
      const cgstIgstAmount = baseAmount * (cgstIgst / 100)
      const sgstAmount = baseAmount * (sgst / 100)
      
      // Total Amount = Base Amount + CGST/IGST Amount + SGST Amount
      const totalAmount = baseAmount + cgstIgstAmount + sgstAmount
      
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          amount: totalAmount.toFixed(2)
        }))
      }, 0)
    } else {
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          amount: ''
        }))
      }, 0)
    }
  }, [formData.rate, formData.qty, formData.free, formData.discount, formData.cgstIgst, formData.sgst])

  // Initialize form data when editing
  useEffect(() => {
    if (isEdit && stockData) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData({
          sNo: stockData.sNo || stockData.s_no || nextSNo,
          description: stockData.description || '',
          hsnSac: stockData.hsnSac || stockData.hsn_sac || '',
          batchNo: stockData.batchNo || stockData.batch_no || '',
          expDate: stockData.expDate || stockData.exp_date || '',
          qty: stockData.qty || '',
        free: stockData.free || '',
        discount: stockData.discount || '',
        mrp: stockData.mrp || '',
        rate: stockData.rate || '',
        cgstIgst: stockData.cgstIgst || stockData.cgst_igst || '',
        sgst: stockData.sgst || '',
        amount: stockData.amount || '',
        })
      }, 0)
    } else {
      // Reset form for new stock
      setTimeout(() => {
        setFormData({
          sNo: nextSNo,
          description: '',
          hsnSac: '',
        batchNo: '',
        expDate: '',
        qty: '',
        free: '',
        discount: '',
        mrp: '',
        rate: '',
        cgstIgst: '',
        sgst: '',
        amount: '',
        })
      }, 0)
    }
    setTimeout(() => {
      setErrors({})
    }, 0)
  }, [isOpen, stockData, isEdit, nextSNo])

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

  // Format date to DD-MM-YYYY (currently unused but kept for future use)
  // eslint-disable-next-line no-unused-vars
  const formatDate = (dateString) => {
    if (!dateString) return ''
    // If it's already in DD-MM-YYYY format, return as is
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
      return dateString
    }
    // If it's in YYYY-MM-DD format (from date input), convert
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-')
      return `${day}-${month}-${year}`
    }
    return dateString
  }


  const validateForm = () => {
    const newErrors = {}

    if (!formData.description.trim()) {
      newErrors.description = 'Description & Packing is required'
    }

    if (formData.expDate && !/^\d{2}-\d{2}-\d{4}$/.test(formData.expDate)) {
      newErrors.expDate = 'Expiry date must be in DD-MM-YYYY format'
    }

    if (formData.qty && (isNaN(formData.qty) || parseFloat(formData.qty) < 0)) {
      newErrors.qty = 'Quantity must be a valid number'
    }

    if (formData.free && (isNaN(formData.free) || parseFloat(formData.free) < 0)) {
      newErrors.free = 'Free quantity must be a valid number'
    }

    if (formData.discount && (isNaN(formData.discount) || parseFloat(formData.discount) < 0 || parseFloat(formData.discount) > 100)) {
      newErrors.discount = 'Discount must be between 0 and 100'
    }

    if (formData.mrp && (isNaN(formData.mrp) || parseFloat(formData.mrp) < 0)) {
      newErrors.mrp = 'MRP must be a valid number'
    }

    if (formData.rate && (isNaN(formData.rate) || parseFloat(formData.rate) < 0)) {
      newErrors.rate = 'Rate must be a valid number'
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
            sNo: nextSNo + 1,
            description: '',
            hsnSac: '',
            batchNo: '',
            expDate: '',
            qty: '',
            free: '',
            discount: '',
            mrp: '',
            rate: '',
            cgstIgst: '',
            sgst: '',
            amount: '',
          })
          setErrors({})
        }
      }
    }
  }

  const handleCancel = () => {
    setFormData({
      sNo: nextSNo,
      description: '',
      hsnSac: '',
      batchNo: '',
      expDate: '',
      qty: '',
      free: '',
      discount: '',
      mrp: '',
      rate: '',
      cgstIgst: '',
      sgst: '',
      amount: '',
    })
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
            {isEdit ? 'Edit Stock' : 'Add Stock'}
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
            {/* S.No (Auto populate) */}
            <div>
              <label htmlFor="sNo" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                S.No <span className="text-slate-400">(Auto)</span>
              </label>
              <input
                type="number"
                id="sNo"
                name="sNo"
                value={formData.sNo}
                disabled
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-600/50 border-2 border-slate-600 rounded-lg text-slate-300 cursor-not-allowed"
              />
            </div>

            {/* Description & Packing */}
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
                placeholder="Enter description and packing"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.description ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* HSN/SAC */}
            <div>
              <label htmlFor="hsnSac" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                HSN/SAC
              </label>
              <input
                type="text"
                id="hsnSac"
                name="hsnSac"
                value={formData.hsnSac}
                onChange={handleChange}
                placeholder="Enter HSN/SAC"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Batch No */}
            <div>
              <label htmlFor="batchNo" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Batch No.
              </label>
              <input
                type="text"
                id="batchNo"
                name="batchNo"
                value={formData.batchNo}
                onChange={handleChange}
                placeholder="Enter batch number"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Exp Date */}
            <div>
              <label htmlFor="expDate" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Exp Date <span className="text-slate-400">(DD-MM-YYYY)</span>
              </label>
              <input
                type="text"
                id="expDate"
                name="expDate"
                value={formData.expDate}
                onChange={handleChange}
                placeholder="DD-MM-YYYY"
                maxLength="10"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.expDate ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.expDate && <p className="text-red-400 text-xs mt-1">{errors.expDate}</p>}
            </div>

            {/* Qty */}
            <div>
              <label htmlFor="qty" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Qty
              </label>
              <input
                type="number"
                id="qty"
                name="qty"
                value={formData.qty}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.qty ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.qty && <p className="text-red-400 text-xs mt-1">{errors.qty}</p>}
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

            {/* Discount %} */}
            <div>
              <label htmlFor="discount" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Discount %
              </label>
              <input
                type="number"
                id="discount"
                name="discount"
                value={formData.discount}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                max="100"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.discount ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.discount && <p className="text-red-400 text-xs mt-1">{errors.discount}</p>}
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
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.mrp ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.mrp && <p className="text-red-400 text-xs mt-1">{errors.mrp}</p>}
            </div>

            {/* Rate */}
            <div>
              <label htmlFor="rate" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Rate
              </label>
              <input
                type="number"
                id="rate"
                name="rate"
                value={formData.rate}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0.00"
                min="0"
                step="0.01"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.rate ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.rate && <p className="text-red-400 text-xs mt-1">{errors.rate}</p>}
            </div>

            {/* CGST/IGST */}
            <div>
              <label htmlFor="cgstIgst" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                CGST/IGST %
              </label>
              <input
                type="number"
                id="cgstIgst"
                name="cgstIgst"
                value={formData.cgstIgst}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* SGST */}
            <div>
              <label htmlFor="sgst" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                SGST %
              </label>
              <input
                type="number"
                id="sgst"
                name="sgst"
                value={formData.sgst}
                onChange={handleChange}
                onWheel={handleWheel}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              {isEdit ? 'Update Stock' : 'Add Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddStockModal
