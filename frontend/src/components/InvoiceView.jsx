import { generateInvoiceData } from '../utils/invoiceGenerator'
import { generateTaxInvoicePDF } from '../utils/taxInvoicePDF'

function InvoiceView({ transaction, type = 'PURCHASE', onClose }) {
  if (!transaction) return null

  // Get company details (seller and buyer) - these should be passed from parent
  const seller = transaction.seller || {}
  const buyer = transaction.buyer || {}
  const items = transaction.items || []

  // Prepare transaction data for invoice generator
  const transactionData = {
    ...transaction,
    purchase_date: transaction.purchase_date || transaction.sale_date || transaction.date,
    bill_no: transaction.bill_no || transaction.billNo || transaction.invoice_no || transaction.invoiceNo,
    invoice_no: transaction.invoice_no || transaction.invoiceNo,
    order_date: transaction.order_date || transaction.orderDate,
    order_no: transaction.order_no || transaction.orderNo,
    terms: transaction.terms || 'CASH/CREDIT'
  }

  const invoiceData = generateInvoiceData(transactionData, { seller, buyer }, items, type)

  // Generate PDF filename in format: Sales_Invoice_03032026_001 or Purchase_Invoice_03032026_001
  const generatePDFFileName = (invoiceData, reportType) => {
    // Determine type prefix
    const typePrefix = reportType === 'PURCHASE_REGISTER' || type === 'PURCHASE' ? 'Purchase' : 'Sales'
    
    // Format date as DDMMYYYY
    let dateStr = invoiceData.billDate || invoiceData.bill_date || ''
    let formattedDate = ''
    
    if (dateStr) {
      // Handle different date formats
      if (dateStr.includes('/')) {
        // Format: DD/MM/YYYY or DD/MM/YY
        const parts = dateStr.split('/')
        if (parts.length === 3) {
          const day = parts[0].padStart(2, '0')
          const month = parts[1].padStart(2, '0')
          let year = parts[2]
          // If year is 2 digits, assume 20XX
          if (year.length === 2) {
            year = '20' + year
          }
          formattedDate = `${day}${month}${year}`
        }
      } else if (dateStr.includes('-')) {
        // Format: YYYY-MM-DD
        const parts = dateStr.split('-')
        if (parts.length === 3) {
          formattedDate = `${parts[2]}${parts[1]}${parts[0]}`
        }
      } else {
        // Try to parse as ISO date
        try {
          const date = new Date(dateStr)
          const day = String(date.getDate()).padStart(2, '0')
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const year = date.getFullYear()
          formattedDate = `${day}${month}${year}`
        } catch (e) {
          // Fallback to current date
          const today = new Date()
          const day = String(today.getDate()).padStart(2, '0')
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const year = today.getFullYear()
          formattedDate = `${day}${month}${year}`
        }
      }
    } else {
      // Use current date if no date provided
      const today = new Date()
      const day = String(today.getDate()).padStart(2, '0')
      const month = String(today.getMonth() + 1).padStart(2, '0')
      const year = today.getFullYear()
      formattedDate = `${day}${month}${year}`
    }
    
    // Extract sequence number from invoiceNo or billNo (last 3 digits)
    let sequence = '001'
    const invoiceNo = invoiceData.invoiceNo || invoiceData.invoice_no || ''
    const billNo = invoiceData.billNo || invoiceData.bill_no || ''
    
    // Try to extract sequence from invoice number (e.g., PUR2026001 -> 001)
    if (invoiceNo && invoiceNo.length >= 3) {
      const last3 = invoiceNo.slice(-3)
      if (/^\d{3}$/.test(last3)) {
        sequence = last3
      }
    } else if (billNo && billNo.length >= 3) {
      // Try billNo if invoiceNo doesn't have sequence
      const last3 = billNo.slice(-3)
      if (/^\d{3}$/.test(last3)) {
        sequence = last3
      }
    }
    
    return `${typePrefix}_Invoice_${formattedDate}_${sequence}.pdf`
  }

  const handleDownloadPDF = async () => {
    try {
      // Convert invoiceData.items to reportData format for TaxInvoice
      const reportData = invoiceData.items.map((item, index) => {
        const amount = parseFloat(item.amount) || 0
        const cgstAmount = parseFloat(item.cgstAmount) || 0
        const sgstAmount = parseFloat(item.sgstAmount) || 0
        const gross = amount - cgstAmount - sgstAmount
        
        // Calculate GST percentage
        let cgstPercent = '0'
        let sgstPercent = '0'
        if (gross > 0) {
          cgstPercent = ((cgstAmount / gross) * 100).toFixed(2)
          sgstPercent = ((sgstAmount / gross) * 100).toFixed(2)
        }
        
        return {
          sNo: index + 1,
          date: invoiceData.billDate,
          invoiceNo: invoiceData.billNo,
          company: invoiceData.buyer.name || '-',
          description: item.description || '',
          hsnSac: item.hsnSac || '-',
          batchNo: item.batchNo || '-',
          expMYY: item.expMYY || '-',
          qty: item.qty || 0,
          free: item.free || 0,
          discPercent: item.discPercent || 0,
          mrp: item.mrp || 0,
          rate: item.rate || 0,
          cgst: cgstAmount,
          sgst: sgstAmount,
          amount: amount
        }
      })
      
      // Calculate summary
      const summary = {
        qty: (invoiceData.summary.totalQty || 0).toFixed(2),
        gross: (invoiceData.summary.gross || 0).toFixed(2),
        cgst: (invoiceData.summary.cgst || 0).toFixed(2),
        sgst: (invoiceData.summary.sgst || 0).toFixed(2),
        igst: '0.00',
        gst: (invoiceData.summary.gst || 0).toFixed(2),
        amount: (invoiceData.summary.amount || 0).toFixed(2),
        items: invoiceData.items.length
      }
      
      // Check if IGST
      const isIGST = parseFloat(summary.cgst) > 0 && parseFloat(summary.sgst) === 0
      if (isIGST) {
        summary.igst = summary.cgst
        summary.cgst = '0.00'
      }
      
      // Get company info (seller)
      const companyInfo = invoiceData.seller || {}
      
      // Generate PDF using TaxInvoice format - pass invoiceData directly
      const pdf = await generateTaxInvoicePDF({
        invoiceData: invoiceData,
        companyInfo: companyInfo,
        reportType: type === 'PURCHASE' ? 'PURCHASE_REGISTER' : 'SALES_REGISTER',
        fromDate: invoiceData.billDate,
        toDate: invoiceData.billDate
      })
      
      const fileName = generatePDFFileName(invoiceData, type === 'PURCHASE' ? 'PURCHASE_REGISTER' : 'SALES_REGISTER')
      pdf.save(fileName)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF invoice')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl my-8 print:shadow-none print:max-w-none">
        {/* Invoice Content */}
        <div className="p-6 print:p-4">
          {/* Header */}
          <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
            <h1 className="text-2xl font-bold text-gray-800">TAX INVOICE</h1>
          </div>

          {/* Seller and Buyer Info */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Seller */}
            <div>
              <h3 className="font-bold text-gray-800 mb-2">From:</h3>
              <div className="text-sm text-gray-700">
                <p className="font-semibold">{seller.name || 'N/A'}</p>
                <p>{seller.address || ''}</p>
                {seller.dl_no && <p>DL No: {seller.dl_no}</p>}
                {seller.email && <p>Email: {seller.email}</p>}
                {seller.state_code && <p>State Code: {seller.state_code}</p>}
                {seller.place_of_supply && <p>Place of Supply: {seller.place_of_supply}</p>}
                {seller.gstin && <p>GSTIN: {seller.gstin}</p>}
              </div>
            </div>

            {/* Buyer */}
            <div>
              <h3 className="font-bold text-gray-800 mb-2">To:</h3>
              <div className="text-sm text-gray-700">
                <p className="font-semibold">{buyer.name || 'N/A'}</p>
                <p>{buyer.address || ''}</p>
                {buyer.phone && <p>Phone: {buyer.phone}</p>}
                {buyer.gstin && <p>GSTIN: {buyer.gstin}</p>}
                {buyer.dl_no && <p>DL No: {buyer.dl_no}</p>}
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
            <div>
              <span className="font-semibold">Terms:</span> {invoiceData.terms}
            </div>
            <div>
              <span className="font-semibold">Bill No:</span> {invoiceData.billNo}
            </div>
            <div>
              <span className="font-semibold">Bill Date:</span> {invoiceData.billDate}
            </div>
            <div>
              <span className="font-semibold">Type:</span> Tax Invoice
            </div>
            {invoiceData.orderDate && (
              <div>
                <span className="font-semibold">Order Date:</span> {invoiceData.orderDate}
              </div>
            )}
            {invoiceData.orderNo && (
              <div>
                <span className="font-semibold">Order No:</span> {invoiceData.orderNo}
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200 border-b-2 border-gray-400">
                  <th className="border border-gray-300 px-2 py-2 text-left">S.No</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Description & Packing</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">HSN/SAC</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Batch No</th>
                  <th className="border border-gray-300 px-2 py-2 text-left">Exp M-YY</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">Qty</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">Free</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">Disc %</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">MRP</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">Rate</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">CGST/IGST %</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">CGST/IGST ₹</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">SGST %</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">SGST ₹</th>
                  <th className="border border-gray-300 px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoiceData.items.map((item) => (
                  <tr key={item.sNo} className="border-b border-gray-300">
                    <td className="border border-gray-300 px-2 py-2">{item.sNo}</td>
                    <td className="border border-gray-300 px-2 py-2">{item.description}</td>
                    <td className="border border-gray-300 px-2 py-2">{item.hsnSac}</td>
                    <td className="border border-gray-300 px-2 py-2">{item.batchNo}</td>
                    <td className="border border-gray-300 px-2 py-2">{item.expMYY}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{item.qty}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{item.free}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{item.discPercent}%</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">₹{item.mrp.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">₹{item.rate.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{item.cgstPercent.toFixed(2)}%</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">₹{item.cgstAmount.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">{item.sgstPercent.toFixed(2)}%</td>
                    <td className="border border-gray-300 px-2 py-2 text-right">₹{item.sgstAmount.toFixed(2)}</td>
                    <td className="border border-gray-300 px-2 py-2 text-right font-semibold">₹{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6 text-sm">
            <div>
              <span className="font-semibold">ITEMS:</span> {invoiceData.summary.itemsCount}
            </div>
            <div>
              <span className="font-semibold">QTY:</span> {invoiceData.summary.totalQty.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">GROSS:</span> ₹{invoiceData.summary.gross.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">CGST:</span> ₹{invoiceData.summary.cgst.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">SGST:</span> ₹{invoiceData.summary.sgst.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">GST:</span> ₹{invoiceData.summary.gst.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">AMOUNT:</span> ₹{invoiceData.summary.amount.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold">Rounded Net Amount:</span> ₹{invoiceData.summary.roundedAmount.toFixed(2)}
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mb-6 border-t-2 border-gray-300 pt-4">
            <p className="text-sm">
              <span className="font-semibold">Amount in Words:</span> {invoiceData.summary.amountInWords}
            </p>
          </div>

          {/* Signature */}
          <div className="text-right mt-8">
            <p className="text-sm">for {seller.name || 'Company Name'}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-gray-100 p-4 flex flex-wrap gap-3 print:hidden">
          <button
            onClick={handleDownloadPDF}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-all"
          >
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-all"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-6 rounded-lg transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoiceView
