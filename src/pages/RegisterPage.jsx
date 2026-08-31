import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../services/authService';

function message(error) {
  return error.response?.data?.message || 'Unable to create your account.';
}

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError('');
    setIsSubmitting(true);
    try {
      const data = await register(Object.fromEntries(formData));
      setSuccess(data.message);
      event.currentTarget.reset();
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return <AccountCard title="Create account" subtitle="Verify your email before you can join meetings."><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field name="firstName" label="First name" /><Field name="lastName" label="Last name" /></div><Field name="username" label="Username" hint="3-40 lowercase letters, numbers, _ or -" /><Field name="email" label="Email" type="email" /><Field name="password" label="Password" type="password" hint="At least 10 characters with uppercase, lowercase, and number." />{error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}{success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}<button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{isSubmitting ? 'Creating account...' : 'Create account'}</button></form></AccountCard>;
}

export function AccountCard({ title, subtitle, children }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8"><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-500">{subtitle}</p>{children}<p className="mt-5 text-center text-sm text-slate-600"><Link to="/login" className="font-medium text-blue-600 hover:text-blue-700">Back to sign in</Link></p></div></div>;
}

export function Field({ name, label, type = 'text', hint }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none ring-blue-500 focus:ring-2" />{hint ? <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span> : null}</label>;
}
