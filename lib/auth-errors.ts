export function authError(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login')) return "That email and password don't match. Try again, or reset your password.";
  if (m.includes('email not confirmed')) return 'Please open the link we emailed you first, then sign in.';
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'There is already an account with this email. Sign in instead.';
  }
  if (m.includes('password') && (m.includes('at least') || m.includes('weak'))) {
    return 'Use a longer password: at least 8 characters.';
  }
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many tries. Wait a minute and try again.';
  if (m.includes('fetch')) return 'We could not reach the server. Check your internet connection.';
  return message || 'Something went wrong. Please try again.';
}
