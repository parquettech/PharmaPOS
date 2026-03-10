import { useState, useEffect } from 'react'
import { Download, FileText } from 'lucide-react'
import api from '../utils/api'

export default function ReportsTab() {
  const [reportType, setReportType] = useState('stock')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportType === 'stock') {
      loadStockReport()
    }
  }, [reportType])

  const loadStockReport = async () => {
    setLoading(true)
    try {
      const res = await api.get('/reports/stock')
      setData(res.data)
    } catch (error) {
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadRegister = async () => {
    if (!startDate || !endDate) {
      alert('Please select date range')
      return
    }
    setLoading(true)
    try {
      const endpoint = reportType === 'purchase' ? '/reports/purchase-register' : '/reports/sales-register'
      const res = await api.get(endpoint, {
        params: { start_date: startDate, end_date: endDate }
      })
      setData(res.data)
    } catch (error) {
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = async () => {
    try {
      const res = await api.get('/reports/export/stock-csv', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${reportType}_report.csv`)
      document.body.appendChild(link)
      link.click()
    } catch (error) {
      alert('Error exporting: ' + error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Reports</h2>
      
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-gray-300 mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => {
              setReportType(e.target.value)
              setData([])
            }}
            className="bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
          >
            <option value="stock">Stock Report</option>
            <option value="purchase">Purchase Register</option>
            <option value="sales">Sales Register</option>
          </select>
        </div>
        {reportType !== 'stock' && (
          <>
            <div>
              <label className="block text-gray-300 mb-2">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-2">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-dark-surface border border-dark-border rounded px-4 py-2 text-white"
              />
            </div>
            <button
              onClick={loadRegister}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load Report'}
            </button>
          </>
        )}
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
        >
          <Download size={20} /> Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-dark-border">
          <thead>
            <tr className="bg-dark-surface">
              {reportType === 'stock' ? (
                <>
                  <th className="border border-dark-border p-2 text-left">Drug</th>
                  <th className="border border-dark-border p-2 text-left">Batch</th>
                  <th className="border border-dark-border p-2 text-left">Quantity</th>
                  <th className="border border-dark-border p-2 text-left">Status</th>
                </>
              ) : (
                <>
                  <th className="border border-dark-border p-2 text-left">Date</th>
                  <th className="border border-dark-border p-2 text-left">ID</th>
                  <th className="border border-dark-border p-2 text-left">Total</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-dark-surface">
                {reportType === 'stock' ? (
                  <>
                    <td className="border border-dark-border p-2 text-white">{row.drug_name}</td>
                    <td className="border border-dark-border p-2 text-white">{row.batch || '-'}</td>
                    <td className="border border-dark-border p-2 text-white">{row.qty}</td>
                    <td className="border border-dark-border p-2">
                      {row.low_stock && <span className="text-yellow-500">Low Stock</span>}
                      {row.expiring_soon && <span className="text-red-500">Expiring Soon</span>}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-dark-border p-2 text-white">{row.date}</td>
                    <td className="border border-dark-border p-2 text-white">{row.id}</td>
                    <td className="border border-dark-border p-2 text-white">₹{row.total}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
