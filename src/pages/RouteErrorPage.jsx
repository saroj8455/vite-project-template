import { useEffect, useRef } from 'react';
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom';
import { reportAppError } from '../services/errorReporter';

export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();
  const hasReportedRef = useRef(false);

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let details = '';

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data?.message || 'The requested page could not be loaded.';
  } else if (error instanceof Error) {
    message = error.message;
    details = error.stack || '';
  }

  useEffect(() => {
    if (hasReportedRef.current) return;
    hasReportedRef.current = true;

    reportAppError(error, {
      surface: 'route_error_boundary',
    });
  }, [error]);

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-rose-600">Application Error</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-600">{message}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Reload App
          </button>
        </div>

        {details ? (
          <pre className="mt-5 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-200">
            {details}
          </pre>
        ) : null}
      </div>
    </section>
  );
}
