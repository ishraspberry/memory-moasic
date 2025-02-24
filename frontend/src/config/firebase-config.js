import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBEyEoj2lwWEu3HBYhZYgy-F2N3mluiWbA",
  authDomain: "test-5822c.firebaseapp.com",
  projectId: "test-5822c",
  storageBucket: "test-5822c.firebasestorage.app",
  messagingSenderId: "670314202040",
  appId: "1:670314202040:web:4be306e0931b74d95dc54d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Set persistence
setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error('Error setting persistence:', error);
  });

export { auth, db, storage };