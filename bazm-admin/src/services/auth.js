import { supabase } from '../lib/supabase';

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export const signOut = () => supabase.auth.signOut();