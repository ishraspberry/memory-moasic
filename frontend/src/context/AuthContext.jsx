import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { GUEST_UID } from '../config/constants';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'Users', firebaseUser.uid);
          
          // First, get the initial user data
          const userDoc = await getDoc(userDocRef);
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || '',
              joinedDate: firebaseUser.metadata.creationTime,
              totalScrapbooks: 0,
              bio: ''
            });
          }

          // Set initial user state
          setUser({
            ...firebaseUser,
            ...userDoc.data()
          });
          
          // Then set up real-time listener
          unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setUser(currentUser => ({
                ...currentUser,
                ...doc.data()
              }));
            }
          });

          setIsGuest(false);
        } catch (error) {
          console.error('Error setting up user:', error);
        }
      } else {
        if (unsubscribeDoc) {
          unsubscribeDoc();
        }
        setUser(null);
        setIsGuest(false);
      }
      setLoading(false);
    });

    return () => {
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
      unsubscribeAuth();
    };
  }, []);

  const setGuestUser = () => {
    setUser({ uid: GUEST_UID, email: null }); 
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, setGuestUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
