import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import ItemDialog from './ItemDialog'

export default function BillGrid({ items, onItemsChange, drugs, companies, isPurchase = false }) {
  const [localItems, setLocalItems] = useState(items || [])
  const [editingIndex, setEditingIndex] = useState(null)
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    setLocalItems(items || [])
  }, [items])

  const calculateItem = (item) => {
    // Calculate gross amount (after discount)
    const gross = (item.qty || 0) * (item.price || 0)
    const discountAmount = gross * ((item.discount_percent || 0) / 100)
    const grossAfterDiscount = gross - discountAmount

    // Calculate GST
    const gstPercent = item.gst_percent || 0
    const gstAmount = (grossAfterDiscount * gstPercent) / 100

    // Split GST based on intra/inter state
    const isIntraState = item.is_intra_state !== false // Default to intra-state
    const cgstAmount = isIntraState ? gstAmount / 2 : 0
    const sgstAmount = isIntraState ? gstAmount / 2 : 0
    const igstAmount = isIntraState ? 0 : gstAmount
    const cgstPercent = isIntraState ? gstPercent / 2 : 0
    const sgstPercent = isIntraState ? gstPercent / 2 : 0
    const igstPercent = isIntraState ? 0 : gstPercent

    const total = grossAfterDiscount + gstAmount

    return {
      ...item,
      gross_amount: grossAfterDiscount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      cgst_percent: cgstPercent,
      sgst_percent: sgstPercent,
      igst_percent: igstPercent,
      gst_amount: gstAmount,
      total: total
    }
  }

  const addItem = () => {
    setEditingIndex(null)
    setShowDialog(true)
  }

  const editItem = (index) => {
    setEditingIndex(index)
    setShowDialog(true)
  }

  const handleItemSave = (itemData) => {
    const calculated = calculateItem(itemData)
    const updated = [...localItems]
    if (editingIndex !== null && editingIndex >= 0) {
      updated[editingIndex] = calculated
    } else {
      updated.push(calculated)
    }
    setLocalItems(updated)
    onItemsChange(updated)
    setShowDialog(false)
    setEditingIndex(null)
  }

  const removeItem = (index) => {
    const updated = localItems.filter((_, i) => i !== index)
    setLocalItems(updated)
    onItemsChange(updated)
  }

  const getTotals = () => {
    const totals = localItems.reduce((acc, item) => {
      acc.gross += item.gross_amount || 0
      acc.cgst += item.cgst_amount || 0
      acc.sgst += item.sgst_amount || 0
      acc.igst += item.igst_amount || 0
      acc.total += item.total || 0
      return acc
    }, { gross: 0, cgst: 0, sgst: 0, igst: 0, total: 0 })
    return totals
  }

  const totals = getTotals()
  const currentItem = editingIndex !== null && editingIndex >= 0 ? localItems[editingIndex] : null

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-dark-border text-sm">
          <thead>
            <tr className="bg-dark-surface">
              <th className="border border-dark-border p-2 text-left">Description</th>
              <th className="border border-dark-border p-2 text-left">HSN</th>
              <th className="border border-dark-border p-2 text-left">Batch</th>
              <th className="border border-dark-border p-2 text-left">Expiry</th>
              <th className="border border-dark-border p-2 text-left">Qty</th>
              <th className="border border-dark-border p-2 text-left">Free</th>
              <th className="border border-dark-border p-2 text-left">Disc %</th>
              <th className="border border-dark-border p-2 text-left">MRP</th>
              <th className="border border-dark-border p-2 text-left">Price</th>
              <th className="border border-dark-border p-2 text-left">CGST %</th>
              <th className="border border-dark-border p-2 text-left">CGST ₹</th>
              <th className="border border-dark-border p-2 text-left">SGST %</th>
              <th className="border border-dark-border p-2 text-left">SGST ₹</th>
              <th className="border border-dark-border p-2 text-left">IGST %</th>
              <th className="border border-dark-border p-2 text-left">IGST ₹</th>
              <th className="border border-dark-border p-2 text-left">Amount</th>
              <th className="border border-dark-border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {localItems.length === 0 ? (
              <tr>
                <td colSpan="17" className="border border-dark-border p-4 text-center text-gray-400">
                  No items added. Click "Add Item" to start.
                </td>
              </tr>
            ) : (
              localItems.map((item, index) => {
                const calcItem = calculateItem(item)
                return (
                  <tr key={index} className="hover:bg-dark-surface">
                    <td className="border border-dark-border p-2 text-white">{calcItem.product_name || '-'}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.hsn_code || '-'}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.batch_no || '-'}</td>
                    <td className="border border-dark-border p-2 text-white">
                      {calcItem.expiry_date ? new Date(calcItem.expiry_date).toLocaleDateString('en-IN') : '-'}
                    </td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.qty || 0}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.free_qty || 0}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.discount_percent?.toFixed(2) || 0}%</td>
                    <td className="border border-dark-border p-2 text-white">₹{calcItem.mrp?.toFixed(2) || 0}</td>
                    <td className="border border-dark-border p-2 text-white">₹{calcItem.price?.toFixed(2) || 0}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.cgst_percent?.toFixed(2) || 0}%</td>
                    <td className="border border-dark-border p-2 text-white">₹{calcItem.cgst_amount?.toFixed(2) || 0}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.sgst_percent?.toFixed(2) || 0}%</td>
                    <td className="border border-dark-border p-2 text-white">₹{calcItem.sgst_amount?.toFixed(2) || 0}</td>
                    <td className="border border-dark-border p-2 text-white">{calcItem.igst_percent?.toFixed(2) || 0}%</td>
                    <td className="border border-dark-border p-2 text-white">₹{calcItem.igst_amount?.toFixed(2) || 0}</td>
                    <td className="border border-dark-border p-2 text-white font-semibold">₹{calcItem.total?.toFixed(2) || 0}</td>
                    <td className="border border-dark-border p-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editItem(index)}
                          className="text-blue-500 hover:text-blue-400"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          {localItems.length > 0 && (
            <tfoot className="bg-dark-surface font-semibold">
              <tr>
                <td colSpan="9" className="border border-dark-border p-2 text-right text-white">TOTAL:</td>
                <td className="border border-dark-border p-2 text-white">-</td>
                <td className="border border-dark-border p-2 text-white">₹{totals.cgst.toFixed(2)}</td>
                <td className="border border-dark-border p-2 text-white">-</td>
                <td className="border border-dark-border p-2 text-white">₹{totals.sgst.toFixed(2)}</td>
                <td className="border border-dark-border p-2 text-white">-</td>
                <td className="border border-dark-border p-2 text-white">₹{totals.igst.toFixed(2)}</td>
                <td className="border border-dark-border p-2 text-white">₹{totals.total.toFixed(2)}</td>
                <td className="border border-dark-border p-2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      
      <div className="flex justify-between items-center">
        <button
          onClick={addItem}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          <Plus size={20} /> Add Item
        </button>
        <div className="text-right">
          <div className="text-lg text-gray-300">Gross: ₹{totals.gross.toFixed(2)}</div>
          <div className="text-xl font-bold text-white">Grand Total: ₹{totals.total.toFixed(2)}</div>
        </div>
      </div>

      {showDialog && (
        <ItemDialog
          item={currentItem}
          drugs={drugs}
          isPurchase={isPurchase}
          onSave={handleItemSave}
          onClose={() => {
            setShowDialog(false)
            setEditingIndex(null)
          }}
        />
      )}
    </div>
  )
}
