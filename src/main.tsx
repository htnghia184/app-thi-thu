
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Initialize dark mode before render
const stored = localStorage.getItem('vstep-dark-mode');
const isDark = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
if (isDark) {
  document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = 'dark';
} else {
  document.documentElement.style.colorScheme = 'light';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
