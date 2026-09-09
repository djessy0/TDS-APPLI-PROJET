import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("[INIT] Application starting...");

window.onerror = (message, source, lineno, colno, error) => {
  console.error("[GLOBAL ERROR]", { message, source, lineno, colno, error });
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
