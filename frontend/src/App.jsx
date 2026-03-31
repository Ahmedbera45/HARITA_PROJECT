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

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
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
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/leaves" element={<Leaves />} />
          <Route path="/import" element={<Import />} />
          <Route path="/fee-calculation" element={<FeeCalculation />} />
          <Route path="/map" element={<ComingSoon title="Harita / CBS" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
