import { ReactNode, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Dumbbell,
  ListChecks,
  CalendarRange,
  CalendarClock,
  FileText,
  MessageSquare,
  UserPlus,
  Menu,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { useAdminAuth } from '../auth/AdminAuthProvider';
import { NavigationGuardProvider, useNavigationGuard } from '../contexts/NavigationGuardContext';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  requireGroup?: string;
}

const navItems: NavItem[] = [
  { to: '/admin/exercises', label: 'Exercises', icon: Dumbbell },
  { to: '/admin/workouts', label: 'Workouts', icon: ListChecks },
  { to: '/admin/programs', label: 'Program', icon: CalendarRange },
  { to: '/admin/posts', label: 'Posts', icon: FileText },
  { to: '/admin/feedback', label: 'Feedback', icon: MessageSquare, requireGroup: 'ADMINS' },
  { to: '/admin/users', label: 'Onboard users', icon: UserPlus, requireGroup: 'ADMINS' },
  { to: '/admin/subscriptions', label: 'Extend subscription', icon: CalendarClock, requireGroup: 'ADMINS' },
];

const COLLAPSED_STORAGE_KEY = 'admin:sidebar-collapsed';

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, logout, isInGroup } = useAdminAuth();
  const { navigate } = useNavigationGuard();
  const visibleNavItems = navItems.filter((item) => !item.requireGroup || isInGroup(item.requireGroup));

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} bg-stone-900 border-r border-stone-800 flex flex-col transition-[width] duration-200`}
    >
      <div className={`p-5 border-b border-stone-800 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <h1 className="text-lg font-bold tracking-wide">APT Admin</h1>}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expandera meny' : 'Fäll ihop meny'}
          title={collapsed ? 'Expandera meny' : 'Fäll ihop meny'}
          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={(e) => { e.preventDefault(); navigate(to); }}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-[#F24E1E] text-white' : 'text-stone-300 hover:bg-stone-800'}`
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-stone-800">
        <div className={`flex items-center gap-3 mb-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#F24E1E] to-[#FF7262] flex items-center justify-center text-sm font-bold uppercase tracking-wide shrink-0">
            {user?.displayName?.charAt(0) ?? '?'}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-200 truncate">{user?.displayName}</p>
              <p className="text-xs text-stone-500 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title="Logga ut"
          aria-label="Logga ut"
          className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-[#FF7262] bg-[#F24E1E]/10 hover:bg-[#F24E1E]/20 border border-[#F24E1E]/20 hover:border-[#F24E1E]/40 transition-all cursor-pointer`}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Logga ut</span>}
        </button>
      </div>
    </aside>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSED_STORAGE_KEY) === 'true'
  );

  useEffect(() => {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <NavigationGuardProvider>
      <div className="h-screen flex bg-stone-950 text-white font-sans overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </NavigationGuardProvider>
  );
}
