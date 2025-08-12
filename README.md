# 🔧 Tekton Tasks Web Component

A comprehensive web component for viewing and triggering Tekton tasks integrated with Facets Control Plane.

## ✨ Features

- **📊 Task Dashboard**: View all available Tekton tasks with status indicators
- **🚀 Task Triggering**: Launch tasks with dynamic parameter forms
- **📈 Run History**: Track task execution history with detailed status
- **📋 Step Logs**: View logs for individual task steps
- **🔄 Real-time Updates**: Auto-refresh task status and runs
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🔐 Secure Integration**: Uses Facets session authentication

## 🚀 Quick Start

### Local Development

1. **Clone & Setup**:
   ```bash
   cd /Users/anujhydrabadi/work/repos/tekton-tasks-web-component
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   This will build the component and start a local server at `http://localhost:8080`

3. **View Component**: Open your browser to see the Tekton Tasks dashboard

### Integration with Facets

1. **Build for Production**:
   ```bash
   npm run build
   ```

2. **Host the Component**: Upload `public/tekton-tasks.js` to your hosting service

3. **Register in Facets**:
   - Navigate to Organizational Settings → Web Components
   - Click "Add Component"
   - Fill in the details:
     - **Name**: `tekton-tasks`
     - **Type**: `local` (sidebar component)
     - **Remote URL**: `https://your-host.com/tekton-tasks.js`
     - **Icon URL**: `https://your-host.com/tekton-icon.svg` (optional)
     - **Tooltip**: "Tekton Tasks Dashboard"

## 🏗️ Architecture

### Component Structure
```
src/
├── components/           # UI component modules (planned)
├── services/
│   └── api.js           # Control Plane API integration
├── utils/
│   ├── constants.js     # Configuration and constants
│   ├── formatters.js    # Data formatting utilities
│   └── auth.js          # Authentication helpers
├── styles/
│   └── main.css         # Component styles
└── tekton-tasks.js      # Main component entry point
```

### API Integration

The component integrates with 4 Control Plane APIs:

1. **GET Tasks** - Fetch available tasks for a resource
2. **GET Task Runs** - Get execution history for a task  
3. **POST Trigger Task** - Create and start a new task run
4. **GET Step Logs** - Retrieve logs for task steps

## ⚙️ Configuration

Edit `src/utils/constants.js` to customize:

```javascript
export const CONFIG = {
  CLUSTER_ID: 'cluster1',        // Target cluster
  RESOURCE_NAME: 'tekton',       // Resource name  
  RESOURCE_TYPE: 'service',      // Resource type
  REFRESH_INTERVAL: 10000,       // Auto-refresh interval (ms)
  // ... other settings
};
```

## 🎨 UI Components

### Task Cards
- **Status Indicators**: Visual status with colors and icons
- **Parameter Count**: Shows number of configurable parameters
- **Quick Actions**: Trigger task or view run history

### Task Trigger Modal
- **Dynamic Forms**: Auto-generated based on task parameters
- **Parameter Validation**: Support for string and array types
- **Default Values**: Pre-filled from task definitions

### Run History
- **Timeline View**: Chronological list of executions
- **Expandable Details**: Click to view run parameters and steps
- **Step Logs**: Direct access to individual step logs

## 🔧 Development

### Scripts
- `npm run dev` - Build and start development server
- `npm run build` - Build for production
- `npm run preview` - Preview built component

### Adding Features
1. Create new components in `src/components/`
2. Add utilities to `src/utils/`
3. Update styles in `src/styles/main.css`
4. Integrate in main component `src/tekton-tasks.js`

## 🌐 Deployment Options

### GitHub Pages (Recommended)
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Component available at: `https://username.github.io/repo-name/tekton-tasks.js`

### Alternative Hosting
- **Vercel**: Zero-config deployments
- **Netlify**: Advanced CDN features  
- **AWS S3 + CloudFront**: Enterprise hosting

## 🔐 Security

- **Authentication**: Inherits Facets session tokens
- **Input Validation**: Sanitizes all user inputs
- **Error Handling**: Secure error messages
- **CORS**: Proper cross-origin configuration

## 📊 Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with Web Components support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
- Check the browser console for error messages
- Verify API permissions and authentication
- Ensure Control Plane APIs are accessible
- Test with different browsers

---

**Built with ❤️ for Facets Control Plane integration**
