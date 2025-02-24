import React, { useState } from 'react';
import { db } from '../../config/firebase-config';
import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { FaTimes } from 'react-icons/fa';

const ShareModal = ({ isOpen, onClose, scrapbookId }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('viewer'); // 'viewer' or 'editor'

  if (!isOpen) return null;

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Check if user exists
      const usersRef = collection(db, 'Users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('No user found with this email address');
        return;
      }

      // Get current scrapbook data
      const scrapbookRef = doc(db, 'scrapbooks', scrapbookId);
      const scrapbookDoc = await getDoc(scrapbookRef);

      if (!scrapbookDoc.exists()) {
        setError('Scrapbook not found');
        return;
      }

      const currentCollaborators = scrapbookDoc.data().collaborators || [];

      // Check if user is already a collaborator
      if (currentCollaborators.some(collab => collab.email === email)) {
        setError('This user is already a collaborator');
        return;
      }

      // Add new collaborator with permission level
      await updateDoc(scrapbookRef, {
        collaborators: [...currentCollaborators, { 
          email,
          role: permissionLevel,
          addedAt: new Date().toISOString()
        }]
      });

      setSuccess('Scrapbook shared successfully!');
      setEmail('');
      setPermissionLevel('viewer'); // Reset to default
    } catch (error) {
      console.error('Error sharing scrapbook:', error);
      setError('Failed to share scrapbook. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>
        
        <h2 className="text-2xl font-bold mb-4">Share Scrapbook</h2>
        
        <form onSubmit={handleShare} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              {success}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share with (email):
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permission Level:
            </label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
            >
              <option value="viewer">Viewer (can only view)</option>
              <option value="editor">Editor (can edit)</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="w-full bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Share
          </button>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;