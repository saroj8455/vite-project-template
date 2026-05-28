import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useFetcher, useLocation, useNavigation, useRouteLoaderData } from 'react-router-dom';
import {
  FiBell,
  FiCheckCircle,
  FiCompass,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMail,
  FiMenu,
  FiUser,
  FiX,
} from 'react-icons/fi';

const desktopNavItemClass = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-200'
  }`;

const mobileTabItemClass = ({ isActive }) =>
  `inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
    isActive
      ? '-translate-y-0.5 scale-[1.02] bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
      : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function AppLayout() {
  const { user } = useRouteLoaderData('app');
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const location = useLocation();

  const [showLoginNotice, setShowLoginNotice] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const noticeTimeoutRef = useRef(null);

  const isLoggingOut = fetcher.state !== 'idle';
  const isNavigating = navigation.state !== 'idle';

  const isDrawerActive =
    location.pathname === '/services' ||
    location.pathname === '/contact' ||
    location.pathname === '/native-geolocation';

  useEffect(() => {
    const notice = window.sessionStorage.getItem('login_success_notice');
    if (notice === '1') {
      setShowLoginNotice(true);
      window.sessionStorage.removeItem('login_success_notice');
    }
  }, []);

  useEffect(() => {
    if (!showLoginNotice) {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = null;
      }
      return;
    }

    noticeTimeoutRef.current = window.setTimeout(() => {
      setShowLoginNotice(false);
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = null;
      }
    }, 2200);

    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current);
        noticeTimeoutRef.current = null;
      }
    };
  }, [showLoginNotice]);

  useEffect(() => {
    setShowDrawer(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-100 native-safe-top">
      {showLoginNotice ? (
        <aside className="native-toast-top pointer-events-none fixed right-4 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div className="pointer-events-auto rounded-lg border border-emerald-200 bg-white p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="mt-0.5 text-emerald-600" size={18} />
              <div>
                <p className="text-sm font-semibold text-slate-900">Login successful</p>
                <p className="text-xs text-slate-600">Welcome back, {user?.firstName}. Your dashboard is ready.</p>
              </div>
              <FiBell className="ml-auto text-slate-400" size={16} />
            </div>
          </div>
        </aside>
      ) : null}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="text-lg font-bold text-slate-900">
              React Auth Dashboard
            </Link>
            <fetcher.Form method="post" action="/logout" className="sm:hidden">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoggingOut}
                aria-label="Logout"
              >
                <FiLogOut size={16} />
              </button>
            </fetcher.Form>
          </div>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <NavLink to="/dashboard" className={desktopNavItemClass}>
              <FiHome size={16} /> Dashboard
            </NavLink>
            <NavLink to="/profile" className={desktopNavItemClass}>
              <FiUser size={16} /> Profile
            </NavLink>
            <NavLink to="/services" className={desktopNavItemClass}>
              <FiGrid size={16} /> Services
            </NavLink>
            <NavLink to="/contact" className={desktopNavItemClass}>
              <FiMail size={16} /> Contact Us
            </NavLink>
            <NavLink to="/native-geolocation" className={desktopNavItemClass}>
              <FiCompass size={16} /> Native APIs
            </NavLink>
            <fetcher.Form method="post" action="/logout">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoggingOut}
              >
                <FiLogOut size={16} /> {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </fetcher.Form>
          </div>
        </div>
      </header>

      <main className="native-main-bottom mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:pb-6">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Signed in as</p>
          <p className="truncate text-base font-semibold text-slate-900">
            {user?.firstName} {user?.lastName} ({user?.username})
          </p>
          {isNavigating ? <p className="mt-2 text-xs text-slate-500">Updating page data...</p> : null}
        </div>
        <Outlet />
      </main>

      <div
        className={`fixed inset-0 z-40 bg-slate-900/35 transition-opacity duration-300 sm:hidden ${
          showDrawer ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setShowDrawer(false)}
      />

      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 w-72 max-w-[82vw] border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 sm:hidden ${
          showDrawer ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-hidden={!showDrawer}
      >
        <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <p className="text-base font-bold text-slate-900">More Navigation</p>
          <button
            type="button"
            onClick={() => setShowDrawer(false)}
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="space-y-1 px-3 py-3">
          <NavLink
            to="/services"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <FiGrid size={16} /> Services
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <FiMail size={16} /> Contact Us
          </NavLink>
          <NavLink
            to="/native-geolocation"
            className={({ isActive }) =>
              `mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <FiCompass size={16} /> Native APIs
          </NavLink>
        </div>

        <div className="mt-auto border-t border-slate-200 px-3 py-3">
          <fetcher.Form method="post" action="/logout">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isLoggingOut}
            >
              <FiLogOut size={16} /> {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </fetcher.Form>
        </div>
        </div>
      </aside>

      <nav className="native-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-2">
          <NavLink to="/dashboard" className={mobileTabItemClass}>
            <FiHome size={16} /> Dashboard
          </NavLink>
          <NavLink to="/profile" className={mobileTabItemClass}>
            <FiUser size={16} /> Profile
          </NavLink>
          <button
            type="button"
            onClick={() => setShowDrawer((prev) => !prev)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 ${
              isDrawerActive || showDrawer
                ? '-translate-y-0.5 scale-[1.02] bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FiMenu size={16} /> More
          </button>
        </div>
      </nav>
    </div>
  );
}
