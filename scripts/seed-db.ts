import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, Timestamp } from "firebase/firestore";

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
const db = getFirestore(app);

// Mock users with passwords
const mockUsers = [
  { 
    name: 'Admin User', 
    email: 'admin@inspectx.com', 
    password: 'admin123',
    role: 'Admin', 
    avatar: 'https://placehold.co/128x128.png' 
  },
  { 
    name: 'Inspector Gadget', 
    email: 'inspector@inspectx.com', 
    password: 'inspector123',
    role: 'Inspector', 
    avatar: 'https://placehold.co/128x128.png' 
  },
  { 
    name: 'Client Corp', 
    email: 'client@inspectx.com', 
    password: 'client123',
    role: 'Client', 
    avatar: 'https://placehold.co/128x128/EFEFEF/7F7F7F.png' 
  },
];

const mockMachines = [
  { id: 'm1', name: 'HT Motor', machineId: 'NTPC-HTM-001', status: 'Active', lastInspection: '2024-07-15', nextInspection: '2025-01-15' },
  { id: 'm2', name: 'LT Motor', machineId: 'NTPC-LTM-002', status: 'Active', lastInspection: '2024-07-16', nextInspection: '2025-01-16' },
  { id: 'm3', name: 'Cable Laying/Installation', machineId: 'NTPC-CBL-003', status: 'Maintenance', lastInspection: '2024-06-20', nextInspection: '2024-12-20' },
  { id: 'm4', name: 'Testing of Power Cables', machineId: 'NTPC-TPC-004', status: 'Active', lastInspection: '2024-07-01', nextInspection: '2025-01-01' },
  { id: 'm5', name: 'Cable Trays', machineId: 'NTPC-CT-005', status: 'Inactive', lastInspection: '2023-01-10', nextInspection: '2023-07-10' },
  { id: 'm6', name: 'Earthing System', machineId: 'NTPC-ES-006', status: 'Active', lastInspection: '2024-05-30', nextInspection: '2024-11-30' },
  { id: 'm7', name: 'HT/LT SwitchGear', machineId: 'NTPC-SWG-007', status: 'Active', lastInspection: '2024-07-18', nextInspection: '2025-01-18' },
  { id: 'm8', name: 'LT Panels', machineId: 'NTPC-LTP-008', status: 'Maintenance', lastInspection: '2024-07-05', nextInspection: '2024-08-05' },
];

const mockInspections = [
  {
    id: 'i1',
    machineId: 'm1',
    machineName: 'HT Motor',
    status: 'Completed',
    priority: 'High',
    assignedTo: 'Inspector Gadget',
    dueDate: '2025-01-15',
    createdAt: Timestamp.fromDate(new Date('2024-12-20')),
  },
  {
    id: 'i2',
    machineId: 'm2',
    machineName: 'LT Motor',
    status: 'Pending',
    priority: 'Medium',
    assignedTo: 'Inspector Gadget',
    dueDate: '2025-01-16',
    createdAt: Timestamp.fromDate(new Date('2024-12-22')),
  },
  {
    id: 'i3',
    machineId: 'm3',
    machineName: 'Cable Laying/Installation',
    status: 'Failed',
    priority: 'High',
    assignedTo: 'Inspector Gadget',
    dueDate: '2024-12-20',
    createdAt: Timestamp.fromDate(new Date('2024-12-10')),
  },
  {
    id: 'i4',
    machineId: 'm7',
    machineName: 'HT/LT SwitchGear',
    status: 'Upcoming',
    priority: 'Low',
    assignedTo: null,
    dueDate: '2025-01-18',
    createdAt: Timestamp.fromDate(new Date('2024-12-25')),
  },
  {
    id: 'i5',
    machineId: 'm8',
    machineName: 'LT Panels',
    status: 'Pending',
    priority: 'Medium',
    assignedTo: 'Inspector Gadget',
    dueDate: '2025-01-05',
    createdAt: Timestamp.fromDate(new Date('2024-12-26')),
  },
];

async function seedDatabase() {
  console.log('Starting database seeding...\n');

  let adminUid = '';

  // Seed users
  console.log('1. Seeding users...');
  for (const user of mockUsers) {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        user.email, 
        user.password
      );
      
      const firebaseUser = userCredential.user;
      console.log(`   ✓ Created auth user: ${user.email}`);
      
      if (user.role === 'Admin') {
        adminUid = firebaseUser.uid;
      }

      // Create user document in Firestore
      const userDoc = {
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      };

      await setDoc(doc(db, "users", firebaseUser.uid), userDoc);
      console.log(`   ✓ Created Firestore document for: ${user.email}`);
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`   ⚠ User already exists: ${user.email}`);
        // Try to get the admin UID for existing users
        if (user.role === 'Admin') {
          try {
            const { signInWithEmailAndPassword } = await import("firebase/auth");
            const cred = await signInWithEmailAndPassword(auth, user.email, user.password);
            adminUid = cred.user.uid;
          } catch {}
        }
      } else {
        console.error(`   ✗ Error creating user ${user.email}:`, error.message);
      }
    }
  }
  
  // Sign in as admin to have write permissions
  if (!auth.currentUser && adminUid) {
    console.log('\n   Note: Already authenticated as admin for data seeding');
  }

  // Seed machines
  console.log('\n2. Seeding machines...');
  for (const machine of mockMachines) {
    try {
      await setDoc(doc(db, "machines", machine.id), machine);
      console.log(`   ✓ Created machine: ${machine.name}`);
    } catch (error: any) {
      console.error(`   ✗ Error creating machine ${machine.name}:`, error.message);
    }
  }

  // Seed inspections
  console.log('\n3. Seeding inspections...');
  for (const inspection of mockInspections) {
    try {
      await setDoc(doc(db, "inspections", inspection.id), inspection);
      console.log(`   ✓ Created inspection: ${inspection.machineName} (${inspection.status})`);
    } catch (error: any) {
      console.error(`   ✗ Error creating inspection ${inspection.id}:`, error.message);
    }
  }

  console.log('\n✓ Database seeding completed!');
  console.log('\n=== Login Credentials ===');
  console.log('- admin@inspectx.com / admin123');
  console.log('- inspector@inspectx.com / inspector123');
  console.log('- client@inspectx.com / client123');
  console.log('\n=== Summary ===');
  console.log(`Users: ${mockUsers.length}`);
  console.log(`Machines: ${mockMachines.length}`);
  console.log(`Inspections: ${mockInspections.length}`);
  
  process.exit(0);
}

seedDatabase();
