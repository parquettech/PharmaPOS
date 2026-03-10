// Invoice Generator Utility - Creates invoice format reports
import { numberToWords } from './numberToWords'

export const generateInvoiceData = (transaction, companyDetails, items, type = 'PURCHASE') => {
  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      // Handle different date formats
      let date
      if (typeof dateString === 'string') {
        // Try ISO format first (YYYY-MM-DD)
        if (dateString.includes('T')) {
          date = new Date(dateString)
        } else if (dateString.includes('-')) {
          const parts = dateString.split('-')
          if (parts.length === 3) {
            date = new Date(parts[0], parts[1] - 1, parts[2])
          } else {
            date = new Date(dateString)
          }
        } else {
          date = new Date(dateString)
        }
      } else {
        date = dateString
      }
      
      if (isNaN(date.getTime())) {
        return dateString // Return original if invalid
      }
      
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  // Format expiry date to M-YY
  const formatExpiry = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${month}-${year}`
    } catch {
      return dateString
    }
  }

  // Calculate totals
  let totalQty = 0
  let totalGross = 0
  let totalCGST = 0
  let totalSGST = 0
  let totalAmount = 0

  const formattedItems = items.map((item, index) => {
    const qty = parseFloat(item.qty) || 0
    const free = parseFloat(item.free) || 0
    const price = parseFloat(item.price || item.rate) || 0
    const discPercent = parseFloat(item.disc_percent || item.discPercent || item.disc_percent) || 0
    const mrp = parseFloat(item.mrp) || 0
    const gstPercent = parseFloat(item.gst_percent || item.gstPercent) || 0
    const cgstAmount = parseFloat(item.cgst_amount || item.cgstAmount) || 0
    const sgstAmount = parseFloat(item.sgst_amount || item.sgstAmount) || 0
    const amount = parseFloat(item.amount) || 0

    totalQty += qty
    const itemGross = amount - cgstAmount - sgstAmount
    totalGross += itemGross
    totalCGST += cgstAmount
    totalSGST += sgstAmount
    totalAmount += amount

    // Detect if this is an IGST item (cgst > 0 and sgst = 0)
    const isIGSTItem = cgstAmount > 0 && sgstAmount === 0
    
    // For IGST: cgstPercent should be the total GST percentage (not divided by 2)
    // For CGST/SGST: cgstPercent and sgstPercent should each be half
    const cgstPercent = isIGSTItem ? gstPercent : (gstPercent / 2)
    const sgstPercent = isIGSTItem ? 0 : (gstPercent / 2)

    return {
      sNo: index + 1,
      description: item.description || '',
      hsnSac: item.hsn || item.hsn_sac || '-',
      batchNo: item.batch || item.batch_no || '-',
      expMYY: formatExpiry(item.expiry),
      qty: qty,
      free: free,
      discPercent: discPercent,
      mrp: mrp,
      rate: price,
      cgstPercent: cgstPercent,
      cgstAmount: cgstAmount,
      sgstPercent: sgstPercent,
      sgstAmount: sgstAmount,
      amount: amount
    }
  })

  const totalGST = totalCGST + totalSGST
  const roundedAmount = Math.round(totalAmount)

  // Preserve buyer object with all properties - don't create new empty object
  const buyer = companyDetails.buyer ? { ...companyDetails.buyer } : {}
  
  // Add buyer ID from transaction if not already set
  if (!buyer.id) {
    // Try to get buyer ID from transaction
    if (type === 'SALES') {
      buyer.id = transaction.third_party_id || transaction.middleman_id || null
    } else if (type === 'PURCHASE') {
      buyer.id = transaction.middleman_id || transaction.supplier_id || null
    }
  }
  
  // Buyer data prepared

  return {
    // Seller/Buyer Information
    seller: companyDetails.seller || {},
    buyer: buyer,
    
    // Invoice Details
    billNo: transaction.bill_no || transaction.billNo || transaction.invoice_no || transaction.invoiceNo || '-',
    billDate: formatDate(transaction.purchase_date || transaction.sale_date || transaction.date || transaction.bill_date),
    invoiceNo: transaction.invoice_no || transaction.invoiceNo || transaction.bill_no || transaction.billNo || '-',
    orderDate: formatDate(transaction.order_date || transaction.orderDate),
    orderNo: transaction.order_no || transaction.orderNo || '-',
    terms: transaction.terms || 'CASH/CREDIT',
    dueDate: formatDate(transaction.due_date || transaction.dueDate),
    irnNo: transaction.irn_no || transaction.irnNo || transaction.IRN || null,
    irn_no: transaction.irn_no || transaction.irnNo || transaction.IRN || null,
    type: type,
    
    // Transaction reference for additional fields
    transaction: transaction,
    
    // Items
    items: formattedItems,
    
    // Summary
    summary: {
      itemsCount: formattedItems.length,
      totalQty: totalQty,
      gross: totalGross,
      cgst: totalCGST,
      sgst: totalSGST,
      gst: totalGST,
      amount: totalAmount,
      roundedAmount: roundedAmount,
      amountInWords: numberToWords(roundedAmount)
    }
  }
}

// numberToWords is imported from numberToWords.js - no need to redefine here

// Generate CSV for invoice
export const generateInvoiceCSV = (invoiceData) => {
  const lines = []
  
  // Header
  lines.push('TAX INVOICE')
  lines.push('')
  lines.push(`Seller: ${invoiceData.seller.name || ''}`)
  lines.push(`Address: ${invoiceData.seller.address || ''}`)
  lines.push(`GSTIN: ${invoiceData.seller.gstin || ''}`)
  lines.push('')
  lines.push(`Buyer: ${invoiceData.buyer.name || ''}`)
  lines.push(`Address: ${invoiceData.buyer.address || ''}`)
  lines.push(`GSTIN: ${invoiceData.buyer.gstin || ''}`)
  lines.push('')
  lines.push(`Bill No: ${invoiceData.billNo}`)
  lines.push(`Bill Date: ${invoiceData.billDate}`)
  lines.push(`Invoice No: ${invoiceData.invoiceNo}`)
  lines.push(`Order No: ${invoiceData.orderNo}`)
  lines.push(`Order Date: ${invoiceData.orderDate}`)
  lines.push(`Terms: ${invoiceData.terms}`)
  lines.push('')
  
  // Items header
  lines.push('S.No,Description & Packing,HSN/SAC,Batch No,Exp M-YY,Qty,Free,Disc %,MRP,Rate,CGST/IGST %,CGST/IGST ₹,SGST %,SGST ₹,Amount')
  
  // Items
  invoiceData.items.forEach(item => {
    lines.push([
      item.sNo,
      `"${item.description}"`,
      item.hsnSac,
      item.batchNo,
      item.expMYY,
      item.qty,
      item.free,
      item.discPercent,
      item.mrp,
      item.rate,
      item.cgstPercent,
      item.cgstAmount,
      item.sgstPercent,
      item.sgstAmount,
      item.amount
    ].join(','))
  })
  
  // Summary
  lines.push('')
  lines.push(`ITEMS,${invoiceData.summary.itemsCount}`)
  lines.push(`QTY,${invoiceData.summary.totalQty}`)
  lines.push(`GROSS,${invoiceData.summary.gross}`)
  lines.push(`CGST,${invoiceData.summary.cgst}`)
  lines.push(`SGST,${invoiceData.summary.sgst}`)
  lines.push(`GST,${invoiceData.summary.gst}`)
  lines.push(`AMOUNT,${invoiceData.summary.amount}`)
  lines.push(`Rounded Amount,${invoiceData.summary.roundedAmount}`)
  lines.push(`Amount in Words,${invoiceData.summary.amountInWords}`)
  
  return lines.join('\n')
}
