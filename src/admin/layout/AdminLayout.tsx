import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthProvider';

const navItems = [
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/workouts', label: 'Workouts' },
  { to: '/admin/programs', label: 'Program' },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAdminAuth();

  return (
    <div className="min-h-screen flex bg-stone-950 text-white font-sans">
      <aside className="w-64 bg-stone-900 border-r border-stone-800 flex flex-col">
        <div className="p-5 border-b border-stone-800">
          <h1 className="text-lg font-bold tracking-wide">APT Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-[#F24E1E] text-white' : 'text-stone-300 hover:bg-stone-800'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <p className="text-xs text-stone-500 mb-2">{user?.username}</p>
          <button
            onClick={logout}
            className="text-sm text-stone-400 hover:text-white transition-colors"
          >
            Logga ut
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}
