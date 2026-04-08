import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MainLayout from './layouts/MainLayout';
import Directory from './pages/Directory';
import Tasks from './pages/Tasks';
import AllTasks from './pages/AllTasks';
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
import Approvals from './pages/Approvals';
import Map from './pages/Map';
import Settings from './pages/Settings';
import { useAuth, MANAGER_ROLES } from './hooks/useAuth';

// Token var ve süresi dolmamış mı kontrolü
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
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
          <Route path="/import" element={<Import />} />
          <Route path="/fee-calculation" element={<FeeCalculation />} />
          <Route path="/tevhid" element={<TevhidCalculation />} />
          <Route path="/imar-planlari" element={<ImarPlanlari />} />
          <Route path="/map" element={<Map />} />

          {/* Dinamik sayfalar */}
          <Route path="/pages/:id" element={<DynamicPageDetail />} />

          {/* Yönetici (Müdür, Şef, Admin) sayfaları */}
          <Route path="/approvals" element={
            <RoleRoute roles={['Admin', 'Müdür', 'Şef']}>
              <Approvals />
            </RoleRoute>
          } />
          <Route path="/all-tasks" element={
            <RoleRoute roles={['Admin', 'Müdür', 'Şef']}>
              <AllTasks />
            </RoleRoute>
          } />
          <Route path="/pages" element={
            <RoleRoute roles={['Admin', 'Müdür', 'Şef']}>
              <DynamicPages />
            </RoleRoute>
          } />
          <Route path="/pages/create" element={
            <RoleRoute roles={['Admin', 'Müdür', 'Şef']}>
              <DynamicPageCreate />
            </RoleRoute>
          } />
          <Route path="/users" element={
            <RoleRoute roles={['Admin', 'Müdür', 'Şef']}>
              <Users />
            </RoleRoute>
          } />

          {/* Sadece Admin */}
          <Route path="/permissions" element={
            <RoleRoute roles={['Admin']}>
              <PermissionGroups />
            </RoleRoute>
          } />
          <Route path="/settings" element={
            <RoleRoute roles={['Admin']}>
              <Settings />
            </RoleRoute>
          } />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
