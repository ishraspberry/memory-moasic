import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTrash, FaShare, FaFlag } from 'react-icons/fa';
import ProfilePicture from './ProfilePicture';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase-config';

const ScrapbookCard = ({ 
  scrapbook, 
  onDelete, 
  onShare, 
  isOwner, 
  onNavigate, 
  visibility,
  onReport 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [owner, setOwner] = React.useState(null);
  const [collaborators, setCollaborators] = React.useState([]);
  const [userRole, setUserRole] = React.useState('viewer'); // Default to 'viewer'

  React.useEffect(() => {
    const loadOwnerAndCollaborators = async () => {
      try {
        // Load owner information
        const ownerDoc = await getDoc(doc(db, 'Users', scrapbook.ownerId));
        if (ownerDoc.exists()) {
          setOwner({
            ...ownerDoc.data(),
            id: scrapbook.ownerId,
          });
        }

        if (user) {
          // Determine the current user's role in the scrapbook
          const currentCollaborator = (scrapbook.collaborators || []).find(
            (collab) => collab.email === user.email
          );

          // Set the user's role based on collaborator data
          setUserRole(currentCollaborator?.role || (isOwner ? 'owner' : 'viewer'));
        }

        // Load detailed collaborator data for display purposes
        const collaboratorPromises = (scrapbook.collaborators || []).map(async (collab) => {
          // Find user by email instead of id
          const usersRef = collection(db, 'Users');
          const q = query(usersRef, where('email', '==', collab.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return {
              ...userDoc.data(),
              id: userDoc.id,
              role: collab.role,
              email: collab.email
            };
          }
          return null;
        });

        const loadedCollaborators = (await Promise.all(collaboratorPromises)).filter(Boolean);
        setCollaborators(loadedCollaborators);
      } catch (error) {
        console.error('Error loading scrapbook data:', error);
      }
    };

    if (scrapbook) {
      loadOwnerAndCollaborators();
    }
  }, [scrapbook?.ownerId, scrapbook?.collaborators, user?.email, isOwner]);

  const handleNavigate = () => {
    if (userRole === 'editor' || userRole === 'owner') {
      onNavigate(scrapbook.id, 'editor');
    } else {
      onNavigate(scrapbook.id, 'viewer');
    }
  };

  const isGuestView = location.pathname === '/guest';

  const getBorderClasses = () => {
    return visibility === 'public' 
      ? 'border-4 border-blue-500' 
      : 'border-4 border-yellow-500';
  };

  if (!scrapbook) {
    return null;
  }

  return (
    <div className={`flex flex-col  bg-white rounded-lg shadow-md overflow-hidden h-full ${getBorderClasses()}`}>
      <div className="relative flex-1">
        {/* <img
          src={scrapbook.thumbnail}
          alt={scrapbook.title}
          className="w-full h-48 object-cover"
          onError={(e) => {
            console.warn('Failed to load thumbnail:', scrapbook.thumbnail);
          }}
        /> */}
        {scrapbook.thumbnail ? (
          <img
          src={scrapbook.thumbnail}
          alt={scrapbook.title || 'Scrapbook Thumbnail'}
          className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center bg-gray-200 text-gray-600 text-xl font-bold">
          {scrapbook.title || 'Untitled'}
          </div>
        )}
        {/* Collaborator Profile Pictures */}
        <div className="absolute top-4 right-2 flex -space-x-2">
          {/* Owner */}
          {owner && (
            <div className="relative" title={`Owner: ${owner.displayName || owner.email}`}>
              <ProfilePicture 
                user={owner} 
                size="sm" 
                className="border-2 border-yellow-500"
              />
            </div>
          )}
          
          {/* Collaborators (show up to 3) */}
          {collaborators.slice(0, 3).map((collaborator) => (
            <div 
              key={collaborator.id}
              className="relative"
              title={`${collaborator.displayName || collaborator.email} (${collaborator.role})`}
            >
              <ProfilePicture 
                user={collaborator} 
                size="sm" 
                className="border-2 border-white"
              />
            </div>
          ))}
          
          {/* Show count if there are more collaborators */}
          {collaborators.length > 3 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-600 border-2 border-white">
              +{collaborators.length - 3}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="text-lg font-semibold mb-2">{scrapbook.title}</h3>
        <p className="text-sm text-gray-500 mb-2">
          Created on {new Date(scrapbook.createdAt).toLocaleDateString()}
        </p>
        
        <div className="flex justify-between items-center">
          <button
            onClick={handleNavigate}
            className="text-blue-600 hover:text-blue-800"
          >
            {userRole === 'editor' || userRole === 'owner' ? 'Edit' : 'View'}
          </button>
          <div className="flex space-x-2">
            {isGuestView && (
              <button
                onClick={() => onReport && onReport(id)}
                className="p-2 text-gray-600 hover:text-gray-800"
                title="Report this scrapbook"
              >
                <FaFlag />
              </button>
            )}
            {isOwner && (
              <>
                <button
                  onClick={() => onShare(scrapbook.id)}
                  className="p-2 text-gray-600 hover:text-gray-800"
                >
                  <FaShare />
                </button>
                <button
                  onClick={() => onDelete(scrapbook.id)}
                  className="p-2 text-red-600 hover:text-red-800"
                >
                  <FaTrash />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrapbookCard;