import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          theme="light"
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'oklch(1 0 0)',
              border: '1px solid oklch(0.92 0.006 285)',
              color: 'oklch(0.20 0.012 285)',
            },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
