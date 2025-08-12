// Entry point for webpack bundling
import './styles/main.css';
import TektonTasksComponent from './components/TektonTasksComponent.js';

// Export the component class for UMD
export default TektonTasksComponent;

// Also ensure it's registered as a custom element
if (typeof window !== 'undefined' && !customElements.get('tekton-tasks')) {
  customElements.define('tekton-tasks', TektonTasksComponent);
}
