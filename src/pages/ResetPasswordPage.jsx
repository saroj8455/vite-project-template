import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/authService';
import { AccountCard, Field } from './RegisterPage';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ error: '', success: '', submitting: false });
  const token = searchParams.get('token');
  const submit = async (event) => {
    event.preventDefault();
    if (!token) return setState({ error: 'This reset link is invalid.', success: '', submitting: false });
    setState({ error: '', success: '', submitting: true });
    try {
      const data = await resetPassword(token, new FormData(event.currentTarget).get('password'));
      setState({ error: '', success: data.message, submitting: false });
    } catch (error) {
      setState({ error: error.response?.data?.message || 'Unable to reset password.', success: '', submitting: false });
    }
  };
  return <AccountCard title="Choose a new password" subtitle="Your reset link expires after 30 minutes."><form onSubmit={submit} className="mt-6 space-y-4"><Field name="password" label="New password" type="password" hint="At least 10 characters with uppercase, lowercase, and number." />{state.error ? <p className="text-sm font-medium text-rose-600">{state.error}</p> : null}{state.success ? <p className="text-sm font-medium text-emerald-700">{state.success}</p> : null}<button type="submit" disabled={state.submitting || !token} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{state.submitting ? 'Updating...' : 'Update password'}</button></form></AccountCard>;
}
