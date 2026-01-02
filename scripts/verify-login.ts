import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJX4PMaXqp0Ej6QRrdBZSqVxDIOZtmj1s",
  authDomain: "inspectx-325dc.firebaseapp.com",
  projectId: "inspectx-325dc",
  storageBucket: "inspectx-325dc.appspot.com",
  messagingSenderId: "852569201171",
  appId: "1:852569201171:web:c089b13f9cd862d240fde6",
  measurementId: "G-Q41G06CRBR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const testUsers = [
  { email: 'admin@inspectx.com', password: 'admin123' },
  { email: 'inspector@inspectx.com', password: 'inspector123' },
  { email: 'client@inspectx.com', password: 'client123' },
];

async function verifyLogin() {
  console.log('Verifying login credentials...\n');

  for (const user of testUsers) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, user.email, user.password);
      console.log(`✓ ${user.email} - Login successful (UID: ${userCredential.user.uid})`);
      await auth.signOut();
    } catch (error: any) {
      console.error(`✗ ${user.email} - Login failed: ${error.code}`);
    }
  }
  
  console.log('\n=== Test Complete ===');
  process.exit(0);
}

verifyLogin();
