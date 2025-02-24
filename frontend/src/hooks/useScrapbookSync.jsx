import { useEffect, useState } from 'react';
import { db } from '../config/firebase-config';
import { doc, onSnapshot, updateDoc , collection , serverTimestamp , setDoc} from 'firebase/firestore';

export const useScrapbookSync = (scrapbookId, userId) => {
  const [elements, setElements] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scrapbookId) return;

    const userRef = doc(db, 'scrapbooks', scrapbookId, 'active_users', userId);
    setDoc(userRef, {
        lastActive: new Date().toISOString(),
        timestamp: serverTimestamp()
    }, { merge: true }) 
        .catch((error) => console.error('Error setting active user:', error));

    updateDoc(userRef, {
      lastActive: new Date().toISOString(),
      timestamp: serverTimestamp()
    }).catch(console.error);

    const unsubscribeElements = onSnapshot(
        doc(db, 'scrapbooks', scrapbookId),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            setElements(docSnapshot.data().elements || []);
          } else {
            console.error('Scrapbook document not found.');
          }
        },
        (error) => {
          console.error('Error syncing elements:', error);
          setError(error);
        }
    );

    const unsubscribeUsers = onSnapshot(
        collection(db, 'scrapbooks', scrapbookId, 'active_users'),
        (snapshot) => {
          const users = [];
          snapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const lastActive = new Date(data.lastActive);
  
            if (new Date() - lastActive < 5 * 60 * 1000) {
              users.push({ id: docSnapshot.id, ...data });
            }
          });
          setActiveUsers(users);
        },
        (error) => {
          console.error('Error syncing active users:', error);
          setError(error);
        }
      );
  

    return () => {
        if (unsubscribeElements) unsubscribeElements();
        if (unsubscribeUsers) unsubscribeUsers();
      };
    }, [scrapbookId, userId]);

 const updateElements = async (newElements) => {
    if (!scrapbookId || !newElements) {
      console.error('Invalid scrapbookId or elements');
      return;
    }

    try {
      await updateDoc(doc(db, 'scrapbooks', scrapbookId), {
        elements: newElements,
        lastModified: new Date().toISOString(),
        lastModifiedBy: userId,
      });
    } catch (error) {
      console.error('Error updating elements:', error);
      setError(error);
    }
  };

  return { elements, activeUsers, updateElements, error };
};
