// Purchase service - connects to FastAPI backend
import apiClient from './api'

export const purchaseService = {
  // Create purchase
  async createPurchase(purchaseData) {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Authentication required. Please login first.')
      }
      
      const response = await apiClient.post('/purchases/', purchaseData)
      return response.data
    } catch (error) {
      console.error('Purchase service error:', error)
      if (error.response) {
        const status = error.response.status
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to create purchase'
        if (status === 404) {
          throw new Error(`Endpoint not found (404). Please ensure:\n1. The backend server is running\n2. The server has been restarted after adding the purchases route\n3. The endpoint /api/purchases/ is registered\n\nError: ${message}`)
        } else if (status === 401) {
          throw new Error('Authentication failed. Please login again.')
        }
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:3000')
      } else {
        throw new Error(error.message || 'Failed to create purchase')
      }
    }
  },

  // Get all purchases
  async getAllPurchases(fromDate = null, toDate = null, supplierId = null) {
    try {
      const params = {}
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (supplierId) params.supplier_id = supplierId

      const response = await apiClient.get('/purchases/', { params })
      return response.data || []
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load purchases'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load purchases')
      }
    }
  },

  // Get purchase by ID
  async getPurchaseById(id) {
    try {
      const response = await apiClient.get(`/purchases/${id}`)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load purchase'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load purchase')
      }
    }
  },

  // Delete purchase
  async deletePurchase(id) {
    try {
      await apiClient.delete(`/purchases/${id}`)
      return true
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to delete purchase'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to delete purchase')
      }
    }
  }
}
