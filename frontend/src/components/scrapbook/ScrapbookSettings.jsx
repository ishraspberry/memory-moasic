import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase-config';
import { doc, updateDoc, arrayUnion, arrayRemove , getDocs, collection, query, where, getDoc} from 'firebase/firestore';
import { FaTimes, FaGlobe, FaLock } from 'react-icons/fa';

const ScrapbookSettings = ({ scrapbookId, onClose, collaborators }) => {
  const [visibility, setVisibility] = useState('private');
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('viewer');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const docRef = doc(db, 'scrapbooks', scrapbookId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setVisibility(docSnap.data().visibility || 'private');
      }
    };
    loadSettings();
  }, [scrapbookId]);

  const handleVisibilityChange = async (newVisibility) => {
    try {
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        visibility: newVisibility
      });
      setVisibility(newVisibility);
    } catch (error) {
      setError('Failed to update visibility');
    }
  };



  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    try {
      const usersRef = collection(db, 'Users');

      const normalizedEmail = newCollaboratorEmail.trim().toLowerCase();
      const q = query(usersRef, where('email', '==', normalizedEmail));

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError('User not found');
        return;
      }

      const newUserDoc = querySnapshot.docs[0];
      const newUser = newUserDoc.data();      
      const existingCollaborator = collaborators.find(
        (c) => c.id === newUserDoc.id
      );
      if (existingCollaborator) {
        setError('Collaborator already added');
        return;
      }
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        collaborators: arrayUnion({
            id: newUserDoc.id,
            email: newCollaboratorEmail,
            role: newCollaboratorRole,
            name: newUser.name || 'Unnamed User',
            photoURL: newUser.photoURL || '/default-avatar.png',
        }),
      });

      await updateDoc(doc(db, 'Users', newUserDoc.id), {
        ScrapbooksAccessed: arrayUnion({
          id: scrapbookId,
          permissionLevel: newCollaboratorRole === 'editor' ? 2 : 1,
        }),
      });

      setNewCollaboratorEmail('');
      setNewCollaboratorRole('viewer');
      setError('');
    } catch (error) {
        console.error('Error adding collaborator:', error);
        setError('Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId) => {
    try {
      const collaborator = collaborators.find(c => c.id === collaboratorId);
      if (!collaborator) {
        setError('Collaborator not found');
        return;
      }
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        collaborators: arrayRemove(collaborator)
      });
      await updateDoc(doc(db, 'Users', collaboratorId), {
        ScrapbooksAccessed: arrayRemove({
          id: scrapbookId,
        }),
      });
    } catch (error) {
      setError('Failed to remove collaborator');
    }
  };

  const handleUpdateCollaboratorRole = async (collaboratorId, newRole) => {
    try {
      const collaboratorIndex = collaborators.findIndex(
        (collaborator) => collaborator.id === collaboratorId
      );
      if (collaboratorIndex === -1) {
        setError('Collaborator not found');
        return;
      }
  
      const updatedCollaborators = [...collaborators];
      updatedCollaborators[collaboratorIndex] = {
        ...updatedCollaborators[collaboratorIndex],
        role: newRole,
      };
  
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        collaborators: updatedCollaborators,
      });
  
      setError('');
    } catch (error) {
      console.error('Error updating collaborator role:', error);
      setError('Failed to update collaborator role');
    }
  };
  //     const updatedCollaborators = collaborators.map(collaborator => {
  //       if (collaborator.id === collaboratorId) {
  //         return { ...collaborator, role: newRole };
  //       }
  //       return collaborator;
  //     });

  //     await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
  //       collaborators: updatedCollaborators
  //     });
  //   } catch (error) {
  //     setError('Failed to update collaborator role');
  //   }
  // };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Scrapbook Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Visibility</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => handleVisibilityChange('private')}
              className={`flex items-center space-x-2 px-4 py-2 rounded ${
                visibility === 'private'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-200'
              }`}
            >
              <FaLock />
              <span>Private</span>
            </button>
            <button
              onClick={() => handleVisibilityChange('public')}
              className={`flex items-center space-x-2 px-4 py-2 rounded ${
                visibility === 'public'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-200'
              }`}
            >
              <FaGlobe />
              <span>Public</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Add Collaborator</h3>
          <form onSubmit={handleAddCollaborator} className="space-y-4">
            <input
              type="email"
              value={newCollaboratorEmail}
              onChange={(e) => setNewCollaboratorEmail(e.target.value)}
              placeholder="Enter email"
              className="w-full p-2 border rounded"
            />
            <select
              value={newCollaboratorRole}
              onChange={(e) => setNewCollaboratorRole(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="submit"
              className="w-full bg-yellow-400 text-black py-2 rounded hover:bg-yellow-500"
            >
              Add Collaborator
            </button>
          </form>
        </div>
        <div>
          <h3 className="font-semibold mb-2">Collaborators</h3>
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center space-x-2">
                  <img
                    src={collaborator.photoURL || '/default-avatar.png'}
                    alt={collaborator.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="font-medium">{collaborator.name}</div>
                    <div className="text-sm text-gray-500">{collaborator.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={collaborator.role}
                    onChange={(e) =>
                      handleUpdateCollaboratorRole(collaborator.id, e.target.value)
                    }
                    className="text-sm border rounded p-1"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    onClick={() => handleRemoveCollaborator(collaborator.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrapbookSettings;