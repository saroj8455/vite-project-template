import { FiCheckCircle, FiLayers, FiShield } from 'react-icons/fi';

const services = [
  { title: 'Profile Optimization', description: 'Improve profile quality and recruiter discoverability.', icon: FiLayers },
  { title: 'Job Match Insights', description: 'Get weekly match trends and role recommendations.', icon: FiCheckCircle },
  { title: 'Security Monitoring', description: 'Track account activity and suspicious login attempts.', icon: FiShield },
];

export default function ServicesPage() {
  return (
    <section>
      <h1 className="text-2xl font-bold text-slate-900">Services</h1>
      <p className="mt-2 text-sm text-slate-600">Explore platform services built for your growth.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => {
          const Icon = service.icon;
          return (
            <article key={service.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="text-blue-600" size={20} />
              <h2 className="mt-3 text-lg font-semibold text-slate-900">{service.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{service.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
