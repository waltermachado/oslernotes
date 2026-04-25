import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createSuperAdmin() {
  const email = 'super@oslernotes.com';
  const password = 'Osler1411@';
  const role = 'super_admin';
  const name = 'Super Admin';

  try {
    console.log('Creating super admin user in Supabase Auth...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        full_name: name,
      },
    });

    if (authError) {
      if (authError.message.includes('already has an account') || authError.code === 'email_exists') {
         console.log('Super admin user already exists in Auth.');
         // We need to fetch the existing user's ID
         const { data: { users }, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
         if (fetchError) throw fetchError;
         
         const existingUser = users.find(u => u.email === email);
          if (existingUser) {
            const userId = existingUser.id;
            console.log(`Found existing user in Auth with ID: ${userId}`);
            
            // Update password for existing user
            const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
              userId,
              { password: password }
            );
            if (updateAuthError) {
              console.error('Error updating auth user password:', updateAuthError);
            } else {
              console.log('Successfully updated password for existing auth user.');
            }

            // Verify/Insert into public.usuarios
            console.log('Verifying/Inserting into public.usuarios...');
            const { data: dbUser, error: checkError } = await supabaseAdmin
             .from('usuarios')
             .select('id')
             .eq('id', userId)
             .single();

           if (!dbUser && checkError?.code === 'PGRST116') {
               const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
                 id: userId,
                 email,
                 nome: name,
                 papel: role,
               });

               if (insertError) {
                 console.error('Error inserting into public.usuarios:', insertError);
                 throw insertError;
               }
               console.log('Successfully inserted into public.usuarios.');
           } else if (checkError && checkError.code !== 'PGRST116') {
               console.error('Error checking public.usuarios:', checkError);
           } else {
               console.log('User already exists in public.usuarios.');
           }
         }
         return;
      }
      throw authError;
    }

    const userId = authData.user.id;
    console.log(`User created in Auth with ID: ${userId}`);
    
    // Note: The public.usuarios table should be automatically populated by the trigger
    // we created in the SQL migration. But let's verify it or insert if missing just in case.
    
    // Verify/Insert into public.usuarios
    console.log('Verifying/Inserting into public.usuarios...');
    const { data: dbUser, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('id')
      .eq('id', userId)
      .single();

    const checkCode = readStringProp(checkError, 'code');

    if (!dbUser || checkCode === 'PGRST116') {
        console.log('User not found in public.usuarios, inserting...');
        const { error: insertError } = await supabaseAdmin.from('usuarios').insert({
          id: userId,
          email,
          nome: name,
          papel: role,
          senha_hash: 'dummy' // since senha_hash is NOT NULL in the actual table schema
        });

        if (insertError) {
          console.error('Error inserting into public.usuarios:', insertError);
          throw insertError;
        }
        console.log('Successfully inserted into public.usuarios.');
    } else if (checkError && checkCode !== 'PGRST116') {
        console.error('Error checking public.usuarios:', checkError);
    } else {
        console.log('User already exists in public.usuarios.');
        // Update to ensure the role is correct just in case
        const { error: updateError } = await supabaseAdmin.from('usuarios').update({
          papel: role,
          nome: name
        }).eq('id', userId);
        
        if (updateError) {
           console.error('Error updating public.usuarios:', updateError);
        } else {
           console.log('Successfully updated user in public.usuarios.');
        }
    }

    console.log('Super admin creation process completed successfully.');
  } catch (error) {
    console.error('Failed to create super admin:', error);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readStringProp(value: unknown, key: string) {
  if (!isRecord(value)) return null;
  const v = value[key];
  return typeof v === 'string' ? v : null;
}

createSuperAdmin();
