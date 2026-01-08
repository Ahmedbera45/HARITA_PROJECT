import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard'; // <-- Yeni Sayfa
import MainLayout from './layouts/MainLayout'; // <-- Yeni Layout

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halka Açık Sayfalar (Layoutsız) */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Korumalı ve Layoutlu Sayfalar */}
        {/* MainLayout içinde Outlet var, altındaki route'lar oraya yerleşir */}
        <Route element={<MainLayout />}>
           <Route path="/dashboard" element={<Dashboard />} />
           {/* İleride yapılacak sayfalar da buraya eklenecek */}
           {/* <Route path="/directory" element={<Directory />} /> */}
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;