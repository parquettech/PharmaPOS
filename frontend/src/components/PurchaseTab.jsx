import { useState, useEffect } from 'react'
import { Save, Printer } from 'lucide-react'
import api from '../utils/api'
import BillGrid from './BillGrid'
import { generatePDF } from '../utils/pdf'

export default function PurchaseTab() {
  const [companies, setCompanies] = useState([])
  const [drugs, setDrugs] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [invoiceNo, setInvoiceNo] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [companiesRes, drugsRes] = await Promise.all([
        api.get('/companies'),
        api.get('/drugs')
      ])
      setCompanies(companiesRes.data || [])
      setDrugs(drugsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSave = async () => {
    if (!selectedCompany || items.length === 0) {
      alert('Please select company and add items')
      return
    }

    setLoading(true)
    try {
      const total = items.reduce((sum, item) => sum + (item.total || 0), 0)
      // Ensure items have all required fields
      const formattedItems = items.map(item => ({
        drug_id: item.drug_id || null,
        product_name: item.product_name || item.drug_name || '',
        hsn_code: item.hsn_code || null,
        batch_no: item.batch_no || item.batch || null,
        expiry_date: item.expiry_date || null,
        qty: item.qty || 0,
        free_qty: item.free_qty || 0,
        discount_percent: item.discount_percent || 0,
        mrp: item.mrp || 0,
        price: item.price || 0,
        gst_percent: item.gst_percent || 0,
        is_intra_state: item.is_intra_state !== false,
        cgst_percent: item.cgst_percent || 0,
        sgst_percent: item.sgst_percent || 0,
        igst_percent: item.igst_percent || 0,
        cgst_amount: item.cgst_amount || 0,
        sgst_amount: item.sgst_amount || 0,
        igst_amount: item.igst_amount || 0,
        gross_amount: item.gross_amount || 0,
        gst_amount: item.gst_amount || 0,
        total: item.total || 0
      }))
      
      await api.post('/purchases', {
        company_id: parseInt(selectedCompany),
        date: date,
        items: formattedItems,
        total: total
      })
      alert('Purchase saved successfully')
      // Reset form
      setItems([])
      setInvoiceNo('')
    } catch (error) {
      alert('Error saving purchase: ' + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    generatePDF({
      type: 'purchase',
      company: companies.find(c => c.id === parseInt(selectedCompany)),
      date: date,
      invoiceNo: invoiceNo,
      items: items
    })
  }

  const selectedCompanyData = companies.find(c => c.id === parseInt(selectedCompany))

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Purchase</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-300 mb-2">Supplier</label>
          <select
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
          >
            <option value="">Select Supplier</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-300 mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-gray-300 mb-2">Invoice No</label>
          <input
            type="text"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            className="w-full bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
            placeholder="Invoice Number"
          />
        </div>
      </div>

      {selectedCompanyData && (
        <div className="bg-dark-surface p-4 rounded border border-dark-border">
          <h3 className="text-lg font-semibold text-white mb-2">Supplier Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="text-white ml-2">{selectedCompanyData.name}</span>
            </div>
            <div>
              <span className="text-gray-400">GSTIN:</span>
              <span className="text-white ml-2">{selectedCompanyData.gstin || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Phone:</span>
              <span className="text-white ml-2">{selectedCompanyData.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-gray-400">Address:</span>
              <span className="text-white ml-2">{selectedCompanyData.address || 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      <BillGrid
        items={items}
        onItemsChange={setItems}
        drugs={drugs}
        companies={companies}
        isPurchase={true}
      />

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          <Save size={20} /> {loading ? 'Saving...' : 'Save Purchase'}
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
        >
          <Printer size={20} /> Print PDF
        </button>
      </div>
    </div>
  )
}
