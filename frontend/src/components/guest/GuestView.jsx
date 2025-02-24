import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase-config';
import { doc, updateDoc, getDoc, serverTimestamp, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import ScrapbookCard from '../shared/ScrapbookCard';
import Navbar from '../shared/Navbar';
import { FaTimes, FaFlag } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';


const GuestView = () => {
  const { user } = useAuth();
  const [publicScrapbooks, setPublicScrapbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCollaborators, setSelectedCollaborators] = useState(null);
  const [ownerName, setOwnerName] = useState(null);
  const [ownerID, setOwnerID] = useState(null);
  const ITEMS_PER_PAGE = 9;
  const navigate = useNavigate();

  useEffect(() => {
    loadPublicScrapbooks();
  }, [page]);

  const loadPublicScrapbooks = async () => {
    try {
      const q = query(
        collection(db, 'scrapbooks'),
        where('visibility', '==', 'public'),
        orderBy('createdAt', 'desc'),
        limit(ITEMS_PER_PAGE * page)
      );

      const snapshot = await getDocs(q);
      const scrapbookData = [];
      for (const docSnapshot of snapshot.docs) {
        const scrapbook = { id: docSnapshot.id, ...docSnapshot.data() };
        if (scrapbook.ownerId) {
          const userDoc = await getDoc(doc(db, 'Users', scrapbook.ownerId));
          console.log(userDoc.data());
          if (userDoc.exists()) {
            console.log("exists");
            scrapbook.ownerUsername = userDoc.data().email; // Add username to scrapbook data
            scrapbookData.push(scrapbook); // Include scrapbook only if the username exists
          }
        }
      }

      setPublicScrapbooks(scrapbookData);
      setHasMore(scrapbookData.length === ITEMS_PER_PAGE * page);
      setLoading(false);
    } catch (error) {
      console.error('Error loading public scrapbooks:', error);
      setLoading(false);
    }
  };

  const openCollaboratorsModal = async (collaborators, ownerId) => {
    try {
      setSelectedCollaborators(collaborators);
      console.log(ownerId);
      if (ownerId) {
        const userDoc = await getDoc(doc(db, 'Users', ownerId));
        setOwnerName(userDoc.exists() ? userDoc.data().email : 'Unknown Owner');
        setOwnerID(ownerId);
      } else {
        setOwnerName('Unknown Owner');
        setOwnerID('unknownID')
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
      setOwnerName('Unknown Owner');
    }
  };

  const report = async (id, itemType) => {
    try {
      const itemRef = doc(db, itemType, id);

      const docSnap = await getDoc(itemRef);

      if (docSnap.data().isReported) {
        alert('This item already been reported');
        return;
      }

      await updateDoc(itemRef, {
        isReported: true,
        reportedAt: serverTimestamp(),
        reportCount: (docSnap.data().reportCount || 0) + 1
      });

      alert('Reported successfully');
    } catch (error) {
      console.error('Error reporting:', error);
      alert('Failed to report: ' + error.message);
    }
  };

  const handleNavigate = (scrapbookId, role) => {
    if (role === 'editor') navigate(`/scrapbook/${scrapbookId}/edit`);
    else if (role === 'collaborator') navigate(`/scrapbook/${scrapbookId}/collaborate`);
    else navigate(`/scrapbook/${scrapbookId}/view`);
  };
  

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center h-screen">Loading...</div>
      </>
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
    <>
      <Navbar />
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-800">Welcome to Memory Mosaic</h1>
          <p className="text-gray-600">
            {user
              ? 'Browse through our collection of public scrapbooks.'
              : 'Browse through our collection of public scrapbooks. Create an account to start making your own!'}
          </p>
          {/* have to add a condition so that the message shows differently for guests and differently for users */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publicScrapbooks.map(scrapbook => (
            <div key={scrapbook.id} className="flex flex-col">
              <ScrapbookCard
                key={scrapbook.id}
                scrapbook={scrapbook}
                isOwner={false}
                visibility={'public'}
                onReport={() => report(scrapbook.id, 'scrapbooks')}
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

        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage(prev => prev + 1)}
              className="bg-yellow-400 text-black px-6 py-2 rounded-md hover:bg-yellow-500"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && publicScrapbooks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No public scrapbooks available yet.</p>
          </div>
        )}
      </div>
        
      {selectedCollaborators && (<CollaboratorsModal
          collaborators={selectedCollaborators}
          ownerName={ownerName}
          ownerID={ownerID}
          onClose={() => setSelectedCollaborators(null)}
        />)
        }
    </>
  );
};

export default GuestView;
