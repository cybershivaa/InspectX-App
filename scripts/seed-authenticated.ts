import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, Timestamp, doc, setDoc, getDoc } from "firebase/firestore";

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

async function seedWithAuth() {
  try {
    console.log('Logging in as admin...');
    const userCredential = await signInWithEmailAndPassword(auth, 'admin@inspectx.com', 'admin123');
    console.log('✓ Logged in as admin');

    // Check if data already exists
    const metaDoc = await getDoc(doc(db, '_meta', 'seeded'));
    if (metaDoc.exists()) {
      console.log('⚠ Database already seeded. Skipping...');
      process.exit(0);
    }

    console.log('\nSeeding machines...');
    const mockMachines = [
      { id: 'm1', name: 'HT Motor', type: 'Motor', location: 'Building A', status: 'Active' },
      { id: 'm2', name: 'LT Motor', type: 'Motor', location: 'Building B', status: 'Active' },
      { id: 'm3', name: 'Cable Laying/Installation', type: 'Cable', location: 'Building C', status: 'Active' },
      { id: 'm4', name: 'Testing of Power Cables', type: 'Cable Testing', location: 'Lab 1', status: 'Active' },
      { id: 'm5', name: 'Cable Trays', type: 'Infrastructure', location: 'Building D', status: 'Active' },
      { id: 'm6', name: 'Earthing System', type: 'Safety', location: 'All Buildings', status: 'Active' },
      { id: 'm7', name: 'HT/LT SwitchGear', type: 'Switchgear', location: 'Substation', status: 'Active' },
      { id: 'm8', name: 'LT Panels', type: 'Panel', location: 'Building E', status: 'Active' },
    ];

    for (const machine of mockMachines) {
      await setDoc(doc(db, 'machines', machine.id), machine);
      console.log(`  ✓ Created machine: ${machine.name}`);
    }

    console.log('\nSeeding inspections...');
    const mockInspections = [
      {
        id: 'i1',
        machineId: 'm1',
        machineName: 'HT Motor',
        status: 'Completed',
        priority: 'High',
        assignedTo: 'John Inspector',
        assignedToId: 'inspector-id',
        requestedBy: 'Admin User',
        requestedById: userCredential.user.uid,
        dueDate: '2025-01-15',
        createdAt: Timestamp.now(),
        fullReportData: { motor: { rating: '100HP', voltage: '11kV' } }
      },
      {
        id: 'i2',
        machineId: 'm2',
        machineName: 'LT Motor',
        status: 'Pending',
        priority: 'Medium',
        assignedTo: 'John Inspector',
        assignedToId: 'inspector-id',
        requestedBy: 'Admin User',
        requestedById: userCredential.user.uid,
        dueDate: '2025-01-20',
        createdAt: Timestamp.now(),
      },
      {
        id: 'i3',
        machineId: 'm3',
        machineName: 'Cable Laying/Installation',
        status: 'Upcoming',
        priority: 'Low',
        assignedTo: 'John Inspector',
        assignedToId: 'inspector-id',
        requestedBy: 'Admin User',
        requestedById: userCredential.user.uid,
        dueDate: '2025-02-01',
        createdAt: Timestamp.now(),
      },
      {
        id: 'i4',
        machineId: 'm7',
        machineName: 'HT/LT SwitchGear',
        status: 'Completed',
        priority: 'High',
        assignedTo: 'John Inspector',
        assignedToId: 'inspector-id',
        requestedBy: 'Admin User',
        requestedById: userCredential.user.uid,
        dueDate: '2025-01-10',
        createdAt: Timestamp.now(),
        fullReportData: { switchgear: { type: 'VCB', rating: '630A' } }
      },
      {
        id: 'i5',
        machineId: 'm6',
        machineName: 'Earthing System',
        status: 'Failed',
        priority: 'High',
        assignedTo: 'John Inspector',
        assignedToId: 'inspector-id',
        requestedBy: 'Admin User',
        requestedById: userCredential.user.uid,
        dueDate: '2025-01-12',
        createdAt: Timestamp.now(),
        fullReportData: { earthing: { resistance: '15Ω', status: 'High' } }
      },
    ];

    for (const inspection of mockInspections) {
      await setDoc(doc(db, 'inspections', inspection.id), inspection);
      console.log(`  ✓ Created inspection: ${inspection.id}`);
    }

    // Mark as seeded
    await setDoc(doc(db, '_meta', 'seeded'), { seeded: true, timestamp: Timestamp.now() });

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nYou can now login with:');
    console.log('- admin@inspectx.com / admin123');
    console.log('- inspector@inspectx.com / inspector123');
    console.log('- client@inspectx.com / client123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedWithAuth();
