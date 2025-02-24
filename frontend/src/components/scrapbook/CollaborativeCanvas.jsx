import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useScrapbookSync } from '../../hooks/useScrapbookSync';
import CanvasElement from '../canvas/CanvasElement';
import { useAuth } from '../../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc , updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase-config';
import ScrapbookEditor from './ScrapbookEditor';
import { GUEST_UID } from '../../config/constants';



const CollaborativeCanvas = () => {
  const { user } = useAuth();
  const { scrapbookId, mode } = useParams();
  const navigate = useNavigate();
  const [selectedElement, setSelectedElement] = useState(null);
  const [tool, setTool] = useState('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [scrapbookData, setScrapbookData] = useState(null);
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        if (!scrapbookId) {
          console.error('Invalid scrapbook ID.');
          navigate('/guest');
          return;
        }

        // Default to GUEST_UID if user is null
        const currentUserId = user?.uid || GUEST_UID;

        const scrapbookRef = doc(db, 'scrapbooks', scrapbookId);
        const snapshot = await getDoc(scrapbookRef);
        console.log(scrapbookId);

        if (!snapshot.exists()) {
          console.error('Scrapbook not found.');
          navigate('/guest');
          return;
        }

        const { collaborators = [], visibility, ownerId } = snapshot.data();

        // Public scrapbooks accessible to everyone
        if (visibility === 'public') {
          const isOwner = currentUserId === ownerId;
          const collaborator = collaborators.find((c) => c.id === currentUserId);
          console.log('Public scrapbook accessed.');
          // setIsEditable(false);
          if (isOwner || (collaborator && collaborator.role === 'editor')) {
            console.log('Public scrapbook: Edit access granted.');
            setIsEditable(true);
          } else {
            console.log('Public scrapbook: View access granted.');
            setIsEditable(false);
          }
          setScrapbookData(snapshot.data());
          return;
        }
  

        // User-specific logic
        const isOwner = currentUserId === ownerId;
        const collaborator = collaborators.find((c) => c.id === currentUserId);

        console.log('Current User ID:', currentUserId);
        console.log('Collaborator:', collaborator);

        if (isOwner || (collaborator && collaborator.role === 'editor')) {
          console.log('Edit access granted.');
          setIsEditable(true);
          setScrapbookData(snapshot.data());
        } else if (collaborator && collaborator.role === 'viewer' || user.Role === 'admin') {
          console.log('View access granted.');
          setIsEditable(false);
          setScrapbookData(snapshot.data());
        } else {
          console.warn('Insufficient permissions.');
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
        navigate('/guest');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [scrapbookId, user, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!scrapbookData) {
    return <div>Error loading scrapbook.</div>;
  }




  const updateElements = async (updatedElements) => {
    try {
        if (!Array.isArray(updatedElements)) {
            throw new TypeError('updatedElements must be an array');
            }
        const docRef = doc(db, 'scrapbooks', scrapbookId);
  
      const sanitizedElements = updatedElements.map((el) => ({
        ...el,
        points: el.points || [], 
        text: el.text || '',    
      }));
  
      await updateDoc(docRef, {
        elements: sanitizedElements,
        lastModified: new Date().toISOString(),
        lastModifiedBy: user.uid,
      });
  
      console.log('Elements updated successfully');
    } catch (error) {
      console.error('Error updating elements:', error);
    }
  };
  



return (
    <div className="relative w-full h-full">
      {loading ? (
        <div className="flex justify-center items-center h-screen">Loading...</div>
      ) : scrapbookData ? (
        <ScrapbookEditor
          scrapbookId={scrapbookId}
          scrapbookData={scrapbookData}
          isEditable={isEditable}
          updateElements={updateElements} 
        />
      ) : (
        <div className="flex justify-center items-center h-screen">
          <p>Scrapbook not found or you don't have access.</p>
        </div>
      )}
    </div>
  );
  
  
};

export default CollaborativeCanvas;