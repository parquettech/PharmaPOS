import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import api from '../utils/api'
import CompanyForm from './CompanyForm'

export default function AdminTab() {
  const [activeTab, setActiveTab] = useState('companies')
  const [companies, setCompanies] = useState([])
  const [drugs, setDrugs] = useState([])
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      if (activeTab === 'companies') {
        const res = await api.get('/companies')
        setCompanies(res.data)
      } else if (activeTab === 'drugs') {
        const res = await api.get('/drugs')
        setDrugs(res.data)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleDelete = async (id, type) => {
    if (!confirm('Are you sure you want to delete?')) return
    
    try {
      await api.delete(`/${type}/${id}`)
      loadData()
    } catch (error) {
      alert('Error deleting: ' + error.message)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Admin</h2>
      
      <div className="flex gap-2 border-b border-dark-border">
        <button
          onClick={() => setActiveTab('companies')}
          className={`px-4 py-2 ${activeTab === 'companies' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
        >
          Companies
        </button>
        <button
          onClick={() => setActiveTab('drugs')}
          className={`px-4 py-2 ${activeTab === 'drugs' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
        >
          Drugs
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
        >
          Users
        </button>
      </div>

      <div className="flex justify-end mb-4">
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <Plus size={20} /> Add {activeTab === 'companies' ? 'Company' : activeTab === 'drugs' ? 'Drug' : 'User'}
        </button>
      </div>

      {activeTab === 'companies' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-dark-border">
            <thead>
              <tr className="bg-dark-surface">
                <th className="border border-dark-border p-2 text-left">Name</th>
                <th className="border border-dark-border p-2 text-left">GSTIN</th>
                <th className="border border-dark-border p-2 text-left">Type</th>
                <th className="border border-dark-border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id} className="hover:bg-dark-surface">
                  <td className="border border-dark-border p-2 text-white">{company.name}</td>
                  <td className="border border-dark-border p-2 text-white">{company.gstin || '-'}</td>
                  <td className="border border-dark-border p-2 text-white">{company.company_type}</td>
                  <td className="border border-dark-border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(company)
                          setShowForm(true)
                        }}
                        className="text-blue-500 hover:text-blue-400"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id, 'companies')}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'drugs' && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-dark-border">
            <thead>
              <tr className="bg-dark-surface">
                <th className="border border-dark-border p-2 text-left">Name</th>
                <th className="border border-dark-border p-2 text-left">HSN</th>
                <th className="border border-dark-border p-2 text-left">Batch</th>
                <th className="border border-dark-border p-2 text-left">Buy Rate</th>
                <th className="border border-dark-border p-2 text-left">Sell Rate</th>
                <th className="border border-dark-border p-2 text-left">GST %</th>
                <th className="border border-dark-border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drugs.map(drug => (
                <tr key={drug.id} className="hover:bg-dark-surface">
                  <td className="border border-dark-border p-2 text-white">{drug.name}</td>
                  <td className="border border-dark-border p-2 text-white">{drug.hsn || '-'}</td>
                  <td className="border border-dark-border p-2 text-white">{drug.batch || '-'}</td>
                  <td className="border border-dark-border p-2 text-white">₹{drug.buy_rate}</td>
                  <td className="border border-dark-border p-2 text-white">₹{drug.sell_rate}</td>
                  <td className="border border-dark-border p-2 text-white">{drug.gst_rate}%</td>
                  <td className="border border-dark-border p-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(drug)
                          setShowForm(true)
                        }}
                        className="text-blue-500 hover:text-blue-400"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(drug.id, 'drugs')}
                        className="text-red-500 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CompanyForm
          data={editing}
          type={activeTab}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSave={() => {
            loadData()
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
