import { useRouteLoaderData } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useRouteLoaderData('app');

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Account</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Profile</h1>
      <p className="mt-2 text-sm text-slate-600">Your account information managed by the React Meet server.</p>

      <div className="soft-card mt-8 flex flex-col gap-6 rounded-3xl p-5 sm:flex-row sm:items-center sm:p-7">
        <img
          src={user?.image}
          alt={user?.username}
          className="h-24 w-24 rounded-full ring-4 ring-teal-100 object-cover"
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
