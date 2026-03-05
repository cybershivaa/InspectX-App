const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pcodkpfvenewjxhzvoth.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjb2RrcGZ2ZW5ld2p4aHp2b3RoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYyMzUyNCwiZXhwIjoyMDg2MTk5NTI0fQ.olMGLq9SBTe41jt5rUWUbDeZWTNOuujHDXt7Ke66thw'
);

const ADMIN_EMAIL    = 'shivamkumar07513@gmail.com';
const ADMIN_PASSWORD = 'Shivam@123';
const ADMIN_NAME     = 'Shivam Kumar';

async function createAdmin() {
  console.log('Creating admin auth user...');

  // 1. Try to create auth user
  let authUserId;
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: ADMIN_NAME, role: 'Admin' },
  });

  if (createError) {
    // If already exists, find the user
    if (createError.message.includes('already') || createError.message.includes('duplicate') || createError.code === 'email_exists') {
      console.log('Auth user already exists, looking up by email...');
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) { console.error('List error:', listError); process.exit(1); }
      const existing = listData.users.find(u => u.email === ADMIN_EMAIL);
      if (!existing) { console.error('User not found after create failure'); process.exit(1); }
      authUserId = existing.id;
      console.log('Found existing auth user:', authUserId);

      // Update password just in case
      await supabase.auth.admin.updateUserById(authUserId, {
        password: ADMIN_PASSWORD,
        user_metadata: { name: ADMIN_NAME, role: 'Admin' },
      });
      console.log('Password updated.');
    } else {
      console.error('Create user error:', createError);
      process.exit(1);
    }
  } else {
    authUserId = createData.user.id;
    console.log('Auth user created:', authUserId);
  }

  // 2. Upsert into public.users table
  const { error: upsertError } = await supabase
    .from('users')
    .upsert({
      id: authUserId,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      role: 'Admin',
      avatar: '',
    }, { onConflict: 'id' });

  if (upsertError) {
    console.error('Failed to upsert into users table:', upsertError);
    process.exit(1);
  }

  console.log('\n✅ Admin user ready!');
  console.log('   Email   :', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
  console.log('   Role    : Admin');
  console.log('   ID      :', authUserId);
}

createAdmin();
