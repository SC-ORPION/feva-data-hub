import { supabase } from './client';

// Users table operations
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateUserProfile(userId: string, updates: any) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Transactions
export async function getTransactions(userId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function createTransaction(transaction: any) {
  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Wallet operations
export async function getWallet(userId: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateWalletBalance(userId: string, amount: number) {
  const { data, error } = await supabase.rpc('update_wallet_balance', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) throw error;
  return data;
}

// Admin operations
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updatePricing(pricing: any) {
  const { error } = await supabase
    .from('pricing')
    .update({ prices: pricing })
    .eq('id', 1);

  if (error) throw error;
}

export async function getPricing() {
  const { data, error } = await supabase
    .from('pricing')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
