// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

try {
  const saved = localStorage.getItem('f1db_theme');
  const theme = saved === 'light' ? 'light' : 'dark';
  document.documentElement.classList.remove('theme-dark', 'theme-light');
  document.documentElement.classList.add(`theme-${theme}`);
} catch (e) {
  // ignore
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
