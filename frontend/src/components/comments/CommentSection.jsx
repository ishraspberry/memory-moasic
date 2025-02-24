import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../config/firebase-config';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc 
} from 'firebase/firestore';
import { FaRegComment, FaTimes, FaEllipsisV, FaEdit, FaTrash, FaCheck, FaTimes as FaClose } from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import CommentItem from './CommentItem';
import { GUEST_UID } from '../../config/constants';


// const Comment = ({ 
//   comment, 
//   user, 
//   onDelete, 
//   onEdit, 
//   onReply,
//   isEditing,
//   setEditingCommentId
// }) => {
//   const [showOptions, setShowOptions] = useState(false);
//   const [editText, setEditText] = useState(comment.text);
//   const editInputRef = useRef(null);

//   useEffect(() => {
//     if (isEditing) {
//       editInputRef.current?.focus();
//     }
//   }, [isEditing]);

//   const handleEdit = () => {
//     if (editText.trim() === comment.text) {
//       setEditingCommentId(null);
//       return;
//     }
    
//     if (editText.trim()) {
//       onEdit(comment.id, editText.trim());
//       setEditingCommentId(null);
//     }
//   };

//   const handleKeyPress = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault();
//       handleEdit();
//     } else if (e.key === 'Escape') {
//       setEditText(comment.text);
//       setEditingCommentId(null);
//     }
//   };

//   return (
//     <div
//       className={`p-3 rounded-lg ${
//         comment.userId === user.uid ? 'bg-blue-100 ml-8' : 'bg-gray-100 mr-8'
//       }`}
//     >
//       {comment.replyTo && (
//         <div className="text-xs text-gray-600 mb-2 p-2 bg-gray-50 rounded">
//           Replying to {comment.replyTo.userName}: {comment.replyTo.text.substring(0, 50)}...
//         </div>
//       )}
      
//       <div className="flex justify-between items-start mb-1">
//         <span className="text-sm font-semibold">
//           {comment.userName}
//           {comment.edited && 
//             <span className="text-xs text-gray-500 ml-2">(edited)</span>
//           }
//         </span>
//         <div className="flex items-center space-x-2">
//           <span className="text-xs text-gray-500">
//             {comment.timestamp 
//               ? formatDistanceToNow(comment.timestamp, { addSuffix: true })
//               : 'Just now'}
//           </span>
//           {comment.userId === user.uid && (
//             <div className="relative">
//               <button
//                 onClick={() => setShowOptions(!showOptions)}
//                 className="text-gray-500 hover:text-gray-700 p-1"
//               >
//                 <FaEllipsisV size={12} />
//               </button>
//               {showOptions && (
//                 <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10">
//                   <button
//                     onClick={() => {
//                       setEditingCommentId(comment.id);
//                       setShowOptions(false);
//                     }}
//                     className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
//                   >
//                     <FaEdit className="mr-2" /> Edit
//                   </button>
//                   <button
//                     onClick={() => {
//                       onDelete(comment.id);
//                       setShowOptions(false);
//                     }}
//                     className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
//                   >
//                     <FaTrash className="mr-2" /> Delete
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>

//       {isEditing ? (
//         <div className="mt-1">
//           <textarea
//             ref={editInputRef}
//             value={editText}
//             onChange={(e) => setEditText(e.target.value)}
//             onKeyDown={handleKeyPress}
//             className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             rows={2}
//           />
//           <div className="flex justify-end space-x-2 mt-2">
//             <button
//               onClick={() => {
//                 setEditText(comment.text);
//                 setEditingCommentId(null);
//               }}
//               className="text-gray-500 hover:text-gray-700"
//             >
//               <FaClose />
//             </button>
//             <button
//               onClick={handleEdit}
//               className="text-green-500 hover:text-green-700"
//             >
//               <FaCheck />
//             </button>
//           </div>
//         </div>
//       ) : (
//         <>
//           <p className="text-sm mb-2">{comment.text}</p>
//           <button
//             onClick={() => onReply(comment)}
//             className="text-xs text-blue-600 hover:text-blue-800"
//           >
//             Reply
//           </button>
//         </>
//       )}
//     </div>
//   );
// };

const CommentSection = ({ scrapbookId, user, isOpen, onClose }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const commentsEndRef = useRef(null);

  useEffect(() => {
    if (!scrapbookId) return;

    const commentsRef = collection(db, 'scrapbooks', scrapbookId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newComments = [];
      snapshot.forEach((doc) => {
        newComments.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        });
      });
      setComments(newComments);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [scrapbookId]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const commentsRef = collection(db, 'scrapbooks', scrapbookId, 'comments');
      await addDoc(commentsRef, {
        text: newComment.trim(),
        userId: user?.uid || GUEST_UID,
        userEmail: user?.email || '',
        userName: user?.displayName || user?.email || 'Guest',
        timestamp: serverTimestamp(),
        replyTo: replyTo ? {
          id: replyTo.id,
          userName: replyTo.userName,
          text: replyTo.text
        } : null,
        edited: false
      });

      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const commentRef = doc(db, 'scrapbooks', scrapbookId, 'comments', commentId);
      await deleteDoc(commentRef);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleEditComment = async (commentId, newText) => {
    try {
      const commentRef = doc(db, 'scrapbooks', scrapbookId, 'comments', commentId);
      await updateDoc(commentRef, {
        text: newText,
        edited: true,
        lastEditedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-lg flex flex-col">
      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h3 className="text-lg font-semibold">Comments</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            user={user}
            onDelete={handleDeleteComment}
            onEdit={handleEditComment}
            onReply={setReplyTo}
            isEditing={editingCommentId === comment.id}
            setEditingCommentId={setEditingCommentId}
          />
        ))}
        <div ref={commentsEndRef} />
      </div>

      {replyTo && (
        <div className="px-4 py-2 bg-gray-50 border-t flex justify-between items-center">
          <span className="text-xs text-gray-600">
            Replying to {replyTo.userName}
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      )}

      <form 
        onSubmit={handleSubmitComment}
        className="border-t p-4 bg-gray-50"
      >
        <div className="flex flex-col space-y-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.userName}...` : "Write a comment..."}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment(e);
              }
            }}
          />
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">
              Press Enter to send
            </span>
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-4 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CommentSection;