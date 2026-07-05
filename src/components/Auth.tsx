import { FormEvent, useState } from 'react';
import { Cctv, Eye, EyeOff, LockKeyhole, Phone, ShieldCheck } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { Button, Card, Field, inputClass } from './ui';

export function Auth() {
  const { login, register } = useApp();
  const referralCodeFromUrl = new URLSearchParams(window.location.search).get('code') || '';
  const [mode, setMode] = useState<'login' | 'register'>(referralCodeFromUrl ? 'register' : 'login');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const phone = String(data.get('phone'));
    const password = String(data.get('password'));
    const result =
      mode === 'login'
        ? await login(phone, password)
        : await register(String(data.get('name')), phone, password, String(data.get('referral') || ''));
    setError(result.ok ? '' : result.message || (mode === 'login' ? 'Credenciales incorrectas.' : 'Ese numero ya existe.'));
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8 text-slate-900">
      <div className="pointer-events-none absolute inset-x-8 top-16 h-44 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="mb-5 text-center">
        <div className="premium-ring mx-auto mb-4 grid h-20 w-20 place-items-center rounded-[2rem] bg-emerald-700 shadow-glow">
          <Cctv className="text-white" size={38} strokeWidth={2.8} />
        </div>
        <p className="text-xs font-black uppercase tracking-[.34em] text-emerald-700">RENKAR</p>
        <h1 className="mt-2 text-[2.15rem] font-black leading-[1.05] text-slate-950">
          Gestion financiera clara y confiable.
        </h1>
      </div>

      <div className="mb-4 overflow-hidden rounded-[1.65rem] border border-emerald-100 bg-white shadow-sm">
        <img src="/images/fintech-hero.png" alt="Panel financiero profesional en telefono" className="h-36 w-full object-cover" />
        <div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          Controla tus inversiones, ganancias y solicitudes con procesos transparentes y verificación bancaria.
        </div>
      </div>

      <Card className="premium-ring">
        <div className="mb-5 grid grid-cols-2 rounded-2xl border border-slate-100 bg-slate-50 p-1">
          <button className={`rounded-xl py-2 text-sm font-black ${mode === 'login' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500'}`} onClick={() => setMode('login')}>
            Iniciar
          </button>
          <button className={`rounded-xl py-2 text-sm font-black ${mode === 'register' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500'}`} onClick={() => setMode('register')}>
            Registro
          </button>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {mode === 'register' && (
            <Field label="Nombre completo">
              <input className={inputClass} name="name" required placeholder="Tu nombre" />
            </Field>
          )}
          <Field label="Numero de telefono">
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
              <input className={`${inputClass} pl-11`} name="phone" type="tel" inputMode="tel" required placeholder="8091234567" />
            </div>
          </Field>
          <Field label="Clave">
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
              <input className={`${inputClass} pl-11 pr-12`} name="password" type={showPassword ? 'text' : 'password'} required placeholder="123456" />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar clave' : 'Ver clave'}
                className="absolute right-4 top-3 grid h-6 w-6 place-items-center rounded-full text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          {mode === 'register' && (
            <Field label="Codigo de referido opcional">
              <input className={inputClass} name="referral" placeholder="K7P4XQ9" defaultValue={referralCodeFromUrl} />
            </Field>
          )}
          {error && (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700 shadow-sm">
              {error}
            </p>
          )}
          <Button className="w-full">{mode === 'login' ? 'Entrar a mi cuenta' : 'Crear cuenta'}</Button>
        </form>

      </Card>
    </main>
  );
}
