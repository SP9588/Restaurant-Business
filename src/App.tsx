import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Toaster } from './components/ui/sonner';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import RestaurantDetail from './pages/RestaurantDetail';
import OwnerDashboard from './pages/OwnerDashboard';
import DriverDashboard from './pages/DriverDashboard';
import OrderTracking from './pages/OrderTracking';
import AdminDashboard from './pages/AdminDashboard';
import AdminAuth from './pages/AdminAuth';
import PartnerRegistration from './pages/PartnerRegistration';
import CashierDashboard from './pages/CashierDashboard';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, profile, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white font-mono uppercase tracking-[0.3em]">Calibrating Kitchen...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-white dark:bg-zinc-950 text-black dark:text-white font-sans transition-colors duration-300">
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute roles={['customer', 'owner', 'driver', 'admin', 'cashier']}>
                  <Layout><Home /></Layout>
                </ProtectedRoute>
              } />
              
              <Route path="/restaurant/:id" element={
                <ProtectedRoute>
                  <Layout><RestaurantDetail /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/admin-auth" element={<AdminAuth />} />
              <Route path="/register-partner" element={<PartnerRegistration />} />

              <Route path="/admin" element={
                <ProtectedRoute roles={['admin']}> 
                  <Layout><AdminDashboard /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/owner" element={
                <ProtectedRoute roles={['owner']}>
                  <Layout><OwnerDashboard /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/driver" element={
                <ProtectedRoute roles={['driver']}>
                  <Layout><DriverDashboard /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/cashier" element={
                <ProtectedRoute roles={['cashier']}>
                  <Layout><CashierDashboard /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/orders" element={
                <ProtectedRoute>
                  <Layout><OrderTracking /></Layout>
                </ProtectedRoute>
              } />

              <Route path="/checkout" element={
                <ProtectedRoute>
                  <Layout><OrderTracking /></Layout>
                </ProtectedRoute>
              } />
            </Routes>
            <Toaster position="top-center" expand={true} richColors />
          </div>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
