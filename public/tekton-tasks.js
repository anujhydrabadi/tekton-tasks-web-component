// Tekton Tasks Web Component - Main Entry Point
import { apiService } from './services/api.js';
import { CONFIG } from './utils/constants.js';
import { formatDateTime, formatDuration } from './utils/formatters.js';

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
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = './main.css';
    
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(cssLink);
    
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
            
            <div class="modal-actions" style="margin-top: 20px; display: flex; gap: 12px; justify-content: flex-end;">
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

  renderRunDetailsModal() {
    const run = this.state.showRunDetails;
    if (!run) return '';

    return `
      <div class="modal-overlay">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">📊 Task Run Details: ${run.name}</h3>
            <button class="close-btn close-details-btn">&times;</button>
          </div>
          
          <div class="run-details-content">
            <div class="detail-section">
              <h4>Status Information</h4>
              <p><strong>Status:</strong> <span style="color: ${CONFIG.STATUS_COLORS[run.status]}">${CONFIG.STATUS_ICONS[run.status]} ${run.status}</span></p>
              <p><strong>Started:</strong> ${formatDateTime(run.startTime)}</p>
              <p><strong>Duration:</strong> ${formatDuration(run.startTime, run.completionTime)}</p>
              ${run.reason ? `<p><strong>Reason:</strong> ${run.reason}</p>` : ''}
              ${run.message ? `<p><strong>Message:</strong> ${run.message}</p>` : ''}
            </div>
            
            ${Object.keys(run.params).length > 0 ? this.renderRunParameters(run.params) : ''}
            ${run.steps.length > 0 ? this.renderRunSteps(run) : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderRunParameters(params) {
    return `
      <div class="detail-section">
        <h4>Parameters</h4>
        ${Object.entries(params).map(([name, value]) => `
          <div class="param-item">
            <strong>${name}:</strong> 
            ${value.type === 'array' 
              ? (value.arrayVal || []).join(', ') 
              : (value.stringVal || 'N/A')
            }
          </div>
        `).join('')}
      </div>
    `;
  }

  renderRunSteps(run) {
    return `
      <div class="detail-section">
        <h4>Steps</h4>
        ${run.steps.map(step => `
          <div class="step-detail-item">
            <div class="step-header">
              <span class="step-name">${step.name}</span>
              <span class="step-status">${step.status}</span>
              <button class="btn btn-secondary btn-sm view-logs-btn" 
                      data-run-name="${run.name}" 
                      data-step-name="${step.name}">
                📋 View Logs
              </button>
            </div>
            <div class="step-details">
              <small>
                Started: ${formatDateTime(step.startTime)} | 
                Duration: ${formatDuration(step.startTime, step.finishedAt)} |
                Exit Code: ${step.exitCode || 'N/A'}
              </small>
            </div>
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

    // Modal close buttons
    shadow.querySelectorAll('.close-btn, .cancel-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setState({ showTriggerModal: false });
      });
    });

    // Task run item clicks
    shadow.querySelectorAll('.task-run-item').forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking on a button
        if (e.target.tagName === 'BUTTON') return;
        
        const runName = item.getAttribute('data-run-name');
        const run = this.state.taskRuns.find(r => r.name === runName);
        if (run) {
          this.setState({ showRunDetails: run });
        }
      });
    });

    // Close run details modal
    const closeDetailsBtn = shadow.querySelector('.close-details-btn');
    if (closeDetailsBtn) {
      closeDetailsBtn.addEventListener('click', () => {
        this.setState({ showRunDetails: null });
      });
    }

    // View logs buttons
    shadow.querySelectorAll('.view-logs-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const runName = btn.getAttribute('data-run-name');
        const stepName = btn.getAttribute('data-step-name');
        this.viewStepLogs(runName, stepName);
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
      
      // Show logs in a simple alert for now (could be enhanced with a proper modal)
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

  stopAutoRefresh() {
    if (this.state.refreshInterval) {
      clearInterval(this.state.refreshInterval);
      this.state.refreshInterval = null;
    }
  }
}

// Register the custom element
customElements.define('tekton-tasks', TektonTasksComponent);

// Export for potential module usage
export default TektonTasksComponent;
