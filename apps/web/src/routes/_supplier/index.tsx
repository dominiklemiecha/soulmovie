import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_supplier/')({
  component: () => (
    <div>
      <h1 className="text-xl font-semibold mb-4">Area Fornitore</h1>
      <p className="text-gray-600">Placeholder. Tab Società/Contatti/Categorie/Certificati arriveranno nelle fasi successive.</p>
    </div>
  ),
});
