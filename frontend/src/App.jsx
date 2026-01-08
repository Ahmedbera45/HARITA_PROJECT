import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Sayfalarımızı import edelim
import Login from './pages/Login';

function App() {
  return (
    <Router>
      {/* Bildirim kutusu her yerde çalışsın diye en üste koyuyoruz */}
      <ToastContainer position="top-right" autoClose={3000} />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Şimdilik ana sayfaya da Login koyalım, sonra Dashboard yapacağız */}
        <Route path="/" element={<div style={{padding: 20}}><h1>Ana Sayfa</h1> <a href="/login">Giriş Yap</a></div>} />
      </Routes>
    </Router>
  );
}

export default App;