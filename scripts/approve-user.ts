import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

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

// Get pending request ID and password from command line
const requestId = process.argv[2];
const password = process.argv[3];

if (!requestId || !password) {
  console.error('Usage: tsx scripts/approve-user.ts <requestId> <password>');
  process.exit(1);
}

async function approveUserAuth() {
  try {
    // Get pending user data
    const pendingDocRef = doc(db, 'pendingUsers', requestId);
    const pendingDoc = await getDoc(pendingDocRef);
    
    if (!pendingDoc.exists()) {
      console.error('❌ Pending user request not found');
      process.exit(1);
    }
    
    const pendingData = pendingDoc.data();
    console.log(`Creating Firebase Auth user for: ${pendingData.email}`);
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      pendingData.email, 
      password
    );
    
    console.log('✓ Firebase Auth user created:', userCredential.user.uid);
    
    // Create Firestore user document
    const newUser = {
      id: userCredential.user.uid,
      name: pendingData.name,
      email: pendingData.email,
      role: pendingData.role,
      avatar: 'https://placehold.co/256.png',
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
    console.log('✓ User document created in Firestore');
    
    // Delete pending request
    await deleteDoc(pendingDocRef);
    console.log('✓ Pending request deleted');
    
    console.log('\n✅ User approved successfully!');
    console.log(`Email: ${pendingData.email}`);
    console.log(`Password: ${password}`);
    console.log('Please share these credentials securely with the user.');
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error approving user:', error.message);
    process.exit(1);
  }
}

approveUserAuth();
