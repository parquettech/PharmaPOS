// Excel Generator Utility - Creates invoice Excel matching the exact design
import * as XLSX from 'xlsx'

export const generateInvoiceExcel = (invoiceData) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new()
  
  // Create worksheet data array
  const wsData = []
  
  const seller = invoiceData.seller || {}
  const buyer = invoiceData.buyer || {}
  const summary = invoiceData.summary || {}
  const paidAmount = parseFloat(invoiceData.paidAmount || invoiceData.paid_amount || 0) || 0
  
  // Row 1: Company Name (centered, merged across columns C-L)
  const row1 = Array(26).fill('')
  row1[2] = seller.name || 'COMPANY NAME' // Column C (index 2)
  wsData.push(row1)
  
  // Row 2-3: Company Address (merged across columns C-L)
  const row2 = Array(26).fill('')
  if (seller.address) {
    const addressLines = seller.address.split(',').map(s => s.trim())
    row2[2] = addressLines[0] || ''
    wsData.push(row2)
    
    if (addressLines.length > 1) {
      const row3 = Array(26).fill('')
      row3[2] = addressLines.slice(1).join(', ')
      wsData.push(row3)
    } else {
      wsData.push(Array(26).fill(''))
    }
  } else {
    wsData.push(Array(26).fill(''))
    wsData.push(Array(26).fill(''))
  }
  
  // Row 4: DL No, Email, and Right-aligned details
  const row4 = Array(26).fill('')
  const dlNo1 = seller.dl_no || seller.dlNo || ''
  const dlNo2 = seller.dl_no_2 || seller.dlNo2 || ''
  if (dlNo1 && dlNo2) {
    row4[2] = `DL No: ${dlNo1} ${dlNo2}` // Column C
  } else if (dlNo1) {
    row4[2] = `DL No: ${dlNo1}`
  }
  if (seller.email) {
    row4[6] = `Gmail: ${seller.email}` // Column G
  }
  // Right-aligned: State Code, Place of Supply, GSTIN
  if (seller.state_code || seller.stateCode) {
    row4[17] = `State Code: ${seller.state_code || seller.stateCode}` // Column R
  }
  if (seller.place_of_supply || seller.placeOfSupply) {
    row4[17] = (row4[17] ? row4[17] + ' ' : '') + `Place of Supply: ${seller.place_of_supply || seller.placeOfSupply}`
  }
  if (seller.gstin) {
    row4[24] = `GSTIN: ${seller.gstin}` // Column Y
  }
  wsData.push(row4)
  
  // Row 5: Separator line (empty)
  wsData.push(Array(26).fill(''))
  
  // Row 6-9: Customer and Invoice Details
  // Row 6: "To," and customer name
  const row6 = Array(26).fill('')
  row6[0] = 'To,' // Column A
  if (buyer.name) {
    row6[0] = 'To,'
    row6[1] = buyer.name.toUpperCase() // Column B
  }
  // Invoice details on right
  if (invoiceData.terms) {
    row6[7] = 'Terms' // Column H
    row6[8] = invoiceData.terms // Column I
  }
  if (invoiceData.billNo) {
    row6[9] = 'Bill No' // Column J
    row6[12] = invoiceData.billNo // Column M
  }
  if (invoiceData.billDate) {
    row6[16] = 'Bill Date' // Column Q
    row6[21] = invoiceData.billDate // Column V
  }
  row6[22] = 'Tax Invoice' // Column W
  wsData.push(row6)
  
  // Row 7: Customer address
  const row7 = Array(26).fill('')
  if (buyer.address) {
    const buyerAddressLines = buyer.address.split(',').map(s => s.trim())
    row7[0] = buyerAddressLines[0] || ''
    if (buyerAddressLines.length > 1) {
      row7[1] = buyerAddressLines.slice(1).join(', ')
    }
  }
  if (invoiceData.orderDate) {
    row7[7] = 'Order Date' // Column H
    row7[8] = invoiceData.orderDate // Column I
  }
  if (invoiceData.orderNo) {
    row7[9] = 'Order No' // Column J
    row7[12] = invoiceData.orderNo // Column M
  }
  // Empty fields: Name, Mobile No
  row7[22] = 'Name' // Column W
  row7[24] = 'Mobile No' // Column Y
  wsData.push(row7)
  
  // Row 8: Customer phone and Due Date
  const row8 = Array(26).fill('')
  if (buyer.phone) {
    row8[0] = `Ph: ${buyer.phone}` // Column A
  }
  row8[22] = 'Due Date' // Column W
  wsData.push(row8)
  
  // Row 9: Customer GSTIN and DL No
  const row9 = Array(26).fill('')
  if (buyer.gstin) {
    row9[7] = `GSTIN: ${buyer.gstin}` // Column H
  }
  if (buyer.dl_no || buyer.dlNo) {
    row9[12] = `DL No: ${buyer.dl_no || buyer.dlNo}` // Column M
  }
  wsData.push(row9)
  
  // Row 10: Empty separator
  wsData.push(Array(26).fill(''))
  
  // Row 11-12: Table Headers
  const row11 = Array(26).fill('')
  row11[0] = 'S.No' // Column A
  row11[1] = 'Description & Packing' // Column B (merged B-F)
  row11[6] = 'HSN / SAC' // Column G
  row11[7] = 'Batch No.' // Column H
  row11[8] = 'Exp M-YY' // Column I
  row11[9] = 'Qty' // Column J
  row11[10] = 'Free' // Column K
  row11[11] = 'Disc %' // Column L
  row11[12] = 'MRP' // Column M
  row11[13] = 'Rate' // Column N
  row11[14] = 'CGST/IGST' // Column O (merged O-P)
  row11[16] = 'SGST' // Column Q (merged Q-R)
  row11[18] = 'Amount' // Column S
  wsData.push(row11)
  
  const row12 = Array(26).fill('')
  row12[14] = '%' // Column O
  row12[15] = '₹' // Column P
  row12[16] = '%' // Column Q
  row12[17] = '₹' // Column R
  wsData.push(row12)
  
  // Row 13+: Product Items
  invoiceData.items.forEach((item, index) => {
    const row = Array(26).fill('')
    row[0] = item.sNo || (index + 1) // Column A
    row[1] = item.description || '-' // Column B
    row[6] = item.hsnSac || '-' // Column G
    row[7] = item.batchNo || '-' // Column H
    row[8] = item.expMYY || '-' // Column I
    row[9] = parseFloat(item.qty || 0).toFixed(0) // Column J
    row[10] = parseFloat(item.free || 0).toFixed(0) // Column K
    row[11] = `${parseFloat(item.discPercent || 0).toFixed(0)}%` // Column L
    row[12] = parseFloat(item.mrp || 0).toFixed(2) // Column M
    row[13] = parseFloat(item.rate || 0).toFixed(2) // Column N
    row[14] = `${parseFloat(item.cgstPercent || 0).toFixed(2)}%` // Column O
    row[15] = parseFloat(item.cgstAmount || 0).toFixed(2) // Column P
    row[16] = `${parseFloat(item.sgstPercent || 0).toFixed(2)}%` // Column Q
    row[17] = parseFloat(item.sgstAmount || 0).toFixed(2) // Column R
    row[18] = parseFloat(item.amount || 0).toFixed(2) // Column S
    wsData.push(row)
  })
  
  // Empty rows before summary
  for (let i = 0; i < 10; i++) {
    wsData.push(Array(26).fill(''))
  }
  
  // Summary Row 24: ITEMS, QTY, GROSS, SGST, CGST, GST, AMOUNT
  const summaryRow = Array(26).fill('')
  summaryRow[1] = `ITEMS: ${summary.itemsCount || 0}` // Column B
  summaryRow[2] = 'QTY' // Column C
  summaryRow[3] = summary.totalQty ? parseFloat(summary.totalQty).toFixed(0) : '' // Column D
  summaryRow[4] = `GROSS ${parseFloat(summary.gross || 0).toFixed(1)}` // Column E
  summaryRow[7] = `SGST ${parseFloat(summary.sgst || 0).toFixed(2)}` // Column H
  summaryRow[9] = `CGST ${parseFloat(summary.cgst || 0).toFixed(2)}` // Column J
  summaryRow[11] = `GST ${parseFloat(summary.gst || 0).toFixed(2)}` // Column L
  summaryRow[13] = `AMOUNT ${parseFloat(summary.amount || 0).toFixed(2)}` // Column N
  wsData.push(summaryRow)
  
  // GST Category Table Row 25-26
  const gstPercent = parseFloat(summary.gross || 0) > 0 
    ? ((parseFloat(summary.gst || 0) / parseFloat(summary.gross || 1)) * 100).toFixed(0) 
    : '5'
  const gstTableHeader = Array(26).fill('')
  gstTableHeader[0] = 'Category' // Column A
  gstTableHeader[4] = 'Gross' // Column E
  gstTableHeader[8] = 'GST' // Column I
  gstTableHeader[14] = 'Amount' // Column O
  wsData.push(gstTableHeader)
  
  const gstTableRow = Array(26).fill('')
  gstTableRow[0] = `GST_${gstPercent}%` // Column A
  gstTableRow[4] = parseFloat(summary.gross || 0).toFixed(2) // Column E
  gstTableRow[8] = parseFloat(summary.gst || 0).toFixed(2) // Column I
  gstTableRow[14] = parseFloat(summary.amount || 0).toFixed(2) // Column O
  wsData.push(gstTableRow)
  
  // Payment details Row 27
  const paymentRow = Array(26).fill('')
  paymentRow[10] = 'Tcs%' // Column K
  paymentRow[14] = 'PD' // Column O
  paymentRow[14] = `PD ${paidAmount.toFixed(2)}` // Column O
  paymentRow[16] = 'DB' // Column Q
  paymentRow[17] = 'CR' // Column R
  paymentRow[18] = 'CD' // Column S
  wsData.push(paymentRow)
  
  // Rounded Net Amount Row 28
  const roundedRow = Array(26).fill('')
  roundedRow[18] = parseFloat(summary.roundedAmount || summary.amount || 0).toFixed(2) // Column S
  wsData.push(roundedRow)
  
  // Remarks Row 29
  const remarksRow = Array(26).fill('')
  remarksRow[0] = 'Remarks:' // Column A
  wsData.push(remarksRow)
  
  // Amount in Words Row 30
  const wordsRow = Array(26).fill('')
  const amountInWords = summary.amountInWords || 'ZERO ONLY'
  wordsRow[0] = `Amount in Words: ${amountInWords.toUpperCase()}` // Column A (merged)
  wsData.push(wordsRow)
  
  // Signature Row 31
  const signatureRow = Array(26).fill('')
  signatureRow[18] = `for ${seller.name || 'COMPANY NAME'}` // Column S (right-aligned)
  wsData.push(signatureRow)
  
  // Create worksheet from data
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // A: S.No
    { wch: 25 }, // B: Description
    { wch: 8 },  // C
    { wch: 8 },  // D
    { wch: 12 }, // E: Gross
    { wch: 8 },  // F
    { wch: 12 }, // G: HSN
    { wch: 12 }, // H: Batch
    { wch: 10 }, // I: Exp
    { wch: 8 },  // J: Qty
    { wch: 8 },  // K: Free
    { wch: 8 },  // L: Disc
    { wch: 10 }, // M: MRP
    { wch: 10 }, // N: Rate
    { wch: 8 },  // O: CGST %
    { wch: 12 }, // P: CGST ₹
    { wch: 8 },  // Q: SGST %
    { wch: 12 }, // R: SGST ₹
    { wch: 15 }, // S: Amount
    { wch: 8 },  // T
    { wch: 8 },  // U
    { wch: 8 },  // V
    { wch: 8 },  // W
    { wch: 8 },  // X
    { wch: 20 }, // Y: GSTIN
  ]
  
  // Merge cells for company header (Row 1, Columns C-L)
  if (!ws['!merges']) ws['!merges'] = []
  ws['!merges'].push({ s: { r: 0, c: 2 }, e: { r: 0, c: 11 } }) // Company name
  ws['!merges'].push({ s: { r: 1, c: 2 }, e: { r: 2, c: 11 } }) // Address
  
  // Merge Description & Packing header (Row 11, Columns B-F)
  ws['!merges'].push({ s: { r: 10, c: 1 }, e: { r: 10, c: 5 } })
  // Merge CGST/IGST header (Row 11, Columns O-P)
  ws['!merges'].push({ s: { r: 10, c: 14 }, e: { r: 10, c: 15 } })
  // Merge SGST header (Row 11, Columns Q-R)
  ws['!merges'].push({ s: { r: 10, c: 16 }, e: { r: 10, c: 17 } })
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice')
  
  return wb
}

// Export invoice as Excel file
export const exportInvoiceExcel = (invoiceData, fileName = 'Invoice.xlsx') => {
  const wb = generateInvoiceExcel(invoiceData)
  XLSX.writeFile(wb, fileName)
}
