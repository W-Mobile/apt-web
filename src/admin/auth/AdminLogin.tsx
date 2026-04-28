import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthProvider';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isAdmin, isLoading, error } = useAdminAuth();
  const navigate = useNavigate();

  if (isAdmin) {
    navigate('/admin');
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email, password);
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
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors"
          />
        </div>

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
