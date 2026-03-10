import React from "react";

export default function TaxInvoice({ 
  companyInfo = null,
  reportData = [],
  summary = null,
  reportType = '',
  fromDate = '',
  toDate = '',
  invoiceData = null
}) {
  // If invoiceData is provided, use it; otherwise use reportData
  const useInvoiceData = invoiceData !== null && invoiceData !== undefined
  
  // Get company info (seller/From)
  const seller = useInvoiceData && invoiceData.seller 
    ? invoiceData.seller 
    : (companyInfo || {})
  
  // Handle address - can be string or array
  const getAddressLines = () => {
    if (useInvoiceData && invoiceData.seller && invoiceData.seller.address) {
      return typeof invoiceData.seller.address === 'string' 
        ? invoiceData.seller.address.split('\n') 
        : invoiceData.seller.address
    }
    return (seller.address || '').split('\n').filter(line => line.trim())
  }
  const addressLines = getAddressLines()
  
  // Get buyer info from invoiceData if available
  let buyer = {}
  if ((useInvoiceData || invoiceData) && invoiceData && invoiceData.buyer) {
    buyer = { ...invoiceData.buyer }
  }
  
  // Calculate totals - use invoiceData.summary if available, otherwise calculate
  const calculateTotals = () => {
    if (useInvoiceData && invoiceData.summary) {
      const invSummary = invoiceData.summary
      return {
        qty: (invSummary.totalQty || 0).toFixed(2),
        gross: (invSummary.gross || 0).toFixed(2),
        cgst: (invSummary.cgst || 0).toFixed(2),
        sgst: (invSummary.sgst || 0).toFixed(2),
        igst: '0.00',
        gst: (invSummary.gst || 0).toFixed(2),
        amount: (invSummary.amount || 0).toFixed(2),
        items: invSummary.itemsCount || 0,
        roundedAmount: (invSummary.roundedAmount || Math.round(invSummary.amount || 0)).toFixed(2),
        amountInWords: invSummary.amountInWords || ''
      }
    }
    
    if (summary) return summary
    
    let totalQty = 0
    let totalGross = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalAmount = 0

    reportData.forEach(item => {
      totalQty += parseFloat(item.qty) || 0
      const amount = parseFloat(item.amount) || 0
      const cgst = parseFloat(item.cgst) || 0
      const sgst = parseFloat(item.sgst) || 0
      const gross = amount - cgst - sgst
      totalGross += gross
      totalCGST += cgst
      totalSGST += sgst
      totalAmount += amount
    })

    return {
      qty: totalQty.toFixed(2),
      gross: totalGross.toFixed(2),
      cgst: totalCGST.toFixed(2),
      sgst: totalSGST.toFixed(2),
      igst: '0.00',
      gst: (totalCGST + totalSGST).toFixed(2),
      amount: totalAmount.toFixed(2),
      items: reportData.length,
      roundedAmount: totalAmount.toFixed(2),
      amountInWords: ''
    }
  }

  const totals = calculateTotals()
  
  // Get items - use invoiceData.items if available, otherwise use reportData
  const items = useInvoiceData ? (invoiceData.items || []) : reportData

  return (
    <div className="bg-gray-300 flex justify-center p-4 print:p-0">
      <div
        className="bg-white print-container"
        style={{
          width: "100%",
          maxWidth: "210mm",
          minHeight: "297mm",
          padding: "24px",
          fontSize: "15px",
          fontFamily: "Times New Roman, serif",
          boxSizing: "border-box",
        }}
      >
        {/* ===== TAX INVOICE HEADER ===== */}
        <div className="text-center mb-8 pb-4" style={{ marginBottom: '32px', paddingBottom: '16px' }}>
          <h1 className="text-3xl font-bold text-gray-900 tracking-wide" style={{ marginBottom: '24px' }}>TAX INVOICE</h1>
          <div className="border-b-2 border-gray-400 w-full" style={{ marginTop: '24px' }}></div>
        </div>

        {/* ===== FROM AND TO SECTION ===== */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Seller */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 text-base pb-2">From:</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900 text-base">{seller.name || 'N/A'}</p>
              {addressLines.length > 0 && addressLines.map((line, idx) => (
                <p key={idx} className="leading-relaxed">{line}</p>
              ))}
              {seller.dl_no && <p className="mt-2"><span className="font-medium">DL No:</span> {seller.dl_no || seller.dlNo || seller.dl_no_2 || seller.dlNo2 || ''}</p>}
              {seller.email && <p><span className="font-medium">Email:</span> {seller.email || ''}</p>}
              {seller.state_code && <p><span className="font-medium">State Code:</span> {seller.state_code || seller.stateCode || ''}</p>}
              {seller.place_of_supply && <p><span className="font-medium">Place of Supply:</span> {seller.place_of_supply || seller.placeOfSupply || seller.state_name || ''}</p>}
              {seller.gstin && <p><span className="font-medium">GSTIN:</span> {seller.gstin || ''}</p>}
            </div>
          </div>

          {/* Buyer */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-bold text-gray-900 mb-3 text-base pb-2">To:</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-gray-900 text-base">{buyer.name || 'N/A'}</p>
              {buyer.address && (
                <>
                  {typeof buyer.address === 'string' 
                    ? buyer.address.split('\n').filter(line => line && line.trim()).map((line, idx) => (
                        <p key={idx} className="leading-relaxed">{line.trim()}</p>
                      ))
                    : Array.isArray(buyer.address)
                    ? buyer.address.filter(line => line && line.trim()).map((line, idx) => (
                        <p key={idx} className="leading-relaxed">{typeof line === 'string' ? line.trim() : line}</p>
                      ))
                    : null
                  }
                </>
              )}
              {buyer.phone && <p className="mt-2"><span className="font-medium">Phone:</span> {buyer.phone}</p>}
              {buyer.gstin && <p><span className="font-medium">GSTIN:</span> {buyer.gstin}</p>}
              {buyer.dl_no && <p><span className="font-medium">DL No:</span> {buyer.dl_no || buyer.dlNo || buyer.dl_no_2 || buyer.dlNo2}</p>}
            </div>
          </div>
        </div>

        {/* ===== INVOICE INFORMATION SECTION ===== */}
        <div className="grid grid-cols-4 gap-4 mb-8 text-sm" style={{ marginBottom: '10px' }}>
          <div className="bg-gray-50 p-2 rounded">
            <span className="font-semibold text-gray-700">Terms:</span> <span className="text-gray-900">{(useInvoiceData || invoiceData) ? (invoiceData?.terms || 'CASH/CREDIT') : 'CASH/CREDIT'}</span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="font-semibold text-gray-700">Bill No:</span> <span className="text-gray-900">{(useInvoiceData || invoiceData) ? (invoiceData?.billNo || '-') : '-'}</span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="font-semibold text-gray-700">Bill Date:</span> <span className="text-gray-900">{(useInvoiceData || invoiceData) ? (invoiceData?.billDate || '-') : '-'}</span>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <span className="font-semibold text-gray-700">Type:</span> <span className="text-gray-900">Tax Invoice</span>
          </div>
          {(useInvoiceData || invoiceData) && invoiceData?.orderDate && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="font-semibold text-gray-700">Order Date:</span> <span className="text-gray-900">{invoiceData.orderDate}</span>
            </div>
          )}
          {(useInvoiceData || invoiceData) && invoiceData?.orderNo && (
            <div className="bg-gray-50 p-2 rounded">
              <span className="font-semibold text-gray-700">Order No:</span> <span className="text-gray-900">{invoiceData.orderNo}</span>
            </div>
          )}
        </div>

        {/* ===== SPACER ABOVE ITEMS TABLE ===== */}
        <div className="mb-12" style={{ marginBottom: '20px' }}></div>

        {/* ===== ITEMS TABLE ===== */}
        <div className="mb-8 overflow-x-auto shadow-sm rounded-lg">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 border-b-2 border-gray-400">
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-800">S.No</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-800">Description & Packing</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-800">HSN/SAC</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-800">Batch No</th>
                <th className="border border-gray-300 px-3 py-3 text-left font-semibold text-gray-800">Exp M-YY</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">Qty</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">Free</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">Disc %</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">MRP</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">Rate</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">CGST/IGST %</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">CGST/IGST ₹</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">SGST %</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">SGST ₹</th>
                <th className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, i) => {
                  const amount = parseFloat(item.amount) || 0
                  const rate = parseFloat(item.rate) || 0
                  const qty = parseFloat(item.qty) || 0
                  
                  let cgstAmount = 0
                  let sgstAmount = 0
                  let cgstPercent = '0'
                  let sgstPercent = '0'
                  
                  if (useInvoiceData && item.cgstAmount !== undefined) {
                    cgstAmount = parseFloat(item.cgstAmount) || 0
                    sgstAmount = parseFloat(item.sgstAmount) || 0
                    cgstPercent = (item.cgstPercent || 0).toFixed(2)
                    sgstPercent = (item.sgstPercent || 0).toFixed(2)
                  } else {
                    const cgst = parseFloat(item.cgst) || 0
                    const sgst = parseFloat(item.sgst) || 0
                    cgstAmount = cgst
                    sgstAmount = sgst
                    const gross = amount - cgst - sgst
                    
                    if (gross > 0) {
                      cgstPercent = ((cgst / gross) * 100).toFixed(2)
                      sgstPercent = ((sgst / gross) * 100).toFixed(2)
                    }
                  }
                  
                  return (
                    <tr key={i} className="border-b border-gray-300 hover:bg-gray-50 transition-colors">
                      <td className="border border-gray-300 px-3 py-2.5 text-center">{item.sNo || i + 1}</td>
                      <td className="border border-gray-300 px-3 py-2.5">{item.description || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-center">{item.hsnSac || item.hsnSac || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-center">{item.batchNo || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-center">{item.expMYY || '-'}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">{qty.toFixed(2)}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">{item.free || 0}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">{item.discPercent || 0}%</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">₹{parseFloat(item.mrp || 0).toFixed(2)}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">₹{rate.toFixed(2)}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">{cgstPercent}%</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">₹{cgstAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">{sgstPercent}%</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right">₹{sgstAmount.toFixed(2)}</td>
                      <td className="border border-gray-300 px-3 py-2.5 text-right font-semibold text-gray-900">₹{amount.toFixed(2)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={15} className="border border-gray-300 text-center p-4">
                    No data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ===== SUMMARY SECTION ===== */}
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">ITEMS:</span> <span className="text-gray-900 font-medium">{totals.items || items.length}</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">QTY:</span> <span className="text-gray-900 font-medium">{totals.qty}</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">GROSS:</span> <span className="text-gray-900 font-medium">₹{totals.gross}</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">CGST:</span> <span className="text-gray-900 font-medium">₹{totals.cgst}</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">SGST:</span> <span className="text-gray-900 font-medium">₹{totals.sgst}</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">GST:</span> <span className="text-gray-900 font-medium">₹{totals.gst}</span>
            </div>
            <div className="bg-white p-2 rounded">
              <span className="font-semibold text-gray-700">AMOUNT:</span> <span className="text-gray-900 font-medium">₹{totals.amount}</span>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <span className="font-semibold text-blue-900">Rounded Net Amount:</span> <span className="text-blue-900 font-bold text-base">₹{totals.roundedAmount || totals.amount}</span>
            </div>
          </div>
        </div>

        {/* ===== AMOUNT IN WORDS ===== */}
        <div className="mb-6 pt-4 bg-gray-50 p-4 rounded-lg">
          <p className="text-sm">
            <span className="font-semibold text-gray-800">Amount in Words:</span> <span className="text-gray-900 font-medium">{totals.amountInWords || ''}</span>
          </p>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="text-right mt-8 pt-4" style={{ marginTop: '48px', paddingTop: '16px' }}>
          <p className="text-sm font-medium text-gray-700">for <span className="font-semibold text-gray-900">{seller.name || 'N/A'}</span></p>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 210mm;
            min-height: 297mm;
            box-shadow: none;
            margin: 0;
            padding: 24px;
          }
          button {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
