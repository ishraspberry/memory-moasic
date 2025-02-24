import React, { useState } from 'react';
import { CiMenuFries } from "react-icons/ci";
import { FaSignOutAlt } from "react-icons/fa";
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase-config';
import { motion, AnimatePresence } from 'framer-motion';
import ProfilePicture from './ProfilePicture';

const Navbar = () => {
  const { user , isGuest} = useAuth();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/guest');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Parent animation settings for staggering children
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2, // Delay of 0.2 seconds between items
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.2,
        staggerDirection: -1, // Reverse the staggering direction on exit
      },
    },
  };

  // Child animation settings
  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.5 } },
  };

  return (
    <nav className="absolute top-0 left-0 z-50">
      {/* Sliding Navigation Menu */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ width: '0%' }} // Start completely collapsed
            animate={{ width: '100%' }} // Animate to full width
            exit={{ width: '0%' }} // Animate back to collapsed on close
            transition={{ duration: 1, ease: 'easeInOut' }} // Slower animation
            className="fixed bg-[#FAF3E0]  shadow-lg h-16 top-0 left-0 flex items-center"
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex justify-between items-center w-full px-6"
            >
              <motion.button
                variants={itemVariants}
                onClick={() => setIsExpanded(false)}
                className="text-gray-600 hover:text-yellow-500 transition-colors"
              >
                <CiMenuFries size={24} />
              </motion.button>
              <div className="flex gap-4 items-center">
                {user ? (
                  <>
                    {user.Role === 'admin' && (
                      <motion.button
                        variants={itemVariants}
                        onClick={() => navigate('/admin')}
                        className="text-gray-600 hover:text-yellow-500 transition-colors"
                      >
                        Admin Dashboard
                      </motion.button>
                    )}
                    <motion.button
                      variants={itemVariants}
                      onClick={() => navigate('/dashboard')}
                      className="text-gray-600 hover:text-yellow-500 transition-colors"
                    >
                      My Scrapbooks
                    </motion.button>
                    <motion.button
                      variants={itemVariants}
                      onClick={() => navigate('/guest')}
                      className="text-gray-600 hover:text-yellow-500 transition-colors"
                    >
                      Library
                    </motion.button>
                    <Link
                      to="/profile"
                      className="text-gray-700 hover:text-yellow-500 transition-colors"
                    >
                      <ProfilePicture user={user} size="sm" />
                    </Link>
                    <motion.button
                      variants={itemVariants}
                      onClick={handleLogout}
                      className="text-gray-600 hover:text-yellow-500 relative group p-2"
                      title="Sign out"
                    >
                      <FaSignOutAlt size={20} />
                      <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                        Sign out
                      </span>
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      variants={itemVariants}
                      onClick={() => navigate('/login')}
                      className="text-gray-600  hover:text-yellow-500 transition-colors"
                    >
                      Login
                    </motion.button>
                    <motion.button
                      variants={itemVariants}
                      onClick={() => navigate('/register')}
                      className="bg-yellow-400 text-black px-4 py-2 rounded-md hover:bg-yellow-500 shadow-md transition-transform transform hover:scale-105"
                    >
                      Sign Up
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setIsExpanded(true)}
        className="p-4 text-gray-600 hover:text-yellow-500 transition-colors"
      >
        <CiMenuFries size={24} />
      </button>
    </nav>
  );
};

export default Navbar;
