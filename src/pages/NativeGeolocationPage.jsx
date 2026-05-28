import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { FiMapPin, FiNavigation } from 'react-icons/fi';

export default function NativeGeolocationPage() {
  const [position, setPosition] = useState(null);
  const [permissionState, setPermissionState] = useState('unknown');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestPermission = async () => {
    setError('');
    try {
      const status = await Geolocation.requestPermissions();
      setPermissionState(status.location || 'unknown');
    } catch (err) {
      setError(err?.message || 'Permission request failed.');
    }
  };

  const getCurrentLocation = async () => {
    setError('');
    setLoading(true);

    try {
      const coords = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });
      setPosition(coords);
    } catch (err) {
      setError(err?.message || 'Unable to fetch location.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900">Adding Calls to Native APIs</h1>
      <p className="mt-2 text-sm text-slate-600">
        This page uses <code>@capacitor/geolocation@7</code> to request location from the native layer.
      </p>

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        Platform: <span className="font-semibold">{Capacitor.getPlatform()}</span>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={requestPermission}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <FiNavigation size={16} /> Request Permission
        </button>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FiMapPin size={16} /> {loading ? 'Fetching Location...' : 'Get Current Location'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Permission</p>
          <p className="mt-1 text-base font-semibold text-slate-900">{permissionState}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latitude / Longitude</p>
          <p className="mt-1 break-all text-base font-semibold text-slate-900">
            {position
              ? `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
              : 'No location yet'}
          </p>
        </div>
      </div>

      {position ? (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
          Accuracy: {Math.round(position.coords.accuracy)} meters
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm font-medium text-rose-600">{error}</p> : null}
    </section>
  );
}
