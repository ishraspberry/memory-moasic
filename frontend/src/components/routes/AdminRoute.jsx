import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = () => {
  const { user, loading } = useAuth();

  console.log('AdminRoute - Current User:', user);
  console.log('AdminRoute - User Role:', user?.Role);

  if (loading) {
    console.log('AdminRoute - Loading...');
    return <div>Loading...</div>;
  }

  if (!user || user.Role !== 'admin') {
    console.log('AdminRoute - Access Denied');
    return <Navigate to="/guest" replace />;
  }

  console.log('AdminRoute - Access Granted');
  return <Outlet />;
};

export default AdminRoute; 