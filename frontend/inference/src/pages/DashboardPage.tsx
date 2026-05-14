import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/logout');
  };

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-primary-600"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">CPAK Measurement Tool</h2>
            <button
              type="button"
              onClick={() => navigate('/measure')}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              Start Measurement
            </button>
          </div>
          <p className="text-gray-600">Upload a leg radiograph to detect anatomical landmarks for CPAK analysis.</p>
        </Card>

      </main>
    </div>
  );
}
