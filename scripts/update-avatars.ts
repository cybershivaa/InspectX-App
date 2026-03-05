import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

// Initialize Firebase with your config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateAvatars() {
  try {
    console.log('Starting avatar update...');
    
    // Get all users from Firestore
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    let updateCount = 0;
    const batch = writeBatch(db);
    
    usersSnapshot.forEach((docSnapshot) => {
      const userData = docSnapshot.data();
      
      // Check if avatar is a placeholder URL
      if (userData.avatar && userData.avatar.includes('placehold.co')) {
        console.log(`Updating avatar for user: ${userData.name} (${userData.email})`);
        const userRef = doc(db, 'users', docSnapshot.id);
        batch.update(userRef, { avatar: '' });
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
