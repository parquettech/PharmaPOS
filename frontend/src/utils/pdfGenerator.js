// PDF Generator Utility - Creates invoice PDF matching the exact design
import jsPDF from 'jspdf'
// Import autoTable directly (recommended for jspdf v4 + jspdf-autotable v5)
import { autoTable } from 'jspdf-autotable'
import { numberToWords } from './numberToWords'

export const generateInvoicePDF = (invoiceData) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10
  const contentWidth = pageWidth - (2 * margin)
  let yPos = margin

  // Helper function to add text with wrapping
  const addText = (text, x, y, options = {}) => {
    const {
      fontSize = 10,
      fontStyle = 'normal',
      align = 'left',
      maxWidth = contentWidth
    } = options

    doc.setFontSize(fontSize)
    doc.setFont('helvetica', fontStyle)
    doc.text(text, x, y, { align, maxWidth })
  }

  // Helper function to draw line
  const drawLine = (x1, y1, x2, y2) => {
    doc.setLineWidth(0.5)
    doc.line(x1, y1, x2, y2)
  }

  // Seller Details Section (Top)
  const seller = invoiceData.seller || {}
  const buyer = invoiceData.buyer || {}

  // Company Name (Centered, Bold) - Top of page
  addText(seller.name || 'COMPANY NAME', pageWidth / 2, yPos, {
    fontSize: 14,
    fontStyle: 'bold',
    align: 'center'
  })
  yPos += 7

  // Address (Left-aligned, multiple lines)
  if (seller.address) {
    const addressLines = doc.splitTextToSize(seller.address, contentWidth - 60)
    addressLines.forEach(line => {
      addText(line, margin, yPos, { fontSize: 9 })
      yPos += 4
    })
  }

  // DL Numbers and Email on same line (Left side)
  yPos += 2
  const dlNo1 = seller.dl_no || seller.dlNo || ''
  const dlNo2 = seller.dl_no_2 || seller.dlNo2 || ''
  let dlText = ''
  if (dlNo1 && dlNo2) {
    dlText = `DL No: ${dlNo1} ${dlNo2}`
  } else if (dlNo1) {
    dlText = `DL No: ${dlNo1}`
  }
  if (dlText) {
    addText(dlText, margin, yPos, { fontSize: 9 })
  }
  if (seller.email) {
    addText(`Gmail: ${seller.email}`, margin + 80, yPos, { fontSize: 9 })
  }
  yPos += 5

  // State Code, Place of Supply, GSTIN (Right-aligned, stacked)
  const rightX = pageWidth - margin
  if (seller.state_code || seller.stateCode) {
    addText(`State Code: ${seller.state_code || seller.stateCode}`, rightX, yPos, {
      fontSize: 9,
      align: 'right',
      fontStyle: 'bold'
    })
    yPos += 4
  }
  if (seller.place_of_supply || seller.placeOfSupply) {
    addText(`Place of Supply: ${seller.place_of_supply || seller.placeOfSupply}`, rightX, yPos, {
      fontSize: 9,
      align: 'right'
    })
    yPos += 4
  }
  if (seller.gstin) {
    addText(`GSTIN: ${seller.gstin}`, rightX, yPos, {
      fontSize: 9,
      align: 'right'
    })
    yPos += 4
  }

  yPos += 3
  drawLine(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  // Invoice Details Header - "Tax Invoice" (Centered, Bold, Top Right area)
  addText('Tax Invoice', pageWidth - margin, yPos, {
    fontSize: 12,
    fontStyle: 'bold',
    align: 'right'
  })
  yPos += 6

  // Bill No and Bill Date on same line (Right side)
  const invoiceX = pageWidth - margin - 60
  const billNo = invoiceData.billNo || '-'
  const billDate = invoiceData.billDate || '-'
  addText(`Bill No ${billNo}`, invoiceX, yPos, { fontSize: 9, align: 'left' })
  addText(billDate, pageWidth - margin, yPos, { fontSize: 9, align: 'right' })
  yPos += 4

  // Name and Mobile No on same line (empty fields)
  addText('Name', invoiceX, yPos, { fontSize: 9, align: 'left' })
  addText('Mobile No', pageWidth - margin, yPos, { fontSize: 9, align: 'right' })
  yPos += 4

  // Due Date
  addText('Due Date', invoiceX, yPos, { fontSize: 9, align: 'left' })
  yPos += 6

  drawLine(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  // Buyer Details Section
  addText('To,', margin, yPos, { fontSize: 10, fontStyle: 'bold' })
  yPos += 5

  if (buyer.name) {
    addText(buyer.name.toUpperCase(), margin, yPos, { fontSize: 10, fontStyle: 'bold' })
    yPos += 5
  }

  if (buyer.address) {
    const buyerAddressLines = doc.splitTextToSize(buyer.address, contentWidth - 60)
    buyerAddressLines.forEach(line => {
      addText(line, margin, yPos, { fontSize: 9 })
      yPos += 4
    })
  }

  if (buyer.phone) {
    addText(`Ph: ${buyer.phone}`, margin, yPos, { fontSize: 9 })
    yPos += 4
  }

  // Terms, Order Date, Order No, GSTIN, DL No (Right side, positioned relative to buyer section)
  const buyerInfoX = pageWidth - margin - 60
  const buyerStartY = yPos - (buyer.address ? (doc.splitTextToSize(buyer.address, contentWidth - 60).length * 4) : 0) - (buyer.phone ? 4 : 0) - 5
  
  if (invoiceData.terms) {
    addText(`Terms ${invoiceData.terms}`, pageWidth - margin, buyerStartY, {
      fontSize: 9,
      align: 'right'
    })
  }
  if (invoiceData.orderDate) {
    addText(`Order Date ${invoiceData.orderDate}`, buyerInfoX, buyerStartY + 4, {
      fontSize: 9,
      align: 'left'
    })
  }
  if (invoiceData.orderNo) {
    addText(`Order No ${invoiceData.orderNo}`, buyerInfoX, buyerStartY + 8, {
      fontSize: 9,
      align: 'left'
    })
  }
  if (buyer.gstin) {
    addText(`GSTIN: ${buyer.gstin}`, buyerInfoX, yPos - 4, { fontSize: 9, align: 'left' })
  }
  if (buyer.dl_no || buyer.dlNo) {
    addText(`DL No ${buyer.dl_no || buyer.dlNo}`, pageWidth - margin, yPos, {
      fontSize: 9,
      align: 'right'
    })
  }

  yPos += 8
  drawLine(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  // Detect if this is an IGST transaction (cgst > 0 and sgst = 0 for all items)
  // IGST means CGST has the combined value and SGST is 0
  const isIGST = invoiceData.items.length > 0 && invoiceData.items.every(item => {
    const cgstAmt = parseFloat(item.cgstAmount || item.cgst_amount || 0)
    const sgstAmt = parseFloat(item.sgstAmount || item.sgst_amount || 0)
    // IGST: cgst > 0 and sgst = 0 (cgst contains the combined IGST value)
    return cgstAmt > 0 && sgstAmt === 0
  })

  // Items Table - conditionally include SGST column based on IGST
  const tableData = invoiceData.items.map(item => {
    const baseRow = [
      item.sNo || '-',
      item.description || '-',
      item.hsnSac || '-',
      item.batchNo || '-',
      item.expMYY || '-',
      parseFloat(item.qty || 0).toFixed(0),
      parseFloat(item.free || 0).toFixed(0),
      `${parseFloat(item.discPercent || 0).toFixed(0)}%`,
      parseFloat(item.mrp || 0).toFixed(2),
      parseFloat(item.rate || 0).toFixed(2),
      `${parseFloat(item.cgstPercent || 0).toFixed(2)}% | ${parseFloat(item.cgstAmount || 0).toFixed(2)}`
    ]
    
    // Only include SGST column if NOT IGST
    if (!isIGST) {
      baseRow.push(`${parseFloat(item.sgstPercent || 0).toFixed(2)}% | ${parseFloat(item.sgstAmount || 0).toFixed(2)}`)
    }
    
    baseRow.push(parseFloat(item.amount || 0).toFixed(2))
    return baseRow
  })

  // Table headers - conditionally include SGST based on IGST
  const tableHeaders = [
    'S.No',
    'Description & Packing',
    'HSN / SAC',
    'Batch No.',
    'Exp (M-YY)',
    'Qty',
    'Free',
    'Disc (%)',
    'MRP',
    'Rate',
    'CGST/IGST (% | ₹)',
    'Amount'
  ]
  
  // Only add SGST header if NOT IGST
  if (!isIGST) {
    tableHeaders.splice(11, 0, 'SGST (% | ₹)')
  }

  // Column styles - adjust based on IGST
  const columnStyles = {
    0: { cellWidth: 8, halign: 'center' }, // S.No
    1: { cellWidth: 40, halign: 'left' }, // Description
    2: { cellWidth: 18, halign: 'left' }, // HSN
    3: { cellWidth: 15, halign: 'left' }, // Batch
    4: { cellWidth: 12, halign: 'left' }, // Exp
    5: { cellWidth: 10, halign: 'right' }, // Qty
    6: { cellWidth: 10, halign: 'right' }, // Free
    7: { cellWidth: 10, halign: 'right' }, // Disc
    8: { cellWidth: 12, halign: 'right' }, // MRP
    9: { cellWidth: 12, halign: 'right' }, // Rate
    10: { cellWidth: 22, halign: 'left' }, // CGST/IGST
    11: { cellWidth: 18, halign: 'right' } // Amount (if IGST) or SGST (if not IGST)
  }
  
  // Only add SGST column style if NOT IGST
  if (!isIGST) {
    columnStyles[11] = { cellWidth: 22, halign: 'left' } // SGST
    columnStyles[12] = { cellWidth: 18, halign: 'right' } // Amount
  }

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0]
    },
    columnStyles: columnStyles,
    margin: { left: margin, right: margin },
    styles: { overflow: 'linebreak', cellPadding: 1.5 }
  })

  yPos = doc.lastAutoTable.finalY + 5

  // Summary Section - Top Row: ITEMS, QTY, GROSS, SGST, CGST, GST, AMOUNT
  const summary = invoiceData.summary || {}
  const totalQty = parseFloat(summary.totalQty || 0)
  const totalGross = parseFloat(summary.gross || 0)
  const totalCGST = parseFloat(summary.cgst || 0)
  const totalSGST = parseFloat(summary.sgst || 0)
  const totalGST = parseFloat(summary.gst || 0)
  const totalAmount = parseFloat(summary.amount || 0)
  const roundedAmount = summary.roundedAmount || Math.round(totalAmount)
  const paidAmount = parseFloat(invoiceData.paidAmount || invoiceData.paid_amount || 0) || 0

  // Top summary row - ITEMS, QTY on left, then GROSS, SGST, CGST, GST, AMOUNT spread across
  // Format: "ITEMS 3" "QTY 5100" then "GROSS 569430.0" "SGST 14235.75" "CGST 14235.75" "GST 28471.50" "AMOUNT 597901.50"
  // For IGST: "ITEMS 3" "QTY 5100" then "GROSS 569430.0" "CGST/IGST 14235.75" "GST 14235.75" "AMOUNT 597901.50"
  addText(`ITEMS ${summary.itemsCount || 0}`, margin, yPos, { fontSize: 9, fontStyle: 'bold' })
  addText(`QTY ${totalQty.toFixed(0)}`, margin + 20, yPos, { fontSize: 9, fontStyle: 'bold' })
  
  // Right side values - spaced evenly (adjust spacing based on IGST)
  const summaryRightX = pageWidth - margin
  if (isIGST) {
    // IGST layout: GROSS, CGST/IGST, GST, AMOUNT
    addText(`GROSS ${totalGross.toFixed(1)}`, summaryRightX - 70, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`CGST/IGST ${totalCGST.toFixed(2)}`, summaryRightX - 45, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`GST ${totalGST.toFixed(2)}`, summaryRightX - 20, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`AMOUNT ${totalAmount.toFixed(2)}`, summaryRightX, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
  } else {
    // CGST/SGST layout: GROSS, SGST, CGST, GST, AMOUNT
    addText(`GROSS ${totalGross.toFixed(1)}`, summaryRightX - 95, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`SGST ${totalSGST.toFixed(2)}`, summaryRightX - 70, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`CGST ${totalCGST.toFixed(2)}`, summaryRightX - 45, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`GST ${totalGST.toFixed(2)}`, summaryRightX - 20, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
    addText(`AMOUNT ${totalAmount.toFixed(2)}`, summaryRightX, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right' })
  }
  yPos += 5

  // GST Category Breakdown Table (Right aligned)
  // Calculate GST percentage from totals
  const gstPercent = totalGross > 0 ? ((totalGST / totalGross) * 100).toFixed(0) : '5'
  const gstTableData = [
    [`GST_${gstPercent}%`, totalGross.toFixed(2), totalGST.toFixed(2), totalAmount.toFixed(2)]
  ]

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Gross', 'GST', 'Amount']],
    body: gstTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 35, halign: 'left' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 40, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    },
    margin: { left: pageWidth - margin - 155, right: margin },
    styles: { overflow: 'linebreak', cellPadding: 2 }
  })

  yPos = doc.lastAutoTable.finalY + 5

  // Detailed GST Breakdown (Right aligned)
  const breakdownX = pageWidth - margin - 80
  // Only show SGST if NOT IGST
  if (!isIGST) {
    addText(`SGST: ${totalSGST.toFixed(2)}`, breakdownX, yPos, { fontSize: 9, align: 'right' })
    yPos += 4
  }
  // Always show "CGST/IGST" in bottom detailed breakdown
  addText(`CGST/IGST: ${totalCGST.toFixed(2)}`, breakdownX, yPos, { fontSize: 9, align: 'right' })
  yPos += 4
  addText(`GST: ${totalGST.toFixed(2)}`, breakdownX, yPos, { fontSize: 9, align: 'right', fontStyle: 'bold' })
  yPos += 4
  addText(`AMOUNT: ${totalAmount.toFixed(2)}`, breakdownX, yPos, { fontSize: 9, align: 'right', fontStyle: 'bold' })
  yPos += 6

  // Payment Details: TCS%, PD, DB, CR, CD (Right aligned, labels only, values blank except PD)
  // Format: "Tcs%" (blank), "PD 0.00", "DB" (blank), "CR" (blank), "CD" (blank)
  addText('Tcs%', breakdownX - 50, yPos, { fontSize: 9, align: 'right' })
  addText(`PD ${paidAmount.toFixed(2)}`, breakdownX - 35, yPos, { fontSize: 9, align: 'right' })
  addText('DB', breakdownX - 20, yPos, { fontSize: 9, align: 'right' })
  addText('CR', breakdownX - 10, yPos, { fontSize: 9, align: 'right' })
  addText('CD', breakdownX, yPos, { fontSize: 9, align: 'right' })
  yPos += 6

  // Rounded Net Amount (Right aligned, prominent)
  addText(`Rounded Net Amount ${roundedAmount.toFixed(2)}`, pageWidth - margin, yPos, {
    fontSize: 10,
    fontStyle: 'bold',
    align: 'right'
  })
  yPos += 8

  // Remarks (Left side)
  addText('Remarks:', margin, yPos, { fontSize: 9 })
  yPos += 8

  // Amount in Words (Full width, bold, uppercase)
  const amountInWords = summary.amountInWords || numberToWords(roundedAmount)
  addText(`Amount in Words: ${amountInWords.toUpperCase()}`, margin, yPos, {
    fontSize: 9,
    fontStyle: 'bold',
    maxWidth: contentWidth
  })
  yPos += 6

  // Signature (Right aligned)
  addText('for ' + (seller.name || 'COMPANY NAME'), pageWidth - margin, yPos, {
    fontSize: 9,
    align: 'right'
  })

  return doc
}
