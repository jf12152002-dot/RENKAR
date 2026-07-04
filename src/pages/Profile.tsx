import { FormEvent, useState } from 'react';
import { Bell, ChevronRight, CreditCard, FileText, Gift, Headphones, Lock, LogOut, X } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { accruedProfit, availableBalance, creditedReferralLineBonus, paidWithdrawals, referralBonus } from '../utils/calculations';
import { money } from '../utils/format';
import { Button, Card, Field, inputClass } from '../components/ui';

type ProfilePanel = 'payments' | 'gift' | 'security' | 'notifications' | 'terms' | null;

export function Profile() {
  const { currentUser, state, logout, updateUserProfile, redeemGiftCode } = useApp();
  const [panel, setPanel] = useState<ProfilePanel>(null);
  const [notice, setNotice] = useState('');
  const [notifications, setNotifications] = useState({
    recharges: true,
    withdrawals: true,
    bonuses: true,
    support: true
  });
  const investments = state.investments.filter((item) => item.userId === currentUser?.id);
  const withdrawals = state.withdrawals.filter((item) => item.userId === currentUser?.id);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const activePaymentAccounts = (state.paymentAccounts || []).filter((account) => account.active);
  const totalReferralBonus = referralBonus(referrals) + creditedReferralLineBonus(movements);

  const rows = [
    {
      id: 'payments' as const,
      icon: CreditCard,
      label: 'Metodos de pago',
      value: activePaymentAccounts.length
        ? `${activePaymentAccounts.length} cuentas disponibles`
        : 'Sin cuentas publicadas por administracion'
    },
    { id: 'gift' as const, icon: Gift, label: 'Codigo de regalo', value: 'Canjea bonos disponibles' },
    { id: 'security' as const, icon: Lock, label: 'Seguridad', value: 'Cambiar clave de acceso' },
    { id: 'notifications' as const, icon: Bell, label: 'Notificaciones', value: 'Configurar alertas de recargas, retiros y bonos' },
    { id: 'terms' as const, icon: FileText, label: 'Terminos y condiciones', value: 'Ver politicas de validacion manual' },
    { id: 'chat' as const, icon: Headphones, label: 'Chat de soporte', value: 'Abrir chat en vivo' }
  ];

  function openRow(id: (typeof rows)[number]['id']) {
    setNotice('');
    if (id === 'chat') {
      window.dispatchEvent(new Event('renkar:open-chat'));
      return;
    }
    setPanel(id);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') || '');
    const confirm = String(data.get('confirm') || '');
    if (password.length < 6) {
      setNotice('La clave debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setNotice('Las claves no coinciden.');
      return;
    }
    await updateUserProfile({ password });
    setNotice('Clave actualizada correctamente.');
    setPanel(null);
  }

  async function redeemCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get('giftCode') || '').trim().toUpperCase();
    if (!code) {
      setNotice('Escribe un codigo de regalo valido.');
      return;
    }
    try {
      await redeemGiftCode(code);
      setNotice('Codigo canjeado correctamente. El bono fue acreditado a tu cuenta.');
      form.reset();
      setPanel(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'No se pudo canjear el codigo.');
    }
  }

  return (
    <div className="space-y-4">
      <Card className="green-profile-card relative overflow-hidden p-5 text-center text-white">
        <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 right-4 h-36 w-36 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-[2rem] border border-white/30 bg-white/20 text-2xl font-black text-white shadow-sm backdrop-blur">
            {currentUser?.name.slice(0, 1)}
          </div>
          <p className="text-xs font-black uppercase tracking-[.24em] text-white/70">Perfil RENKAR</p>
          <h1 className="mt-1 text-2xl font-black">{currentUser?.name}</h1>
          <p className="text-sm text-white/75">Telefono: {currentUser?.email}</p>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <ProfileStat label="Balance total" value={money(availableBalance(investments, withdrawals, referrals, movements))} color="from-emerald-500 to-green-700" />
        <ProfileStat label="Ganancias totales" value={money(accruedProfit(investments) + totalReferralBonus)} color="from-sky-500 to-blue-700" />
        <ProfileStat label="Total retirado" value={money(paidWithdrawals(withdrawals))} color="from-amber-400 to-orange-600" />
        <ProfileStat label="Referidos totales" value={String(referrals.length)} color="from-fuchsia-500 to-violet-700" />
      </div>
      {notice && <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      <Card>
        <div className="space-y-3">
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <button key={row.label} onClick={() => openRow(row.id)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-100 hover:bg-emerald-50 active:scale-[.99]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-700 text-white shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{row.label}</p>
                  <p className="truncate text-xs text-slate-500">{row.value}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500" />
              </button>
            );
          })}
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left font-bold text-rose-700 transition hover:bg-rose-100">
            <LogOut className="h-5 w-5 text-rose-700" />
            Cerrar sesion
          </button>
        </div>
      </Card>
      {panel && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 px-4 pb-4 backdrop-blur-sm">
          <Card className="max-h-[86vh] w-full max-w-md overflow-y-auto p-0">
            <header className="flex items-center justify-between border-b border-slate-100 p-4">
              <h2 className="text-lg font-black">{panelTitle(panel)}</h2>
              <button onClick={() => setPanel(null)} className="rounded-full bg-slate-100 p-2 text-slate-600"><X className="h-4 w-4" /></button>
            </header>
            <div className="p-4">
              {panel === 'payments' && (
                <div className="space-y-3">
                  <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
                    Usa una de estas cuentas oficiales para transferir. La inversion se activa solo cuando administracion valide el pago.
                  </p>
                  {activePaymentAccounts.map((account) => (
                    <div key={account.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <p className="font-bold text-emerald-800">{account.bank}</p>
                      <p className="mt-1 text-sm text-slate-600">Titular: {account.accountHolder}</p>
                      <p className="text-sm text-slate-600">Cuenta: {account.accountNumber}</p>
                      <p className="text-sm text-slate-500">Tipo: {account.accountType}</p>
                    </div>
                  ))}
                  {!activePaymentAccounts.length && (
                    <p className="text-sm text-slate-400">Administracion aun no ha publicado cuentas de transferencia.</p>
                  )}
                  <Button onClick={() => setPanel(null)} className="w-full">Cerrar</Button>
                </div>
              )}
              {panel === 'security' && (
                <form className="space-y-4" onSubmit={savePassword}>
                  <Field label="Nueva clave"><input className={inputClass} type="password" name="password" minLength={6} required /></Field>
                  <Field label="Confirmar clave"><input className={inputClass} type="password" name="confirm" minLength={6} required /></Field>
                  <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-700">Para publicar, usa contrasenas cifradas y sesiones seguras.</p>
                  <Button className="w-full">Actualizar clave</Button>
                </form>
              )}
              {panel === 'gift' && (
                <form className="space-y-4" onSubmit={redeemCode}>
                  <p className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-800">
                    Ingresa tu codigo de regalo. Si esta activo y no lo has usado antes, el bono se acreditara automaticamente a tu balance.
                  </p>
                  <Field label="Codigo de regalo">
                    <input className={inputClass} name="giftCode" placeholder="RENKAR200" autoCapitalize="characters" required />
                  </Field>
                  <Button className="w-full">Canjear codigo</Button>
                </form>
              )}
              {panel === 'notifications' && (
                <div className="space-y-3">
                  {Object.entries(notifications).map(([key, enabled]) => (
                    <label key={key} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
                      <span className="font-semibold capitalize">{labels[key as keyof typeof labels]}</span>
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={() => setNotifications((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        className="h-5 w-5 accent-emerald-300"
                      />
                    </label>
                  ))}
                  <Button onClick={() => { setNotice('Preferencias de notificacion actualizadas.'); setPanel(null); }} className="w-full">Guardar preferencias</Button>
                </div>
              )}
              {panel === 'terms' && (
                <div className="space-y-3 text-sm text-slate-600">
                  <p>RENKAR registra solicitudes de recarga, inversion y retiro para revision administrativa.</p>
                  <p>Las recargas se activan solo cuando administracion valida la transferencia bancaria y el comprobante.</p>
                  <p>Los retiros se procesan diariamente de lunes a sabado de 10:00 AM a 5:00 PM, aplican una comision de retiro del 15% y pueden estar en estado Pendiente, Aprobado, Rechazado o Pagado.</p>
                  <p>Para solicitar retiros, el usuario debe tener al menos una recarga aprobada por administracion. Los bonos, comisiones y referidos no habilitan retiros por si solos.</p>
                  <p>Las solicitudes de inversion se reciben de 9:00 AM a 7:00 PM. Fuera de ese horario no se permite crear solicitudes.</p>
                  <p>La bonificacion de referidos es un pago unico de $100 por cada bloque de 5 referidos activos.</p>
                  <p>Los bonos por lineas se acreditan al aprobarse una inversion validada: Linea 1 15%, Linea 2 3% y Linea 3 2% del plan activado.</p>
                  <Button onClick={() => setPanel(null)} className="w-full">Entendido</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

const labels = {
  recharges: 'Recargas',
  withdrawals: 'Retiros',
  bonuses: 'Bonos',
  support: 'Soporte'
};

function ProfileStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-lg shadow-slate-300/50`}>
      <p className="text-[11px] font-black uppercase tracking-wide text-white/75">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function panelTitle(panel: Exclude<ProfilePanel, null>) {
  const titles = {
    payments: 'Metodos de pago',
    gift: 'Codigo de regalo',
    security: 'Seguridad',
    notifications: 'Notificaciones',
    terms: 'Terminos y condiciones'
  };
  return titles[panel];
}
