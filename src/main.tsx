import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { applyPage, pageKeyFor } from './layout/head';

// Before the first render, so a deep link to /contact-us/ is not first painted with the home
// page's stylesheets that index.html carries.
applyPage(pageKeyFor(window.location.pathname), window.location.pathname);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
