import jsPDF from 'jspdf'

export function generatePDF({ type, company, date, invoiceNo, items }) {
  const doc = new jsPDF()
  
  // Page settings
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let yPos = margin

  // Header
  doc.setFontSize(20)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('PharmaPOS', pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'normal')
  doc.text(`${type === 'purchase' ? 'PURCHASE' : 'SALE'} INVOICE`, pageWidth / 2, yPos, { align: 'center' })
  
  yPos += 15

  // Company details section
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`${type === 'purchase' ? 'Supplier' : 'Customer'} Details:`, margin, yPos)
  yPos += 7
  
  doc.setFont('helvetica', 'normal')
  if (company) {
    doc.text(`Name: ${company.name || ''}`, margin, yPos)
    yPos += 6
    if (company.gstin) {
      doc.text(`GSTIN: ${company.gstin}`, margin, yPos)
      yPos += 6
    }
    if (company.address) {
      const addressLines = doc.splitTextToSize(`Address: ${company.address}`, pageWidth - 2 * margin)
      doc.text(addressLines, margin, yPos)
      yPos += addressLines.length * 6
    }
    if (company.phone) {
      doc.text(`Phone: ${company.phone}`, margin, yPos)
      yPos += 6
    }
  }
  
  yPos += 5

  // Invoice details
  doc.setFont('helvetica', 'bold')
  doc.text('Invoice Details:', pageWidth - margin - 60, yPos - 20)
  doc.setFont('helvetica', 'normal')
  doc.text(`Date: ${date}`, pageWidth - margin - 60, yPos - 14)
  if (invoiceNo) {
    doc.text(`Invoice No: ${invoiceNo}`, pageWidth - margin - 60, yPos - 8)
  }

  yPos += 10

  // Items table
  const tableStartY = yPos
  const colWidths = {
    desc: 50,
    hsn: 25,
    batch: 20,
    qty: 15,
    price: 20,
    disc: 15,
    cgst: 18,
    sgst: 18,
    amount: 20
  }

  // Table header
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  let xPos = margin
  doc.text('Description', xPos, yPos)
  xPos += colWidths.desc
  doc.text('HSN', xPos, yPos)
  xPos += colWidths.hsn
  doc.text('Batch', xPos, yPos)
  xPos += colWidths.batch
  doc.text('Qty', xPos, yPos)
  xPos += colWidths.qty
  doc.text('Price', xPos, yPos)
  xPos += colWidths.price
  doc.text('Disc%', xPos, yPos)
  xPos += colWidths.disc
  doc.text('CGST', xPos, yPos)
  xPos += colWidths.cgst
  doc.text('SGST', xPos, yPos)
  xPos += colWidths.sgst
  doc.text('Amount', xPos, yPos)

  yPos += 8
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 5

  // Table rows
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  let totalGross = 0
  let totalCGST = 0
  let totalSGST = 0
  let totalIGST = 0
  let grandTotal = 0

  items.forEach((item, index) => {
    if (yPos > 250) { // New page if needed
      doc.addPage()
      yPos = margin + 10
    }

    const gross = (item.qty || 0) * (item.price || 0) * (1 - (item.discount_percent || 0) / 100)
    const cgst = item.cgst_amount || 0
    const sgst = item.sgst_amount || 0
    const igst = item.igst_amount || 0
    const amount = item.total || 0

    totalGross += gross
    totalCGST += cgst
    totalSGST += sgst
    totalIGST += igst
    grandTotal += amount

    xPos = margin
    const descLines = doc.splitTextToSize(item.product_name || '-', colWidths.desc - 2)
    doc.text(descLines, xPos, yPos)
    const descHeight = descLines.length * 4
    xPos += colWidths.desc
    doc.text(item.hsn_code || '-', xPos, yPos)
    xPos += colWidths.hsn
    doc.text(item.batch_no || '-', xPos, yPos)
    xPos += colWidths.batch
    doc.text((item.qty || 0).toString(), xPos, yPos)
    xPos += colWidths.qty
    doc.text(`₹${(item.price || 0).toFixed(2)}`, xPos, yPos)
    xPos += colWidths.price
    doc.text(`${(item.discount_percent || 0).toFixed(1)}%`, xPos, yPos)
    xPos += colWidths.disc
    doc.text(`₹${cgst.toFixed(2)}`, xPos, yPos)
    xPos += colWidths.cgst
    doc.text(`₹${sgst.toFixed(2)}`, xPos, yPos)
    xPos += colWidths.sgst
    doc.text(`₹${amount.toFixed(2)}`, xPos, yPos)

    yPos += Math.max(descHeight, 6)
    yPos += 2
  })

  // Totals
  yPos += 5
  doc.line(margin, yPos, pageWidth - margin, yPos)
  yPos += 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const totalsX = pageWidth - margin - 60

  doc.text('Gross Amount:', totalsX - 40, yPos)
  doc.text(`₹${totalGross.toFixed(2)}`, totalsX, yPos, { align: 'right' })
  yPos += 7

  if (totalCGST > 0 || totalSGST > 0) {
    doc.text('CGST:', totalsX - 40, yPos)
    doc.text(`₹${totalCGST.toFixed(2)}`, totalsX, yPos, { align: 'right' })
    yPos += 7
    doc.text('SGST:', totalsX - 40, yPos)
    doc.text(`₹${totalSGST.toFixed(2)}`, totalsX, yPos, { align: 'right' })
    yPos += 7
  }

  if (totalIGST > 0) {
    doc.text('IGST:', totalsX - 40, yPos)
    doc.text(`₹${totalIGST.toFixed(2)}`, totalsX, yPos, { align: 'right' })
    yPos += 7
  }

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Grand Total:', totalsX - 40, yPos)
  doc.text(`₹${grandTotal.toFixed(2)}`, totalsX, yPos, { align: 'right' })

  // Footer
  yPos = doc.internal.pageSize.getHeight() - 20
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Thank you for your business!', pageWidth / 2, yPos, { align: 'center' })

  // Save PDF
  const filename = `${type}_invoice_${invoiceNo || date.replace(/-/g, '')}.pdf`
  doc.save(filename)
}
