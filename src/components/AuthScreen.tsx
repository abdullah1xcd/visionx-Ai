import { useState } from 'react';
import { Activity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type Props = { configurationMissing?: boolean };

export default function AuthScreen({ configurationMissing = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      setBusy(false);
    }
  };

  return <main className="min-h-screen w-full overflow-y-auto bg-[#080A0D] px-4 py-10 text-white">
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Activity size={28}/></div>
        <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">VISIONX AI</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Sign in to VisionX</h1>
        <p className="mt-2 text-sm text-slate-400">Use your Google account to access the team workspace.</p>
      </div>
      <section className="rounded-2xl border border-white/10 bg-[#10151d] p-6 shadow-2xl shadow-black/30">
        {configurationMissing ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Supabase Auth is not configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to the frontend environment, then redeploy.</div> : <>
          <button type="button" onClick={signInWithGoogle} disabled={busy} className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 3.06 13.22l7.98 6.19C12.93 13.72 18.04 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.47-4.73 7.16l7.64 5.92c4.46-4.12 7.13-10.2 7.13-17.55Z"/><path fill="#FBBC05" d="M11.04 28.59A14.4 14.4 0 0 1 10.25 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.54 3.03 10.78l8.01-6.19Z"/><path fill="#34A853" d="M24 48c6.47 0 11.91-2.13 15.85-5.9l-7.64-5.92c-2.12 1.42-4.83 2.27-8.21 2.27-5.96 0-11.07-4.22-12.96-9.91l-8.01 6.19C6.51 43.62 14.62 48 24 48Z"/></svg>
            {busy ? 'Redirecting to Google…' : 'Continue with Google'}
          </button>
          {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Google accounts can sign in. This is a shared team workspace, so signed-in teammates can access the same VisionX data.</p>
        </>}
      </section>
    </div>
  </main>;
}
