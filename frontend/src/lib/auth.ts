import { supabase } from './supabaseClient';

export const signUp = async (email: string, password: string) => {
  try {
    const { data: { user }, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data: user, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'An unexpected error occurred during sign up' } };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data: { user, session }, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'An unexpected error occurred during sign in' } };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error: any) {
    return { error: { message: error.message || 'An unexpected error occurred during sign out' } };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { data: user, error };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'An unexpected error occurred while fetching user' } };
  }
};
