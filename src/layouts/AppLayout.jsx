import { useEffect, useState } from 'react';
import { NavLink, Outlet, useFetcher, useLocation, useNavigation, useRouteLoaderData } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon';

const primaryNav = [
  { to: '/dashboard', label: 'Overview', icon: 'dashboard' },
  { to: '/meeting', label: 'Meetings', icon: 'videocam' },
  { to: '/profile', label: 'My profile', icon: 'person' },
];

const secondaryNav = [
  { to: '/services', label: 'Services', icon: 'grid_view' },
  { to: '/contact', label: 'Support', icon: 'support_agent' },
  { to: '/native-geolocation', label: 'Native tools', icon: 'explore' },
];

const navClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
    isActive ? 'bg-white/12 text-white shadow-sm' : 'text-slate-300 hover:bg-white/7 hover:text-white'
  }`;

export default function AppLayout() {
  const { user } = useRouteLoaderData('app');
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isLoggingOut = fetcher.state !== 'idle';

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const renderNav = (items) => items.map((item) => (
    <NavLink key={item.to} to={item.to} className={navClass}>
      <MaterialIcon name={item.icon} />
      {item.label}
    </NavLink>
  ));

  return (
    <div className="app-shell min-h-screen bg-[#f6f7fb] text-slate-900">
      <aside className="product-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col p-4 lg:flex">
        <NavLink to="/dashboard" className="flex items-center gap-3 px-2 py-3 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-400 to-fuchsia-500 shadow-lg shadow-indigo-950/30">
            <MaterialIcon name="video_camera_front" />
          </span>
          <span className="text-lg font-bold tracking-tight">React Meet</span>
        </NavLink>

        <nav className="mt-8 space-y-1">{renderNav(primaryNav)}</nav>
        <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        <nav className="mt-2 space-y-1">{renderNav(secondaryNav)}</nav>

        <div className="mt-auto rounded-2xl bg-white/7 p-3">
          <div className="flex items-center gap-3 px-1">
            <img src={user?.image} alt="" className="h-9 w-9 rounded-xl bg-slate-700 object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.firstName} {user?.lastName}</p>
              <p className="truncate text-xs text-slate-400">@{user?.username}</p>
            </div>
          </div>
          <fetcher.Form method="post" action="/logout" className="mt-3">
            <button type="submit" disabled={isLoggingOut} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/8 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-rose-500 hover:text-white disabled:opacity-60">
              <MaterialIcon name="logout" className="text-base" /> {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </fetcher.Form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/70 px-4 backdrop-blur lg:h-20 lg:px-10">
          <div className="lg:hidden">
            <NavLink to="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-slate-950">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white"><MaterialIcon name="video_camera_front" className="text-lg" /></span>
              React Meet
            </NavLink>
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{navigation.state === 'idle' ? 'Everything is in sync' : 'Updating workspace...'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-right sm:block"><span className="block text-xs font-semibold text-slate-700">{user?.firstName} {user?.lastName}</span><span className="block text-[11px] text-slate-400">Personal workspace</span></span>
            <img src={user?.image} alt="" className="h-9 w-9 rounded-xl bg-slate-200 object-cover" />
            <button type="button" onClick={() => setDrawerOpen(true)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-700 lg:hidden" aria-label="Open navigation">
              <MaterialIcon name="menu" />
            </button>
          </div>
        </header>

        <main className="native-main-bottom mx-auto w-full max-w-7xl px-4 py-7 sm:px-7 lg:px-10 lg:py-9"><Outlet /></main>
      </div>

      <div className={`fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm transition lg:hidden ${drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`product-sidebar fixed inset-y-0 right-0 z-50 flex w-72 flex-col p-4 shadow-2xl transition-transform lg:hidden ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-2 py-2 text-white"><span className="font-bold">Navigate</span><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close navigation"><MaterialIcon name="close" /></button></div>
        <nav className="mt-6 space-y-1">{renderNav([...primaryNav, ...secondaryNav])}</nav>
        <fetcher.Form method="post" action="/logout" className="mt-auto"><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-3 py-2.5 text-sm font-bold text-white"><MaterialIcon name="logout" /> Sign out</button></fetcher.Form>
      </aside>
    </div>
  );
}
