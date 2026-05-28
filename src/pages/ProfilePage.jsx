import { useRouteLoaderData } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useRouteLoaderData('app');

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <p className="mt-2 text-sm text-slate-600">Your account information from DummyJSON auth API.</p>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <img
          src={user?.image}
          alt={user?.username}
          className="h-24 w-24 rounded-full border border-slate-200 object-cover"
        />

        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {user?.firstName} {user?.lastName}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p>
            <p className="mt-1 text-base font-semibold text-slate-900">{user?.username}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1 break-all text-base font-semibold text-slate-900">{user?.email}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
