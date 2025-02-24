import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../config/firebase-config';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, or } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FaCamera } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import ProfilePicture from '../shared/ProfilePicture';
import axios from 'axios';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '../../config/firebase-config';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    displayName: '',
    email: '',
    bio: '',
    photoURL: '',
    joinedDate: '',
    totalScrapbooks: 0
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadProfileData();
  }, [user, navigate]);

  const loadProfileData = async () => {
    if (!user) return;
    
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/profile/${user.uid}`);
      setProfileData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const storageRef = ref(storage, `profilePhotos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/profile/${user.uid}/photo`, {
        photoURL
      });

      setProfileData(prev => ({
        ...prev,
        ...response.data.user
      }));

    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/profile/${user.uid}`, {
        displayName: profileData.displayName,
        bio: profileData.bio
      });
      
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');

    try {
      // Validation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError('New password should be at least 6 characters');
        return;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, passwordData.newPassword);

      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
      alert('Password updated successfully');
    } catch (error) {
      console.error('Error updating password:', error);
      switch (error.code) {
        case 'auth/wrong-password':
          setPasswordError('Current password is incorrect');
          break;
        default:
          setPasswordError('Failed to update password. Please try again.');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex flex-col items-center md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-8">
            {/* Profile Photo Section */}
            <div className="relative">
              <ProfilePicture 
                user={user} 
                size="lg"
                className="shadow-lg"
              />
              <label className="absolute bottom-0 right-0 bg-yellow-500 p-2 rounded-full cursor-pointer hover:bg-yellow-600 transition-colors">
                <FaCamera className="text-white" />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>

            {/* Profile Info Section */}
            <div className="flex-1">
              {editing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                    <input
                      type="text"
                      value={profileData.displayName}
                      onChange={(e) => setProfileData(prev => ({...prev, displayName: e.target.value}))}
                      className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData(prev => ({...prev, bio: e.target.value}))}
                      rows={4}
                      className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold">{profileData.displayName}</h1>
                    <p className="text-gray-600">{profileData.email}</p>
                  </div>
                  <p className="text-gray-700">{profileData.bio || 'No bio yet'}</p>
                  <div className="flex space-x-6">
                    <div>
                      <p className="text-sm text-gray-500">Joined</p>
                      <p className="font-medium">
                        {new Date(profileData.joinedDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Scrapbooks</p>
                      <p className="font-medium">{profileData.totalScrapbooks}</p>
                    </div>
                  </div>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                    >
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                    >
                      Change Password
                    </button>
                  </div>

                  {/* Password Change Modal */}
                  {isChangingPassword && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                      <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Change Password</h3>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                          {passwordError && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                              {passwordError}
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Current Password
                            </label>
                            <input
                              type="password"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                currentPassword: e.target.value
                              }))}
                              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              New Password
                            </label>
                            <input
                              type="password"
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                newPassword: e.target.value
                              }))}
                              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Confirm New Password
                            </label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData(prev => ({
                                ...prev,
                                confirmPassword: e.target.value
                              }))}
                              className="mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
                              required
                            />
                          </div>
                          <div className="flex space-x-4">
                            <button
                              type="submit"
                              className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                            >
                              Update Password
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsChangingPassword(false);
                                setPasswordError('');
                                setPasswordData({
                                  currentPassword: '',
                                  newPassword: '',
                                  confirmPassword: ''
                                });
                              }}
                              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 
