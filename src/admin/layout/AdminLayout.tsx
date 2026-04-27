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
    <div className="min-h-screen flex bg-gray-950 text-white">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold">APT Admin</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 mb-2">{user?.username}</p>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white"
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
