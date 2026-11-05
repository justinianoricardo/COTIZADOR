import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/Cotizador_3D_Pro';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
