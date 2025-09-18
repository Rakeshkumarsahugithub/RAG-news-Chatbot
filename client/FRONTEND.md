# RAG Chatbot Frontend

A modern React-based frontend for the RAG (Retrieval-Augmented Generation) chatbot application that provides an intuitive interface for news-based conversations.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

### Installation
```bash
cd client
npm install
```

### Development
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

### Build for Production
```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── ChatHeader.jsx        # Chat interface header
│   │   ├── LoadingIndicator.jsx  # Loading animations
│   │   ├── MessageInput.jsx      # Message input component
│   │   ├── MessageList.jsx       # Chat messages display
│   │   ├── SearchBar.jsx         # Search functionality
│   │   ├── SearchIntegration.jsx # Search integration logic
│   │   ├── SearchResults.jsx     # Search results display
│   │   └── SourcesPanel.jsx      # Sources and references panel
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services and utilities
│   ├── assets/           # Images, icons, and static files
│   ├── App.jsx           # Main application component
│   ├── App.scss          # Global styles
│   ├── main.jsx          # Application entry point
│   └── index.css         # Base CSS styles
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
└── eslint.config.js      # ESLint configuration
```

## 🧩 Core Components

### App.jsx
The main application component that orchestrates the entire chat interface:
- Manages global state for messages, search results, and UI state
- Handles WebSocket connections for real-time communication
- Coordinates between chat and search functionalities
- Implements responsive design patterns

**Key Features:**
- Real-time chat messaging
- Integrated search functionality
- Source citation display
- Responsive mobile-first design
- Error handling and loading states

### ChatHeader.jsx
Header component for the chat interface:
- Displays application title and branding
- Shows connection status
- Provides navigation controls
- Responsive design for mobile devices

### MessageInput.jsx
Advanced message input component with:
- Multi-line text input with auto-resize
- Send button with keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Character count and input validation
- Loading state management
- Accessibility features (ARIA labels, keyboard navigation)

### MessageList.jsx
Displays chat messages with:
- Message bubbles for user and bot messages
- Timestamp display
- Source citations and references
- Markdown rendering support
- Auto-scroll to latest messages
- Message status indicators

### SearchIntegration.jsx
Handles search functionality:
- Real-time search suggestions
- Search result filtering and sorting
- Integration with RAG backend
- Search history management
- Advanced search options

### SearchResults.jsx
Displays search results with:
- Relevance scoring
- Source metadata (title, date, URL)
- Snippet previews
- Click-to-insert functionality
- Pagination for large result sets

### SourcesPanel.jsx
Shows source citations and references:
- Expandable source details
- Direct links to original articles
- Source credibility indicators
- Related articles suggestions
- Export functionality for citations

### LoadingIndicator.jsx
Provides various loading states:
- Typing indicators for bot responses
- Search loading animations
- Connection status indicators
- Skeleton loaders for content

## 🎨 Styling Architecture

### SCSS Structure
The application uses SCSS for styling with a modular approach:

- **App.scss**: Global styles, CSS variables, and layout
- **Component-specific SCSS**: Each component has its own stylesheet
- **Responsive Design**: Mobile-first approach with breakpoints
- **CSS Variables**: Consistent theming and easy customization

### Design System
- **Colors**: Modern color palette with dark/light theme support
- **Typography**: Readable font hierarchy with proper contrast
- **Spacing**: Consistent spacing scale using CSS custom properties
- **Components**: Reusable UI components with consistent styling

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the client directory:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Vite Configuration
The `vite.config.js` file includes:
- React plugin configuration
- Development server settings
- Build optimization
- Asset handling

## 🌐 API Integration

### WebSocket Connection
Real-time communication with the backend:
```javascript
import io from 'socket.io-client';

const socket = io(process.env.VITE_WS_URL || 'http://localhost:3001');
```

### HTTP Requests
API calls using Axios:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3001',
  timeout: 10000,
});
```

## 📱 Features

### Core Functionality
- **Real-time Chat**: WebSocket-based messaging with the RAG backend
- **Search Integration**: Semantic search through news articles
- **Source Citations**: Automatic source attribution for responses
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Error Handling**: Graceful error handling with user feedback

### Advanced Features
- **Message History**: Persistent chat history with session management
- **Search Filters**: Advanced filtering options for search results
- **Export Options**: Export conversations and citations
- **Accessibility**: WCAG 2.1 compliant interface
- **Performance**: Optimized rendering with React best practices

## 🔍 Search Functionality

### Search Types
1. **Semantic Search**: Natural language queries
2. **Keyword Search**: Traditional keyword-based search
3. **Date Range**: Filter by publication date
4. **Source Filter**: Filter by news source

### Search Integration
- Real-time search suggestions
- Search result ranking by relevance
- Integration with chat context
- Search history and saved searches

## 🎯 Performance Optimization

### React Optimization
- Component memoization with `React.memo`
- Callback optimization with `useCallback`
- State management optimization
- Lazy loading for large components

### Bundle Optimization
- Code splitting with dynamic imports
- Tree shaking for unused code elimination
- Asset optimization and compression
- Service worker for caching (production)

## 🧪 Development Guidelines

### Code Style
- ESLint configuration for consistent code style
- Prettier for code formatting
- Component naming conventions
- File organization standards

### Best Practices
- Functional components with hooks
- Custom hooks for reusable logic
- Proper error boundaries
- Accessibility considerations
- Performance monitoring

## 🚀 Deployment

### Build Process
```bash
npm run build
```

### Deployment Options
1. **Static Hosting**: Netlify, Vercel, GitHub Pages
2. **CDN**: CloudFront, CloudFlare
3. **Docker**: Containerized deployment
4. **Traditional Hosting**: Apache, Nginx

### Environment Configuration
- Production environment variables
- API endpoint configuration
- Performance monitoring setup
- Error tracking integration

## 🔧 Troubleshooting

### Common Issues
1. **WebSocket Connection Errors**: Check backend server status
2. **API Timeout**: Verify backend API endpoints
3. **Build Errors**: Check Node.js version compatibility
4. **Styling Issues**: Verify SCSS compilation

### Debug Mode
Enable debug mode by setting:
```env
VITE_DEBUG=true
```

## 📚 Dependencies

### Core Dependencies
- **React 19.1.1**: UI framework
- **React DOM 19.1.1**: DOM rendering
- **Axios 1.12.2**: HTTP client
- **Socket.io-client 4.8.1**: WebSocket client
- **React Icons 5.5.0**: Icon library
- **SASS 1.92.1**: CSS preprocessor

### Development Dependencies
- **Vite 7.1.2**: Build tool and dev server
- **ESLint 9.33.0**: Code linting
- **@vitejs/plugin-react 5.0.0**: React plugin for Vite

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make changes with proper testing
4. Submit a pull request

### Code Standards
- Follow ESLint rules
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
