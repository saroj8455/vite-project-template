import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import './index.css';
import router from './routes/router';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider  future={{
    v7_startTransition: true,
  }}
   router={router} />
  </StrictMode>,
);
