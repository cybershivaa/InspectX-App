import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Firebase config - same as in your firebase.ts
const firebaseConfig = {
  apiKey: "AIzaSyDDK0tEhT8xmG3WZNfm6oJKb1t_j_b8BEg",
  authDomain: "inspectx-4e6df.firebaseapp.com",
  projectId: "inspectx-4e6df",
  storageBucket: "inspectx-4e6df.firebasestorage.app",
  messagingSenderId: "730620068848",
  appId: "1:730620068848:web:ac2dbf6b41fcaf5d20f933",
  measurementId: "G-DZFQ24RFQT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleMachines = [
  {
    machineId: "NTPC-BARH-HT-001",
    name: "HT Motor Unit 1",
    status: "Active",
    location: "Unit 1 - Main Building",
    lastInspection: new Date('2025-12-15').toISOString(),
    model: "ABB HT Motor 11kV 500HP"
  },
  {
    machineId: "NTPC-BARH-HT-002",
    name: "HT Motor Unit 2",
    status: "Active",
    location: "Unit 2 - Main Building",
    lastInspection: new Date('2025-12-10').toISOString(),
    model: "Siemens HT Motor 11kV 750HP"
  },
  {
    machineId: "NTPC-BARH-LT-001",
    name: "LT Motor Cooling Tower 1",
    status: "Active",
    location: "Cooling Tower Area",
    lastInspection: new Date('2025-12-20').toISOString(),
    model: "Crompton LT Motor 415V 50HP"
  },
  {
    machineId: "NTPC-BARH-LT-002",
    name: "LT Motor Cooling Tower 2",
    status: "Maintenance",
    location: "Cooling Tower Area",
    lastInspection: new Date('2025-11-25').toISOString(),
    model: "Crompton LT Motor 415V 50HP"
  },
  {
    machineId: "NTPC-BARH-SWG-001",
    name: "HT Switchgear Panel A",
    status: "Active",
    location: "Switchgear Room 1",
    lastInspection: new Date('2025-12-18').toISOString(),
    model: "Schneider Electric 11kV Switchgear"
  },
  {
    machineId: "NTPC-BARH-SWG-002",
    name: "LT Switchgear Panel B",
    status: "Active",
    location: "Switchgear Room 2",
    lastInspection: new Date('2025-12-12').toISOString(),
    model: "ABB 415V LT Panel"
  },
  {
    machineId: "NTPC-BARH-BD-001",
    name: "Busduct System 1",
    status: "Active",
    location: "Main Distribution Room",
    lastInspection: new Date('2025-12-08').toISOString(),
    model: "L&T Busduct 3000A"
  },
  {
    machineId: "NTPC-BARH-ES-001",
    name: "Earthing System Grid 1",
    status: "Active",
    location: "Substation Area",
    lastInspection: new Date('2025-12-05').toISOString(),
    model: "Copper Earthing Grid 500sqmm"
  },
  {
    machineId: "NTPC-BARH-CT-001",
    name: "Cable Tray System Block A",
    status: "Active",
    location: "Block A - Cable Gallery",
    lastInspection: new Date('2025-12-22').toISOString(),
    model: "GI Cable Tray 600mm"
  },
  {
    machineId: "NTPC-BARH-CT-002",
    name: "Cable Tray System Block B",
    status: "Active",
    location: "Block B - Cable Gallery",
    lastInspection: new Date('2025-12-19').toISOString(),
    model: "GI Cable Tray 600mm"
  },
  {
    machineId: "NTPC-BARH-CL-001",
    name: "Power Cable Route 1",
    status: "Active",
    location: "Underground Cable Trench 1",
    lastInspection: new Date('2025-12-14').toISOString(),
    model: "XLPE 11kV 3C x 240sqmm"
  },
  {
    machineId: "NTPC-BARH-CL-002",
    name: "Power Cable Route 2",
    status: "Active",
    location: "Underground Cable Trench 2",
    lastInspection: new Date('2025-12-16').toISOString(),
    model: "XLPE 415V 4C x 185sqmm"
  },
  {
    machineId: "NTPC-BARH-LTP-001",
    name: "LT Distribution Panel 1",
    status: "Active",
    location: "Auxiliary Building Floor 1",
    lastInspection: new Date('2025-12-11').toISOString(),
    model: "Siemens SIVACON 415V Panel"
  },
  {
    machineId: "NTPC-BARH-LTP-002",
    name: "LT Distribution Panel 2",
    status: "Active",
    location: "Auxiliary Building Floor 2",
    lastInspection: new Date('2025-12-13').toISOString(),
    model: "Siemens SIVACON 415V Panel"
  },
  {
    machineId: "NTPC-BARH-LT-003",
    name: "Station Lighting System 1",
    status: "Active",
    location: "Main Building External",
    lastInspection: new Date('2025-12-09').toISOString(),
    model: "LED Flood Lights 250W"
  },
  {
    machineId: "NTPC-BARH-LP-001",
    name: "Lighting Pole Array A",
    status: "Active",
    location: "Yard Area North",
    lastInspection: new Date('2025-12-17').toISOString(),
    model: "12M High Mast with LED Fixtures"
  },
  {
    machineId: "NTPC-BARH-LP-002",
    name: "Lighting Pole Array B",
    status: "Maintenance",
    location: "Yard Area South",
    lastInspection: new Date('2025-11-30').toISOString(),
    model: "12M High Mast with LED Fixtures"
  },
  {
    machineId: "NTPC-BARH-TR-001",
    name: "Power Transformer 1",
    status: "Active",
    location: "Transformer Yard",
    lastInspection: new Date('2025-12-21').toISOString(),
    model: "ABB 33/11kV 25MVA"
  },
  {
    machineId: "NTPC-BARH-TR-002",
    name: "Power Transformer 2",
    status: "Active",
    location: "Transformer Yard",
    lastInspection: new Date('2025-12-23').toISOString(),
    model: "ABB 33/11kV 25MVA"
  },
  {
    machineId: "NTPC-BARH-DG-001",
    name: "Diesel Generator Set 1",
    status: "Active",
    location: "DG Room",
    lastInspection: new Date('2025-12-07').toISOString(),
    model: "Cummins 1500kVA DG Set"
  }
];

async function seedMachines() {
  try {
    console.log('🔄 Starting machine seeding process...\n');
    
    // Check if machines already exist
    const existingMachines = await getDocs(collection(db, 'machines'));
    
    if (existingMachines.size > 0) {
      console.log(`⚠️  Found ${existingMachines.size} existing machines in database.`);
      console.log('📋 Existing machine IDs:');
      existingMachines.forEach(doc => {
        console.log(`   - ${doc.data().machineId}: ${doc.data().name}`);
      });
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return; // Exit if machines exist
    }
    
    console.log('📝 Adding sample machines to database...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const machine of sampleMachines) {
      try {
        // Check if machine with same ID already exists
        const existingQuery = query(
          collection(db, 'machines'),
          where('machineId', '==', machine.machineId)
        );
        const existing = await getDocs(existingQuery);
        
        if (existing.empty) {
          await addDoc(collection(db, 'machines'), {
            ...machine,
            createdAt: new Date().toISOString(),
          });
          console.log(`✅ Added: ${machine.machineId} - ${machine.name}`);
          successCount++;
        } else {
          console.log(`⏭️  Skipped: ${machine.machineId} (already exists)`);
        }
      } catch (error) {
        console.error(`❌ Failed to add ${machine.machineId}:`, error);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`✨ Machine seeding completed!`);
    console.log(`   ✅ Successfully added: ${successCount} machines`);
    if (failCount > 0) {
      console.log(`   ❌ Failed: ${failCount} machines`);
    }
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during machine seeding:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedMachines();
