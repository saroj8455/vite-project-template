import { lazy, Suspense } from 'react';
import { FiBarChart2, FiCheckCircle, FiEye } from 'react-icons/fi';
import { useLoaderData, useRouteLoaderData } from 'react-router-dom';

const AnalyticsCharts = lazy(() => import('../components/AnalyticsCharts'));

const cards = [
  { title: 'Sessions', value: '12', delta: '+8%', icon: FiBarChart2 },
  { title: 'Tasks Done', value: '34', delta: '+14%', icon: FiCheckCircle },
  { title: 'Profile Views', value: '89', delta: '+22%', icon: FiEye },
];

export default function DashboardPage() {
  const { user } = useRouteLoaderData('app');
  const { generatedAt } = useLoaderData();

  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">A quick overview of your account activity.</p>
      <p className="mt-1 text-xs text-slate-500">Last loaded: {new Date(generatedAt).toLocaleString()}</p>

      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-700">Hello, {user?.firstName}. Your route loader data is fresh and revalidated.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Icon className="text-slate-400" size={16} /> {card.title}
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-emerald-600">{card.delta} this week</p>
            </article>
          );
        })}
      </div>

      <Suspense
        fallback={
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-64" />
            <div className="h-56 animate-pulse rounded-2xl border border-slate-200 bg-white sm:h-64" />
          </div>
        }
      >
        <AnalyticsCharts />
      </Suspense>
    </section>
  );
}
