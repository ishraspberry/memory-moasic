const express = require('express');
const router = express.Router();
const admin = require('../config/firebase-admin');
const db = admin.firestore();

router.get('/scrapbooks', async (req, res) => {
  try {
    // Query the 'scrapbooks' collection, ordered by 'createdAt' descending
    const scrapbooksQuery = db.collection('scrapbooks').orderBy('createdAt', 'desc');
    const snapshot = await scrapbooksQuery.get();

    const scrapbookData = [];

    // Iterate over each scrapbook document
    for (const docSnapshot of snapshot.docs) {
      const scrapbook = { id: docSnapshot.id, ...docSnapshot.data() };

      // Fetch owner details if 'ownerId' exists
      if (scrapbook.ownerId) {
        const userDoc = await db.collection('Users').doc(scrapbook.ownerId).get();
        if (userDoc.exists) {
          scrapbook.ownerUsername = userDoc.data().email; // Add owner's email
          scrapbookData.push(scrapbook); // Add scrapbook only if owner exists
        }
      }
    }

    // Return the enriched scrapbook data
    res.status(200).json({
      scrapbooks: scrapbookData,
    });
  } catch (error) {
    console.error('Error loading scrapbooks:', error);
    res.status(500).json({ error: 'An error occurred while loading scrapbooks.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    // Fetch all users from the 'Users' collection
    const snapshot = await db.collection('Users').get();

    // Map over the documents to format the user data
    const userData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Return the user data as JSON
    res.status(200).json({ users: userData });
  } catch (error) {
    console.error('Error loading users:', error);
    res.status(500).json({ error: 'An error occurred while loading users.' });
  }
});

router.get('/users/:ownerId', async (req, res) => {
  const { ownerId } = req.params;

  try {
    if (!ownerId) {
      return res.status(400).json({ error: 'Owner ID is required.' });
    }

    const userDoc = await db.collection('Users').doc(ownerId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Owner not found.', ownerName: 'Unknown Owner' });
    }

    const ownerData = userDoc.data();
    res.status(200).json({
      ownerName: ownerData.email || 'Unknown Owner',
      ownerId: ownerId,
    });
  } catch (error) {
    console.error('Error fetching owner data:', error);
    res.status(500).json({ error: 'An error occurred while fetching owner data.' });
  }
});

router.delete('/users/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Query for scrapbooks owned by the user
    const scrapbooksQuery = db.collection('Scrapbooks').where('ownerId', '==', userId);
    const snapshot = await scrapbooksQuery.get();

    // Step 2: Delete all scrapbooks owned by the user
    const deletePromises = snapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    // Step 3: Delete the user from the Users collection
    await db.collection('Users').doc(userId).delete();

    // Step 4: Delete the user from authentication
    await admin.auth().deleteUser(userId);

    res.status(200).json({ message: 'User and their scrapbooks deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user and their scrapbooks:', error);
    res.status(500).json({ error: 'An error occurred while deleting the user and their scrapbooks.' });
  }
});

router.get('/reported-users', async (req, res) => {
  try {
    // Query for users with 'isReported' set to true
    const snapshot = await db.collection('Users').where('isReported', '==', true).get();

    // Map over the documents to format the user data
    const reportedUsers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ reportedUsers });
  } catch (error) {
    console.error('Error loading reported users:', error);
    res.status(500).json({ error: 'An error occurred while loading reported users.' });
  }
});

router.patch('/reported-users/:userId/ignore', async (req, res) => {
  const { userId } = req.params;

  try {
    // Update the 'isReported' field of the user document to false
    const userRef = db.collection('Users').doc(userId);
    await userRef.update({
      isReported: false
    });

    res.status(200).json({ message: 'User report ignored successfully.' });
  } catch (error) {
    console.error('Error ignoring user report:', error);
    res.status(500).json({ error: 'An error occurred while ignoring the user report.' });
  }
});

router.get('/reported-scrapbooks', async (req, res) => {
    try {
      // Query scrapbooks where 'isReported' is true
      const snapshot = await db.collection('scrapbooks')
        .where('isReported', '==', true)
        .get();
  
      // Process each scrapbook document
      const reportedScrapbookData = await Promise.all(snapshot.docs.map(async (scrapbookDoc) => {
        const scrapbookData = { id: scrapbookDoc.id, ...scrapbookDoc.data() };
        
        // Fetch user details of the scrapbook owner
        if (scrapbookData.ownerId) {
          const userDoc = await db.collection('Users').doc(scrapbookData.ownerId).get();
          
          // Add owner username if the user document exists
          scrapbookData.ownerUsername = userDoc.exists ? userDoc.data().email : 'Unknown User';
        }
  
        return scrapbookData;
      }));
  
      // Send the reported scrapbooks data as a response
      res.status(200).json(reportedScrapbookData);
  
    } catch (error) {
      console.error('Error loading reported scrapbooks:', error);
      res.status(500).json({ error: 'An error occurred while fetching reported scrapbooks.' });
    }
  });

router.patch('/reported-scrapbooks/:scrapbookId/ignore', async (req, res) => {
  const { scrapbookId } = req.params;

  try {
    // Update the 'isReported' field to false for the specified scrapbook
    const scrapbookRef = db.collection('scrapbooks').doc(scrapbookId);
    await scrapbookRef.update({
      isReported: false
    });

    res.status(200).json({ message: 'Scrapbook report ignored successfully.' });
  } catch (error) {
    console.error('Error ignoring scrapbook report:', error);
    res.status(500).json({ error: 'An error occurred while ignoring the scrapbook report.' });
  }
});

module.exports = router; 