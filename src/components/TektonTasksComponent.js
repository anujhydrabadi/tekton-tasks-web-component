// Tekton Tasks Web Component - Refactored for Webpack bundling
import { apiService } from '../services/api.js';
import { CONFIG } from '../utils/constants.js';
import { formatDateTime, formatDuration } from '../utils/formatters.js';

class TektonTasksComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Component state
    this.state = {
      tasks: [],
      selectedTask: null,
      taskRuns: [],
      loading: false,
      error: null,
      showTriggerModal: false,
      showRunDetails: null,
      refreshInterval: null
    };
    
    // Bind methods
    this.loadTasks = this.loadTasks.bind(this);
    this.loadTaskRuns = this.loadTaskRuns.bind(this);
    this.triggerTask = this.triggerTask.bind(this);
    this.refreshData = this.refreshData.bind(this);
  }

  connectedCallback() {
    this.render();
    this.loadTasks();
    this.startAutoRefresh();
  }

  disconnectedCallback() {
    this.stopAutoRefresh();
  }

  startAutoRefresh() {
    this.state.refreshInterval = setInterval(() => {
      this.refreshData();
    }, CONFIG.REFRESH_INTERVAL);
  }

  stopAutoRefresh() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
      this.state.refreshInterval = null;
    }
  }

  async loadTasks() {
    this.setState({ loading: true, error: null });
    
    try {
      const tasks = await apiService.getTasks();
      this.setState({ tasks, loading: false });
    } catch (error) {
      console.error('Failed to load tasks:', error);
      this.setState({ error: error.message, loading: false });
    }
  }

  async loadTaskRuns(taskName) {
    if (!taskName) return;
    
    try {
      const taskRuns = await apiService.getTaskRuns(taskName);
      this.setState({ taskRuns, selectedTask: taskName });
    } catch (error) {
      console.error('Failed to load task runs:', error);
      this.setState({ error: error.message });
    }
  }

  async triggerTask(taskName, params) {
    try {
      this.setState({ loading: true });
      await apiService.triggerTask(taskName, params);
      
      // Refresh task runs to show the new run
      await this.loadTaskRuns(taskName);
      this.setState({ showTriggerModal: false, loading: false });
      
      this.showNotification('Task triggered successfully!', 'success');
    } catch (error) {
      console.error('Failed to trigger task:', error);
      this.setState({ error: error.message, loading: false });
      this.showNotification('Failed to trigger task: ' + error.message, 'error');
    }
  }

  async refreshData() {
    if (this.state.loading) return;
    
    // Refresh tasks
    await this.loadTasks();
    
    // Refresh task runs if a task is selected
    if (this.state.selectedTask) {
      await this.loadTaskRuns(this.state.selectedTask);
    }
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.render();
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 6px;
      color: white;
      font-weight: 500;
      z-index: 2000;
      background: ${type === 'success' ? CONFIG.STATUS_COLORS.SUCCEEDED : CONFIG.STATUS_COLORS.FAILED};
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }

  render() {
    // For webpack bundling, we'll inline the CSS instead of using a link
    const styles = this.getInlineStyles();
    
    this.shadowRoot.innerHTML = '';
    
    const styleElement = document.createElement('style');
    styleElement.textContent = styles;
    this.shadowRoot.appendChild(styleElement);
    
    const container = document.createElement('div');
    container.className = 'tekton-dashboard';
    
    container.innerHTML = `
      <div class="header">
        <h1 class="title">🔧 Tekton Tasks Dashboard</h1>
        <div class="controls">
          <button class="btn btn-secondary" id="refresh-btn">
            🔄 Refresh
          </button>
          <div class="status-info">
            Cluster: <strong>${CONFIG.CLUSTER_ID}</strong> | 
            Resource: <strong>${CONFIG.RESOURCE_TYPE}/${CONFIG.RESOURCE_NAME}</strong>
          </div>
        </div>
      </div>
      
      ${this.renderContent()}
    `;
    
    this.shadowRoot.appendChild(container);
    this.attachEventListeners();
  }

  renderContent() {
    if (this.state.loading && this.state.tasks.length === 0) {
      return this.renderLoading();
    }
    
    if (this.state.error) {
      return this.renderError();
    }
    
    return `
      <div class="main-content">
        ${this.renderTasksGrid()}
        ${this.state.selectedTask ? this.renderTaskRuns() : ''}
      </div>
      ${this.state.showTriggerModal ? this.renderTriggerModal() : ''}
      ${this.state.showRunDetails ? this.renderRunDetailsModal() : ''}
    `;
  }

  renderLoading() {
    return `
      <div class="loading">
        <div class="spinner"></div>
        Loading tasks...
      </div>
    `;
  }

  renderError() {
    return `
      <div class="error">
        <strong>Error:</strong> ${this.state.error}
        <button class="btn btn-secondary" onclick="this.loadTasks()" style="margin-left: 12px;">
          Retry
        </button>
      </div>
    `;
  }

  renderTasksGrid() {
    if (this.state.tasks.length === 0) {
      return `
        <div class="empty-state">
          <p>No Tekton tasks found for this resource.</p>
        </div>
      `;
    }

    return `
      <div class="tasks-grid">
        ${this.state.tasks.map(task => this.renderTaskCard(task)).join('')}
      </div>
    `;
  }

  renderTaskCard(task) {
    const lastRun = this.getLastRunForTask(task.name);
    const statusColor = lastRun ? CONFIG.STATUS_COLORS[lastRun.status] : CONFIG.STATUS_COLORS.PENDING;
    const statusIcon = lastRun ? CONFIG.STATUS_ICONS[lastRun.status] : '⚪';

    return `
      <div class="task-card" data-task-name="${task.name}">
        <div class="task-header">
          <div class="task-name">${task.name}</div>
          <div class="task-status" style="color: ${statusColor}">
            ${statusIcon} ${lastRun ? lastRun.status : 'No Runs'}
          </div>
        </div>
        
        <div class="task-description">
          ${task.description || 'No description provided'}
        </div>
        
        <div class="task-params">
          <span class="param-count">${task.params.length} parameter(s)</span>
        </div>
        
        <div class="task-actions">
          <button class="btn btn-primary trigger-task-btn" data-task-name="${task.name}">
            🚀 Trigger Task
          </button>
          <button class="btn btn-secondary view-runs-btn" data-task-name="${task.name}">
            📊 View Runs
          </button>
        </div>
      </div>
    `;
  }

  getLastRunForTask(taskName) {
    const runs = this.state.taskRuns.filter(run => run.taskName === taskName);
    if (runs.length === 0) return null;
    
    // Sort by start time, most recent first
    runs.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    return runs[0];
  }

  renderTriggerModal() {
    const task = this.state.tasks.find(t => t.name === this.state.selectedTask);
    if (!task) return '';

    return `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">🚀 Trigger Task: ${task.name}</h3>
            <button class="close-btn">&times;</button>
          </div>
          
          <form id="trigger-form">
            ${task.params.map(param => this.renderParameterInput(param)).join('')}
            
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary cancel-trigger-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">🚀 Trigger Task</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderParameterInput(param) {
    const defaultValue = param.defaultValue;
    let inputValue = '';
    let inputHtml = '';

    if (param.type === 'array') {
      inputValue = defaultValue && defaultValue.arrayVal ? defaultValue.arrayVal.join('\n') : '';
      inputHtml = `
        <textarea 
          class="form-input" 
          name="${param.name}" 
          rows="3" 
          placeholder="Enter one value per line"
        >${inputValue}</textarea>
        <div class="form-help">Enter array values, one per line</div>
      `;
    } else {
      inputValue = defaultValue && defaultValue.stringVal ? defaultValue.stringVal : '';
      inputHtml = `
        <input 
          type="text" 
          class="form-input" 
          name="${param.name}" 
          value="${inputValue}"
          placeholder="Enter ${param.type} value"
        />
      `;
    }

    return `
      <div class="form-group">
        <label class="form-label">${param.name}</label>
        ${inputHtml}
        ${param.description ? `<div class="form-help">${param.description}</div>` : ''}
      </div>
    `;
  }

  async handleTriggerSubmit(form) {
    const formData = new FormData(form);
    const params = {};
    
    const task = this.state.tasks.find(t => t.name === this.state.selectedTask);
    if (!task) return;

    // Build params object based on task parameter definitions
    for (const param of task.params) {
      const value = formData.get(param.name);
      
      if (param.type === 'array') {
        const arrayValues = value ? value.split('\n').map(v => v.trim()).filter(v => v) : [];
        params[param.name] = {
          type: 'array',
          arrayVal: arrayValues,
          stringVal: null
        };
      } else {
        params[param.name] = {
          type: 'string',
          stringVal: value || '',
          arrayVal: null
        };
      }
    }

    await this.triggerTask(this.state.selectedTask, params);
  }

  async viewStepLogs(runName, stepName) {
    try {
      const logData = await apiService.getStepLogs(runName, stepName);
      
      // Show logs in a new window with better formatting
      const logWindow = window.open('', '_blank', 'width=800,height=600');
      logWindow.document.write(`
        <html>
          <head><title>Step Logs: ${stepName}</title></head>
          <body style="font-family: monospace; padding: 20px; background: #1e293b; color: #e2e8f0;">
            <h2 style="color: #3b82f6;">Step: ${stepName}</h2>
            <h3 style="color: #64748b;">Task Run: ${runName}</h3>
            <hr style="margin: 16px 0; border-color: #475569;">
            <pre style="white-space: pre-wrap; line-height: 1.4;">${logData.logs || 'No logs available'}</pre>
          </body>
        </html>
      `);
      logWindow.document.close();
    } catch (error) {
      console.error('Failed to load step logs:', error);
      this.showNotification('Failed to load logs: ' + error.message, 'error');
    }
  }

  attachEventListeners() {
    const shadow = this.shadowRoot;
    
    // Refresh button
    const refreshBtn = shadow.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', this.loadTasks);
    }

    // Trigger task buttons
    shadow.querySelectorAll('.trigger-task-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskName = e.target.getAttribute('data-task-name');
        this.setState({ 
          selectedTask: taskName, 
          showTriggerModal: true 
        });
      });
    });

    // View runs buttons
    shadow.querySelectorAll('.view-runs-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskName = e.target.getAttribute('data-task-name');
        this.loadTaskRuns(taskName);
      });
    });

    // Modal close buttons
    shadow.querySelectorAll('.close-btn, .cancel-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setState({ showTriggerModal: false });
      });
    });

    // Trigger form submission
    const triggerForm = shadow.getElementById('trigger-form');
    if (triggerForm) {
      triggerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleTriggerSubmit(e.target);
      });
    }
  }

  // Method to get CSS as a string for inlining
  getInlineStyles() {
    return `
      :host {
        --primary-color: #3b82f6;
        --primary-dark: #2563eb;
        --primary-light: #60a5fa;
        --success-color: #10b981;
        --success-light: #34d399;
        --error-color: #ef4444;
        --error-light: #f87171;
        --warning-color: #f59e0b;
        --warning-light: #fbbf24;
        --secondary-color: #6b7280;
        --background-color: #f8fafc;
        --card-background: #ffffff;
        --card-hover: #fefefe;
        --border-color: #e5e7eb;
        --border-light: #f3f4f6;
        --text-primary: #1f2937;
        --text-secondary: #6b7280;
        --text-light: #9ca3af;
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        --border-radius: 12px;
        --border-radius-lg: 16px;
        --border-radius-sm: 8px;
        --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        --gradient-success: linear-gradient(135deg, #10b981 0%, #059669 100%);
        --gradient-error: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        --gradient-warning: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .tekton-dashboard {
        font-family: var(--font-family);
        background: var(--background-color);
        padding: 24px;
        min-height: 600px;
        color: var(--text-primary);
        line-height: 1.6;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 32px;
        padding: 24px;
        background: var(--gradient-primary);
        border-radius: var(--border-radius-lg);
        color: white;
        box-shadow: var(--shadow-lg);
      }

      .title {
        font-size: 28px;
        font-weight: 700;
        margin: 0;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .controls {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      .status-info {
        background: rgba(255, 255, 255, 0.15);
        padding: 8px 16px;
        border-radius: var(--border-radius-sm);
        font-size: 14px;
        font-weight: 500;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      /* Button Styles */
      .btn {
        padding: 12px 24px;
        border: none;
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: var(--transition);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: inherit;
      }

      .btn-primary {
        background: var(--gradient-primary);
        color: white;
        box-shadow: var(--shadow);
      }

      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
      }

      .btn-secondary {
        background: var(--card-background);
        color: var(--text-primary);
        border: 2px solid var(--border-color);
        box-shadow: var(--shadow-sm);
      }

      .btn-secondary:hover {
        background: var(--card-hover);
        border-color: var(--primary-color);
        transform: translateY(-1px);
        box-shadow: var(--shadow);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }

      /* Task Grid */
      .tasks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
        gap: 24px;
        margin-bottom: 40px;
      }

      .task-card {
        background: var(--card-background);
        border: 2px solid var(--border-light);
        border-radius: var(--border-radius);
        padding: 24px;
        box-shadow: var(--shadow);
        transition: var(--transition);
        position: relative;
        overflow: hidden;
      }

      .task-card:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-xl);
        border-color: var(--primary-light);
      }

      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .task-name {
        font-size: 18px;
        font-weight: 700;
        color: var(--text-primary);
        word-break: break-word;
        line-height: 1.3;
      }

      .task-status {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        padding: 6px 12px;
        border-radius: 20px;
        background: var(--background-color);
        border: 2px solid var(--border-color);
        white-space: nowrap;
      }

      .task-description {
        color: var(--text-secondary);
        font-size: 14px;
        margin-bottom: 20px;
        line-height: 1.5;
        min-height: 42px;
      }

      .task-params {
        margin-bottom: 20px;
      }

      .param-count {
        font-size: 11px;
        color: var(--text-light);
        background: var(--border-light);
        padding: 4px 8px;
        border-radius: 12px;
        font-weight: 500;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .task-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .task-actions .btn {
        flex: 1;
        min-width: 120px;
        justify-content: center;
      }

      /* Loading States */
      .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 60px;
        color: var(--text-secondary);
        background: var(--card-background);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
      }

      .spinner {
        border: 3px solid var(--border-color);
        border-top: 3px solid var(--primary-color);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        animation: spin 1s linear infinite;
        margin-right: 16px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .error {
        background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        border: 2px solid var(--error-light);
        color: var(--error-color);
        padding: 20px;
        border-radius: var(--border-radius);
        margin: 20px 0;
        box-shadow: var(--shadow);
      }

      /* Modal Styles */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        backdrop-filter: blur(8px);
        animation: fadeIn 0.2s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .modal {
        background: var(--card-background);
        border-radius: var(--border-radius-lg);
        box-shadow: var(--shadow-xl);
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
        border: 2px solid var(--border-light);
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from { opacity: 0; transform: translateY(-20px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 24px;
        border-bottom: 2px solid var(--border-light);
        background: var(--gradient-primary);
        color: white;
        border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
      }

      .modal-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
      }

      .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: white;
        padding: 8px;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: var(--transition);
      }

      .close-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      #trigger-form {
        padding: 24px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-label {
        display: block;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 8px;
      }

      .form-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        font-size: 14px;
        font-family: inherit;
        transition: var(--transition);
      }

      .form-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .form-help {
        font-size: 12px;
        color: var(--text-light);
        margin-top: 6px;
        font-style: italic;
      }

      .modal-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 32px;
        padding-top: 20px;
        border-top: 2px solid var(--border-light);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .tasks-grid {
          grid-template-columns: 1fr;
        }
        
        .tekton-dashboard {
          padding: 16px;
        }
        
        .header {
          flex-direction: column;
          gap: 16px;
          text-align: center;
        }

        .controls {
          flex-direction: column;
          width: 100%;
        }

        .modal {
          margin: 20px;
          max-width: calc(100vw - 40px);
        }
      }
    `;
  }
}

// Export the component
export default TektonTasksComponent;
