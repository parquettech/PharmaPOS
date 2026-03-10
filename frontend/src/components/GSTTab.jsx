import { useState } from 'react'
import { Download } from 'lucide-react'
import api from '../utils/api'

export default function GSTTab() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadSummary = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/gst/summary/${month}`)
      setSummary(res.data)
    } catch (error) {
      alert('Error loading summary: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const exportGSTR1 = async () => {
    try {
      const res = await api.get(`/gst/gstr1/${month}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `gstr1_${month}.csv`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      alert('Error exporting: ' + error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">GST</h2>
      
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-gray-300 mb-2">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
          />
        </div>
        <button
          onClick={loadSummary}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Generate Summary'}
        </button>
      </div>

      {summary && (
        <div className="bg-dark-surface p-6 rounded-lg space-y-4">
          <h3 className="text-xl font-bold text-white">GST Summary for {summary.month}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Outward Taxable</p>
              <p className="text-white text-xl font-bold">₹{summary.outward_taxable.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">CGST</p>
              <p className="text-white text-xl font-bold">₹{summary.cgst.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">SGST</p>
              <p className="text-white text-xl font-bold">₹{summary.sgst.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">IGST</p>
              <p className="text-white text-xl font-bold">₹{summary.igst.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={exportGSTR1}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            <Download size={20} /> Export GSTR-1 CSV
          </button>
        </div>
      )}
    </div>
  )
}
