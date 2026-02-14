import type { JSX } from 'react';

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">
        Este fluxo sera habilitado na v2 com regras completas de DARF e compensacao de prejuizo.
      </p>
    </section>
  );
}
