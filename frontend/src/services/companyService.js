// Company service - connects to FastAPI backend
import apiClient from './api'

export const companyService = {
  // Get all companies
  async getAllCompanies() {
    try {
      const response = await apiClient.get('/companies/')
      return response.data || []
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load companies'
        throw new Error(message)
      } else if (error.request) {
        // For network errors, preserve the original error structure for graceful handling
        if (error.isNetworkError) {
          throw error // Preserve the network error with isNetworkError flag
        }
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load companies')
      }
    }
  },

  // Get company by ID
  async getCompanyById(id) {
    try {
      const response = await apiClient.get(`/companies/${id}`)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load company'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load company')
      }
    }
  },

  // Create company
  async createCompany(companyData) {
    try {
      const response = await apiClient.post('/companies/', companyData)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to create company'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to create company')
      }
    }
  },

  // Update company
  async updateCompany(id, companyData) {
    try {
      const response = await apiClient.put(`/companies/${id}`, companyData)
      return response.data
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to update company'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to update company')
      }
    }
  },

  // Delete company
  async deleteCompany(id) {
    try {
      await apiClient.delete(`/companies/${id}`)
      return true
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to delete company'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to delete company')
      }
    }
  },

  // Get companies by type
  async getCompaniesByType(type) {
    try {
      const response = await apiClient.get('/companies/')
      const allCompanies = response.data || []
      // Filter by type on client side (backend doesn't have type filter endpoint yet)
      return allCompanies.filter(company => company.type === type)
    } catch (error) {
      if (error.response) {
        const message = error.response.data?.detail || error.response.data?.message || 'Failed to load companies'
        throw new Error(message)
      } else if (error.request) {
        throw new Error('Unable to connect to server. Please check if the backend is running.')
      } else {
        throw new Error(error.message || 'Failed to load companies')
      }
    }
  }
}
