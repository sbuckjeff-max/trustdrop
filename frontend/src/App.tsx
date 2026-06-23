import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DealerDashboard from './pages/DealerDashboard';
import CourierDashboard from './pages/CourierDashboard';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute allowedRoles={['dealer']} />}>
            <Route path="/dealer/dashboard" element={<DealerDashboard />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['courier']} />}>
            <Route path="/courier/dashboard" element={<CourierDashboard />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
