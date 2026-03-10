/**
 * Generate automatic invoice, bill, and order numbers
 * Format: PUR2026001 (PUR + year + sequence starting from 001)
 *         SAL2026001 (SAL + year + sequence starting from 001)
 */

/**
 * Extract sequence number from a formatted number string
 * @param {string} numberString - The number string (e.g., "PUR2026001")
 * @param {string} prefix - The prefix to match (e.g., "PUR" or "SAL")
 * @param {number} year - The year to match
 * @returns {number|null} - The sequence number or null if not matching
 */
function extractSequenceNumber(numberString, prefix, year) {
  if (!numberString || typeof numberString !== 'string') {
    return null
  }
  
  // Match pattern: PREFIX + YEAR + SEQUENCE (e.g., PUR2026001)
  const pattern = new RegExp(`^${prefix}${year}(\\d{3})$`)
  const match = numberString.match(pattern)
  
  if (match) {
    return parseInt(match[1], 10)
  }
  
  return null
}

/**
 * Find the highest sequence number from an array of numbers
 * @param {Array} numbers - Array of number strings
 * @param {string} prefix - The prefix (PUR or SAL)
 * @param {number} year - The year
 * @returns {number} - The highest sequence number found, or 0 if none
 */
function findHighestSequence(numbers, prefix, year) {
  if (!numbers || numbers.length === 0) {
    return 0
  }
  
  let maxSequence = 0
  
  for (const num of numbers) {
    if (!num) continue
    
    const sequence = extractSequenceNumber(num, prefix, year)
    if (sequence !== null && sequence > maxSequence) {
      maxSequence = sequence
    }
  }
  
  return maxSequence
}

/**
 * Generate the next number in sequence
 * @param {string} prefix - The prefix (PUR or SAL)
 * @param {number} year - The year
 * @param {number} lastSequence - The last sequence number
 * @returns {string} - The generated number (e.g., "PUR2026001")
 */
function generateNextNumber(prefix, year, lastSequence) {
  const nextSequence = lastSequence + 1
  const sequenceString = String(nextSequence).padStart(3, '0')
  return `${prefix}${year}${sequenceString}`
}

/**
 * Generate invoice, bill, and order numbers for Purchase
 * @param {Array} purchases - Array of purchase records
 * @returns {Object} - Object with invoiceNo, billNo, and orderNo
 */
export function generatePurchaseNumbers(purchases = []) {
  const currentYear = new Date().getFullYear()
  const prefix = 'PUR'
  
  // Extract all invoice_no, bill_no, and order_no values
  const invoiceNumbers = purchases.map(p => p.invoice_no).filter(Boolean)
  const billNumbers = purchases.map(p => p.bill_no).filter(Boolean)
  const orderNumbers = purchases.map(p => p.order_no).filter(Boolean)
  
  // Find highest sequence for each type
  const lastInvoiceSeq = findHighestSequence(invoiceNumbers, prefix, currentYear)
  const lastBillSeq = findHighestSequence(billNumbers, prefix, currentYear)
  const lastOrderSeq = findHighestSequence(orderNumbers, prefix, currentYear)
  
  // Generate next numbers
  return {
    invoiceNo: generateNextNumber(prefix, currentYear, lastInvoiceSeq),
    billNo: generateNextNumber(prefix, currentYear, lastBillSeq),
    orderNo: generateNextNumber(prefix, currentYear, lastOrderSeq)
  }
}

/**
 * Generate invoice, bill, and order numbers for Sales
 * @param {Array} sales - Array of sale records
 * @returns {Object} - Object with invoiceNo, billNo, and orderNo
 */
export function generateSalesNumbers(sales = []) {
  const currentYear = new Date().getFullYear()
  const prefix = 'SAL'
  
  // Extract all invoice_no, bill_no, and order_no values
  const invoiceNumbers = sales.map(s => s.invoice_no).filter(Boolean)
  const billNumbers = sales.map(s => s.bill_no).filter(Boolean)
  const orderNumbers = sales.map(s => s.order_no).filter(Boolean)
  
  // Find highest sequence for each type
  const lastInvoiceSeq = findHighestSequence(invoiceNumbers, prefix, currentYear)
  const lastBillSeq = findHighestSequence(billNumbers, prefix, currentYear)
  const lastOrderSeq = findHighestSequence(orderNumbers, prefix, currentYear)
  
  // Generate next numbers
  return {
    invoiceNo: generateNextNumber(prefix, currentYear, lastInvoiceSeq),
    billNo: generateNextNumber(prefix, currentYear, lastBillSeq),
    orderNo: generateNextNumber(prefix, currentYear, lastOrderSeq)
  }
}
