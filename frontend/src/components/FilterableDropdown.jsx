import { useState, useEffect, useRef } from 'react'

function FilterableDropdown({ 
  options = [], 
  value = null, 
  onChange, 
  placeholder = 'Select...', 
  displayKey = 'name',
  valueKey = 'id',
  className = '',
  disabled = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [filteredOptions, setFilteredOptions] = useState(options)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Filter options based on search text
  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      // Safely handle undefined/null filterText
      if (!filterText || (typeof filterText === 'string' && !filterText.trim())) {
        setFilteredOptions(options)
      } else {
        const filtered = options.filter(option => {
          // Safely get display value with null checks
          if (!option || typeof option !== 'object') return false
          const displayValue = option?.[displayKey]
          const safeDisplayValue = typeof displayValue === 'string' ? displayValue : String(displayValue || '')
          const safeFilterText = typeof filterText === 'string' ? filterText : String(filterText || '')
          // Additional safety check before toLowerCase
          if (typeof safeDisplayValue !== 'string' || typeof safeFilterText !== 'string') return false
          return safeDisplayValue.toLowerCase().includes(safeFilterText.toLowerCase())
        })
        setFilteredOptions(filtered)
      }
    }, 0)
  }, [filterText, options, displayKey])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
        setFilterText('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Get selected option display value
  const selectedOption = options.find(opt => {
    const optValue = opt[valueKey]
    const currentValue = value
    // Handle null values explicitly
    if (optValue === null && currentValue === null) return true
    if (optValue === null || currentValue === null) return false
    return String(optValue) === String(currentValue)
  })
  const displayValue = selectedOption ? selectedOption[displayKey] : ''

  const handleSelect = (option) => {
    onChange(option[valueKey])
    setIsOpen(false)
    setFilterText('')
  }

  const handleInputChange = (e) => {
    setFilterText(e.target.value)
    if (!isOpen) {
      setIsOpen(true)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    setFilterText('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
    setFilterText('')
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? filterText : displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={displayValue ? displayValue : placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          readOnly={!isOpen}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-400 hover:text-white mr-1 pointer-events-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              ×
            </button>
          )}
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-700 border-2 border-slate-600 rounded-lg shadow-xl max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              No options found
            </div>
          ) : (
            <ul className="py-1">
              {filteredOptions.map((option, index) => {
                const optionValue = option[valueKey]
                const optionDisplay = option[displayKey]
                // Handle null values explicitly for selection
                const isSelected = (optionValue === null && value === null) || 
                                  (optionValue !== null && value !== null && String(optionValue) === String(value))
                // Use index as key fallback for null values
                const itemKey = optionValue !== null ? optionValue : `null-${index}`
                return (
                  <li
                    key={itemKey}
                    onClick={() => handleSelect(option)}
                    className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                    }`}
                  >
                    {optionDisplay}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default FilterableDropdown
