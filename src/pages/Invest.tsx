import { FormEvent, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Clipboard, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';
import { plans } from '../data/plans';
import { useApp } from '../hooks/useApp';
import { Button, Card, Field, inputClass } from '../components/ui';
import { availableBalance } from '../utils/calculations';
import { money } from '../utils/format';

type InvestMode = 'plans' | 'recharge';

const rdMoney = (value: number) => `RD$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
const dailyRoi = (dailyEarnings: number, investmentAmount: number) => ((dailyEarnings / investmentAmount) * 100).toFixed(2);
const planVisualStyles: Record<string, { panel: string; stripe: string; text: string; soft: string; button: string; glow: string }> = {
  'plan-renkar-a': {
    panel: 'from-lime-50 via-white to-emerald-50',
    stripe: 'from-lime-400 to-emerald-600',
    text: 'text-emerald-700',
    soft: 'bg-emerald-50 text-emerald-700',
    button: 'from-lime-500 to-emerald-700',
    glow: 'shadow-emerald-200/70'
  },
  'plan-renkar-b': {
    panel: 'from-sky-50 via-white to-blue-50',
    stripe: 'from-sky-400 to-blue-700',
    text: 'text-blue-700',
    soft: 'bg-blue-50 text-blue-700',
    button: 'from-sky-500 to-blue-700',
    glow: 'shadow-blue-200/70'
  },
  'plan-renkar-c': {
    panel: 'from-fuchsia-50 via-white to-rose-50',
    stripe: 'from-fuchsia-500 to-rose-600',
    text: 'text-fuchsia-700',
    soft: 'bg-fuchsia-50 text-fuchsia-700',
    button: 'from-fuchsia-500 to-rose-600',
    glow: 'shadow-fuchsia-200/70'
  },
  'plan-renkar-d': {
    panel: 'from-amber-50 via-white to-orange-50',
    stripe: 'from-amber-400 to-orange-600',
    text: 'text-amber-700',
    soft: 'bg-amber-50 text-amber-700',
    button: 'from-amber-400 to-orange-600',
    glow: 'shadow-amber-200/70'
  },
  'plan-renkar-e': {
    panel: 'from-cyan-50 via-white to-teal-50',
    stripe: 'from-cyan-400 to-teal-700',
    text: 'text-teal-700',
    soft: 'bg-teal-50 text-teal-700',
    button: 'from-cyan-500 to-teal-700',
    glow: 'shadow-cyan-200/70'
  },
  'plan-renkar-f': {
    panel: 'from-indigo-50 via-white to-slate-100',
    stripe: 'from-indigo-500 to-slate-800',
    text: 'text-indigo-700',
    soft: 'bg-indigo-50 text-indigo-700',
    button: 'from-indigo-500 to-slate-800',
    glow: 'shadow-indigo-200/70'
  },
  'plan-renkar-g': {
    panel: 'from-red-50 via-white to-orange-50',
    stripe: 'from-red-500 to-orange-700',
    text: 'text-rose-700',
    soft: 'bg-rose-50 text-rose-700',
    button: 'from-red-500 to-orange-700',
    glow: 'shadow-red-200/70'
  }
};
const defaultPlanVisual = planVisualStyles['plan-renkar-a'];

export function Invest({ mode = 'plans' }: { mode?: InvestMode }) {
  const { currentUser, state, createRecharge, purchasePlan } = useApp();
  const availablePlans = state.plans?.length ? state.plans : plans;
  const activeAccounts = (state.paymentAccounts || []).filter((account) => account.active);
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccounts[0]?.id || '');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [buyingPlanId, setBuyingPlanId] = useState('');
  const selectedAccount = activeAccounts.find((account) => account.id === selectedAccountId) || activeAccounts[0];
  const investments = state.investments.filter((item) => item.userId === currentUser?.id);
  const withdrawals = state.withdrawals.filter((item) => item.userId === currentUser?.id);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const balance = availableBalance(investments, withdrawals, referrals, movements);

  useEffect(() => {
    if (!selectedAccountId && activeAccounts[0]) setSelectedAccountId(activeAccounts[0].id);
  }, [activeAccounts, selectedAccountId]);

  async function submitRecharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSent(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const receiptFile = data.get('receipt') as File;
    const receiptDataUrl = receiptFile?.size ? await fileToDataUrl(receiptFile) : '';
    try {
      await createRecharge({
        bankName: selectedAccount?.bank || String(data.get('bankName')),
        referenceNumber: selectedAccount?.accountNumber || '',
        amount: Number(data.get('amount')),
        transferDate: String(data.get('transferDate')),
        receiptName: receiptFile?.name || 'comprobante.jpg',
        receiptDataUrl
      });
      setSent(true);
      form.reset();
      await Swal.fire({
        icon: 'success',
        title: 'Solicitud enviada',
        text: 'Tu comprobante fue recibido y queda pendiente de validacion por administracion.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#047857',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
          popup: 'rounded-[1.75rem]',
          confirmButton: 'rounded-2xl px-5 py-3 font-black'
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.');
    }
  }

  async function buyPlan(planId: string) {
    setError('');
    setSent(false);
    setBuyingPlanId(planId);
    try {
      await purchasePlan(planId);
      await Swal.fire({
        icon: 'success',
        title: 'Plan comprado',
        text: 'El monto fue debitado de tu balance disponible y tu plan quedo activo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#047857',
        background: '#ffffff',
        color: '#0f172a',
        customClass: {
          popup: 'rounded-[1.75rem]',
          confirmButton: 'rounded-2xl px-5 py-3 font-black'
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comprar el plan.');
    } finally {
      setBuyingPlanId('');
    }
  }

  async function copyAccountNumber() {
    if (!selectedAccount?.accountNumber) return;
    await navigator.clipboard?.writeText(selectedAccount.accountNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (mode === 'recharge') {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-black">Recarga</h1>
          <p className="text-sm text-slate-400">Solicitud de recarga por transferencia bancaria.</p>
        </div>
        <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
          Horario de recargas: 9:00 AM - 7:00 PM. Tu balance se actualiza cuando administracion aprueba la transferencia.
        </p>

        <Card className={sent ? 'premium-ring border-emerald-200' : ''}>
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="text-gold" />
            <div>
              <h2 className="font-bold">Solicitud de recarga</h2>
              <p className="text-xs text-slate-400">Estado inicial: Pendiente de validacion</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={submitRecharge}>
            <Field label="Nombre del banco">
              <select
                className={inputClass}
                name="bankName"
                required
                value={selectedAccount?.id || ''}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value);
                  setCopied(false);
                }}
              >
                {activeAccounts.map((account) => <option key={account.id} value={account.id}>{account.bank}</option>)}
              </select>
            </Field>
            {!activeAccounts.length && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                No hay cuentas bancarias activas publicadas por administracion.
              </p>
            )}
            {selectedAccount && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm font-bold text-slate-700">Numero de cuenta para depositar</p>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black text-slate-950">{selectedAccount.accountNumber}</p>
                    <p className="text-xs text-slate-500">{selectedAccount.accountType} - {selectedAccount.accountHolder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="shrink-0 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    <Clipboard className="mr-1 inline h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-emerald-800">Realiza la transferencia a esta cuenta y sube el comprobante.</p>
              </div>
            )}
            <Field label="Monto transferido">
              <input className={inputClass} name="amount" required type="number" min={1} placeholder="Ej: 1300" />
            </Field>
            <Field label="Fecha de transferencia"><input className={inputClass} name="transferDate" required type="date" /></Field>
            <Field label="Comprobante de pago"><input className={`${inputClass} file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:font-bold file:text-white`} name="receipt" required type="file" accept="image/*" /></Field>
            <Button className="w-full">Enviar para validacion</Button>
          </form>
          {error && <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">{error}</p>}
          {sent && (
            <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-black text-emerald-700">
              Solicitud enviada.
            </p>
          )}
          <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            Tu recarga sera acreditada a tu balance cuando el pago sea validado por administracion.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Planes</h1>
        <p className="text-sm text-slate-400">Compra planes con tu balance disponible.</p>
      </div>
      <Card className="blue-balance-card p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[.16em] text-white/75">Balance disponible</p>
            <p className="mt-2 text-3xl font-black">{money(balance)}</p>
            <p className="mt-1 text-xs font-semibold text-white/80">Recarga primero si necesitas mas fondos.</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
            <WalletCards className="h-6 w-6" />
          </span>
        </div>
      </Card>
      <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
        Horario para comprar planes: 9:00 AM - 7:00 PM. Al comprar, el monto se debita de tu balance disponible.
      </p>

      {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">{error}</p>}

      <div className="grid gap-3">
        {availablePlans.map((plan) => {
          const roi = dailyRoi(plan.dailyProfit, plan.amount);
          const visual = planVisualStyles[plan.id] || defaultPlanVisual;
          const hasBalance = balance >= plan.amount;
          const purchasesCount = investments.filter((investment) => investment.planId === plan.id).length;
          const reachedLimit = purchasesCount >= 2;
          const isBuying = buyingPlanId === plan.id;
          return (
            <Card key={plan.id} className={`relative overflow-hidden border-0 bg-gradient-to-br ${visual.panel} p-0 shadow-2xl ${visual.glow} transition hover:-translate-y-0.5`}>
              <div className={`absolute inset-y-0 left-0 w-2 bg-gradient-to-b ${visual.stripe}`} />
              <div className="absolute -right-12 -top-14 h-32 w-32 rounded-full bg-white/70 blur-2xl" />
              <div className="p-5 pl-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-2xl font-black uppercase tracking-[.16em] ${visual.text}`}>{plan.name}</p>
                    <h2 className="mt-2 text-[2.65rem] font-black leading-none tracking-[-.05em] text-slate-950">{rdMoney(plan.amount)}</h2>
                    <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">Capital de entrada</p>
                  </div>
                  <div className={`shrink-0 rounded-[1.35rem] border border-white/70 px-4 py-3 text-center shadow-lg backdrop-blur ${visual.soft}`}>
                    <p className="text-2xl font-black">{roi}%</p>
                    <p className="text-[10px] font-black uppercase tracking-wide opacity-70">ROI diario</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 rounded-[1.35rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Compras permitidas</p>
                    <p className={`text-sm font-black ${reachedLimit ? 'text-rose-600' : visual.text}`}>{Math.min(purchasesCount, 2)}/2</p>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Ganancia cada 24h</p>
                    <p className={`text-lg font-black ${visual.text}`}>+{rdMoney(plan.dailyProfit)}</p>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Duracion del plan</p>
                    <p className="text-sm font-black text-slate-900">{plan.durationDays} dias</p>
                  </div>
                  <div className="h-px bg-slate-100" />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Proyeccion total</p>
                    <p className="text-sm font-black text-slate-900">{rdMoney(plan.dailyProfit * plan.durationDays)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className={`mt-4 w-full rounded-[1.25rem] bg-gradient-to-r ${visual.button} px-4 py-3.5 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50`}
                  onClick={() => buyPlan(plan.id)}
                  disabled={reachedLimit || !hasBalance || isBuying}
                >
                  <TrendingUp className="mr-2 inline h-4 w-4" />
                  {isBuying ? 'Comprando...' : reachedLimit ? 'Limite alcanzado' : hasBalance ? 'Comprar' : 'Saldo insuficiente'}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
