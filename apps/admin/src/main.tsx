import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App, erstelleQueryClient } from './App';
import './styles.css';
import { themaAnwenden } from './theme';

themaAnwenden();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App queryClient={erstelleQueryClient()} />
    </BrowserRouter>
  </StrictMode>,
);
