import { createClient } from '@supabase/supabase-js';

// Public, client-safe credentials (equivalent to the old Firebase config).
// Security is enforced by Row Level Security policies in the database, not by hiding this key.
const SUPABASE_URL = "https://kcdyyeiohxohpilcjaof.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ya_sE8HcZL3j2WD4pFqJlA_8cICHEYq";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ------------------ AUTH HELPERS ------------------

/** Sends a magic link email to the given address. The user clicks it to complete sign-in. */
export async function sendAdminMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
}

/** Checks whether the given email exists in the `admins` whitelist table. */
export async function checkIsAdmin(email: string): Promise<boolean> {
  if (!email) return false;
  const { data, error } = await supabase
    .from('admins')
    .select('email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error) {
    console.error('Erro ao verificar status de admin:', error);
    return false;
  }
  return !!data;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}

// ------------------ IMAGE UPLOAD (replaces imgbb) ------------------

/** Uploads a file to the `product-images` public bucket and returns its public URL. */
export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from('product-images')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('product-images').getPublicUrl(path);
  return data.publicUrl;
}

// ------------------ CASE CONVERSION HELPERS ------------------
// Postgres columns are snake_case; the app's TS types are camelCase.

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

export function rowToCamel<T = any>(row: Record<string, any>): T {
  const out: Record<string, any> = {};
  for (const key in row) {
    out[snakeToCamel(key)] = row[key];
  }
  return out as T;
}

export function objectToSnake(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key in obj) {
    if (obj[key] !== undefined) out[camelToSnake(key)] = obj[key];
  }
  return out;
}
