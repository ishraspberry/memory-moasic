import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
// import { db } from '../../config/firebase-config';
// import { collection, query, getDocs, deleteDoc, updateDoc, orderBy, where, limit, doc, getDoc } from 'firebase/firestore';
import { FaTimes, FaFlag } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import ScrapbookCard from '../shared/ScrapbookCard';
import axios from 'axios';


const AdminSidebar = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;
  if (user.Role !== 'admin') return <Navigate to="/" replace />;

  const menuItems = [
    { path: '/admin', label: 'Public View' },
    { path: '/admin/reported-users', label: 'Reported Users' },
    { path: '/admin/all-users', label: 'All Users' },
    { path: '/admin/reported-pages', label: 'Reported Pages' },
  ];

  return (
    <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6">Admin Dashboard</h2>
      <nav>
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`block py-2 px-4 rounded mb-2 ${
              location.pathname === item.path
                ? 'bg-yellow-400 text-black'
                : 'hover:bg-gray-700'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

const AllScrapbooks = () => {
  const [scrapbooks, setScrapbooks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [ownerID, setOwnerID] = useState(null);

  const scrapbooksPerPage = 9; // Items per page
  const navigate = useNavigate();

  // Fetch all scrapbooks on component mount
  useEffect(() => {
    const loadAllScrapbooks = async () => {
      try {
        setLoading(true);
    
        // Call the Express API to fetch scrapbooks
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/scrapbooks`);
    
        if (response.status === 200) {
          // Update state with the fetched data
          setScrapbooks(response.data.scrapbooks);
        } else {
          console.error('Unexpected response:', response);
        }
    
        setLoading(false);
      } catch (error) {
        console.error('Error loading scrapbooks:', error);
        setLoading(false);
      }
    };

    loadAllScrapbooks();
  }, []);

  // Calculate pagination
  const totalPages = Math.ceil(scrapbooks.length / scrapbooksPerPage);
  const startIndex = (currentPage - 1) * scrapbooksPerPage;
  const paginatedScrapbooks = scrapbooks.slice(startIndex, startIndex + scrapbooksPerPage);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return; // Prevent invalid page numbers
    setCurrentPage(newPage);
  };

  const openCollaboratorsModal = async (collaborators, ownerId) => {
    try {
      setSelectedCollaborators(collaborators);
      if (ownerId) {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users/${ownerId}`);
        setOwnerName(response.status === 200 ? response.data.ownerName : 'Unknown Owner');
        setOwnerID(ownerId);
      } else {
        setOwnerName('Unknown Owner');
        setOwnerID('unknownID');
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
      setOwnerName('Unknown Owner');
    }
  };

  const handleNavigate = (scrapbookId, role) => {
    if (role === 'editor') navigate(`/scrapbook/${scrapbookId}/edit`);
    else if (role === 'collaborator') navigate(`/scrapbook/${scrapbookId}/collaborate`);
    else navigate(`/scrapbook/${scrapbookId}/view`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  const CollaboratorsModal = ({ownerName, ownerID, collaborators, onClose}) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
        <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800"
          >
            <FaTimes />
          </button>
          <h2 className="text-2xl font-bold mb-4">Collaborators</h2>
  
          {/* Owner Section */}
          {ownerName && (
            <div className="mb-4 border-b pb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{ownerName}</p>
                  <p className="text-sm text-gray-500">Owner</p>
                </div>
                <button
                  onClick={() => report(ownerID, 'Users')}
                  className="text-red-500 hover:text-red-700"
                  title="Report this owner"
                >
                  <FaFlag />
                </button>
              </div>
            </div>
          )}
  
          {/* Collaborators Section */}
          {!collaborators || collaborators.length === 0 ? (
            <p className="text-gray-500">No collaborators found.</p>
          ) : (
            <ul className="space-y-3">
              {collaborators.map((collaborator, index) => (
                <li 
                  key={collaborator.id || index} 
                  className="flex justify-between items-center border-b pb-2 last:border-b-0"
                >
                  <div>
                    <p className="font-medium">
                      {collaborator.email || collaborator.Name || 'Unnamed Collaborator'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {collaborator.Role || 'Collaborator'}
                    </p>
                  </div>
                  <button
                    onClick={() => report(collaborator.id,'Users')}
                    className="text-red-500 hover:text-red-700"
                    title="Report this collaborator"
                  >
                    <FaFlag />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedScrapbooks.map((scrapbook) => (
          <div key={scrapbook.id} className="flex flex-col">
            <ScrapbookCard
              key={scrapbook.id}
              scrapbook={scrapbook}
              isOwner={false}
              visibility="public"
              onNavigate={handleNavigate}
            />
            {scrapbook.collaborators && (
              <button
                onClick={() => openCollaboratorsModal(scrapbook.collaborators, scrapbook.ownerId)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800 text-left px-4"
              >
                All Collaborators
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="w-full flex justify-center mt-8 bottom-10 pb-10">
          <nav className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === i + 1
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {!loading && scrapbooks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">No scrapbooks available yet.</p>
        </div>
      )}

      {selectedCollaborators && (
        <CollaboratorsModal
          collaborators={selectedCollaborators}
          ownerName={ownerName}
          ownerID={ownerID}
          onClose={() => setSelectedCollaborators(null)}
        />
      )}
    </div>
  );
};

const AllUsers = () => {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  // const [totalPages, setTotalPages] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(10);


  // const usersPerPage = 10;

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/users`);
        if (response.status === 200) {
          setUsers(response.data.users);
        } else {
          console.error('Unexpected response:', response);
        }
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => user.email);

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const startIndex = (currentPage - 1) * usersPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + usersPerPage);



  // const paginatedUsers = users.slice(
  //   (currentPage - 1) * usersPerPage,
  //   currentPage * usersPerPage
  // );

  const handleDeleteUser = async (userId) => {
    try {
      // Call the backend API to delete the user and their scrapbooks
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}`);
  
      if (response.status === 200) {
        // Remove the user from the local state
        setUsers((prev) => prev.filter((user) => user.id !== userId));
        console.log(response.data.message);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error deleting user and their scrapbooks:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">All Users</h2>
      <UserTable 
        users={paginatedUsers} 
        isReportedView={false} 
        onDelete={handleDeleteUser} 
      />
      <Pagination
        totalItems={filteredUsers.length}
        itemsPerPage={usersPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

const ReportedUsers = () => {
  const [reportedUsers, setReportedUsers] = useState([]);

  useEffect(() => {
    loadReportedUsers();
  }, []);

  const loadReportedUsers = async () => {
    try {
      // Fetch reported users from the backend
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/reported-users`);
      if (response.status === 200) {
        // Update the reported users state
        setReportedUsers(response.data.reportedUsers);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error loading reported users:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      // Call the backend API to delete the user and their scrapbooks
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/users/${userId}`);
  
      if (response.status === 200) {
        // Remove the user from the local state
        setReportedUsers((prev) => prev.filter((user) => user.id !== userId));
        console.log(response.data.message);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error deleting user and their scrapbooks:', error);
    }
  };

  const handleIgnoreUser = async (userId) => {
    try {
      // Call the backend API to ignore the user's report
      const response = await axios.patch(`${import.meta.env.VITE_API_URL}/api/admin/reported-users/${userId}/ignore`);
      if (response.status === 200) {
        // Remove the user from the reported users list in the local state
        setReportedUsers((prev) => prev.filter((user) => user.id !== userId));
        console.log(response.data.message);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error ignoring user report:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Reported Users</h2>
      <UserTable 
        users={reportedUsers} 
        onDelete={handleDeleteUser} 
        onIgnore={handleIgnoreUser}
        isReportedView={true}
      />
    </div>
  );
};

const ReportedPages = () => {
  const [reportedScrapbooks, setReportedScrapbooks] = useState([]);

  useEffect(() => {
    loadReportedScrapbooks();
  }, []);

  const loadReportedScrapbooks = async () => {
    try {
      // Fetch reported scrapbooks from the backend
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/reported-scrapbooks`);
  
      if (response.status === 200) {
        // Update the state with the reported scrapbooks data
        console.log(response);
        setReportedScrapbooks(response.data);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error loading reported scrapbooks:', error);
    }
  };

  const handleDeleteScrapbook = async (scrapbookId) => {
    try {
      // Call the backend API to delete the scrapbook
      const response = await axios.delete(`${import.meta.env.VITE_API_URL}/api/scrapbooks/${scrapbookId}`);
  
      if (response.status === 200) {
        // Remove the deleted scrapbook from the local state
        setReportedScrapbooks(prev => prev.filter(scrapbook => scrapbook.id !== scrapbookId));
        console.log(response.data.message);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error deleting scrapbook:', error);
    }
  };

  const handleIgnoreReport = async (scrapbookId) => {
    try {
      // Call the backend API to ignore the scrapbook report
      const response = await axios.patch(`${import.meta.env.VITE_API_URL}/api/admin//reported-scrapbooks/${scrapbookId}/ignore`);
  
      if (response.status === 200) {
        // Remove the ignored scrapbook from the local state
        setReportedScrapbooks(prev => prev.filter(scrapbook => scrapbook.id !== scrapbookId));
        console.log(response.data.message);
      } else {
        console.error('Unexpected response:', response);
      }
    } catch (error) {
      console.error('Error ignoring report:', error);
    }
  };


  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Reported Pages</h2>
      
      {reportedScrapbooks.length === 0 ? (
        <p className="text-gray-600">No reported scrapbooks.</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scrapbook Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportedScrapbooks.map((scrapbook) => (
                <tr key={scrapbook.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {scrapbook.ownerUsername}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {scrapbook.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-4">
                    <button 
                      onClick={() => handleDeleteScrapbook(scrapbook.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 ease-in-out transform hover:-translate-y-1 shadow-md"
                    >
                      Delete Scrapbook
                    </button>
                    <button 
                      onClick={() => handleIgnoreReport(scrapbook.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300 ease-in-out transform hover:-translate-y-1 shadow-md"
                    >
                      Ignore Report
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const UserTable = ({ users, onDelete, onIgnore, isReportedView }) => {
  const filteredUsers = users.filter((user) => user.email);
  return (

  <div className="bg-white rounded-lg shadow overflow-hidden">
    <table className="min-w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Username
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Email
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Scrapbooks
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {filteredUsers.map((user) => (
          <tr key={user.id}>
            <td className="px-6 py-4 whitespace-nowrap">{user.email || 'N/A'}</td>
            <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              {user.ScrapbooksAccessed?.filter((scrapbook) => scrapbook.permissionLevel === 2).length || 0}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
            <button
                  onClick={() => onDelete(user.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 ease-in-out transform hover:-translate-y-1 shadow-md"
                >
                  Delete
              </button>
            </td>
            {isReportedView && (
              <td className="px-6 py-4 whitespace-nowrap">
                <button
                  onClick={() => onIgnore(user.id)}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 ease-in-out transform hover:-translate-y-1 shadow-md"
                >
                  Ignore
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  )
};

const Pagination = ({ totalItems, itemsPerPage, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="mt-4 flex justify-center">
      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
        {Array.from({ length: totalPages }).map((_, index) => (
          <button
            key={index}
            onClick={() => onPageChange(index + 1)}
            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
              currentPage === index + 1
                ? 'z-10 bg-yellow-400 border-yellow-500 text-black'
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </nav>
    </div>
  );
};

const AdminDashboard = () => {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 bg-gray-100">
        <Routes>
          <Route path="/" element={<AllScrapbooks />} />
          <Route path="/reported-users" element={<ReportedUsers />} />
          <Route path="/all-users" element={<AllUsers />} />
          <Route path="/reported-pages" element={<ReportedPages />} />
        </Routes>
      </div>
    </div>
  );
};

export default AdminDashboard;
