const express = require('express');
const router = express.Router();
const admin = require('../config/firebase-admin');

// Get profile data
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = admin.firestore();

    const userDoc = await db.collection('Users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Count scrapbooks
    const scrapbooksQuery = await db.collection('scrapbooks')
      .where('ownerId', '==', userId)
      .get();
    
    const userEmail = userDoc.data().email;
    const collabQuery = await db.collection('scrapbooks')
      .where('collaborators', 'array-contains', {
        email: userEmail,
      })
      .get();

    const totalScrapbooks = scrapbooksQuery.size + collabQuery.size;

    // Update the count if it's different
    if (userDoc.data().totalScrapbooks !== totalScrapbooks) {
      await userDoc.ref.update({ totalScrapbooks });
    }

    res.status(200).json({
      ...userDoc.data(),
      totalScrapbooks
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile data' });
  }
});

// Update profile data
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { displayName, bio } = req.body;
    const db = admin.firestore();

    const userRef = db.collection('Users').doc(userId);
    await userRef.update({
      displayName,
      bio
    });

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update profile photo
router.post('/:userId/photo', async (req, res) => {
  try {
    const { userId } = req.params;
    const { photoURL } = req.body;
    const db = admin.firestore();

    const userRef = db.collection('Users').doc(userId);
    
    // Update both the photoURL and lastUpdated timestamp
    await userRef.update({
      photoURL,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get the updated user data to send back
    const updatedUser = await userRef.get();

    res.status(200).json({
      message: 'Profile photo updated successfully',
      user: {
        ...updatedUser.data(),
        id: userId
      }
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ error: 'Failed to update profile photo' });
  }
});

// Add password change endpoint
router.post('/:userId/change-password', async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    // Get user's email
    const db = admin.firestore();
    const userDoc = await db.collection('Users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password in Firebase Auth
    const user = await admin.auth().getUser(userId);
    await admin.auth().updateUser(userId, {
      password: newPassword,
    });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

module.exports = router; 