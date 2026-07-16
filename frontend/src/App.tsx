import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import CourierDashboard from './pages/CourierDashboard';
import CourierDeliveryDetail from './pages/CourierDeliveryDetail';
import DealerDashboard from './pages/DealerDashboard';
import DealerDeliveryDetail from './pages/DealerDeliveryDetail';
import Login from './pages/Login';
import NewDelivery from './pages/NewDelivery';
import Register from './pages/Register';
import TermsOfService from './pages/TermsOfService';

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="page"><p>Loading…</p></main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'dealer') {
    return <Navigate to="/dealer/dashboard" replace />;
  }

  if (user.role === 'courier') {
    return <Navigate to="/courier/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tos" element={<TermsOfService />} />
          <Route path="/demo" element={<DemoAccess />} />

          <Route element={<ProtectedRoute allowedRoles={['dealer']} />}>
            <Route path="/dealer/dashboard" element={<DealerDashboard />} />
            <Route path="/dealer/new-delivery" element={<NewDelivery />} />
            <Route path="/dealer/deliveries/:id" element={<DealerDeliveryDetail />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['courier']} />}>
            <Route path="/courier/dashboard" element={<CourierDashboard />} />
            <Route path="/courier/deliveries/:id" element={<CourierDeliveryDetail />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
