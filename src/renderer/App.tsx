import { Link, Route, Routes } from 'react-router-dom';

const menuItems = [
  { path: '/', label: 'Home' },
  { path: '/import-notes', label: 'Import Notes' },
  { path: '/import-movements', label: 'Import Movements' },
  { path: '/average-price', label: 'Average Price' },
  { path: '/monthly-assessment', label: 'Monthly Assessment / DARF' },
  { path: '/assets-report', label: 'Assets Report' },
];

function PlaceholderPage({ title }: { title: string }): JSX.Element {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">This page will be implemented in future tasks.</p>
    </section>
  );
}

export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold">Hello World</h1>
          <p className="mt-2 text-sm text-slate-600">
            Tax Report foundation is running with Electron + React + Tailwind.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              to={item.path}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Routes>
          <Route path="/" element={<PlaceholderPage title="Home Page" />} />
          <Route path="/import-notes" element={<PlaceholderPage title="Import Notes Page" />} />
          <Route
            path="/import-movements"
            element={<PlaceholderPage title="Import Movements Page" />}
          />
          <Route path="/average-price" element={<PlaceholderPage title="Average Price Page" />} />
          <Route
            path="/monthly-assessment"
            element={<PlaceholderPage title="Monthly Assessment Page" />}
          />
          <Route path="/assets-report" element={<PlaceholderPage title="Assets Report Page" />} />
        </Routes>
      </main>
    </div>
  );
}
