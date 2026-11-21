import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function mountApp() {
  let rootEl = document.getElementById('root');
  if (!rootEl && document.body) {
    rootEl = document.createElement('div');
    rootEl.id = 'root';
    document.body.appendChild(rootEl);
  }
  if (rootEl) {
    createRoot(rootEl).render(<App />);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
