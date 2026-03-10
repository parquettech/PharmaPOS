import { useState, useEffect } from 'react'
import FilterableDropdown from '../components/FilterableDropdown'
import InvoiceView from '../components/InvoiceView'
import { companyService } from '../services/companyService'
import { stockService } from '../services/stockService'
import { purchaseService } from '../services/purchaseService'
import { saleService } from '../services/saleService'
import { generateInvoiceData, generateInvoiceCSV } from '../utils/invoiceGenerator'
import { generateTaxInvoicePDF } from '../utils/taxInvoicePDF'
import jsPDF from 'jspdf'
// Import autoTable directly (recommended for jspdf v4 + jspdf-autotable v5)
import { autoTable } from 'jspdf-autotable'

function Reports() {
  const [reportType, setReportType] = useState('PURCHASE_REGISTER')
  const [fromDate, setFromDate] = useState(new Date().toLocaleDateString('en-GB').split('/').reverse().join('-'))
  const [toDate, setToDate] = useState(new Date().toLocaleDateString('en-GB').split('/').reverse().join('-'))
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [companies, setCompanies] = useState([])
  const [reportData, setReportData] = useState([])
  const [summary, setSummary] = useState({
    qty: '0.00',
    gross: '0.00',
    cgst: '0.00',
    sgst: '0.00',
    igst: '0.00',
    gst: '0.00',
    amount: '0.00'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  const [invoiceType, setInvoiceType] = useState(null)
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [selectedInvoices, setSelectedInvoices] = useState(new Set()) // Track selected invoice IDs
  const [selectedTransactions, setSelectedTransactions] = useState(new Set()) // Track selected transaction IDs for deletion
  const [isExportingPDF, setIsExportingPDF] = useState(false) // Track PDF export progress
  const [exportNotification, setExportNotification] = useState(null) // Track export notification messages
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 }) // Track export progress

  const reportTypes = [
    { value: 'PURCHASE_REGISTER', label: 'Purchase Registry' },
    { value: 'SALES_REGISTER', label: 'Sales Registry' }
  ]

  // Generate PDF filename in format: Sales_Invoice_03032026_001 or Purchase_Invoice_03032026_001
  const generatePDFFileName = (invoiceData, reportType) => {
    // Determine type prefix
    const typePrefix = reportType === 'PURCHASE_REGISTER' ? 'Purchase' : 'Sales'
    
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

  // Load companies
  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const allCompanies = await companyService.getAllCompanies()
      const companiesList = [
        { id: null, name: 'All Companies' },
        ...allCompanies
      ]
      setCompanies(companiesList)
      setSelectedCompany(null) // Default to "All Companies"
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  // Apply filter and load report data
  const handleApplyFilter = async () => {
    setIsLoading(true)
      // Clear selection when applying new filters
      setSelectedInvoices(new Set())
      setSelectedTransactions(new Set())
    try {
      // Normalize dates - convert empty strings to null and ensure YYYY-MM-DD format
      let fromDateFilter = null
      let toDateFilter = null
      
      if (fromDate && fromDate.trim() !== '') {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = fromDate.trim()
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          fromDateFilter = dateStr
        } else {
          // Try to convert to YYYY-MM-DD
          try {
            const date = new Date(dateStr)
            fromDateFilter = date.toISOString().split('T')[0]
          } catch {
            console.error('Invalid from date format:', dateStr)
            alert('Invalid "From Date" format. Please use YYYY-MM-DD format.')
            setIsLoading(false)
            return
          }
        }
      }
      
      if (toDate && toDate.trim() !== '') {
        // Ensure date is in YYYY-MM-DD format
        const dateStr = toDate.trim()
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          toDateFilter = dateStr
        } else {
          // Try to convert to YYYY-MM-DD
          try {
            const date = new Date(dateStr)
            toDateFilter = date.toISOString().split('T')[0]
          } catch {
            console.error('Invalid to date format:', dateStr)
            alert('Invalid "To Date" format. Please use YYYY-MM-DD format.')
            setIsLoading(false)
            return
          }
        }
      }
      
      // Validate date range
      if (fromDateFilter && toDateFilter && fromDateFilter > toDateFilter) {
        alert('"From Date" cannot be later than "To Date". Please correct the date range.')
        setIsLoading(false)
        return
      }
      
      const companyId = selectedCompany && selectedCompany !== null ? selectedCompany : null
      
      // Applying filters
      
      if (reportType === 'STOCK_LIST') {
        // Load stock data
        const stockData = await stockService.getAllStock()
        
        // Filter by date range if provided
        let filteredStock = stockData
        if (fromDateFilter || toDateFilter) {
          filteredStock = stockData.filter(item => {
            const itemDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : null
            if (!itemDate) return false
            
            if (fromDateFilter && itemDate < fromDateFilter) return false
            if (toDateFilter && itemDate > toDateFilter) return false
            return true
          })
        }
        
        // Filter by company if selected (for stock, we check if there's any company relation)
        // Since stock doesn't have direct company relation, we'll skip company filter for stock
        
        const formattedData = filteredStock.map((item, index) => ({
          sNo: index + 1,
          date: new Date(item.created_at || Date.now()).toLocaleDateString('en-GB'),
          invoiceNo: '-',
          company: '-',
          description: item.description || '',
          hsnSac: item.hsn_sac || item.hsnSac || '-',
          batchNo: item.batch_no || item.batchNo || '-',
          expMYY: item.exp_date || item.expDate ? formatExpiryDate(item.exp_date || item.expDate) : '-',
          qty: item.qty || 0,
          free: item.free || 0,
          discPercent: item.discount || 0,
          mrp: item.mrp || 0,
          rate: item.rate || 0,
          cgst: item.cgst_igst || item.cgstIgst || 0,
          sgst: item.sgst || 0,
          amount: item.amount || 0
        }))
        setReportData(formattedData)
        calculateSummary(formattedData)
      } else if (reportType === 'PURCHASE_REGISTER') {
        // Load purchase data with date and company filters
        const purchasesData = await purchaseService.getAllPurchases(
          fromDateFilter,
          toDateFilter,
          companyId
        )
        setPurchases(purchasesData)
        
        // Get all companies for name lookup
        const allCompanies = await companyService.getAllCompanies()
        
        // Flatten purchases with items for table display
        // Also apply client-side date filtering as a safety measure
        const formattedData = []
        let sNo = 1
        
        for (const purchase of purchasesData) {
          // Additional client-side date filtering to ensure accuracy
          if (fromDateFilter || toDateFilter) {
            const purchaseDate = purchase.purchase_date || purchase.created_at
            if (purchaseDate) {
              // Normalize date to YYYY-MM-DD format
              let purchaseDateStr = ''
              try {
                if (typeof purchaseDate === 'string') {
                  // If already in YYYY-MM-DD format, use as is
                  if (purchaseDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                    purchaseDateStr = purchaseDate.split('T')[0].split(' ')[0]
                  } else {
                    // Parse other date formats
                    purchaseDateStr = new Date(purchaseDate).toISOString().split('T')[0]
                  }
                } else {
                  purchaseDateStr = new Date(purchaseDate).toISOString().split('T')[0]
                }
              } catch (e) {
                // Error parsing purchase date
                continue // Skip if date can't be parsed
              }
              
              // Skip if before from_date
              if (fromDateFilter && purchaseDateStr < fromDateFilter) {
                continue
              }
              // Skip if after to_date
              if (toDateFilter && purchaseDateStr > toDateFilter) {
                continue
              }
            } else {
              // Skip purchases without dates if filtering is active
              if (fromDateFilter || toDateFilter) {
                continue
              }
            }
          }
          // Get supplier name
          const supplier = allCompanies.find(c => c.id === purchase.supplier_id)
          const companyName = supplier ? supplier.name : '-'
          
          if (purchase.items && purchase.items.length > 0) {
            for (const item of purchase.items) {
              formattedData.push({
                sNo: sNo++,
                date: purchase.purchase_date || new Date(purchase.created_at).toLocaleDateString('en-GB'),
                invoiceNo: purchase.invoice_no || purchase.bill_no || '-',
                billNo: purchase.bill_no || purchase.invoice_no || '-',
                company: companyName,
                description: item.description || '',
                hsnSac: item.hsn || '-',
                batchNo: item.batch || '-',
                expMYY: item.expiry ? formatExpiryDate(item.expiry) : '-',
                qty: item.qty || 0,
                free: item.free || 0,
                discPercent: item.disc_percent || 0,
                mrp: item.mrp || 0,
                rate: item.price || 0,
                cgst: item.cgst_amount || 0,
                sgst: item.sgst_amount || 0,
                amount: item.amount || 0,
                purchaseId: purchase.id // Store purchase ID for invoice view
              })
            }
          } else {
            // If no items, still show the purchase header
            formattedData.push({
              sNo: sNo++,
              date: purchase.purchase_date || new Date(purchase.created_at).toLocaleDateString('en-GB'),
              invoiceNo: purchase.invoice_no || purchase.bill_no || '-',
              billNo: purchase.bill_no || purchase.invoice_no || '-',
              company: companyName,
              description: '-',
              hsnSac: '-',
              batchNo: '-',
              expMYY: '-',
              qty: 0,
              free: 0,
              discPercent: 0,
              mrp: 0,
              rate: 0,
              cgst: purchase.cgst_amount || 0,
              sgst: purchase.sgst_amount || 0,
              amount: purchase.total_amount || 0,
              purchaseId: purchase.id
            })
          }
        }
        
        setReportData(formattedData)
        calculateSummary(formattedData)
      } else if (reportType === 'SALES_REGISTER') {
        // Load sales data with date and company filters
        const salesData = await saleService.getAllSales(
          fromDateFilter,
          toDateFilter,
          companyId
        )
        setSales(salesData)
        
        // Get all companies for name lookup
        const allCompanies = await companyService.getAllCompanies()
        
        // Flatten sales with items for table display
        // Also apply client-side date filtering as a safety measure
        const formattedData = []
        let sNo = 1
        
        for (const sale of salesData) {
          // Additional client-side date filtering to ensure accuracy
          if (fromDateFilter || toDateFilter) {
            const saleDate = sale.sale_date || sale.created_at
            if (saleDate) {
              // Normalize date to YYYY-MM-DD format
              let saleDateStr = ''
              try {
                if (typeof saleDate === 'string') {
                  // If already in YYYY-MM-DD format, use as is
                  if (saleDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                    saleDateStr = saleDate.split('T')[0].split(' ')[0]
                  } else {
                    // Parse other date formats
                    saleDateStr = new Date(saleDate).toISOString().split('T')[0]
                  }
                } else {
                  saleDateStr = new Date(saleDate).toISOString().split('T')[0]
                }
              } catch (e) {
                // Error parsing sale date
                continue // Skip if date can't be parsed
              }
              
              // Skip if before from_date
              if (fromDateFilter && saleDateStr < fromDateFilter) {
                continue
              }
              // Skip if after to_date
              if (toDateFilter && saleDateStr > toDateFilter) {
                continue
              }
            } else {
              // Skip sales without dates if filtering is active
              if (fromDateFilter || toDateFilter) {
                continue
              }
            }
          }
          // Get middleman name
          const middleman = allCompanies.find(c => c.id === sale.middleman_id)
          const companyName = middleman ? middleman.name : '-'
          
          if (sale.items && sale.items.length > 0) {
            for (const item of sale.items) {
              formattedData.push({
                sNo: sNo++,
                date: sale.sale_date || new Date(sale.created_at).toLocaleDateString('en-GB'),
                invoiceNo: sale.invoice_no || sale.bill_no || '-',
                billNo: sale.bill_no || sale.invoice_no || '-',
                company: companyName,
                description: item.description || '',
                hsnSac: item.hsn || '-',
                batchNo: item.batch || '-',
                expMYY: item.expiry ? formatExpiryDate(item.expiry) : '-',
                qty: item.qty || 0,
                free: item.free || 0,
                discPercent: item.disc_percent || 0,
                mrp: item.mrp || 0,
                rate: item.price || 0,
                cgst: item.cgst_amount || 0,
                sgst: item.sgst_amount || 0,
                amount: item.amount || 0,
                saleId: sale.id // Store sale ID for invoice view
              })
            }
          } else {
            // If no items, still show the sale header
            formattedData.push({
              sNo: sNo++,
              date: sale.sale_date || new Date(sale.created_at).toLocaleDateString('en-GB'),
              invoiceNo: sale.invoice_no || sale.bill_no || '-',
              billNo: sale.bill_no || sale.invoice_no || '-',
              company: companyName,
              description: '-',
              hsnSac: '-',
              batchNo: '-',
              expMYY: '-',
              qty: 0,
              free: 0,
              discPercent: 0,
              mrp: 0,
              rate: 0,
              cgst: sale.cgst_amount || 0,
              sgst: sale.sgst_amount || 0,
              amount: sale.total_amount || 0,
              saleId: sale.id
            })
          }
        }
        
        setReportData(formattedData)
        calculateSummary(formattedData)
      }
    } catch (error) {
      console.error('Error loading report data:', error)
      alert('Failed to load report data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Format expiry date to M-YY format
  const formatExpiryDate = (dateString) => {
    if (!dateString) return '-'
    try {
      // Handle DD-MM-YYYY format
      if (dateString.includes('-')) {
        const parts = dateString.split('-')
        if (parts.length === 3) {
          const month = parts[1]
          const year = parts[2].slice(-2)
          return `${month}-${year}`
        }
      }
      // Handle Date object or ISO string
      const date = new Date(dateString)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${month}-${year}`
    } catch {
      return dateString
    }
  }

  // Calculate summary totals
  const calculateSummary = (data) => {
    let totalQty = 0
    let totalGross = 0
    let totalCGST = 0
    let totalSGST = 0
    let totalIGST = 0
    let totalAmount = 0

    data.forEach(item => {
      totalQty += parseFloat(item.qty) || 0
      const amount = parseFloat(item.amount) || 0
      const cgst = parseFloat(item.cgst) || 0
      const sgst = parseFloat(item.sgst) || 0
      
      // Check if this is an IGST transaction (cgst > 0 and sgst = 0)
      const isIGST = cgst > 0 && sgst === 0
      
      // Gross = Amount - CGST - SGST (or Amount - IGST)
      const gross = amount - cgst - sgst
      totalGross += gross
      
      if (isIGST) {
        // IGST transaction - add to IGST total
        totalIGST += cgst
      } else {
        // CGST/SGST transaction
        totalCGST += cgst
        totalSGST += sgst
      }
      totalAmount += amount
    })

    setSummary({
      qty: totalQty.toFixed(2),
      gross: totalGross.toFixed(2),
      cgst: totalCGST.toFixed(2),
      sgst: totalSGST.toFixed(2),
      igst: totalIGST.toFixed(2),
      gst: (totalCGST + totalSGST + totalIGST).toFixed(2),
      amount: totalAmount.toFixed(2)
    })
  }

  // Show notification message
  const showNotification = (message, type = 'info', duration = 5000) => {
    setExportNotification({ message, type, timestamp: Date.now() })
    if (duration > 0) {
      setTimeout(() => {
        setExportNotification(null)
      }, duration)
    }
  }

  // Export entire report to PDF - Generate individual tax invoice PDFs for each transaction (same as View Invoice)
  const handleExportReportPDF = async () => {
    if (reportData.length === 0) {
      showNotification('No data to export. Please apply filters first.', 'warning')
      return
    }

    if (isExportingPDF) {
      showNotification('PDF export is already in progress. Please wait...', 'warning')
      return
    }

    setIsExportingPDF(true)
    setExportProgress({ current: 0, total: 0 })
    
    try {
      // PDF Export started
      showNotification('Starting PDF export...', 'info', 0)
      
      const allCompanies = await companyService.getAllCompanies()
      // Companies loaded for PDF export

      // Get unique transaction IDs
      const uniqueTransactionIds = new Set()
      reportData.forEach(item => {
        const transactionId = item.purchaseId || item.saleId
        if (transactionId) {
          uniqueTransactionIds.add(transactionId)
        }
      })

      // Processing transactions for PDF export

      if (uniqueTransactionIds.size === 0) {
        showNotification('No transactions found to export. Make sure your report data has transaction IDs. Check console for details.', 'error')
        setIsExportingPDF(false)
        setExportProgress({ current: 0, total: 0 })
        return
      }

      // Show progress message
      setExportProgress({ current: 0, total: uniqueTransactionIds.size })
      showNotification(`Found ${uniqueTransactionIds.size} transaction(s) to export. Generating PDFs... This may take a moment. Your browser may ask for permission to download multiple files.`, 'info', 0)

      // Generate PDF for each transaction using the same method as View Invoice
      let successCount = 0
      let failCount = 0
      const errors = []
      let processedCount = 0

      for (const transactionId of uniqueTransactionIds) {
        processedCount++
        setExportProgress({ current: processedCount, total: uniqueTransactionIds.size })
        showNotification(`Processing ${processedCount} of ${uniqueTransactionIds.size} transaction(s)...`, 'info', 0)
        try {
          // Processing transaction for PDF export
          let transaction = null
          
          // Get transaction
          if (reportType === 'PURCHASE_REGISTER') {
            transaction = purchases.find(p => p.id === transactionId)
            if (transaction) {
              const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
              const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
              // In Purchase: "From" is the supplier (seller), "To" is your company (buyer)
              transaction.seller = supplier || {} // From = Supplier
              transaction.buyer = middleman || supplier || {} // To = Your company (using middleman if exists, else supplier)
              // Purchase transaction found
            }
          } else if (reportType === 'SALES_REGISTER') {
            transaction = sales.find(s => s.id === transactionId)
            if (transaction) {
              const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
              const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
              transaction.seller = middleman || {}
              transaction.buyer = thirdParty || {} // Don't fallback to middleman - buyer should be thirdParty only
              // Sales transaction found
            }
          }

          if (!transaction) {
            // Transaction not found
            errors.push(`Transaction ${transactionId} not found`)
            failCount++
            continue
          }

          if (!transaction.items || transaction.items.length === 0) {
            // Transaction has no items
            errors.push(`Transaction ${transactionId} has no items`)
            failCount++
            continue
          }

          // Transaction has items

          // Prepare transaction data exactly like InvoiceView does
          const transactionData = {
            ...transaction,
            purchase_date: transaction.purchase_date || transaction.sale_date || transaction.date,
            bill_no: transaction.bill_no || transaction.billNo || transaction.invoice_no || transaction.invoiceNo,
            invoice_no: transaction.invoice_no || transaction.invoiceNo,
            order_date: transaction.order_date || transaction.orderDate,
            order_no: transaction.order_no || transaction.orderNo,
            terms: transaction.terms || 'CASH/CREDIT'
          }

          // Use generateInvoiceData (same as View Invoice) to create invoiceData structure
          const invoiceData = generateInvoiceData(
            transactionData,
            { seller: transaction.seller, buyer: transaction.buyer },
            transaction.items || [],
            reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES'
          )

          // Invoice data generated

          // Get company info (seller) - same as View Invoice
          const companyInfo = invoiceData.seller || {}

          // Generate PDF using TaxInvoice format - pass invoiceData directly (EXACTLY same as View Invoice)
          const pdfStartTime = Date.now()
          const pdf = await generateTaxInvoicePDF({
            invoiceData: invoiceData,
            companyInfo: companyInfo,
            reportType: reportType === 'PURCHASE_REGISTER' ? 'PURCHASE_REGISTER' : 'SALES_REGISTER',
            fromDate: invoiceData.billDate,
            toDate: invoiceData.billDate
          })
          const pdfEndTime = Date.now()

          // Verify PDF was created
          if (!pdf) {
            throw new Error('PDF object is null')
          }
          if (!pdf.internal) {
            throw new Error('PDF internal object is missing')
          }
          if (!pdf.internal.pages || pdf.internal.pages.length === 0) {
            throw new Error(`PDF has no pages (pages: ${pdf.internal.pages?.length || 0})`)
          }
          
          // Generate filename in format: Sales_Invoice_03032026_001 or Purchase_Invoice_03032026_001
          const fileName = generatePDFFileName(invoiceData, reportType)
          
          // Save PDF - this should trigger download
          try {
            pdf.save(fileName)
          } catch (saveError) {
            console.error(`[PDF Export] ✗ Error calling pdf.save():`, saveError)
            throw new Error(`Failed to save PDF: ${saveError.message}`)
          }
          
          successCount++

          // Small delay between downloads to avoid browser blocking
          if (successCount < uniqueTransactionIds.size) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // Increased delay to 1 second
          }
        } catch (error) {
          console.error(`[PDF Export] Error generating PDF for transaction ${transactionId}:`, error)
          errors.push(`Transaction ${transactionId}: ${error.message || error.toString()}`)
          failCount++
        }
      }

      // Export complete
      setExportProgress({ current: 0, total: 0 })
      
      if (failCount > 0) {
        const errorDetails = errors.slice(0, 3).join('; ') // Show first 3 errors
        showNotification(`Export completed with errors: ${successCount} succeeded, ${failCount} failed. Check console for details.`, 'error', 8000)
      } else if (successCount > 0) {
        showNotification(`✓ Successfully exported ${successCount} invoice(s) as PDF! Please check your Downloads folder.`, 'success', 8000)
      } else {
        showNotification('No PDFs were generated. Please check the browser console (F12) for errors.', 'error', 8000)
      }
    } catch (error) {
      console.error('[PDF Export] ===== FATAL ERROR =====', error)
      console.error('[PDF Export] Error stack:', error.stack)
      setExportProgress({ current: 0, total: 0 })
      showNotification(`Failed to generate PDF reports: ${error.message || 'Unknown error'}. Check browser console (F12) for details.`, 'error', 8000)
    } finally {
      setIsExportingPDF(false)
      // Export process finished
    }
  }

  // Export to Excel - Export individual invoices
  const handleExportExcel = async () => {
    if (reportData.length === 0) {
      alert('No data to export. Please apply filters first.')
      return
    }

    try {
      const allCompanies = await companyService.getAllCompanies()
      const uniqueTransactionIds = new Set()
      
      // Get unique transaction IDs from report data
      reportData.forEach(item => {
        const transactionId = item.purchaseId || item.saleId
        if (transactionId) {
          uniqueTransactionIds.add(transactionId)
        }
      })

      if (uniqueTransactionIds.size === 0) {
        alert('No invoices found to export.')
        return
      }

      // Export each invoice as Excel
      for (const transactionId of uniqueTransactionIds) {
        let transaction = null
        
        if (reportType === 'PURCHASE_REGISTER') {
          transaction = purchases.find(p => p.id === transactionId)
          if (transaction) {
            const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
            const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
            // In Purchase: "From" is the supplier (seller), "To" is your company (buyer)
            transaction.seller = supplier || {} // From = Supplier
            transaction.buyer = middleman || supplier || {} // To = Your company (using middleman if exists, else supplier)
          }
        } else if (reportType === 'SALES_REGISTER') {
          transaction = sales.find(s => s.id === transactionId)
          if (transaction) {
            const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
            const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
            transaction.seller = middleman || {}
            transaction.buyer = thirdParty || {} // Don't fallback to middleman - buyer should be thirdParty only
          }
        }
        
        if (transaction) {
          const invoiceData = generateInvoiceData(
            transaction,
            { seller: transaction.seller, buyer: transaction.buyer },
            transaction.items || [],
            reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES'
          )
          
          invoiceData.paidAmount = transaction.paid_amount || transaction.paidAmount || 0
          
          const fileName = `Invoice_${invoiceData.billNo}_${invoiceData.billDate.replace(/\//g, '-')}.xlsx`
          exportInvoiceExcel(invoiceData, fileName)
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      alert(`Successfully exported ${uniqueTransactionIds.size} invoice(s) as Excel.`)
    } catch (error) {
      console.error('Error exporting Excel:', error)
      alert(`Failed to export Excel: ${error.message || 'Unknown error'}`)
    }
  }

  // Handle view invoice
  const handleViewInvoice = async (transactionId) => {
    try {
      let transaction = null
      const allCompanies = await companyService.getAllCompanies()
      
      if (reportType === 'PURCHASE_REGISTER') {
        transaction = purchases.find(p => p.id === transactionId)
        if (transaction) {
          const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
          const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
          transaction.seller = supplier || {} // From = Supplier (seller)
          transaction.buyer = middleman || supplier || {} // To = Your company (buyer)
        }
      } else if (reportType === 'SALES_REGISTER') {
        transaction = sales.find(s => s.id === transactionId)
        if (transaction) {
          const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
          const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
          transaction.seller = middleman || {}
          transaction.buyer = thirdParty || {} // Don't fallback to middleman - buyer should be thirdParty only
        }
      }
      
      if (transaction) {
        setSelectedInvoice(transaction)
        setInvoiceType(reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES')
      }
    } catch (error) {
      console.error('Error loading invoice:', error)
      alert('Failed to load invoice details')
    }
  }

  // Handle download invoice (CSV)
  const handleDownloadInvoice = async (transactionId) => {
    try {
      let transaction = null
      const allCompanies = await companyService.getAllCompanies()
      
      if (reportType === 'PURCHASE_REGISTER') {
        transaction = purchases.find(p => p.id === transactionId)
        if (transaction) {
          const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
          const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
          transaction.seller = supplier || {} // From = Supplier (seller)
          transaction.buyer = middleman || supplier || {} // To = Your company (buyer)
        }
      } else if (reportType === 'SALES_REGISTER') {
        transaction = sales.find(s => s.id === transactionId)
        if (transaction) {
          const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
          const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
          transaction.seller = middleman || {}
          transaction.buyer = thirdParty || {} // Don't fallback to middleman - buyer should be thirdParty only
        }
      }
      
      if (transaction) {
        const invoiceData = generateInvoiceData(
          transaction,
          { seller: transaction.seller, buyer: transaction.buyer },
          transaction.items || [],
          reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES'
        )
        const csv = generateInvoiceCSV(invoiceData)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `Invoice_${invoiceData.billNo}_${invoiceData.billDate.replace(/\//g, '-')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Error downloading invoice:', error)
      alert('Failed to download invoice')
    }
  }

  // Handle download invoice as PDF - Using TaxInvoice template
  const handleDownloadInvoicePDF = async (transactionId) => {
    try {
      let transaction = null
      const allCompanies = await companyService.getAllCompanies()
      
      if (reportType === 'PURCHASE_REGISTER') {
        transaction = purchases.find(p => p.id === transactionId)
        if (transaction) {
          const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
          const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
          transaction.seller = supplier || {} // From = Supplier (seller)
          transaction.buyer = middleman || supplier || {} // To = Your company (buyer)
          
          // Debug: Log buyer data
          // Purchase buyer data prepared
        }
      } else if (reportType === 'SALES_REGISTER') {
        transaction = sales.find(s => s.id === transactionId)
        if (transaction) {
          const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
          const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
          // For SALES: Seller (From) = Middleman, Buyer (To) = Third Party (customer)
          transaction.seller = middleman || {}
          transaction.buyer = thirdParty || {} // Don't fallback to middleman - buyer should be thirdParty only
          
          // Debug: Log buyer data
          // Sales buyer data prepared
        }
      }
      
      if (transaction) {
        // Ensure buyer has all company data - don't pass empty object
        const buyerData = transaction.buyer && Object.keys(transaction.buyer).length > 0 
          ? transaction.buyer 
          : {}
        
        // Buyer data prepared for invoice
        
        const invoiceData = generateInvoiceData(
          transaction,
          { seller: transaction.seller, buyer: buyerData },
          transaction.items || [],
          reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES'
        )
        
        // Invoice data generated
        
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
        
        // Generating PDF with invoice data
        
        // Generate PDF using TaxInvoice format - pass invoiceData directly
        const pdf = await generateTaxInvoicePDF({
          invoiceData: invoiceData,
          companyInfo: companyInfo,
          reportType: reportType === 'PURCHASE_REGISTER' ? 'PURCHASE_REGISTER' : 'SALES_REGISTER',
          fromDate: invoiceData.billDate,
          toDate: invoiceData.billDate
        })
        
        const fileName = generatePDFFileName(invoiceData, reportType)
        pdf.save(fileName)
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate PDF invoice')
    }
  }

  // Toggle selection of an invoice (for export)
  const toggleInvoiceSelection = (invoiceNo) => {
    const newSelection = new Set(selectedInvoices)
    if (newSelection.has(invoiceNo)) {
      newSelection.delete(invoiceNo)
    } else {
      newSelection.add(invoiceNo)
    }
    setSelectedInvoices(newSelection)
  }

  // Toggle selection of a transaction (for deletion - works for all reports)
  const toggleTransactionSelection = (transactionId, invoiceNo) => {
    const newSelection = new Set(selectedTransactions)
    if (newSelection.has(transactionId)) {
      newSelection.delete(transactionId)
    } else {
      newSelection.add(transactionId)
    }
    setSelectedTransactions(newSelection)
    
    // Also update invoice selection if invoice number exists (for export)
    if (invoiceNo && invoiceNo !== '-') {
      toggleInvoiceSelection(invoiceNo)
    }
  }

  // Select all invoices
  const selectAllInvoices = () => {
    const uniqueInvoices = new Set(reportData.map(item => item.invoiceNo).filter(Boolean))
    setSelectedInvoices(uniqueInvoices)
  }

  // Deselect all invoices
  const deselectAllInvoices = () => {
    setSelectedInvoices(new Set())
  }

  // Select all transactions (for deletion - all reports)
  const selectAllTransactions = () => {
    const allTransactions = new Set()
    reportData.forEach(item => {
      const transactionId = item.purchaseId || item.saleId
      if (transactionId) {
        allTransactions.add(transactionId)
      }
    })
    setSelectedTransactions(allTransactions)
    
    // Also select all invoices for export
    selectAllInvoices()
  }

  // Deselect all transactions
  const deselectAllTransactions = () => {
    setSelectedTransactions(new Set())
    deselectAllInvoices()
  }

  // Delete selected transactions (works for all reports, with or without invoice)
  const handleDeleteSelected = async () => {
    if (selectedTransactions.size === 0) {
      alert('Please select at least one report to delete.')
      return
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete ${selectedTransactions.size} selected ${reportType === 'PURCHASE_REGISTER' ? 'purchase(s)' : 'sale(s)'}? This action cannot be undone.`)) {
      return
    }

    try {
      let successCount = 0
      let failCount = 0

      for (const transactionId of selectedTransactions) {
        try {
          if (reportType === 'PURCHASE_REGISTER') {
            await purchaseService.deletePurchase(transactionId)
          } else if (reportType === 'SALES_REGISTER') {
            await saleService.deleteSale(transactionId)
          }
          successCount++
        } catch (error) {
          console.error(`Failed to delete transaction ${transactionId}:`, error)
          failCount++
        }
      }

      // Clear selection
      setSelectedTransactions(new Set())
      setSelectedInvoices(new Set())
      
      // Reload report data
      await handleApplyFilter()
      
      if (failCount > 0) {
        alert(`Deleted ${successCount} report(s) successfully. ${failCount} report(s) failed to delete.`)
      } else {
        alert(`Successfully deleted ${successCount} report(s)!`)
      }
    } catch (error) {
      alert(error.message || 'Failed to delete selected reports')
    }
  }

  // Export selected invoices as PDF - Using TaxInvoice template (same as View Invoice)
  const handleExportSelectedPDF = async () => {
    if (selectedTransactions.size === 0) {
      showNotification('Please select at least one report to export.', 'warning')
      return
    }

    if (isExportingPDF) {
      showNotification('PDF export is already in progress. Please wait...', 'warning')
      return
    }

    setIsExportingPDF(true)
    setExportProgress({ current: 0, total: 0 })
    
    showNotification(`Generating PDFs for ${selectedTransactions.size} selected transaction(s)... Please wait. This may take a moment. Your browser may ask for permission to download multiple files.`, 'info', 0)
    
    try {
      const allCompanies = await companyService.getAllCompanies()

      const uniqueTransactionIds = Array.from(selectedTransactions)
      
      if (uniqueTransactionIds.length === 0) {
        showNotification('No transactions selected to export.', 'warning')
        setIsExportingPDF(false)
        setExportProgress({ current: 0, total: 0 })
        return
      }

      setExportProgress({ current: 0, total: uniqueTransactionIds.length })
      showNotification(`Found ${uniqueTransactionIds.length} transaction(s) to export. Generating PDFs... This may take a moment. Your browser may ask for permission to download multiple files.`, 'info', 0)

      let successCount = 0
      let failCount = 0
      const errors = []
      let processedCount = 0

      // Generate individual PDF for each selected transaction (same as View Invoice)
      for (const transactionId of uniqueTransactionIds) {
        processedCount++
        setExportProgress({ current: processedCount, total: uniqueTransactionIds.length })
        showNotification(`Processing ${processedCount} of ${uniqueTransactionIds.length} transaction(s)...`, 'info', 0)
        try {
          // Processing transaction for PDF export
          let transaction = null
          
          if (reportType === 'PURCHASE_REGISTER') {
            transaction = purchases.find(p => p.id === transactionId)
            if (transaction) {
              const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
              const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
              transaction.seller = supplier || {}
              transaction.buyer = middleman || supplier || {}
              // Purchase transaction found
            }
          } else if (reportType === 'SALES_REGISTER') {
            transaction = sales.find(s => s.id === transactionId)
            if (transaction) {
              const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
              const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
              transaction.seller = middleman || {}
              transaction.buyer = thirdParty || {}
              // Sales transaction found
            }
          }

          if (!transaction) {
            // Transaction not found
            errors.push(`Transaction ${transactionId} not found`)
            failCount++
            continue
          }

          if (!transaction.items || transaction.items.length === 0) {
            // Transaction has no items
            errors.push(`Transaction ${transactionId} has no items`)
            failCount++
            continue
          }

          // Transaction has items

          // Prepare transaction data (same as InvoiceView)
          const transactionData = {
            ...transaction,
            purchase_date: transaction.purchase_date || transaction.sale_date || transaction.date,
            bill_no: transaction.bill_no || transaction.billNo || transaction.invoice_no || transaction.invoiceNo,
            invoice_no: transaction.invoice_no || transaction.invoiceNo,
            order_date: transaction.order_date || transaction.orderDate,
            order_no: transaction.order_no || transaction.orderNo,
            terms: transaction.terms || 'CASH/CREDIT'
          }

          // Generate invoice data using the same utility as InvoiceView
          const invoiceData = generateInvoiceData(
            transactionData,
            { seller: transaction.seller, buyer: transaction.buyer },
            transaction.items || [],
            reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES'
          )

          // Invoice data generated

          const companyInfo = invoiceData.seller || {}

          // Generating PDF for selected transaction
          // Generate PDF using the same method as InvoiceView (pass invoiceData directly)
          const pdf = await generateTaxInvoicePDF({
            invoiceData: invoiceData,
            companyInfo: companyInfo,
            reportType: reportType === 'PURCHASE_REGISTER' ? 'PURCHASE_REGISTER' : 'SALES_REGISTER',
            fromDate: invoiceData.billDate,
            toDate: invoiceData.billDate
          })

          const fileName = generatePDFFileName(invoiceData, reportType)
          pdf.save(fileName)
          
          if (!pdf || !pdf.internal || !pdf.internal.pages || pdf.internal.pages.length === 0) {
            throw new Error('PDF was not created properly')
          }
          successCount++

          // Small delay between downloads to avoid browser blocking
          if (successCount < uniqueTransactionIds.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        } catch (error) {
          console.error(`[PDF Export Selected] Error generating PDF for transaction ${transactionId}:`, error)
          errors.push(`Transaction ${transactionId}: ${error.message || error.toString()}`)
          failCount++
        }
      }

      // Export selected complete
      setExportProgress({ current: 0, total: 0 })

      if (failCount > 0) {
        const errorDetails = errors.slice(0, 3).join('; ')
        showNotification(`Export completed: ${successCount} succeeded, ${failCount} failed. Check console for details.`, 'error', 8000)
      } else {
        showNotification(`✓ Successfully exported ${successCount} invoice(s) as PDF! Check your downloads folder.`, 'success', 8000)
      }
    } catch (error) {
      console.error('[PDF Export Selected] Fatal error generating PDFs:', error)
      setExportProgress({ current: 0, total: 0 })
      showNotification(`Failed to generate PDF reports: ${error.message || 'Unknown error'}. Check browser console for details.`, 'error', 8000)
    } finally {
      setIsExportingPDF(false)
    }
  }

  // Export selected invoices as CSV
  const handleExportSelectedCSV = async () => {
    if (selectedTransactions.size === 0) {
      alert('Please select at least one report to export.')
      return
    }

    try {
      const allCompanies = await companyService.getAllCompanies()
      const uniqueTransactionIds = new Set(selectedTransactions)

      // Export each selected invoice
      for (const transactionId of uniqueTransactionIds) {
        let transaction = null
        
        if (reportType === 'PURCHASE_REGISTER') {
          transaction = purchases.find(p => p.id === transactionId)
          if (transaction) {
            const supplier = allCompanies.find(c => c.id === transaction.supplier_id)
            const middleman = transaction.middleman_id ? allCompanies.find(c => c.id === transaction.middleman_id) : null
            // In Purchase: "From" is the supplier (seller), "To" is your company (buyer)
            transaction.seller = supplier || {} // From = Supplier
            transaction.buyer = middleman || supplier || {} // To = Your company (using middleman if exists, else supplier)
          }
        } else if (reportType === 'SALES_REGISTER') {
          transaction = sales.find(s => s.id === transactionId)
          if (transaction) {
            const middleman = allCompanies.find(c => c.id === transaction.middleman_id)
            const thirdParty = transaction.third_party_id ? allCompanies.find(c => c.id === transaction.third_party_id) : null
            transaction.seller = middleman || {}
            transaction.buyer = thirdParty || {} // Don't fallback to middleman - buyer should be thirdParty only
          }
        }
        
        if (transaction) {
          const invoiceData = generateInvoiceData(
            transaction,
            { seller: transaction.seller, buyer: transaction.buyer },
            transaction.items || [],
            reportType === 'PURCHASE_REGISTER' ? 'PURCHASE' : 'SALES'
          )
          
          const csv = generateInvoiceCSV(invoiceData)
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const link = document.createElement('a')
          const url = URL.createObjectURL(blob)
          link.setAttribute('href', url)
          link.setAttribute('download', `Invoice_${invoiceData.billNo}_${invoiceData.billDate.replace(/\//g, '-')}.csv`)
          link.style.visibility = 'hidden'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
      
      alert(`Successfully exported ${uniqueTransactionIds.size} invoice(s) as CSV.`)
    } catch (error) {
      console.error('Error exporting selected invoices:', error)
      alert(`Failed to export selected invoices: ${error.message || 'Unknown error'}`)
    }
  }

  // Handle delete report item (for items without invoice numbers)
  const handleDeleteReport = async (item) => {
    const transactionId = item.purchaseId || item.saleId
    if (!transactionId) {
      alert('Cannot delete: Transaction ID not found')
      return
    }

    // Confirm deletion
    if (!window.confirm(`Are you sure you want to delete this ${reportType === 'PURCHASE_REGISTER' ? 'purchase' : 'sale'}? This action cannot be undone.`)) {
      return
    }

    try {
      if (reportType === 'PURCHASE_REGISTER') {
        await purchaseService.deletePurchase(transactionId)
      } else if (reportType === 'SALES_REGISTER') {
        await saleService.deleteSale(transactionId)
      }
      
      // Reload report data
      await handleApplyFilter()
      alert('Report deleted successfully!')
    } catch (error) {
      alert(error.message || 'Failed to delete report')
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export. Please apply filters first.')
      return
    }

    // Create CSV content
    const headers = ['S.No', 'Date', 'Invoice No', 'Company', 'Description & Pack', 'HSN/SAC', 'Batch No', 'Exp M-YY', 'Qty', 'Free', 'Disc %', 'MRP', 'Rate', 'CGST', 'SGST', 'Amount']
    const rows = reportData.map(item => [
      item.sNo,
      item.date,
      item.invoiceNo,
      item.company,
      item.description,
      item.hsnSac,
      item.batchNo,
      item.expMYY,
      item.qty,
      item.free,
      item.discPercent,
      item.mrp,
      item.rate,
      item.cgst,
      item.sgst,
      item.amount
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${reportType}_${fromDate}_to_${toDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 bg-slate-900 min-h-screen">
      {/* Export Notification */}
      {exportNotification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-2xl border-2 ${
          exportNotification.type === 'success' 
            ? 'bg-green-900/90 border-green-500 text-green-100' 
            : exportNotification.type === 'error' 
            ? 'bg-red-900/90 border-red-500 text-red-100'
            : exportNotification.type === 'warning'
            ? 'bg-yellow-900/90 border-yellow-500 text-yellow-100'
            : 'bg-blue-900/90 border-blue-500 text-blue-100'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium whitespace-pre-wrap break-words">
                {exportNotification.message}
              </p>
              {isExportingPDF && exportProgress.total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>Progress: {exportProgress.current} / {exportProgress.total}</span>
                    <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        exportNotification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setExportNotification(null)}
              className="text-current opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close notification"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Reports</h2>

        {/* Report Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Report Type:
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            >
              {reportTypes.map(type => (
                <option key={type.value} value={type.value} className="bg-slate-700">
                  {type.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              From:
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              To:
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-700/50 border-2 border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-white text-xs sm:text-sm font-medium mb-1 sm:mb-2">
              Company:
            </label>
            <FilterableDropdown
              options={companies}
              value={selectedCompany}
              onChange={setSelectedCompany}
              placeholder="All Companies"
              filterPlaceholder="Type to filter companies..."
              className="w-full"
            />
          </div>
        </div>

        {/* Apply Filter Button */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={handleApplyFilter}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-slate-700 disabled:hover:bg-slate-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Apply Filter'}
          </button>
        </div>

        {/* Summary/Totals Section */}
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm sm:text-base">
            <div className="text-white">
              <span className="font-semibold">QTY:</span> {summary.qty}
            </div>
            <div className="text-white">
              <span className="font-semibold">GROSS:</span> ₹{summary.gross}
            </div>
            <div className="text-white">
              <span className="font-semibold">CGST:</span> ₹{summary.cgst}
            </div>
            <div className="text-white">
              <span className="font-semibold">SGST:</span> ₹{summary.sgst}
            </div>
            <div className="text-white">
              <span className="font-semibold">IGST:</span> ₹{summary.igst}
            </div>
            <div className="text-white">
              <span className="font-semibold">GST:</span> ₹{summary.gst}
            </div>
            <div className="text-white">
              <span className="font-semibold">AMOUNT:</span> ₹{summary.amount}
            </div>
          </div>
        </div>

        {/* Data Table Section */}
        <div className="mb-4 sm:mb-6 overflow-x-auto">
          <table className="w-full border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-slate-700 border-b border-slate-600">
                {(reportType === 'PURCHASE_REGISTER' || reportType === 'SALES_REGISTER') && (
                  <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-white border-r border-slate-600">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size > 0 && selectedTransactions.size === new Set(reportData.map(item => item.purchaseId || item.saleId).filter(Boolean)).size}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllTransactions()
                        } else {
                          deselectAllTransactions()
                        }
                      }}
                      className="cursor-pointer"
                      title="Select/Deselect All Reports"
                    />
                  </th>
                )}
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">S.No</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Date</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Invoice No</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Company</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Description & Pack</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">HSN/SAC</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Batch No</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Exp M-YY</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Qty</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Free</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Disc %</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">MRP</th>
                <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Rate</th>
                {(() => {
                  // Check if any item has IGST (cgst > 0 and sgst = 0)
                  const hasIGST = reportData.some(item => {
                    const cgst = parseFloat(item.cgst) || 0
                    const sgst = parseFloat(item.sgst) || 0
                    return cgst > 0 && sgst === 0
                  })
                  const hasCGSTSGST = reportData.some(item => {
                    const cgst = parseFloat(item.cgst) || 0
                    const sgst = parseFloat(item.sgst) || 0
                    return cgst > 0 && sgst > 0
                  })
                  
                  // If we have mixed IGST and CGST/SGST, show both columns
                  // If only IGST, show only IGST column
                  // If only CGST/SGST, show both columns
                  if (hasIGST && !hasCGSTSGST) {
                    // Only IGST transactions
                    return (
                      <>
                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600" colSpan="2">IGST</th>
                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Amount</th>
                      </>
                    )
                  } else {
                    // CGST/SGST or mixed - show CGST/IGST header
                    return (
                      <>
                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">CGST/IGST</th>
                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">SGST</th>
                        <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white border-r border-slate-600">Amount</th>
                      </>
                    )
                  }
                })()}
                {(reportType === 'PURCHASE_REGISTER' || reportType === 'SALES_REGISTER') && (
                  <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-white">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={(() => {
                    const hasIGST = reportData.some(item => {
                      const cgst = parseFloat(item.cgst) || 0
                      const sgst = parseFloat(item.sgst) || 0
                      return cgst > 0 && sgst === 0
                    })
                    const hasCGSTSGST = reportData.some(item => {
                      const cgst = parseFloat(item.cgst) || 0
                      const sgst = parseFloat(item.sgst) || 0
                      return cgst > 0 && sgst > 0
                    })
                    const colCount = (hasIGST && !hasCGSTSGST) ? 17 : 18
                    return (reportType === 'PURCHASE_REGISTER' || reportType === 'SALES_REGISTER') ? colCount : (colCount - 2)
                  })()} className="px-4 py-8 text-center text-slate-400 text-xs sm:text-sm">
                    {isLoading ? 'Loading data...' : 'No data available. Please apply filters to load report data.'}
                  </td>
                </tr>
              ) : (
                reportData.map((item, index) => {
                  const transactionId = item.purchaseId || item.saleId
                  const isFirstInGroup = index === 0 || reportData[index - 1].invoiceNo !== item.invoiceNo
                  const isSelected = selectedInvoices.has(item.invoiceNo)
                  
                  return (
                    <tr
                      key={index}
                      className={`border-b border-slate-700 hover:bg-slate-700/30 transition-colors ${isSelected ? 'bg-slate-700/50' : ''}`}
                    >
                      {(reportType === 'PURCHASE_REGISTER' || reportType === 'SALES_REGISTER') && (
                        <td className="px-2 sm:px-3 py-2 text-center text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                          {transactionId ? (
                            // Show checkbox for all items (for deletion and export)
                            <input
                              type="checkbox"
                              checked={selectedTransactions.has(transactionId)}
                              onChange={() => toggleTransactionSelection(transactionId, item.invoiceNo)}
                              className="cursor-pointer"
                              title={item.invoiceNo && item.invoiceNo !== '-' ? `Select Invoice ${item.invoiceNo} for deletion/export` : 'Select for deletion'}
                            />
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.sNo}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.date}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.invoiceNo}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.company}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.description}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.hsnSac}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.batchNo}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.expMYY}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.qty}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.free}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        {item.discPercent}%
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        ₹{parseFloat(item.mrp).toFixed(2)}
                      </td>
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                        ₹{parseFloat(item.rate).toFixed(2)}
                      </td>
                      {(() => {
                        const cgst = parseFloat(item.cgst) || 0
                        const sgst = parseFloat(item.sgst) || 0
                        const isIGST = cgst > 0 && sgst === 0
                        
                        // Check if report has mixed IGST and CGST/SGST
                        const hasIGST = reportData.some(i => {
                          const icgst = parseFloat(i.cgst) || 0
                          const isgst = parseFloat(i.sgst) || 0
                          return icgst > 0 && isgst === 0
                        })
                        const hasCGSTSGST = reportData.some(i => {
                          const icgst = parseFloat(i.cgst) || 0
                          const isgst = parseFloat(i.sgst) || 0
                          return icgst > 0 && isgst > 0
                        })
                        
                        if (hasIGST && !hasCGSTSGST) {
                          // Only IGST transactions - show IGST column
                          return (
                            <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700" colSpan="2">
                              {isIGST ? `₹${cgst.toFixed(2)}` : '-'}
                            </td>
                          )
                        } else {
                          // CGST/SGST or mixed - show both columns
                          return (
                            <>
                              <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                                {isIGST ? `₹${cgst.toFixed(2)}` : (cgst > 0 ? `₹${cgst.toFixed(2)}` : '-')}
                              </td>
                              <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm border-r border-slate-700">
                                {isIGST ? '-' : (sgst > 0 ? `₹${sgst.toFixed(2)}` : '-')}
                              </td>
                            </>
                          )
                        }
                      })()}
                      <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm font-semibold border-r border-slate-700">
                        ₹{parseFloat(item.amount).toFixed(2)}
                      </td>
                      {(reportType === 'PURCHASE_REGISTER' || reportType === 'SALES_REGISTER') && (
                        <td className="px-2 sm:px-3 py-2 text-slate-300 text-xs sm:text-sm">
                          <div className="flex gap-2 items-center">
                            {isFirstInGroup && transactionId ? (
                              <>
                                <button
                                  onClick={() => handleViewInvoice(transactionId)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 sm:px-3 rounded text-xs transition-all"
                                  title="View Invoice"
                                >
                                  View Invoice
                                </button>
                                {/* Show delete button for all reports */}
                                <button
                                  onClick={() => handleDeleteReport(item)}
                                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-2 sm:px-3 rounded text-xs transition-all"
                                  title="Delete Report"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          {/* Selection Controls - Only for Purchase and Sales Registers */}
          {(reportType === 'PURCHASE_REGISTER' || reportType === 'SALES_REGISTER') && reportData.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
              <span className="text-white text-sm font-medium">
                Selected: {selectedTransactions.size} report(s)
              </span>
              <button
                onClick={selectAllTransactions}
                className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-1.5 px-3 rounded text-xs transition-all"
              >
                Select All
              </button>
              <button
                onClick={deselectAllTransactions}
                className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-1.5 px-3 rounded text-xs transition-all"
              >
                Deselect All
              </button>
              <button
                onClick={handleExportSelectedPDF}
                disabled={selectedTransactions.size === 0 || isExportingPDF}
                className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-slate-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExportingPDF ? `Generating PDFs... (${selectedTransactions.size})` : `Export Selected as PDF (${selectedTransactions.size})`}
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={selectedTransactions.size === 0}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-slate-700 text-white font-medium py-1.5 px-3 rounded text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete selected reports"
              >
                Delete Selected ({selectedTransactions.size})
              </button>
            </div>
          )}
          
        </div>
      </div>

      {/* Invoice View Modal */}
      {selectedInvoice && (
        <InvoiceView
          transaction={selectedInvoice}
          type={invoiceType}
          onClose={() => {
            setSelectedInvoice(null)
            setInvoiceType(null)
          }}
          onDownload={() => handleDownloadInvoicePDF(selectedInvoice.id)}
        />
      )}
    </div>
  )
}

export default Reports
