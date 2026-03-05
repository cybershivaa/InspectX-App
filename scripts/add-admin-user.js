const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcodkpfvenewjxhzvoth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb2RrcGZ2ZW5ld2p4aHp2b3RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYyMzUyNCwiZXhwIjoyMDg2MTk5NTI0fQ.olMGLq9SBTe41jt5rUWUbDeZWTNOuujHDXt7Ke66thw'
);

async function addAdminUser() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@example.com', // Change to your desired admin email
    password: 'Admin@1234',     // Change to a strong password
    email_confirm: true,
    user_metadata: { role: 'admin' }
  });

  if (error) {
    console.error('Error creating admin user:', error);
  } else {
    console.log('Admin user created:', data);
  }
}

addAdminUser();
