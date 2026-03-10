import React from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { createRoot } from 'react-dom/client'
import TaxInvoice from '../components/TaxInvoice'

/**
 * Generate PDF from TaxInvoice component
 * @param {Object} options - PDF generation options
 * @param {Array} options.reportData - Report data to display
 * @param {Object} options.summary - Summary totals
 * @param {Object} options.companyInfo - Company information
 * @param {String} options.reportType - Type of report
 * @param {String} options.fromDate - Start date
 * @param {String} options.toDate - End date
 * @param {Object} options.invoiceData - Invoice data from InvoiceView (alternative to reportData)
 * @returns {Promise<jsPDF>} PDF document
 */
export async function generateTaxInvoicePDF({
  reportData = [],
  summary = null,
  companyInfo = null,
  reportType = '',
  fromDate = '',
  toDate = '',
  invoiceData = null
} = {}) {
  // Create a temporary container element - MUST be in viewport for html2canvas
  const container = document.createElement('div')
  container.id = 'pdf-generator-container'
  container.style.position = 'fixed'
  container.style.left = '0'
  container.style.top = '0'
  container.style.width = '210mm'
  container.style.height = 'auto'
  container.style.padding = '0'
  container.style.margin = '0'
  container.style.overflow = 'visible'
  container.style.zIndex = '999999'
  container.style.backgroundColor = '#ffffff'
  container.style.visibility = 'visible'
  container.style.opacity = '1'
  container.style.pointerEvents = 'none'
  // Position it off-screen but still in viewport
  container.style.transform = 'translateX(-10000px)'
  container.style.clipPath = 'none'
  document.body.appendChild(container)

  let root = null

  try {
    // Render the TaxInvoice component with dynamic data
    root = createRoot(container)
    root.render(
      <TaxInvoice 
        reportData={reportData}
        summary={summary}
        companyInfo={companyInfo}
        reportType={reportType}
        fromDate={fromDate}
        toDate={toDate}
        invoiceData={invoiceData}
      />
    )

    // Wait for React to render - increased time to ensure spacing is rendered
    await new Promise((resolve) => {
      setTimeout(() => resolve(), 5000)
    })
    
    // Force multiple reflows to ensure layout
    const forceReflow = () => {
      const height = container.offsetHeight
      const width = container.offsetWidth
      container.getBoundingClientRect()
      return { height, width }
    }
    
    for (let i = 0; i < 3; i++) {
      forceReflow()
      await new Promise((resolve) => {
        requestAnimationFrame(() => resolve())
      })
    }
    
    // Get final dimensions
    const finalDimensions = forceReflow()
    const contentHeight = Math.max(
      container.scrollHeight,
      container.offsetHeight,
      container.clientHeight,
      finalDimensions.height,
      1000
    )
    const contentWidth = Math.max(
      container.scrollWidth,
      container.offsetWidth,
      container.clientWidth,
      finalDimensions.width,
      794
    )

    if (contentHeight === 0 || contentWidth === 0) {
      throw new Error(`Container has invalid dimensions: ${contentWidth}x${contentHeight}`)
    }

    // Check if content actually rendered
    const printContainer = container.querySelector('.print-container')
    const tables = container.querySelectorAll('table')
    
    if (!printContainer && tables.length === 0) {
      throw new Error('TaxInvoice component did not render - no content found')
    }

    // Convert ALL colors to RGB BEFORE html2canvas processes them
    // Be very aggressive - force all oklch/oklab colors to RGB
    // This includes gradients, backgrounds, borders, and all color properties
    const allElements = container.querySelectorAll('*')
    allElements.forEach((el) => {
      try {
        const style = window.getComputedStyle(el)
        
        // Force text color to RGB - check if it contains oklch/oklab or is not RGB
        const textColor = style.color
        if (textColor && (textColor.includes('oklch') || textColor.includes('oklab') || (!textColor.startsWith('rgb') && !textColor.startsWith('#')))) {
          el.style.color = 'rgb(0, 0, 0)'
        }
        
        // Handle background-image (gradients) - this is the main culprit!
        const bgImage = style.backgroundImage
        if (bgImage && bgImage !== 'none' && (bgImage.includes('oklch') || bgImage.includes('oklab'))) {
          // Remove gradient and replace with solid color based on class
          if (el.classList.contains('bg-gradient-to-r')) {
            if (el.classList.contains('from-gray-200') && el.classList.contains('to-gray-300')) {
              el.style.backgroundImage = 'none'
              el.style.backgroundColor = 'rgb(229, 231, 235)'
            } else {
              el.style.backgroundImage = 'none'
              el.style.backgroundColor = 'rgb(229, 231, 235)'
            }
          } else {
            el.style.backgroundImage = 'none'
            el.style.backgroundColor = 'rgb(229, 231, 235)'
          }
        }
        
        // Force background color to RGB based on classes or fallback
        const bgColor = style.backgroundColor
        if (bgColor && (bgColor.includes('oklch') || bgColor.includes('oklab') || (!bgColor.startsWith('rgb') && bgColor !== 'transparent' && !bgColor.startsWith('#')))) {
          // Map Tailwind classes to RGB values
          if (el.classList.contains('bg-gray-300')) {
            el.style.backgroundColor = 'rgb(209, 213, 219)'
          } else if (el.classList.contains('bg-white')) {
            el.style.backgroundColor = 'rgb(255, 255, 255)'
          } else if (el.classList.contains('bg-gray-200')) {
            el.style.backgroundColor = 'rgb(229, 231, 235)'
          } else if (el.classList.contains('bg-gray-50')) {
            el.style.backgroundColor = 'rgb(249, 250, 251)'
          } else if (el.classList.contains('bg-blue-50')) {
            el.style.backgroundColor = 'rgb(239, 246, 255)'
          } else {
            el.style.backgroundColor = 'rgb(255, 255, 255)'
          }
        }
        
        // Force all border colors to RGB black
        const borderProps = ['borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']
        borderProps.forEach(prop => {
          const color = style[prop]
          if (color && (color.includes('oklch') || color.includes('oklab') || (!color.startsWith('rgb') && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' && !color.startsWith('#')))) {
            el.style[prop] = 'rgb(0, 0, 0)'
          }
        })
      } catch (e) {
        // Ignore errors for individual elements
        // Error converting color for element
      }
    })
    
    // Inject comprehensive global CSS to override ALL oklch colors and gradients
    const globalStyle = document.createElement('style')
    globalStyle.id = 'pdf-oklch-fix'
    globalStyle.textContent = `
      #pdf-generator-container * {
        color: rgb(0, 0, 0) !important;
        border-color: rgb(0, 0, 0) !important;
        border-top-color: rgb(0, 0, 0) !important;
        border-right-color: rgb(0, 0, 0) !important;
        border-bottom-color: rgb(0, 0, 0) !important;
        border-left-color: rgb(0, 0, 0) !important;
        background-image: none !important;
      }
      #pdf-generator-container .bg-gray-300 {
        background-color: rgb(209, 213, 219) !important;
        background-image: none !important;
      }
      #pdf-generator-container .bg-white {
        background-color: rgb(255, 255, 255) !important;
        background-image: none !important;
      }
      #pdf-generator-container .bg-gray-200 {
        background-color: rgb(229, 231, 235) !important;
        background-image: none !important;
      }
      #pdf-generator-container .bg-gray-50 {
        background-color: rgb(249, 250, 251) !important;
        background-image: none !important;
      }
      #pdf-generator-container .bg-blue-50 {
        background-color: rgb(239, 246, 255) !important;
        background-image: none !important;
      }
      #pdf-generator-container .bg-gradient-to-r {
        background-image: none !important;
        background-color: rgb(229, 231, 235) !important;
      }
    `
    document.head.appendChild(globalStyle)
    
    // Move container to viewport (but keep it visually hidden)
    container.style.transform = 'translateX(0)'
    container.style.left = '0'
    container.style.top = '0'
    container.style.opacity = '0.99' // Almost fully visible for html2canvas
    container.style.visibility = 'visible'
    
    // Wait for transform and style changes to apply
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            container.offsetHeight // Force reflow
            resolve()
          })
        })
      })
    })
    
    // Verify container is in viewport
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      throw new Error(`Container has zero dimensions in viewport: ${rect.width}x${rect.height}`)
    }

    // Capturing canvas for PDF generation

    // Capture with html2canvas
    let canvas
    try {
      canvas = await html2canvas(container, {
        scale: 1.5, // Lower scale for faster capture
        useCORS: true,
        logging: false, // Disable logging to avoid console spam
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: contentWidth,
        height: contentHeight,
        windowWidth: contentWidth,
        windowHeight: contentHeight,
        removeContainer: false,
        imageTimeout: 30000,
        foreignObjectRendering: false,
        onclone: (clonedDoc, element) => {
          // Helper to convert colors in cloned document
          const convertColorInClone = (colorValue, fallback = 'rgb(0, 0, 0)') => {
            if (!colorValue || colorValue === 'transparent' || colorValue === 'rgba(0, 0, 0, 0)') {
              return fallback
            }
            if (colorValue.startsWith('rgb')) {
              return colorValue
            }
            if (colorValue.includes('oklch') || colorValue.includes('oklab')) {
              // For oklch in clone, just use fallback
              return fallback
            }
            return fallback
          }
          
          // Inject comprehensive CSS to fix ALL colors
          const styleSheet = clonedDoc.createElement('style')
          styleSheet.textContent = `
            * {
              color: rgb(0, 0, 0) !important;
              border-color: rgb(0, 0, 0) !important;
              border-top-color: rgb(0, 0, 0) !important;
              border-right-color: rgb(0, 0, 0) !important;
              border-bottom-color: rgb(0, 0, 0) !important;
              border-left-color: rgb(0, 0, 0) !important;
            }
            .print-container {
              padding: 0mm !important;
              margin: 0mm !important;
              width: 100% !important;
            }
            table {
              border-spacing: 0 !important;
              border-collapse: collapse !important;
              width: 100% !important;
            }
            td, th {
              padding: 1mm !important;
              font-size: 8px !important;
              color: rgb(0, 0, 0) !important;
              border-color: rgb(0, 0, 0) !important;
            }
            div {
              padding: 0.3mm !important;
              color: rgb(0, 0, 0) !important;
            }
            button {
              display: none !important;
            }
            .bg-gray-300 {
              background-color: rgb(209, 213, 219) !important;
            }
            .bg-white {
              background-color: rgb(255, 255, 255) !important;
            }
            .bg-gray-200 {
              background-color: rgb(229, 231, 235) !important;
            }
            .bg-gray-50 {
              background-color: rgb(249, 250, 251) !important;
            }
            .bg-blue-50 {
              background-color: rgb(239, 246, 255) !important;
              background-image: none !important;
            }
            .bg-gradient-to-r {
              background-image: none !important;
              background-color: rgb(229, 231, 235) !important;
            }
          `
          clonedDoc.head.appendChild(styleSheet)
          
          // Fix ALL colors in cloned document - be very aggressive
          const allElements = clonedDoc.querySelectorAll('*')
          allElements.forEach((el) => {
            try {
              const style = clonedDoc.defaultView.getComputedStyle(el)
              
              // Remove gradients FIRST (this is critical - gradients contain oklch colors!)
              const bgImage = style.backgroundImage
              if (bgImage && bgImage !== 'none' && (bgImage.includes('oklch') || bgImage.includes('oklab') || bgImage.includes('gradient'))) {
                el.style.backgroundImage = 'none'
                if (el.classList.contains('bg-gradient-to-r')) {
                  el.style.backgroundColor = 'rgb(229, 231, 235)'
                } else if (el.classList.contains('from-gray-200') && el.classList.contains('to-gray-300')) {
                  el.style.backgroundColor = 'rgb(229, 231, 235)'
                }
              }
              
              // Force all text colors to RGB black
              const textColor = style.color
              if (textColor && (textColor.includes('oklch') || textColor.includes('oklab') || !textColor.startsWith('rgb'))) {
                el.style.color = 'rgb(0, 0, 0)'
              }
              
              // Force all background colors to RGB
              const bgColor = style.backgroundColor
              if (bgColor && (bgColor.includes('oklch') || bgColor.includes('oklab'))) {
                if (el.classList.contains('bg-gray-300')) {
                  el.style.backgroundColor = 'rgb(209, 213, 219)'
                } else if (el.classList.contains('bg-white')) {
                  el.style.backgroundColor = 'rgb(255, 255, 255)'
                } else if (el.classList.contains('bg-gray-200')) {
                  el.style.backgroundColor = 'rgb(229, 231, 235)'
                } else if (el.classList.contains('bg-gray-50')) {
                  el.style.backgroundColor = 'rgb(249, 250, 251)'
                } else if (el.classList.contains('bg-blue-50')) {
                  el.style.backgroundColor = 'rgb(239, 246, 255)'
                } else {
                  el.style.backgroundColor = 'rgb(255, 255, 255)'
                }
              }
              
              // Force all border colors to RGB black
              ['borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(prop => {
                const color = style[prop]
                if (color && (color.includes('oklch') || color.includes('oklab') || (!color.startsWith('rgb') && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent' && !color.startsWith('#')))) {
                  el.style[prop] = 'rgb(0, 0, 0)'
                }
              })
              
              // Hide buttons
              if (el.tagName === 'BUTTON') {
                el.style.display = 'none'
              }
            } catch (e) {
              // Ignore individual element errors
            }
          })
        }
      })
    } catch (canvasError) {
      console.error('html2canvas error:', canvasError)
      throw new Error(`Failed to capture canvas: ${canvasError.message}`)
    }

    // Validate canvas
    if (!canvas) {
      throw new Error('Canvas was not generated')
    }
    
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(`Invalid canvas dimensions: ${canvas.width}x${canvas.height}`)
    }

    // Canvas captured successfully

    // Create PDF with proper metadata and security settings
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    })
    
    // Add PDF metadata
    const reportTitle = reportType === 'PURCHASE_REGISTER' ? 'Purchase Register Report' 
      : reportType === 'SALES_REGISTER' ? 'Sales Register Report'
      : 'Tax Invoice Report'
    
    pdf.setProperties({
      title: reportTitle,
      subject: 'Tax Invoice - PharmaPOS',
      author: companyInfo?.name || 'PharmaPOS',
      creator: 'PharmaPOS System',
      producer: 'PharmaPOS PDF Generator',
      keywords: 'tax invoice, pharma, invoice, report',
      creationDate: new Date()
    })
    
    // Set PDF security to prevent text extraction and conversion
    // Note: jsPDF doesn't support encryption directly, but we can mark content as image-only
    // The image-based approach naturally prevents text extraction

    // Convert canvas to PNG
    const pdfWidth = 210 // A4 width in mm
    const pdfHeight = 297 // A4 height in mm
    const imgData = canvas.toDataURL('image/png', 1.0)
    
    if (!imgData || !imgData.startsWith('data:image/png')) {
      throw new Error('Invalid PNG data generated')
    }
    
    if (imgData.length < 1000) {
      throw new Error(`PNG data too small: ${imgData.length} bytes - likely empty`)
    }

    // PNG data generated
    
    // Calculate image dimensions for PDF
    const aspectRatio = canvas.width / canvas.height
    let imgWidth = pdfWidth
    let imgHeight = pdfWidth / aspectRatio
    
    // Scale to fit page
    if (imgHeight > pdfHeight) {
      imgHeight = pdfHeight
      imgWidth = pdfHeight * aspectRatio
      
      if (imgWidth < pdfWidth) {
        imgWidth = pdfWidth
        imgHeight = pdfWidth / aspectRatio
      }
    } else {
      imgWidth = pdfWidth
      imgHeight = pdfWidth / aspectRatio
      
      if (imgHeight > pdfHeight) {
        imgHeight = pdfHeight
        imgWidth = pdfHeight * aspectRatio
      }
    }
    
    // Add image to PDF as rasterized content (prevents text extraction)
    try {
      // Add image directly without any text layers
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST')
      
      // Ensure PDF structure is valid
      const pageCount = pdf.internal.pages.length
      
      if (pageCount === 0) {
        throw new Error('PDF has no pages')
      }
      
      // Mark PDF content as image-only by removing any potential text objects
      // This ensures conversion tools will fail since there's no extractable text
      // The PDF structure remains valid but conversion-resistant
      
    } catch (addImageError) {
      console.error('Error adding image to PDF:', addImageError)
      throw new Error(`Failed to add image to PDF: ${addImageError.message}`)
    }

    // Clean up
    const globalStyleFix = document.getElementById('pdf-oklch-fix')
    if (globalStyleFix) {
      document.head.removeChild(globalStyleFix)
    }
    
    if (root) {
      root.unmount()
    }
    if (container.parentNode) {
      document.body.removeChild(container)
    }

    return pdf
  } catch (error) {
    console.error('PDF generation error:', error)
    
    // Clean up on error
    const globalStyleFix = document.getElementById('pdf-oklch-fix')
    if (globalStyleFix) {
      try {
        document.head.removeChild(globalStyleFix)
      } catch (e) {
        // Ignore
      }
    }
    
    if (root) {
      try {
        root.unmount()
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    if (container.parentNode) {
      try {
        document.body.removeChild(container)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    throw error
  }
}
