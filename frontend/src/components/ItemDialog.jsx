import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function ItemDialog({ item, drugs, isPurchase, onSave, onClose }) {
  const [formData, setFormData] = useState({
    product_name: '',
    hsn_code: '',
    batch_no: '',
    expiry_date: '',
    qty: 1,
    free_qty: 0,
    discount_percent: 0,
    mrp: 0,
    price: 0,
    gst_percent: 18,
    is_intra_state: true,
    drug_id: null
  })

  useEffect(() => {
    if (item) {
      setFormData({
        product_name: item.product_name || '',
        hsn_code: item.hsn_code || '',
        batch_no: item.batch_no || '',
        expiry_date: item.expiry_date ? (item.expiry_date.split('T')[0] || item.expiry_date) : '',
        qty: item.qty || 1,
        free_qty: item.free_qty || 0,
        discount_percent: item.discount_percent || 0,
        mrp: item.mrp || 0,
        price: item.price || 0,
        gst_percent: item.gst_percent || 18,
        is_intra_state: item.is_intra_state !== false,
        drug_id: item.drug_id || null
      })
    }
  }, [item])

  const calculateAmounts = () => {
    const gross = (formData.qty || 0) * (formData.price || 0)
    const discountAmount = gross * ((formData.discount_percent || 0) / 100)
    const grossAfterDiscount = gross - discountAmount
    const gstAmount = (grossAfterDiscount * (formData.gst_percent || 0)) / 100
    
    const isIntra = formData.is_intra_state !== false
    const cgstAmount = isIntra ? gstAmount / 2 : 0
    const sgstAmount = isIntra ? gstAmount / 2 : 0
    const igstAmount = isIntra ? 0 : gstAmount
    
    const total = grossAfterDiscount + gstAmount
    
    return { grossAfterDiscount, cgstAmount, sgstAmount, igstAmount, total, gstAmount }
  }

  const handleDrugSelect = (drugId) => {
    const drug = drugs.find(d => d.id === parseInt(drugId))
    if (drug) {
      setFormData(prev => ({
        ...prev,
        drug_id: drug.id,
        product_name: drug.name,
        hsn_code: drug.hsn || prev.hsn_code,
        price: isPurchase ? drug.buy_rate : drug.sell_rate,
        gst_percent: drug.gst_rate || prev.gst_percent
      }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const amounts = calculateAmounts()
    
    const itemData = {
      ...formData,
      drug_name: formData.product_name,
      gross_amount: amounts.grossAfterDiscount,
      cgst_amount: amounts.cgstAmount,
      sgst_amount: amounts.sgstAmount,
      igst_amount: amounts.igstAmount,
      cgst_percent: formData.is_intra_state ? formData.gst_percent / 2 : 0,
      sgst_percent: formData.is_intra_state ? formData.gst_percent / 2 : 0,
      igst_percent: formData.is_intra_state ? 0 : formData.gst_percent,
      gst_amount: amounts.gstAmount,
      total: amounts.total
    }
    
    onSave(itemData)
  }

  const amounts = calculateAmounts()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            {item ? 'Edit Item' : 'Add Item'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-2">Select Drug (Optional)</label>
              <select
                value={formData.drug_id || ''}
                onChange={(e) => handleDrugSelect(e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
              >
                <option value="">Select from existing drugs</option>
                {drugs.map(drug => (
                  <option key={drug.id} value={drug.id}>{drug.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Product Name *</label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">HSN Code</label>
              <input
                type="text"
                value={formData.hsn_code}
                onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Batch No</label>
              <input
                type="text"
                value={formData.batch_no}
                onChange={(e) => setFormData({ ...formData, batch_no: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Quantity *</label>
              <input
                type="number"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Free Qty</label>
              <input
                type="number"
                value={formData.free_qty}
                onChange={(e) => setFormData({ ...formData, free_qty: parseFloat(e.target.value) || 0 })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Discount %</label>
              <input
                type="number"
                value={formData.discount_percent}
                onChange={(e) => setFormData({ ...formData, discount_percent: parseFloat(e.target.value) || 0 })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">MRP</label>
              <input
                type="number"
                value={formData.mrp}
                onChange={(e) => setFormData({ ...formData, mrp: parseFloat(e.target.value) || 0 })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Price *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                step="0.01"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">GST %</label>
              <input
                type="number"
                value={formData.gst_percent}
                onChange={(e) => setFormData({ ...formData, gst_percent: parseFloat(e.target.value) || 0 })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">Transaction Type</label>
              <select
                value={formData.is_intra_state ? 'intra' : 'inter'}
                onChange={(e) => setFormData({ ...formData, is_intra_state: e.target.value === 'intra' })}
                className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
              >
                <option value="intra">Intra-State (CGST + SGST)</option>
                <option value="inter">Inter-State (IGST)</option>
              </select>
            </div>
          </div>

          <div className="bg-dark-bg p-4 rounded border border-dark-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Gross Amount:</span>
                <span className="text-white ml-2">₹{amounts.grossAfterDiscount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400">GST Amount:</span>
                <span className="text-white ml-2">₹{amounts.gstAmount.toFixed(2)}</span>
              </div>
              {formData.is_intra_state ? (
                <>
                  <div>
                    <span className="text-gray-400">CGST ({formData.gst_percent / 2}%):</span>
                    <span className="text-white ml-2">₹{amounts.cgstAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">SGST ({formData.gst_percent / 2}%):</span>
                    <span className="text-white ml-2">₹{amounts.sgstAmount.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div>
                  <span className="text-gray-400">IGST ({formData.gst_percent}%):</span>
                  <span className="text-white ml-2">₹{amounts.igstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-gray-400 font-semibold">Total Amount:</span>
                <span className="text-white ml-2 text-lg font-bold">₹{amounts.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              {item ? 'Update Item' : 'Add Item'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
