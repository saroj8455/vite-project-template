import { lazy, Suspense } from 'react';
import { useLoaderData, useRouteLoaderData } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon';

const AnalyticsCharts = lazy(() => import('../components/AnalyticsCharts'));

const cards = [
  { title: 'Sessions', value: '12', delta: '+8%', icon: 'bar_chart' },
  { title: 'Tasks Done', value: '34', delta: '+14%', icon: 'task_alt' },
  { title: 'Profile Views', value: '89', delta: '+22%', icon: 'visibility' },
];

export default function DashboardPage() {
  const { user } = useRouteLoaderData('app');
  const { generatedAt } = useLoaderData();

  return (
    <section>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Overview</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">Good to see you, {user?.firstName}.</h1>
          <p className="mt-2 text-sm text-slate-500">Here is how your workspace is performing today.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">Updated {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          return (
            <article key={card.title} className="soft-card rounded-2xl p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lg">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><MaterialIcon name={card.icon} className="text-lg" /></span> {card.title}
              </p>
              <div className="mt-5 flex items-end justify-between"><p className="text-4xl font-extrabold tracking-tight text-slate-950">{card.value}</p><p className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{card.delta}</p></div>
              <p className="mt-2 text-xs text-slate-400">Compared with last week</p>
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
