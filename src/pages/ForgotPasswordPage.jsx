import { useState } from 'react';
import { requestPasswordReset } from '../services/authService';
import { AccountCard, Field } from './RegisterPage';

export default function ForgotPasswordPage() {
  const [state, setState] = useState({ error: '', success: '', submitting: false });
  const submit = async (event) => {
    event.preventDefault();
    setState({ error: '', success: '', submitting: true });
    try {
      const data = await requestPasswordReset(new FormData(event.currentTarget).get('email'));
      setState({ error: '', success: data.message, submitting: false });
    } catch (error) {
      setState({ error: error.response?.data?.message || 'Unable to request a password reset.', success: '', submitting: false });
    }
  };
  return <AccountCard title="Reset password" subtitle="We will send a secure reset link if the account is eligible."><form onSubmit={submit} className="mt-6 space-y-4"><Field name="email" label="Email" type="email" />{state.error ? <p className="text-sm font-medium text-rose-600">{state.error}</p> : null}{state.success ? <p className="text-sm font-medium text-emerald-700">{state.success}</p> : null}<button type="submit" disabled={state.submitting} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{state.submitting ? 'Sending...' : 'Send reset link'}</button></form></AccountCard>;
}
