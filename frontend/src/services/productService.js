// Product service - for batch-based lookup
import apiClient from './api'

export const productService = {
  // Get product by batch number (for auto-fill)
  async getProductByBatch(batchNo) {
    try {
      const response = await apiClient.get(`/products/batch/${encodeURIComponent(batchNo)}`)
      return response.data
    } catch (error) {
      if (error.response) {
        if (error.response.status === 404) {
          return null // Product not found - return null instead of throwing
        }
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load product'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load product')
      }
    }
  },

  // Get all products
  async getAllProducts() {
    try {
      const response = await apiClient.get('/products/')
      return response.data || []
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load products'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load products')
      }
    }
  },

  // Create product
  async createProduct(productData) {
    try {
      const response = await apiClient.post('/products/', productData)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to create product'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to create product')
      }
    }
  },

  // Update product
  async updateProduct(id, productData) {
    try {
      const response = await apiClient.put(`/products/${id}`, productData)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to update product'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to update product')
      }
    }
  },

  // Delete product
  async deleteProduct(id) {
    try {
      await apiClient.delete(`/products/${id}`)
      return true
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to delete product'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to delete product')
      }
    }
  }
}
