import React from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Initialize the React application
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

const root = createRoot(container);

// Render the application with error boundary and toast notifications
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            maxWidth: '350px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
          loading: {
            duration: Infinity,
          },
        }}
      />
    </ErrorBoundary>
  </React.StrictMode>
);

// Chrome extension specific initialization
if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Log extension startup
  console.log('Postify Chrome Extension initialized');

  // Handle extension lifecycle events
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('Popup received message:', message);

    // Handle messages from background script
    switch (message.action) {
      case 'CERTIFICATES_UPDATED':
        // Trigger a refresh of certificate data
        window.dispatchEvent(new CustomEvent('certificatesUpdated', {
          detail: message.data
        }));
        break;

      case 'AUTH_STATE_CHANGED':
        // Trigger auth state refresh
        window.dispatchEvent(new CustomEvent('authStateChanged', {
          detail: message.data
        }));
        break;

      case 'SCAN_COMPLETED':
        // Show scan completion notification
        window.dispatchEvent(new CustomEvent('scanCompleted', {
          detail: message.data
        }));
        break;

      default:
        console.log('Unknown message action:', message.action);
    }

    // Always send response to prevent "message port closed" errors
    sendResponse({ received: true });
    return true;
  });

  // Handle extension errors
  chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        console.error('Extension port disconnected:', chrome.runtime.lastError);
      }
    });
  });

  // Notify background script that popup is ready
  chrome.runtime.sendMessage({
    action: 'POPUP_READY',
    timestamp: Date.now()
  }).catch((error) => {
    console.log('Background script not ready yet:', error);
  });
}

// Global error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

// Development helpers
if (process.env.NODE_ENV === 'development') {
  // Add development tools
  interface PostifyDebug {
    version: string;
    environment: string;
    chrome: boolean;
    runtime: typeof chrome.runtime | null;
  }

  (window as typeof window & { __POSTIFY_DEBUG__: PostifyDebug }).__POSTIFY_DEBUG__ = {
    version: '1.0.0',
    environment: 'development',
    chrome: typeof chrome !== 'undefined',
    runtime: typeof chrome !== 'undefined' ? chrome.runtime : null
  };

  console.log('Postify Debug Info:', (window as typeof window & { __POSTIFY_DEBUG__: PostifyDebug }).__POSTIFY_DEBUG__);
}
