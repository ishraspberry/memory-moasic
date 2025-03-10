import { Outlet } from 'react-router-dom';
import Navbar from './components/shared/Navbar';

const Layout = () => {
  return (
    <div className="bg-lightBeige min-h-screen">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default Layout;