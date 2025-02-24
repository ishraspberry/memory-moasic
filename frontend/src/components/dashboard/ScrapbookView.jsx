import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase-config';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, arrayUnion, updateDoc, or , getDoc} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ScrapbookCard from '../shared/ScrapbookCard';
import ShareModal from '../shared/ShareModal';
import { FaPlus } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import ScrapbookSettings from '../scrapbook/ScrapbookSettings'; 
import axios from 'axios';


import logo from '../../assets/MM.png';

const ScrapbookView = () => {
  const { user } = useAuth();
  const [scrapbooks, setScrapbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedScrapbook, setSelectedScrapbook] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); 
  const ITEMS_PER_PAGE = 5;
  const navigate = useNavigate();
  const location = useLocation();

  // Parse page number from URL on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const pageParam = parseInt(searchParams.get('page')) || 1;
    setPage(pageParam);
  }, [location.search]);

  useEffect(() => {
    if (!user) return;
    loadScrapbooks();
  }, [user?.uid, page]);

  const loadScrapbooks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/scrapbooks/user/${user.uid}`,
        {
          params: {
            page,
            limit: ITEMS_PER_PAGE
          }
        }
      );

      setScrapbooks(response.data.scrapbooks);
      setTotalPages(response.data.pagination.totalPages);
      setLoading(false);
    } catch (error) {
      console.error('Error loading scrapbooks:', error);
      setLoading(false);
    }
  };
  

  const handlePageChange = (newPage) => {
    setPage(newPage);
    navigate(`?page=${newPage}`);
  };

  const handleShare = (scrapbookId) => {
    setSelectedScrapbook(scrapbookId);
    setShareModalOpen(true);
  };

  const handleDelete = async (scrapbookId) => {
    if (window.confirm('Are you sure you want to delete this scrapbook?')) {
      try {
        // Optimistically update UI
        const updatedScrapbooks = scrapbooks.filter((book) => book.id !== scrapbookId);
        setScrapbooks(updatedScrapbooks);

        if (updatedScrapbooks.length === 0 && page > 1) {
          handlePageChange(page - 1);
        }

        // Make API call in the background
        await axios.delete(`${import.meta.env.VITE_API_URL}/api/scrapbooks/${scrapbookId}`);
      } catch (error) {
        // If the API call fails, revert the optimistic update
        console.error('Error deleting scrapbook:', error);
        alert('Failed to delete scrapbook. Please try again.');
        loadScrapbooks(); // Reload the original data
      }
    }
  };  

  const handleNavigate = (scrapbookId, role) => {
    if (role === 'editor') navigate(`/scrapbook/${scrapbookId}/edit`);
    else if (role === 'collaborator') navigate(`/scrapbook/${scrapbookId}/collaborate`);
    else navigate(`/scrapbook/${scrapbookId}/view`);
  };

  const handleCreateNew = async () => {
    try {
      const defaultTitle = 'New Scrapbook';
      const title = prompt('Enter scrapbook title:', defaultTitle) || defaultTitle;

      // Optimistically update UI
      const tempId = Date.now().toString(); // Temporary ID for optimistic update
      const tempScrapbook = {
        id: tempId,
        title,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        collaborators: [],
        visibility: 'private'
      };

      setScrapbooks(prev => [...prev, tempScrapbook]);

      // Make API call
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/scrapbooks`, {
        title,
        ownerId: user.uid,
        visibility: 'private'
      });

      // Navigate to the new scrapbook
      handleNavigate(response.data.id, 'editor');
    } catch (error) {
      console.error('Error creating scrapbook:', error);
      alert('Failed to create scrapbook. Please try again.');
      // Revert optimistic update
      loadScrapbooks();
    }
  };

  if (!user) {
    return <div className="flex justify-center items-center h-screen">Redirecting...</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="w-full min-h-screen flex flex-col gap-10 px-6">
      <div className="flex justify-center pb-10 pt-20">
        <img className="w-[300px]" src={logo} alt="Logo" />
      </div>
      <div className="flex flex-col items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-[1200px]">
          <div className="aspect-square w-full">
            <button
              onClick={handleCreateNew}
              className="w-full h-full group flex justify-center items-center border-[2px] border-dashed rounded-md hover:border-yellow-500 duration-300 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <FaPlus className="text-[#d9d9d9] text-xl group-hover:text-yellow-500 transition-colors" />
            </button>
          </div>
          {scrapbooks.map((scrapbook) => {
            // console.log('Rendering scrapbook:', scrapbook);

            const defaultThumbnail = '/default-thumbnail.png';
            const scrapbookWithFallback = {
              ...scrapbook,
              thumbnail: scrapbook.thumbnail || defaultThumbnail,
            };

            return (
              <div className="aspect-square w-full bg-red-100" key={scrapbook.id}>
                <ScrapbookCard
                  scrapbook={scrapbookWithFallback}
                  onNavigate={handleNavigate}
                  onDelete={handleDelete}
                  onShare={handleShare}
                  isOwner={user.uid === scrapbook.ownerId}
                  visibility={scrapbook.visibility}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {(totalPages > 1) && <div className="w-full flex justify-center mt-8 bottom-10 pb-10">
        <nav className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              className={`px-3 py-1 rounded-md ${
                page === i + 1 ? 'bg-yellow-500 text-white' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
            className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300 disabled:bg-gray-100"
          >
            Next
          </button>
        </nav>
      </div>}

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        scrapbookId={selectedScrapbook}
      />
    </div>
  );
};

export default ScrapbookView;
