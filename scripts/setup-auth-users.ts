import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJX4PMaXqp0Ej6QRrdBZSqVxDIOZtmj1s",
  authDomain: "inspectx-325dc.firebaseapp.com",
  projectId: "inspectx-325dc",
  storageBucket: "inspectx-325dc.appspot.com",
  messagingSenderId: "852569201171",
  appId: "1:852569201171:web:c089b13f9cd862d240fde6",
  measurementId: "G-Q41G06CRBR"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const testUsers = [
  {
    email: 'admin@inspectx.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'Admin' as const,
    avatar: 'https://placehold.co/128x128.png'
  },
  {
    email: 'inspector@inspectx.com',
    password: 'inspector123',
    name: 'Inspector User',
    role: 'Inspector' as const,
    avatar: 'https://placehold.co/128x128.png'
  },
  {
    email: 'client@inspectx.com',
    password: 'client123',
    name: 'Client User',
    role: 'Client' as const,
    avatar: 'https://placehold.co/128x128.png'
  }
];

async function setupUsers() {
  console.log('🔧 Setting up authentication test users...\n');

  for (const userData of testUsers) {
    try {
      // Try to sign in first to check if user exists
      try {
        await signInWithEmailAndPassword(auth, userData.email, userData.password);
        console.log(`✓ User ${userData.email} already exists`);
      } catch (signInError: any) {
        // If sign in fails, create the user
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password' || signInError.code === 'auth/invalid-credential') {
          console.log(`  Creating user: ${userData.email}`);
          const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
          
          // Create Firestore user document
          const userDoc = {
            id: userCredential.user.uid,
            name: userData.name,
            email: userData.email,
            role: userData.role,
            avatar: userData.avatar
          };
          
          await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
          console.log(`  ✓ Created ${userData.role}: ${userData.email}`);
        } else {
          throw signInError;
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`  ⚠ User ${userData.email} exists but password may be different`);
      } else {
        console.error(`  ✗ Error with ${userData.email}:`, error.message);
      }
    }
  }

  console.log('\n✅ User setup complete!');
  console.log('\nTest Credentials:');
  testUsers.forEach(u => {
    console.log(`  ${u.role}: ${u.email} / ${u.password}`);
  });

  process.exit(0);
}

setupUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
