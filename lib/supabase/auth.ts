import { supabase } from './client';

export async function signUp(email: string, password: string, userData?: any) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData || {},
      },
    });

    if (error) {
      throw new Error(error.message || 'Sign up failed');
    }

    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Sign up failed');
  }
}

export async function signIn(email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  try {
    const response = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (response.error) {
      if (response.error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password');
      }
      throw new Error(response.error.message || 'Login failed');
    }

    return response.data;
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    throw new Error(error.message || 'Sign out failed');
  }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  });

  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function getUserSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}
