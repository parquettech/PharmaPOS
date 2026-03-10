import { useState, useEffect } from 'react'
import AddCompanyModal from '../components/AddCompanyModal'
import { companyService } from '../services/companyService'

function Companies() {
  const [companies, setCompanies] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Load companies from API on mount
  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await companyService.getAllCompanies()
      // Backend returns snake_case, we'll handle mapping in display
      setCompanies(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load companies')
      console.error('Error loading companies:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Add Company
  const handleAddCompany = () => {
    setEditingCompany(null)
    setSelectedCompanyId(null)
    setIsModalOpen(true)
  }

  // Handle Edit Company
  const handleEditCompany = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedCompanyId) {
      alert('Please select a company to edit.\n\nClick on a row in the table first to select it.')
      return
    }

    // Find company from the original companies list (backend format)
    const company = companies.find((c) => {
      // Handle both number and string ID comparisons
      return String(c.id) === String(selectedCompanyId) || c.id === selectedCompanyId
    })
    
    if (company) {
      // Map backend format (snake_case) to frontend format (camelCase) for editing
      const mappedCompany = mapCompanyDataForEdit(company)
      if (mappedCompany) {
        setEditingCompany(mappedCompany)
        setIsModalOpen(true)
      } else {
        alert('Error loading company data. Please try again.')
        setSelectedCompanyId(null)
      }
    } else {
      alert(`Company with ID ${selectedCompanyId} not found. Please select a valid company.`)
      setSelectedCompanyId(null)
    }
  }

  // Handle Delete Company
  const handleDeleteCompany = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!selectedCompanyId) {
      alert('Please select a company to delete.\n\nClick on a row in the table first to select it.')
      return
    }

    // Find company from original companies list (backend format)
    const company = companies.find((c) => {
      // Handle both number and string ID comparisons
      return String(c.id) === String(selectedCompanyId) || c.id === selectedCompanyId
    })
    
    if (!company) {
      alert(`Company with ID ${selectedCompanyId} not found. Please select a valid company.`)
      setSelectedCompanyId(null)
      return
    }

    const companyName = company.name || 'this company'
    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${companyName}" (GSTIN: ${company.gstin || 'N/A'})?\n\nThis action cannot be undone.`
    )
    
    if (confirmDelete) {
      try {
        setIsLoading(true)
        setError('')
        // Use the company ID from the found company
        await companyService.deleteCompany(company.id)
        // Clear selection before reloading
        setSelectedCompanyId(null)
        // Reload companies after deletion
        await loadCompanies()
        // Show success message
        alert(`Company "${companyName}" deleted successfully.`)
      } catch (err) {
        const errorMessage = err.message || 'Failed to delete company. Please try again.'
        alert(errorMessage)
        setError(errorMessage)
        console.error('Error deleting company:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Handle Save (Add or Update)
  const handleSaveCompany = async (formData) => {
    try {
      setError('')
      // Map frontend field names (camelCase) to backend field names (snake_case)
      const companyData = {
        name: formData.name.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        phone: formData.phone.trim(),
        type: formData.type.trim(),
        address: formData.address && formData.address.trim() ? formData.address.trim() : null,
        dl_no: formData.dlNo && formData.dlNo.trim() ? formData.dlNo.trim() : null,
        email: formData.email && formData.email.trim() ? formData.email.trim() : null,
        state_code: formData.stateCode && formData.stateCode.trim() ? formData.stateCode.trim() : null,
        place_of_supply: formData.placeOfSupply && formData.placeOfSupply.trim() ? formData.placeOfSupply.trim() : null,
      }

      if (editingCompany && editingCompany.id) {
        // Update existing company - use the company ID from editingCompany
        await companyService.updateCompany(editingCompany.id, companyData)
        // Clear selection and editing state before reloading
        setEditingCompany(null)
        setSelectedCompanyId(null)
        // Reload companies after update to get latest data
        await loadCompanies()
        return true
      } else {
        // Create new company
        await companyService.createCompany(companyData)
        // Reload companies after creation to show the new company
        await loadCompanies()
        return true
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to save company. Please try again.'
      alert(errorMessage)
      setError(errorMessage)
      console.error('Error saving company:', err)
      return false
    }
  }

  // Handle row selection
  const handleRowClick = (e, companyId) => {
    // Prevent selection when clicking on buttons or interactive elements
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
      return
    }
    
    // Allow clicks on table cells - don't stop propagation, let it bubble to row
    // Convert both to strings for reliable comparison
    const id = String(companyId)
    const currentId = selectedCompanyId ? String(selectedCompanyId) : null
    
    // Toggle selection: if same row clicked, deselect; otherwise select new row
    const newSelectedId = id === currentId ? null : companyId
    setSelectedCompanyId(newSelectedId)
  }

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingCompany(null)
  }

  // Handle modal save success
  const handleModalSave = async (formData) => {
    const wasEditing = !!editingCompany
    const success = await handleSaveCompany(formData)
    if (success) {
      handleCloseModal()
      setTimeout(() => {
        if (wasEditing) {
          alert(`Company "${formData.name}" updated successfully!`)
        } else {
          alert(`Company "${formData.name}" added successfully!`)
        }
      }, 100)
    }
    return success
  }

  // Map backend response (snake_case) to frontend format (camelCase) for display and edit
  const mapCompanyDataForEdit = (company) => {
    if (!company) return null
    return {
      id: company.id,
      name: company.name || '',
      gstin: company.gstin || '',
      address: company.address || '',
      phone: company.phone || '',
      type: company.type || 'GENERAL',
      dlNo: company.dl_no || company.dlNo || '',
      email: company.email || '',
      stateCode: company.state_code || company.stateCode || '',
      placeOfSupply: company.place_of_supply || company.placeOfSupply || '',
    }
  }

  // Transform companies list from backend format (snake_case) to frontend format (camelCase)
  const transformedCompanies = companies.map(mapCompanyDataForEdit).filter(c => c !== null)

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
              <p className="text-slate-300 text-sm">Loading companies...</p>
            </div>
          ) : (
            <div className="overflow-x-auto h-full">
              <table className="w-full border-collapse min-w-[600px]">
                {/* Table Header */}
                <thead>
                  <tr className="bg-slate-700 border-b border-slate-600">
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      ID
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      Name
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600">
                      GSTIN
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white border-r border-slate-600 hidden md:table-cell">
                      Address
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-white">
                      Phone
                    </th>
                  </tr>
                </thead>
                {/* Table Body */}
                <tbody>
                  {transformedCompanies.length === 0 ? (
                    <tr>
                      <td 
                        colSpan="5" 
                        className="px-4 py-8 text-center text-slate-400 text-xs sm:text-sm"
                      >
                        No companies found. Click "Add Company" to create one.
                      </td>
                    </tr>
                  ) : (
                    transformedCompanies.map((company, index) => {
                      // Reliable ID comparison for selection highlighting
                      const isSelected = selectedCompanyId !== null && (
                        String(selectedCompanyId) === String(company.id) || 
                        selectedCompanyId === company.id
                      )
                      return (
                        <tr 
                          key={company.id || index}
                          onClick={(e) => handleRowClick(e, company.id)}
                          className={`border-b border-slate-700 hover:bg-slate-700/50 active:bg-slate-600/50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-blue-600/20 ring-2 ring-blue-500 border-blue-400' : ''
                          }`}
                          style={{
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                          }}
                          title={isSelected ? `Selected: ${company.name}. Click again to deselect, or use Edit/Delete buttons.` : `Click to select ${company.name}`}
                        >
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {company.id}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {company.name}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                            {company.gstin}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm border-r border-slate-700 hidden md:table-cell">
                            {company.address || '-'}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-slate-300 text-xs sm:text-sm">
                            {company.phone}
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
            onClick={handleAddCompany}
            disabled={isLoading}
            className="flex-1 lg:flex-none bg-slate-700 hover:bg-slate-600 active:bg-slate-800 disabled:bg-slate-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 whitespace-nowrap text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Company
          </button>

          <button
            type="button"
            onClick={handleEditCompany}
            disabled={!selectedCompanyId || transformedCompanies.length === 0 || isLoading}
            className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-700 disabled:hover:bg-slate-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 whitespace-nowrap text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedCompanyId ? 'Please select a company first by clicking on a row' : 'Edit selected company'}
          >
            Edit Company
          </button>

          <button
            type="button"
            onClick={handleDeleteCompany}
            disabled={!selectedCompanyId || transformedCompanies.length === 0 || isLoading}
            className="flex-1 lg:flex-none bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-700 disabled:hover:bg-red-700 text-white font-medium py-2 sm:py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 whitespace-nowrap text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title={!selectedCompanyId ? 'Please select a company first by clicking on a row' : 'Delete selected company'}
          >
            Delete Company
          </button>
        </div>
      </div>

      {/* Add/Edit Company Modal */}
      <AddCompanyModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleModalSave}
        companyData={mapCompanyDataForEdit(editingCompany)}
        isEdit={!!editingCompany}
      />
    </div>
  )
}

export default Companies
