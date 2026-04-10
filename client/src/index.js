import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress ResizeObserver loop error - this is a known browser issue
// that doesn't affect functionality
const errorHandler = (event) => {
  if (
    event.message === 'ResizeObserver loop completed with undelivered notifications.'
  ) {
    event.preventDefault();
    return true;
  }
};
window.addEventListener('error', errorHandler);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
