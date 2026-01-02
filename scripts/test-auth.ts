import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";

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

async function testAuth() {
  console.log('🧪 Testing Firebase Authentication & Firestore Access\n');

  try {
    // Test 1: Login
    console.log('Test 1: Logging in as admin@inspectx.com...');
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@inspectx.com', 'admin123');
    console.log('✅ Login successful!');
    console.log(`   User ID: ${userCredential.user.uid}`);
    console.log(`   Email: ${userCredential.user.email}\n`);

    // Test 2: Firestore Read Access
    console.log('Test 2: Testing Firestore read access...');
    
    const collections = ['users', 'inspections', 'machines', 'pendingUsers'];
    
    for (const collectionName of collections) {
      try {
        const q = query(collection(db, collectionName), limit(1));
        const snapshot = await getDocs(q);
        console.log(`✅ ${collectionName}: ${snapshot.size} document(s) found`);
      } catch (error: any) {
        console.log(`❌ ${collectionName}: ${error.code || error.message}`);
      }
    }

    console.log('\n🎉 All tests completed!');
    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.code || error.message);
    if (error.code === 'auth/invalid-credential') {
      console.error('   The email or password is incorrect.');
      console.error('   Run: npm run setup-users to create test users');
    }
    process.exit(1);
  }
}

testAuth();
