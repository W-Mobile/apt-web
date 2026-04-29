import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAdminAuth } from './AdminAuthProvider';

export function AdminLogin() {
  const [email, setEmail] = useState(() => localStorage.getItem('admin_remembered_email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('admin_remember_me') === 'true');
  const { login, isAdmin, isLoading, error } = useAdminAuth();
  const navigate = useNavigate();

  if (isAdmin) {
    navigate('/admin');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rememberMe) {
      localStorage.setItem('admin_remember_me', 'true');
      localStorage.setItem('admin_remembered_email', email);
    } else {
      localStorage.removeItem('admin_remember_me');
      localStorage.removeItem('admin_remembered_email');
    }
    await login(email, password, rememberMe);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 font-sans">
      <form onSubmit={handleSubmit} className="bg-stone-900 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-5 border border-stone-800">
        <h1 className="text-2xl font-bold text-white text-center tracking-wide">APT Admin</h1>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div>
          <label htmlFor="email" className="block text-sm text-stone-300 mb-1">E-post</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-stone-300 mb-1">Lösenord</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 pr-12 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
              aria-label={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-stone-600 bg-stone-800 text-[#F24E1E] accent-[#F24E1E]"
          />
          <span className="text-sm text-stone-300">Kom ihåg mig</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-[#F24E1E] text-white font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Loggar in...' : 'Logga in'}
        </button>
      </form>
    </div>
  );
}
