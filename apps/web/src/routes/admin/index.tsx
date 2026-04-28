import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/')({
  component: () => (
    <div>
      <h1 className="text-xl font-semibold mb-4">Admin Dashboard</h1>
      <p className="text-gray-600">Placeholder. Le funzionalità admin (lista fornitori, KPI, audit log) arriveranno nelle fasi successive.</p>
    </div>
  ),
});
