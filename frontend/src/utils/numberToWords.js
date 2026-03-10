// Convert number to words (Indian numbering system)
export const numberToWords = (num) => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
    'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN']
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']
  
  if (num === 0) return 'ZERO'
  
  const convertHundreds = (n) => {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) {
      const ten = Math.floor(n / 10)
      const one = n % 10
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '')
    }
    const hundred = Math.floor(n / 100)
    const remainder = n % 100
    return ones[hundred] + ' HUNDRED' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '')
  }
  
  const convert = (n) => {
    if (n === 0) return ''
    
    if (n < 100) return convertHundreds(n)
    if (n < 1000) {
      const hundred = Math.floor(n / 100)
      const remainder = n % 100
      return convertHundreds(hundred) + ' HUNDRED' + (remainder > 0 ? ' ' + convertHundreds(remainder) : '')
    }
    
    if (n < 100000) {
      const thousand = Math.floor(n / 1000)
      const remainder = n % 1000
      return convertHundreds(thousand) + ' THOUSAND' + (remainder > 0 ? ' ' + convert(remainder) : '')
    }
    
    if (n < 10000000) {
      const lakh = Math.floor(n / 100000)
      const remainder = n % 100000
      return convertHundreds(lakh) + ' LAKH' + (remainder > 0 ? ' ' + convert(remainder) : '')
    }
    
    const crore = Math.floor(n / 10000000)
    const remainder = n % 10000000
    return convertHundreds(crore) + ' CRORE' + (remainder > 0 ? ' ' + convert(remainder) : '')
  }
  
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  
  let result = convert(rupees).toUpperCase()
  if (paise > 0) {
    result += ' AND ' + convertHundreds(paise) + ' PAISE'
  }
  result += ' ONLY'
  
  return result
}
