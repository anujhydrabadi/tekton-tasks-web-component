// Constants for the Tekton Tasks Web Component
export const CONFIG = {
  // Hardcoded values for testing
  CLUSTER_ID: 'cluster1',
  RESOURCE_NAME: 'tekton',
  RESOURCE_TYPE: 'service',
  
  // API endpoints
  API_BASE: '/cc-ui/v1',
  
  // Refresh intervals
  REFRESH_INTERVAL: 10000, // 10 seconds
  LOG_REFRESH_INTERVAL: 5000, // 5 seconds for live logs
  
  // UI constants
  MAX_LOG_LINES: 1000,
  TASK_CARD_HEIGHT: '200px',
  
  // Status colors
  STATUS_COLORS: {
    SUCCEEDED: '#22c55e',
    FAILED: '#ef4444',
    RUNNING: '#3b82f6',
    PENDING: '#f59e0b',
    STARTED: '#3b82f6',
    CANCELLED: '#6b7280',
    CANCELLING: '#f59e0b',
    NON_PERMANENT_ERROR: '#f97316'
  },
  
  // Status icons
  STATUS_ICONS: {
    SUCCEEDED: '✅',
    FAILED: '❌',
    RUNNING: '🔄',
    PENDING: '⏳',
    STARTED: '🚀',
    CANCELLED: '🚫',
    CANCELLING: '⏹️',
    NON_PERMANENT_ERROR: '⚠️'
  }
};

// API endpoint builders
export const ENDPOINTS = {
  getTasks: () => 
    `${CONFIG.API_BASE}/clusters/${CONFIG.CLUSTER_ID}/resources/${CONFIG.RESOURCE_TYPE}/${CONFIG.RESOURCE_NAME}/tasks`,
  
  getTaskRuns: (taskName) => 
    `${CONFIG.API_BASE}/clusters/${CONFIG.CLUSTER_ID}/resources/${CONFIG.RESOURCE_TYPE}/${CONFIG.RESOURCE_NAME}/tasks/${taskName}/runs`,
  
  triggerTask: (taskName) => 
    `${CONFIG.API_BASE}/clusters/${CONFIG.CLUSTER_ID}/resources/${CONFIG.RESOURCE_TYPE}/${CONFIG.RESOURCE_NAME}/tasks/${taskName}/trigger`,
  
  getStepLogs: (taskRunName, stepName) => 
    `${CONFIG.API_BASE}/clusters/${CONFIG.CLUSTER_ID}/taskruns/${taskRunName}/steps/${stepName}/logs`
};
