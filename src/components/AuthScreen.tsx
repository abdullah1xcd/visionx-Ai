import { useState } from 'react';
import { Activity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type Props = { configurationMissing?: boolean };
const AUTHORIZED_EMAIL = 'abdullahmohamedharoon8@gmail.com';

export default function AuthScreen({ configurationMissing = false }: Props) {
  const [email, setEmail] = useState(AUTHORIZED_EMAIL);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    if (email.trim().toLowerCase() !== AUTHORIZED_EMAIL) {
      setError('This email is not authorized to access VisionX.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: AUTHORIZED_EMAIL,
        password,
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please check your password.');
      setBusy(false);
    }
  };

  return <main className="min-h-screen w-full overflow-y-auto bg-[#080A0D] px-4 py-10 text-white">
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Activity size={28}/></div>
        <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">VISIONX AI</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to VisionX</h1>
        <p className="mt-2 text-sm text-slate-400">Private access for the authorized VisionX account.</p>
      </div>
      <section className="rounded-2xl border border-white/10 bg-[#10151d] p-6 shadow-2xl shadow-black/30">
        {configurationMissing ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Supabase Auth is not configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to the frontend environment, then redeploy.</div> : <form onSubmit={signIn} className="space-y-4">
          <div>
            <label htmlFor="visionx-email" className="mb-2 block text-xs font-medium text-slate-300">Authorized email</label>
            <input id="visionx-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required className="h-12 w-full rounded-xl border border-white/10 bg-[#080A0D] px-4 text-sm text-white outline-none focus:border-cyan-400" />
          </div>
          <div>
            <label htmlFor="visionx-password" className="mb-2 block text-xs font-medium text-slate-300">Password</label>
            <input id="visionx-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required className="h-12 w-full rounded-xl border border-white/10 bg-[#080A0D] px-4 text-sm text-white outline-none focus:border-cyan-400" placeholder="Enter your password" />
          </div>
          <button type="submit" disabled={busy || !password} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-cyan-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? 'Signing in…' : 'Sign in with email'}
          </button>
          {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
          <p className="text-center text-[11px] leading-5 text-slate-500">Access is restricted to abdullahmohamedharoon8@gmail.com. Google sign-in is disabled.</p>
        </form>}
      </section>
    </div>
  </main>;
}
