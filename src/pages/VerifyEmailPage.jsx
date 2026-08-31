import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../services/authService';
import { AccountCard } from './RegisterPage';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, message: '' });
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setState({ loading: false, message: 'This verification link is invalid.' });
      return;
    }
    verifyEmail(token).then((data) => setState({ loading: false, message: data.message })).catch((error) => setState({ loading: false, message: error.response?.data?.message || 'Unable to verify this email.' }));
  }, [searchParams]);
  return <AccountCard title="Email verification" subtitle="Secure account onboarding"><p className={`mt-6 text-sm font-medium ${state.message.includes('verified') ? 'text-emerald-700' : 'text-rose-600'}`}>{state.loading ? 'Verifying your email...' : state.message}</p></AccountCard>;
}
