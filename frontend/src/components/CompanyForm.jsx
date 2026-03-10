import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import api from '../utils/api'

export default function CompanyForm({ data, type, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    phone: '',
    company_type: 'SUPPLIER',
    // For drugs
    hsn: '',
    batch: '',
    expiry: '',
    buy_rate: 0,
    sell_rate: 0,
    gst_rate: 18
  })

  useEffect(() => {
    if (data) {
      setFormData({ ...data, expiry: data.expiry ? data.expiry.split('T')[0] : '' })
    }
  }, [data])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (data) {
        await api.put(`/${type}/${data.id}`, formData)
      } else {
        await api.post(`/${type}`, formData)
      }
      onSave()
    } catch (error) {
      alert('Error saving: ' + error.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-dark-surface p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">
            {data ? 'Edit' : 'Add'} {type === 'companies' ? 'Company' : 'Drug'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'companies' ? (
            <>
              <div>
                <label className="block text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">GSTIN</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Company Type</label>
                <select
                  value={formData.company_type}
                  onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                >
                  <option value="SUPPLIER">Supplier</option>
                  <option value="CUSTOMER">Customer</option>
                  <option value="BOTH">Both</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-gray-300 mb-2">Drug Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">HSN</label>
                <input
                  type="text"
                  value={formData.hsn}
                  onChange={(e) => setFormData({ ...formData, hsn: e.target.value })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Buy Rate</label>
                <input
                  type="number"
                  value={formData.buy_rate}
                  onChange={(e) => setFormData({ ...formData, buy_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Sell Rate</label>
                <input
                  type="number"
                  value={formData.sell_rate}
                  onChange={(e) => setFormData({ ...formData, sell_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">GST %</label>
                <input
                  type="number"
                  value={formData.gst_rate}
                  onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-dark-bg border border-dark-border rounded px-4 py-2 text-white"
                  step="0.01"
                />
              </div>
            </>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Save
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
