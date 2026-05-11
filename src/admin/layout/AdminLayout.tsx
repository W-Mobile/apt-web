import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../auth/AdminAuthProvider';
import { NavigationGuardProvider, useNavigationGuard } from '../contexts/NavigationGuardContext';

const navItems = [
  { to: '/admin/exercises', label: 'Exercises' },
  { to: '/admin/workouts', label: 'Workouts' },
  { to: '/admin/programs', label: 'Program' },
  { to: '/admin/posts', label: 'Posts' },
];

function Sidebar() {
  const { user, logout } = useAdminAuth();
  const { navigate } = useNavigationGuard();

  return (
    <aside className="w-64 bg-stone-900 border-r border-stone-800 flex flex-col">
      <div className="p-5 border-b border-stone-800">
        <h1 className="text-lg font-bold tracking-wide">APT Admin</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={(e) => { e.preventDefault(); navigate(to); }}
            className={({ isActive }) =>
              `block px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'bg-[#F24E1E] text-white' : 'text-stone-300 hover:bg-stone-800'}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-stone-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F24E1E] to-[#FF7262] flex items-center justify-center text-sm font-bold uppercase tracking-wide shrink-0">
            {user?.displayName?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-200 truncate">{user?.displayName}</p>
            <p className="text-xs text-stone-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full px-3 py-2 rounded-lg text-sm font-medium text-[#FF7262] bg-[#F24E1E]/10 hover:bg-[#F24E1E]/20 border border-[#F24E1E]/20 hover:border-[#F24E1E]/40 transition-all cursor-pointer"
        >
          Logga ut
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <NavigationGuardProvider>
      <div className="h-screen flex bg-stone-950 text-white font-sans overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </NavigationGuardProvider>
  );
}
