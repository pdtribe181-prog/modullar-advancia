import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StripeProvider } from './providers/StripeProvider';
import { AuthProvider } from './providers/AuthProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StripeProvider>
          <App />
        </StripeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
