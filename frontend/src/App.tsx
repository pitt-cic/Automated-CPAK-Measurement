import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import DashboardPage from './pages/DashboardPage';
import ForceChangePasswordPage from './pages/ForceChangePasswordPage';
import LoginPage from './pages/LoginPage';
import LogoutPage from './pages/LogoutPage';
import MeasurementPageV2 from './pages/MeasurementPageV2';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/logout" element={<LogoutPage />} />
        <Route path="/change-password" element={<ForceChangePasswordPage />} />
        <Route path="/measure" element={<MeasurementPageV2 />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
