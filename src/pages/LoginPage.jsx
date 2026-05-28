import { useState } from 'react';
import { Form, useActionData, useNavigation, useSearchParams } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock, FiUser } from 'react-icons/fi';

export default function LoginPage() {
  const actionData = useActionData();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const [showPassword, setShowPassword] = useState(false);

  const isSubmitting = navigation.state === 'submitting';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Login to access your dashboard and profile.</p>

        <Form method="post" className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <label className="block text-sm font-medium text-slate-700">
            Username
            <div className="relative mt-1">
              <FiUser className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                name="username"
                defaultValue="emilys"
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-slate-900 outline-none ring-blue-500 focus:ring-2"
                required
              />
            </div>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <div className="relative mt-1">
              <FiLock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                defaultValue="emilyspass"
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-10 text-slate-900 outline-none ring-blue-500 focus:ring-2"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </label>

          {actionData?.error ? <p className="text-sm font-medium text-rose-600">{actionData.error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </Form>
      </div>
    </div>
  );
}
