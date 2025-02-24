import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx'; 
import Layout from './Layout'; 
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ScrapbookView from './components/dashboard/ScrapbookView';
import AdminDashboard from './components/dashboard/AdminDashboard';
import GuestView from './components/guest/GuestView';
import PrivateRoute from './components/routes/PrivateRoute';
import CollaborativeCanvas from './components/scrapbook/CollaborativeCanvas.jsx';
import ProfilePage from './components/profile/ProfilePage';

function App() {
  return (
    <div className="bg-lightBeige min-h-screen">
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/guest" element={<GuestView />} />

          <Route path="/" element={<Navigate to="/guest" replace />} />


          {/* Protected Routes with Layout */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            {/* Nested Routes */}
            <Route path="guest" element={<GuestView />} />
            <Route path="dashboard" element={<ScrapbookView />} />
            <Route path="scrapbook/:scrapbookId/view" element={<CollaborativeCanvas mode="view" />} />
            <Route path="scrapbook/:scrapbookId/edit" element={<CollaborativeCanvas mode="edit" />} />
            <Route path="scrapbook/:id/collaborate" element={<CollaborativeCanvas userRole="collaborator" />} />
            <Route path="admin/*" element={<AdminDashboard />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/guest" />} />
        </Routes>
      </AuthProvider>
    </div>
  );
}

export default App;