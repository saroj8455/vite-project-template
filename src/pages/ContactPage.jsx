import { useEffect, useRef, useState } from 'react';
import { Form } from 'react-router-dom';
import { FiCheckCircle } from 'react-icons/fi';

export default function ContactPage() {
  const [showToast, setShowToast] = useState(false);
  const toastTimerRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    event.currentTarget.reset();

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setShowToast(true);
    toastTimerRef.current = window.setTimeout(() => {
      setShowToast(false);
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  return (
    <section className="relative">
      {showToast ? (
        <aside className="pointer-events-none fixed right-4 top-4 z-50 w-[calc(100%-2rem)] max-w-md native-toast-top">
          <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-lg">
            <div className="flex items-start gap-3">
              <FiCheckCircle className="mt-0.5 text-emerald-600" size={18} />
              <div>
                <p className="text-sm font-semibold text-slate-900">Message Sent Successfully</p>
                <p className="text-xs text-slate-600">
                  Thank you for reaching out. Our team will review your message and contact you shortly.
                </p>
              </div>
            </div>
          </div>
        </aside>
      ) : null}

      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Support</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Contact Us</h1>
      <p className="mt-2 text-sm text-slate-600">Need help? Send us a message and our team will connect with you.</p>

      <Form className="soft-card mt-8 grid gap-4 rounded-3xl p-5 sm:grid-cols-2 sm:p-7" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-slate-700 sm:col-span-1">
          Name
          <input
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-1">
          Email
          <input
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <label className="text-sm font-medium text-slate-700 sm:col-span-2">
          Message
          <textarea
            name="message"
            rows={4}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Send Message
          </button>
        </div>
      </Form>
    </section>
  );
}
