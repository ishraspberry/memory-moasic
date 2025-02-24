import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase-config';

const ScrapbookViewer = () => {
  const { id: scrapbookId } = useParams();
  const [scrapbook, setScrapbook] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScrapbook = async () => {
      const scrapbookRef = doc(db, 'scrapbooks', scrapbookId);
      const snapshot = await getDoc(scrapbookRef);

      if (snapshot.exists()) {
        setScrapbook(snapshot.data());
      } else {
        console.error('Scrapbook not found.');
        navigate('/dashboard');
      }
    };

    fetchScrapbook();
  }, [scrapbookId, navigate]);

  if (!scrapbook) return <div>Loading...</div>;

  return (
    <div>
      <h1>{scrapbook.title}</h1>
      <p>Created on: {new Date(scrapbook.createdAt).toLocaleDateString()}</p>
      {scrapbook.elements?.map((element, index) => (
        <div key={index}>{element.text || element.type}</div>
      ))}
    </div>
  );
};

export default ScrapbookViewer;
