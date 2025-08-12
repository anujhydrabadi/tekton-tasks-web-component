// API service for Control Plane integration
import { ENDPOINTS } from '../utils/constants.js';
import { getAuthHeaders } from '../utils/auth.js';

class ApiService {
  constructor() {
    this.baseUrl = window.location.origin;
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      ...getAuthHeaders(),
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(`API Error (${response.status}): ${errorData.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Public API methods
  async getTasks() {
    return this.makeRequest(ENDPOINTS.getTasks());
  }

  async getTaskRuns(taskName) {
    return this.makeRequest(ENDPOINTS.getTaskRuns(taskName));
  }

  async triggerTask(taskName, params = {}) {
    return this.makeRequest(ENDPOINTS.triggerTask(taskName), {
      method: 'POST',
      body: JSON.stringify({ params })
    });
  }

  async getStepLogs(taskRunName, stepName) {
    return this.makeRequest(ENDPOINTS.getStepLogs(taskRunName, stepName));
  }
}

// Export singleton instance
export const apiService = new ApiService();
