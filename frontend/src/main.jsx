import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Material UI ve Tema Bağlantıları
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme'; // Az önce oluşturduğumuz dosya

// Bildirim Kütüphanesi (Toastify)
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      {/* CssBaseline: Tarayıcı varsayılanlarını sıfırlar ve arka plan rengini temadan (#f8fafc) alır */}
      <CssBaseline /> 
      
      <App />
      
      {/* Bildirim Kutusu Ayarları */}
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
        theme="colored"
      />
    </ThemeProvider>
  </React.StrictMode>,
)