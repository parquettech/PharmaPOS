// Stock service - connects to FastAPI backend
import apiClient from './api'

export const stockService = {
  // Get all stock items
  async getAllStock() {
    try {
      const response = await apiClient.get('/stock/')
      return response.data || []
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load stock items'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load stock items')
      }
    }
  },

  // Get stock item by ID
  async getStockById(id) {
    try {
      const response = await apiClient.get(`/stock/${id}`)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load stock item'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load stock item')
      }
    }
  },

  // Create stock item
  async createStock(stockData) {
    try {
      const response = await apiClient.post('/stock/', stockData)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to create stock item'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to create stock item')
      }
    }
  },

  // Update stock item
  async updateStock(id, stockData) {
    try {
      const response = await apiClient.put(`/stock/${id}`, stockData)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to update stock item'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to update stock item')
      }
    }
  },

  // Delete stock item
  async deleteStock(id) {
    try {
      await apiClient.delete(`/stock/${id}`)
      return true
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to delete stock item'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to delete stock item')
      }
    }
  },

  // Get stock item by batch number
  async getStockByBatch(batchNo) {
    try {
      // Trim and encode the batch number
      const trimmedBatch = batchNo.trim()
      if (!trimmedBatch) {
        throw new Error('Batch number cannot be empty')
      }
      const response = await apiClient.get(`/stock/batch/${encodeURIComponent(trimmedBatch)}`)
      return response.data
    } catch (error) {
      console.error('getStockByBatch error:', error)
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Stock item not found'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load stock item')
      }
    }
  },

  // Get available stock (for StockList - shows current available quantities)
  // Always fetches fresh data from database - no caching
  async getAvailableStock() {
    try {
      // Add timestamp to prevent any browser caching (though axios doesn't cache by default)
      const timestamp = Date.now()
      const response = await apiClient.get(`/stock/available?t=${timestamp}`)
      return response.data || []
    } catch (error) {
      let errorMessage = 'Failed to load available stock'
      
      if (error.response) {
        // Extract error message from response, ensuring it's a string
        const detail = error.response.data?.detail
        const message = error.response.data?.message
        
        if (typeof detail === 'string') {
          errorMessage = detail
        } else if (typeof message === 'string') {
          errorMessage = message
        } else if (detail) {
          // If detail is an object, try to stringify it
          errorMessage = typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
        } else if (message) {
          errorMessage = typeof message === 'object' ? JSON.stringify(message) : String(message)
        } else {
          errorMessage = `API Error: ${error.response.status} ${error.response.statusText || 'Unknown error'}`
        }
      } else if (error.request) {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.'
      } else if (error.message) {
        errorMessage = String(error.message)
      }
      
      console.error('getAvailableStock error:', error)
      console.error('Error message:', errorMessage)
      throw new Error(errorMessage)
    }
  }
}
