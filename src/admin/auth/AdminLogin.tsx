import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { useAdminAuth } from './AdminAuthProvider';

type View = 'login' | 'requestCode' | 'resetPassword';

const inputClass = 'w-full px-4 py-3 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors';
const buttonClass = 'w-full py-3 bg-[#F24E1E] text-white font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors';

export function AdminLogin() {
  const [view, setView] = useState<View>('login');
  const [email, setEmail] = useState(() => localStorage.getItem('admin_remembered_email') ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('admin_remember_me') === 'true');
  const { login, isAdmin, isLoading, error } = useAdminAuth();
  const navigate = useNavigate();

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

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

  function goToRequestCode() {
    setResetEmail(email);
    setResetError(null);
    setResetSuccess(null);
    setView('requestCode');
  }

  function goBackToLogin() {
    setResetError(null);
    setResetSuccess(null);
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setView('login');
  }

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);
    try {
      await resetPassword({ username: resetEmail.trim() });
      setView('resetPassword');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Kunde inte skicka återställningskod.');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setResetError(null);

    if (newPassword !== confirmPassword) {
      setResetError('Lösenorden matchar inte.');
      return;
    }

    if (newPassword.length < 8) {
      setResetError('Lösenordet måste vara minst 8 tecken.');
      return;
    }

    setResetLoading(true);
    try {
      await confirmResetPassword({
        username: resetEmail.trim(),
        newPassword,
        confirmationCode: resetCode.trim(),
      });
      setResetSuccess('Lösenordet har återställts. Du kan nu logga in.');
      setEmail(resetEmail);
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setView('login');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Kunde inte återställa lösenordet.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 font-sans">
      {view === 'login' && (
        <form onSubmit={handleSubmit} className="bg-stone-900 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-5 border border-stone-800">
          <h1 className="text-2xl font-bold text-white text-center tracking-wide">APT Admin</h1>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {resetSuccess && <p className="text-green-400 text-sm text-center">{resetSuccess}</p>}

          <div>
            <label htmlFor="email" className="block text-sm text-stone-300 mb-1">E-post</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
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
                className={`${inputClass} pr-12`}
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

          <div className="flex items-center justify-between">
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
              type="button"
              onClick={goToRequestCode}
              className="text-sm text-stone-400 hover:text-[#F24E1E] transition-colors"
            >
              Glömt lösenord?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={buttonClass}
          >
            {isLoading ? 'Loggar in...' : 'Logga in'}
          </button>
        </form>
      )}

      {view === 'requestCode' && (
        <form onSubmit={handleRequestCode} className="bg-stone-900 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-5 border border-stone-800">
          <button
            type="button"
            onClick={goBackToLogin}
            className="flex items-center gap-1 text-sm text-stone-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Tillbaka
          </button>

          <h1 className="text-2xl font-bold text-white text-center tracking-wide">Återställ lösenord</h1>
          <p className="text-sm text-stone-400 text-center">
            Ange din e-postadress så skickar vi en verifieringskod.
          </p>

          {resetError && <p className="text-red-400 text-sm text-center">{resetError}</p>}

          <div>
            <label htmlFor="reset-email" className="block text-sm text-stone-300 mb-1">E-post</label>
            <input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className={buttonClass}
          >
            {resetLoading ? 'Skickar...' : 'Skicka kod'}
          </button>
        </form>
      )}

      {view === 'resetPassword' && (
        <form onSubmit={handleResetPassword} className="bg-stone-900 p-8 rounded-2xl shadow-lg w-full max-w-sm space-y-5 border border-stone-800">
          <button
            type="button"
            onClick={() => { setResetError(null); setView('requestCode'); }}
            className="flex items-center gap-1 text-sm text-stone-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Tillbaka
          </button>

          <h1 className="text-2xl font-bold text-white text-center tracking-wide">Nytt lösenord</h1>
          <p className="text-sm text-stone-400 text-center">
            Ange koden som skickades till <span className="text-white">{resetEmail}</span> och välj ett nytt lösenord.
          </p>

          {resetError && <p className="text-red-400 text-sm text-center">{resetError}</p>}

          <div>
            <label htmlFor="reset-code" className="block text-sm text-stone-300 mb-1">Verifieringskod</label>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="6-siffrig kod"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm text-stone-300 mb-1">Nytt lösenord</label>
            <div className="relative">
              <input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
                aria-label={showNewPassword ? 'Dölj lösenord' : 'Visa lösenord'}
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm text-stone-300 mb-1">Bekräfta lösenord</label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white transition-colors"
                aria-label={showConfirmPassword ? 'Dölj lösenord' : 'Visa lösenord'}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={resetLoading}
            className={buttonClass}
          >
            {resetLoading ? 'Återställer...' : 'Återställ lösenord'}
          </button>
        </form>
      )}
    </div>
  );
}
