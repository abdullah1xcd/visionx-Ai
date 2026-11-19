import { FormEvent, useState } from 'react';
import { Activity, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

type Props = { configurationMissing?: boolean };

export default function AuthScreen({ configurationMissing = false }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-screen w-full overflow-y-auto bg-[#080A0D] px-4 py-10 text-white">
    <div className="mx-auto flex min-h-[80vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><Activity size={28}/></div>
        <p className="text-xs font-bold tracking-[0.3em] text-cyan-300">VISIONX AI</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Secure access</h1>
        <p className="mt-2 text-sm text-slate-400">Sign in to your private computer vision workspace.</p>
      </div>
      <section className="rounded-2xl border border-white/10 bg-[#10151d] p-6 shadow-2xl shadow-black/30">
        {configurationMissing ? <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Supabase Auth is not configured yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to the frontend environment, then redeploy.</div> : <>
          <form onSubmit={submit} className="space-y-4">
            <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Email address</span><span className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-cyan-400/60"><Mail size={17} className="text-slate-500"/><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"/></span></label>
            <label className="block"><span className="mb-2 block text-xs font-medium text-slate-300">Password</span><span className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-cyan-400/60"><LockKeyhole size={17} className="text-slate-500"/><input type={showPassword?'text':'password'} required autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password" className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-600"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)} className="text-slate-500 hover:text-white">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
            {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-300">{error}</p>}
            <button disabled={busy} className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-400 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60">{busy?'Please wait…':'Sign in securely'}</button>
          </form>
          <p className="mt-5 text-center text-[11px] leading-5 text-slate-500">Private access only. Ask the project administrator to provision your account.</p>
        </>}
      </section>
    </div>
  </main>;
}
