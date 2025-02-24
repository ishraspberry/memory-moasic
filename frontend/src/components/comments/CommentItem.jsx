// src/components/comments/CommentItem.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaEllipsisV, FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { GUEST_UID } from '../../config/constants';

const CommentItem = ({ 
  comment, 
  user, 
  onDelete, 
  onEdit, 
  onReply,
  isEditing,
  setEditingCommentId
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const editInputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (editText.trim() === comment.text) {
      setEditingCommentId(null);
      return;
    }
    
    if (editText.trim()) {
      onEdit(comment.id, editText.trim());
      setEditingCommentId(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setEditText(comment.text);
      setEditingCommentId(null);
    }
  };

  return (
    <div
      className={`p-3 rounded-lg ${
        comment.userId === (user?.uid || GUEST_UID)? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
      }`}
    >
      {comment.replyTo && (
        <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-50 rounded">
          Replying to {comment.replyTo.userName}: {comment.replyTo.text.substring(0, 50)}...
        </div>
      )}
      
      <div className="flex justify-between items-start mb-1">
        <span className="text-sm font-semibold">
          {comment.userName}
          {comment.edited && 
            <span className="text-xs text-gray-500 ml-2">(edited)</span>
          }
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {comment.timestamp 
              ? formatDistanceToNow(comment.timestamp, { addSuffix: true })
              : 'Just now'}
          </span>
          {comment.userId === (user?.uid || GUEST_UID) && (
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <FaEllipsisV size={12} />
              </button>
              {showOptions && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10">
                  <button
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <FaEdit className="mr-2" /> Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(comment.id);
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
                  >
                    <FaTrash className="mr-2" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        <div className="mt-1">
          <textarea
            ref={editInputRef}
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => {
                setEditText(comment.text);
                setEditingCommentId(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
            <button
              onClick={handleEdit}
              className="text-green-500 hover:text-green-700"
            >
              <FaCheck />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm mb-2">{comment.text}</p>
          <button
            onClick={() => onReply(comment)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Reply
          </button>
        </>
      )}
    </div>
  );
};

export default CommentItem;