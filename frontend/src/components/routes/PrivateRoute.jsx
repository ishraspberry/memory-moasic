import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';

const PrivateRoute = ({ children, allowedRoles = ['user', 'admin'] }) => {
  const { user , isAdmin, loading } = useAuth();

  const location = useLocation();


  if (loading) return <div>Loading...</div>;

  console.log('PrivateRoute - Current User:', user);

  if (allowedRoles.includes('admin') && isAdmin) {
    console.log('easy mode');
    return children;
  }
  if (allowedRoles.includes('user')) {
    console.log('hard mode');
    return children;
  }
  if (!user) {
    console.log('User is not authenticated. Redirecting to login.');
    return <Navigate to="/login" />;
  }
  if (!user || isGuest) {
    // Redirect guests and unauthenticated users to the guest view or login
    return <Navigate to={isGuest ? '/guest' : '/login'} state={{ from: location }} />;
  }

  if (!allowedRoles.includes(user.Role)) {
    console.log(`User does not have required role. Redirecting to dashboard. Role: ${user.Role}`);
    return <Navigate to="/dashboard" />;
  }
  return <Navigate to="/dashboard" />;

  return children;
};

export default PrivateRoute;
