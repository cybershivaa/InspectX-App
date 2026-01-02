import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');
  initializeApp({
    credential: cert(serviceAccountPath)
  });
}

const db = getFirestore();

async function updateAvatars() {
  try {
    console.log('Starting avatar update...');
    
    // Get all users from Firestore
    const usersSnapshot = await db.collection('users').get();
    
    let updateCount = 0;
    const batch = db.batch();
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      
      // Check if avatar is a placeholder URL
      if (userData.avatar && userData.avatar.includes('placehold.co')) {
        console.log(`Updating avatar for user: ${userData.name} (${userData.email})`);
        batch.update(doc.ref, { avatar: '' });
        updateCount++;
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} user avatars`);
    } else {
      console.log('ℹ️  No avatars to update');
    }
    
  } catch (error) {
    console.error('❌ Error updating avatars:', error);
    process.exit(1);
  }
}

updateAvatars()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
