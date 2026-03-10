import { useState, useEffect } from 'react'

function AddCompanyModal({ isOpen, onClose, onSave, companyData = null, isEdit = false }) {
  const [formData, setFormData] = useState({
    name: '',
    gstin: '',
    address: '',
    phone: '',
    type: 'GENERAL',
    dlNo: '',
    email: '',
    stateCode: '',
    placeOfSupply: '',
  })

  const [errors, setErrors] = useState({})

  // Initialize form data when editing
  useEffect(() => {
    if (isEdit && companyData) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setFormData({
          name: companyData.name || '',
          gstin: companyData.gstin || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          type: companyData.type || 'GENERAL',
          dlNo: companyData.dlNo || companyData.dl_no || '',
          email: companyData.email || '',
          stateCode: companyData.stateCode || companyData.state_code || '',
          placeOfSupply: companyData.placeOfSupply || companyData.place_of_supply || '',
        })
      }, 0)
    } else {
      // Reset form for new company
      setTimeout(() => {
        setFormData({
          name: '',
          gstin: '',
          address: '',
        phone: '',
        type: 'GENERAL',
        dlNo: '',
        email: '',
        stateCode: '',
        placeOfSupply: '',
        })
      }, 0)
    }
    setTimeout(() => {
      setErrors({})
    }, 0)
  }, [isOpen, companyData, isEdit])

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

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.gstin.trim()) {
      newErrors.gstin = 'GSTIN is required'
    } else if (formData.gstin.length !== 15) {
      newErrors.gstin = 'GSTIN must be 15 characters'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be 10 digits'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.stateCode && !/^\d{2}$/.test(formData.stateCode)) {
      newErrors.stateCode = 'State code must be 2 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      const success = onSave(formData)
      // onSave returns true/false to indicate success
      // The parent component handles closing modal and showing success messages
      // We just need to ensure the form is ready for next use
      if (success === true) {
        // Reset form only after successful save (for add mode)
        if (!isEdit) {
          setFormData({
            name: '',
            gstin: '',
            address: '',
            phone: '',
            type: 'GENERAL',
            dlNo: '',
            email: '',
            stateCode: '',
            placeOfSupply: '',
          })
          setErrors({})
        }
      }
      // If success is false, modal stays open (parent handles this)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: '',
      gstin: '',
      address: '',
      phone: '',
      type: 'GENERAL',
      dlNo: '',
      email: '',
      stateCode: '',
      placeOfSupply: '',
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="bg-slate-700 border-b border-slate-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {isEdit ? 'Edit Company' : 'Add Company'}
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
          <div className="space-y-4 sm:space-y-5">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter company name"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.name ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* GSTIN */}
            <div>
              <label htmlFor="gstin" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                GSTIN <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="gstin"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="Enter 15 character GSTIN"
                maxLength="15"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.gstin ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.gstin && <p className="text-red-400 text-xs mt-1">{errors.gstin}</p>}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter address"
                rows="3"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Phone <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter 10 digit phone number"
                maxLength="10"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.phone ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* DL No */}
            <div>
              <label htmlFor="dlNo" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                DL No
              </label>
              <input
                type="text"
                id="dlNo"
                name="dlNo"
                value={formData.dlNo}
                onChange={handleChange}
                placeholder="Enter Drug License Number"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.email ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* State Code */}
            <div>
              <label htmlFor="stateCode" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                State Code
              </label>
              <input
                type="text"
                id="stateCode"
                name="stateCode"
                value={formData.stateCode}
                onChange={handleChange}
                placeholder="Enter 2 digit state code"
                maxLength="2"
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                  errors.stateCode ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                }`}
              />
              {errors.stateCode && <p className="text-red-400 text-xs mt-1">{errors.stateCode}</p>}
            </div>

            {/* Place of Supply */}
            <div>
              <label htmlFor="placeOfSupply" className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
                Place of Supply
              </label>
              <input
                type="text"
                id="placeOfSupply"
                name="placeOfSupply"
                value={formData.placeOfSupply}
                onChange={handleChange}
                placeholder="Enter place of supply"
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
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
              {isEdit ? 'Update Company' : 'Add Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddCompanyModal
