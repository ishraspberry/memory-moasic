const express = require('express');
const router = express.Router();
const admin = require('../config/firebase-admin');
const { query, where } = require('firebase-admin/firestore');

// Delete scrapbook endpoint
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = admin.firestore();

    // Get the scrapbook to check ownership and get collaborators
    const scrapbookRef = db.collection('scrapbooks').doc(id);
    const scrapbook = await scrapbookRef.get();

    if (!scrapbook.exists) {
      return res.status(404).json({ error: 'Scrapbook not found' });
    }

    const scrapbookData = scrapbook.data();

    // Update owner's ScrapbooksAccessed array
    const ownerRef = db.collection('Users').doc(scrapbookData.ownerId);
    await ownerRef.update({
      ScrapbooksAccessed: admin.firestore.FieldValue.arrayRemove({
        id: id,
        permissionLevel: 2
      })
    });

    // Update collaborators' ScrapbooksAccessed arrays
    const collaboratorPromises = scrapbookData.collaborators.map(async (collab) => {
      const userQuery = await db.collection('Users')
        .where('email', '==', collab.email)
        .get();

      if (!userQuery.empty) {
        const userDoc = userQuery.docs[0];
        await userDoc.ref.update({
          ScrapbooksAccessed: admin.firestore.FieldValue.arrayRemove({
            id: id,
            permissionLevel: collab.role === 'editor' ? 2 : 1
          })
        });
      }
    });

    await Promise.all(collaboratorPromises);

    // Delete the scrapbook
    await scrapbookRef.delete();

    // Update scrapbook counts for all affected users
    const updateUserScrapbookCount = async (userId) => {
      const userScrapbooksQuery = await db.collection('scrapbooks')
        .where('ownerId', '==', userId)
        .get();
      
      const userCollabQuery = await db.collection('scrapbooks')
        .where('collaborators', 'array-contains', {
          email: (await db.collection('Users').doc(userId).get()).data().email
        })
        .get();

      const totalCount = userScrapbooksQuery.size + userCollabQuery.size;
      
      await db.collection('Users').doc(userId).update({
        totalScrapbooks: totalCount
      });
    };

    // Update owner's count
    await updateUserScrapbookCount(scrapbookData.ownerId);

    // Update collaborators' counts
    for (const collab of scrapbookData.collaborators) {
      const userQuery = await db.collection('Users')
        .where('email', '==', collab.email)
        .get();
      
      if (!userQuery.empty) {
        await updateUserScrapbookCount(userQuery.docs[0].id);
      }
    }

    res.status(200).json({ message: 'Scrapbook deleted successfully' });
  } catch (error) {
    console.error('Error deleting scrapbook:', error);
    res.status(500).json({ error: 'Failed to delete scrapbook' });
  }
});

// Create scrapbook endpoint
router.post('/', async (req, res) => {
  try {
    const { title, ownerId, visibility = 'private' } = req.body;
    const db = admin.firestore();

    // Create the scrapbook
    const scrapbookRef = await db.collection('scrapbooks').add({
      title,
      ownerId,
      createdAt: new Date().toISOString(),
      collaborators: [],
      visibility
    });

    // Update user's ScrapbooksAccessed array
    const userRef = db.collection('Users').doc(ownerId);
    await userRef.update({
      ScrapbooksAccessed: admin.firestore.FieldValue.arrayUnion({
        id: scrapbookRef.id,
        permissionLevel: 2 // 2 for edit access
      })
    });

    res.status(201).json({
      id: scrapbookRef.id,
      message: 'Scrapbook created successfully'
    });
  } catch (error) {
    console.error('Error creating scrapbook:', error);
    res.status(500).json({ error: 'Failed to create scrapbook' });
  }
});

// Get all scrapbooks for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 5 } = req.query;
    const db = admin.firestore();

    // Get user's email for collaborator check
    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userEmail = userDoc.data().email;

    // Get scrapbooks where user is owner or collaborator
    const ownedScrapbooks = await db.collection('scrapbooks')
      .where('ownerId', '==', userId)
      .get();

    const collaboratedScrapbooks = await db.collection('scrapbooks')
      .where('collaborators', 'array-contains', {
        email: userEmail,
      })
      .get();

    // Combine and format results
    let allScrapbooks = [
      ...ownedScrapbooks.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isOwner: true
      })),
      ...collaboratedScrapbooks.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isOwner: false
      }))
    ];

    // Sort by creation date
    allScrapbooks.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Calculate pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const totalPages = Math.ceil(allScrapbooks.length / parseInt(limit));
    const paginatedScrapbooks = allScrapbooks.slice(startIndex, endIndex);

    res.status(200).json({
      scrapbooks: paginatedScrapbooks,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: allScrapbooks.length
      }
    });
  } catch (error) {
    console.error('Error fetching scrapbooks:', error);
    res.status(500).json({ error: 'Failed to fetch scrapbooks' });
  }
});

module.exports = router; 