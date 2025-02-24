import React from 'react';
import { FaRegComment } from 'react-icons/fa';

const CommentButton = ({ onClick, isOpen, unreadCount = 0 }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded relative ${
      isOpen ? 'bg-yellow-400' : 'bg-gray-200 hover:bg-gray-300'
    }`}
    title="Comments"
  >
    <FaRegComment />
    {unreadCount > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
        {unreadCount}
      </span>
    )}
  </button>
);

export default CommentButton;