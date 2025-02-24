import React from 'react';
import { generateColorFromString, getInitials } from '../../utils/colorUtils';

const ProfilePicture = ({ user, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-40 h-40 text-5xl'
  };

  if (!user) return null;

  const hasValidPhotoURL = user.photoURL && user.photoURL.startsWith('http');
  const email = user.email || ''; // Default to an empty string if email is undefined

  const initial = getInitials(user.displayName || user.email);
  const backgroundColor = email ? generateColorFromString(email) : '#ccc'; 

  return hasValidPhotoURL ? (
    <img
      src={user.photoURL}
      alt={user.displayName || 'Profile'}
      className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
    />
  ) : (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor }}
    >
      {initial}
    </div>
  );
};

export default ProfilePicture; 