import { FiCheckCircle, FiLayers, FiShield } from 'react-icons/fi';

const services = [
  { title: 'Profile Optimization', description: 'Improve profile quality and recruiter discoverability.', icon: FiLayers },
  { title: 'Job Match Insights', description: 'Get weekly match trends and role recommendations.', icon: FiCheckCircle },
  { title: 'Security Monitoring', description: 'Track account activity and suspicious login attempts.', icon: FiShield },
];

export default function ServicesPage() {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Workspace</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">Services</h1>
      <p className="mt-2 text-sm text-slate-600">Explore platform services built for your growth.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <article key={service.title} className="soft-card rounded-3xl p-6 transition duration-200 hover:-translate-y-1">
              <span className="inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700"><Icon size={20} /></span>
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{service.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{service.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
