import { Navigate, createBrowserRouter } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProfilePage from '../pages/ProfilePage';
import ServicesPage from '../pages/ServicesPage';
import ContactPage from '../pages/ContactPage';
import NativeGeolocationPage from '../pages/NativeGeolocationPage';
import RouteErrorPage from '../pages/RouteErrorPage';
import MeetingPage from '../pages/MeetingPage';
import {
  dashboardLoader,
  loginAction,
  loginLoader,
  logoutAction,
  protectedLoader,
} from './authDataRouter';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
    loader: loginLoader,
    action: loginAction,
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/logout',
    action: logoutAction,
  },
  {
    id: 'app',
    loader: protectedLoader,
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: <DashboardPage />,
        loader: dashboardLoader,
      },
      {
        path: '/profile',
        element: <ProfilePage />,
      },
      {
        path: '/services',
        element: <ServicesPage />,
      },
      {
        path: '/contact',
        element: <ContactPage />,
      },
      {
        path: '/native-geolocation',
        element: <NativeGeolocationPage />,
      },
      {
        path: '/meeting',
        element: <MeetingPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
    errorElement: <RouteErrorPage />,
  },
]);

export default router;
