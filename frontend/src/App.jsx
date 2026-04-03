import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';
import Directory from './pages/Directory';
import Tasks from './pages/Tasks';
import ComingSoon from './pages/ComingSoon';
import Leaves from './pages/Leaves';
import Import from './pages/Import';
import FeeCalculation from './pages/FeeCalculation';
import Users from './pages/Users';
import TevhidCalculation from './pages/TevhidCalculation';
import DynamicPages from './pages/DynamicPages';
import DynamicPageDetail from './pages/DynamicPageDetail';
import DynamicPageCreate from './pages/DynamicPageCreate';
import PermissionGroups from './pages/PermissionGroups';
import ImarPlanlari from './pages/ImarPlanlari';
import { useAuth } from './hooks/useAuth';

// Token var mı kontrolü
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

// Rol bazlı rota koruması: yetkisizse /dashboard'a yönlendir
function RoleRoute({ children, roles }) {
  const { role } = useAuth();
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Halka Açık Sayfalar */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Korumalı ve Layoutlu Sayfalar */}
        <Route element={<PrivateRoute><MainLayout /></PrivateRoute>}>
          {/* Tüm roller */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/map" element={<ComingSoon title="Harita / CBS" />} />

          {/* Tüm roller — veri yükleme ve harç hesaplama */}
          <Route path="/import" element={<Import />} />
          <Route path="/fee-calculation" element={<FeeCalculation />} />
          <Route path="/tevhid" element={<TevhidCalculation />} />

          {/* /pages/:id — herkes kendi sayfasını görür (menüden tıklayarak gelir) */}
          <Route path="/pages/:id" element={<DynamicPageDetail />} />

          {/* /pages ve /pages/create — sadece yönetici */}
          <Route path="/pages" element={
            <RoleRoute roles={['Admin', 'Manager']}>
              <DynamicPages />
            </RoleRoute>
          } />
          <Route path="/pages/create" element={
            <RoleRoute roles={['Admin', 'Manager']}>
              <DynamicPageCreate />
            </RoleRoute>
          } />

          {/* Sadece Admin + Manager */}
          <Route path="/users" element={
            <RoleRoute roles={['Admin', 'Manager']}>
              <Users />
            </RoleRoute>
          } />

          {/* İmar Planları — tüm roller (canView kontrolü MainLayout'ta) */}
          <Route path="/imar-planlari" element={<ImarPlanlari />} />

          {/* Sadece Admin */}
          <Route path="/permissions" element={
            <RoleRoute roles={['Admin']}>
              <PermissionGroups />
            </RoleRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
