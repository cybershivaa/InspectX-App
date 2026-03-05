import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role, pendingUserId } = body;
    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Use service role key — bypasses RLS for all operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Try to create user in Supabase Auth
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });

    let resolvedUserId: string;

    if (authError) {
      // User may already exist in Auth — look them up by email
      const { data: listData, error: listError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (listError) return NextResponse.json({ error: listError.message }, { status: 400 });
      const existingAuthUser = listData.users.find(u => u.email === email);
      if (!existingAuthUser) {
        // Truly a different error
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }
      resolvedUserId = existingAuthUser.id;
    } else {
      resolvedUserId = authUser.user?.id || '';
      if (!resolvedUserId) {
        return NextResponse.json({ error: 'User creation failed: no user ID returned.' }, { status: 500 });
      }
    }

    // 2. Upsert into users table (handles both new and already-existing users)
    const { error: upsertError } = await adminClient.from('users').upsert({
      id: resolvedUserId,
      name,
      email,
      role,
      avatar: '',
    });
    if (upsertError) {
      // If we just created the auth user, roll it back
      if (!authError) await adminClient.auth.admin.deleteUser(resolvedUserId);
      return NextResponse.json({ error: `Failed to create user profile: ${upsertError.message}` }, { status: 500 });
    }

    // 3. Delete from pending_users
    if (pendingUserId) {
      await adminClient.from('pending_users').delete().eq('id', pendingUserId);
    }

    return NextResponse.json({ user: { id: resolvedUserId, email, name, role } }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
