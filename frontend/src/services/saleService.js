// Sale service - connects to FastAPI backend
import apiClient from './api'

export const saleService = {
  // Create sale
  async createSale(saleData) {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Authentication required. Please login first.')
      }
      
      const response = await apiClient.post('/sales/', saleData)
      return response.data
    } catch (error) {
      console.error('Sale service error:', error)
      if (error.response) {
        const status = error.response.status
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to create sale'
        if (status === 404) {
          throw new Error(`Endpoint not found (404). Please ensure:\n1. The backend server is running\n2. The server has been restarted after adding the sales route\n3. The endpoint /api/sales/ is registered\n\nError: ${message}`)
        } else if (status === 401) {
          throw new Error('Authentication failed. Please login again.')
        }
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running on http://localhost:3000')
      } else {
        throw new Error(error.message || 'Failed to create sale')
      }
    }
  },

  // Get all sales
  async getAllSales(fromDate = null, toDate = null, middlemanId = null) {
    try {
      const params = {}
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (middlemanId) params.middleman_id = middlemanId

      const response = await apiClient.get('/sales/', { params })
      return response.data || []
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load sales'
        throw new Error(message)
      } else if (error.request) {
        // For network errors, check if it's a timeout that might be handled gracefully
        if (error.isNetworkError && error.originalError?.code === 'ECONNABORTED') {
          // Timeout - let calling code handle gracefully (may have fallback)
          throw error
        }
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load sales')
      }
    }
  },

  // Get sale by ID
  async getSaleById(id) {
    try {
      const response = await apiClient.get(`/sales/${id}`)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load sale'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load sale')
      }
    }
  },

  // Delete sale
  async deleteSale(id) {
    try {
      await apiClient.delete(`/sales/${id}`)
      return true
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to delete sale'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to delete sale')
      }
    }
  }
}
