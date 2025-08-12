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

  // Method to get CSS as a string for inlining
  getInlineStyles() {
    return `
      :host {
        --primary-color: #3b82f6;
        --success-color: #22c55e;
        --error-color: #ef4444;
        --warning-color: #f59e0b;
        --secondary-color: #6b7280;
        --background-color: #f8fafc;
        --card-background: #ffffff;
        --border-color: #e2e8f0;
        --text-primary: #1e293b;
        --text-secondary: #64748b;
        --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --border-radius: 8px;
        --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .tekton-dashboard {
        font-family: var(--font-family);
        background: var(--background-color);
        padding: 20px;
        min-height: 600px;
        color: var(--text-primary);
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid var(--border-color);
      }

      .title {
        font-size: 24px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .controls {
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: var(--border-radius);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .btn-primary {
        background: var(--primary-color);
        color: white;
      }

      .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
      }

      .btn-secondary {
        background: var(--card-background);
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .btn-secondary:hover {
        background: var(--background-color);
        border-color: var(--primary-color);
      }

      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
      }
    `;
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

  renderTaskRuns() {
    const task = this.state.tasks.find(t => t.name === this.state.selectedTask);
    if (!task) return '';

    return `
      <div class="task-runs">
        <div class="section-header">
          <h2>📊 Task Runs for: ${task.name}</h2>
          <button class="btn btn-secondary close-runs-btn">✕ Close</button>
        </div>
        
        ${this.state.taskRuns.length === 0 
          ? '<p>No task runs found.</p>' 
          : this.state.taskRuns.map(run => this.renderTaskRunItem(run)).join('')
        }
      </div>
    `;
  }

  renderTaskRunItem(run) {
    const statusColor = CONFIG.STATUS_COLORS[run.status];
    const statusIcon = CONFIG.STATUS_ICONS[run.status];
    const duration = formatDuration(run.startTime, run.completionTime);

    return `
      <div class="task-run-item" data-run-name="${run.name}">
        <div class="task-run-header">
          <div class="task-run-name">${run.name}</div>
          <div class="task-status" style="color: ${statusColor}">
            ${statusIcon} ${run.status}
          </div>
        </div>
        
        <div class="task-run-details">
          <div class="task-run-time">
            Started: ${formatDateTime(run.startTime)} | 
            Duration: ${duration}
            ${run.reason ? ` | Reason: ${run.reason}` : ''}
          </div>
          
          ${run.message ? `<div class="task-run-message">${run.message}</div>` : ''}
        </div>
        
        ${run.steps.length > 0 ? this.renderSteps(run) : ''}
      </div>
    `;
  }

  renderSteps(run) {
    return `
      <div class="task-run-steps">
        <strong>Steps:</strong>
        ${run.steps.map(step => `
          <div class="step-item">
            <span class="step-name">${step.name}</span>
            <span class="step-status">${step.status}</span>
            <button class="btn btn-secondary btn-sm view-logs-btn" 
                    data-run-name="${run.name}" 
                    data-step-name="${step.name}">
              📋 Logs
            </button>
          </div>
        `).join('')}
      </div>
    `;
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

    // Close runs button
    const closeRunsBtn = shadow.querySelector('.close-runs-btn');
    if (closeRunsBtn) {
      closeRunsBtn.addEventListener('click', () => {
        this.setState({ selectedTask: null, taskRuns: [] });
      });
    }
  }

  async viewStepLogs(runName, stepName) {
    try {
      const logData = await apiService.getStepLogs(runName, stepName);
      
      // Show logs in a simple alert for now
      alert(`Step: ${stepName}\nLogs:\n${logData.logs || 'No logs available'}`);
    } catch (error) {
      console.error('Failed to load step logs:', error);
      this.showNotification('Failed to load logs: ' + error.message, 'error');
    }
  }
}

// Export the component
export default TektonTasksComponent;
