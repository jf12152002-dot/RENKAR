import { FormEvent, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { Clipboard, ShieldCheck, TrendingUp } from 'lucide-react';
import { plans } from '../data/plans';
import { useApp } from '../hooks/useApp';
import { Button, Card, Field, inputClass } from '../components/ui';

const rdMoney = (value: number) => `RD$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
const dailyRoi = (dailyEarnings: number, investmentAmount: number) => ((dailyEarnings / investmentAmount) * 100).toFixed(2);
const planVisualStyles: Record<string, { gradient: string; text: string; soft: string; button: string }> = {
  'plan-renkar-a': {
    gradient: 'from-emerald-400 via-emerald-600 to-green-700',
    text: 'text-emerald-700',
    soft: 'bg-emerald-50 text-emerald-700',
    button: 'from-emerald-500 to-green-700'
  },
  'plan-renkar-b': {
    gradient: 'from-sky-400 via-blue-600 to-indigo-700',
    text: 'text-blue-700',
    soft: 'bg-blue-50 text-blue-700',
    button: 'from-sky-500 to-blue-700'
  },
  'plan-renkar-c': {
    gradient: 'from-fuchsia-500 via-violet-600 to-purple-800',
    text: 'text-violet-700',
    soft: 'bg-violet-50 text-violet-700',
    button: 'from-fuchsia-500 to-violet-700'
  },
  'plan-renkar-d': {
    gradient: 'from-amber-300 via-orange-500 to-yellow-700',
    text: 'text-amber-700',
    soft: 'bg-amber-50 text-amber-700',
    button: 'from-amber-400 to-orange-600'
  },
  'plan-renkar-e': {
    gradient: 'from-cyan-400 via-teal-500 to-emerald-700',
    text: 'text-teal-700',
    soft: 'bg-teal-50 text-teal-700',
    button: 'from-cyan-500 to-teal-700'
  },
  'plan-renkar-f': {
    gradient: 'from-indigo-500 via-blue-700 to-slate-900',
    text: 'text-indigo-700',
    soft: 'bg-indigo-50 text-indigo-700',
    button: 'from-indigo-500 to-blue-800'
  },
  'plan-renkar-g': {
    gradient: 'from-rose-500 via-red-600 to-orange-700',
    text: 'text-rose-700',
    soft: 'bg-rose-50 text-rose-700',
    button: 'from-rose-500 to-red-700'
  }
};
const defaultPlanVisual = planVisualStyles['plan-renkar-a'];

export function Invest() {
  const { state, createRecharge } = useApp();
  const availablePlans = state.plans?.length ? state.plans : plans;
  const [selected, setSelected] = useState(availablePlans[0]);
  const [amount, setAmount] = useState(availablePlans[0].amount);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const rechargeFormRef = useRef<HTMLDivElement | null>(null);
  const activeAccounts = (state.paymentAccounts || []).filter((account) => account.active);
  const [selectedAccountId, setSelectedAccountId] = useState(activeAccounts[0]?.id || '');
  const selectedAccount = activeAccounts.find((account) => account.id === selectedAccountId) || activeAccounts[0];

  useEffect(() => {
    const nextSelected = availablePlans.find((plan) => plan.id === selected.id) || availablePlans[0];
    if (nextSelected.id !== selected.id) {
      setSelected(nextSelected);
      setAmount(nextSelected.amount);
    }
  }, [availablePlans, selected.id]);

  function selectPlan(plan: typeof plans[number]) {
    setSelected(plan);
    setAmount(plan.amount);
    setSent(false);
    setError('');
    window.setTimeout(() => {
      rechargeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSent(false);
    const form = event.currentTarget;
    const data = new FormData(form);
    const receiptFile = data.get('receipt') as File;
    const receiptDataUrl = receiptFile?.size ? await fileToDataUrl(receiptFile) : '';
    try {
      await createRecharge({
        planId: selected.id,
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

  async function copyAccountNumber() {
    if (!selectedAccount?.accountNumber) return;
    await navigator.clipboard?.writeText(selectedAccount.accountNumber);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Comprar</h1>
        <p className="text-sm text-slate-400">Horario para invertir: 9:00 AM - 7:00 PM.</p>
      </div>
      <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
        Las solicitudes de inversion solo se reciben dentro del horario establecido.
      </p>

      <div className="grid gap-3">
        {availablePlans.map((plan) => {
          const isSelected = selected.id === plan.id;
          const roi = dailyRoi(plan.dailyProfit, plan.amount);
          const visual = planVisualStyles[plan.id] || defaultPlanVisual;
          return (
          <Card key={plan.id} className={`overflow-hidden p-0 transition hover:-translate-y-0.5 ${isSelected ? 'premium-ring border-emerald-200 shadow-glow' : ''}`}>
            <div className={`bg-gradient-to-br ${visual.gradient} p-5 text-white`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-black uppercase tracking-[.18em] text-white">{plan.name}</p>
                  <h2 className="mt-2 text-4xl font-black tracking-tight">{rdMoney(plan.amount)}</h2>
                  <p className="text-sm font-semibold text-white/85">Inversion inicial</p>
                </div>
                <div className="rounded-3xl border border-white/25 bg-white/20 px-4 py-3 text-center shadow-sm backdrop-blur">
                  <p className="text-2xl font-black">{roi}%</p>
                  <p className="text-[11px] font-bold text-white/85">por dia</p>
                </div>
              </div>
            </div>
            <div className={`space-y-4 bg-white p-4 ${isSelected ? 'plan-selected-fade' : ''}`}>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Renta diaria</p>
                  <p className={`mt-1 text-sm font-black ${visual.text}`}>{rdMoney(plan.dailyProfit)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Duracion</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{plan.durationDays} dias</p>
                </div>
                <div className={`rounded-2xl p-3 text-center ${visual.soft}`}>
                  <p className="text-[10px] font-black uppercase tracking-wide opacity-70">Ganancia</p>
                  <p className="mt-1 text-sm font-black">+{rdMoney(plan.dailyProfit)}/dia</p>
                </div>
              </div>
              <button
                type="button"
                className={`w-full rounded-2xl bg-gradient-to-r ${visual.button} px-4 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 active:scale-[.98]`}
                onClick={() => selectPlan(plan)}
              >
                <TrendingUp className="mr-2 inline h-4 w-4" />
                Comprar
              </button>
            </div>
          </Card>
          );
        })}
      </div>

      <Card className={sent ? 'premium-ring border-emerald-200' : ''}>
        <div ref={rechargeFormRef} className="-mt-2 h-2" />
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="text-gold" />
          <div>
            <h2 className="font-bold">Solicitud de recarga</h2>
            <p className="text-xs text-slate-400">Estado inicial: Pendiente de validacion</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={submit}>
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
            <p className="rounded-2xl bg-amber-300/10 p-3 text-sm text-amber-100">
              No hay cuentas bancarias activas publicadas por administracion.
            </p>
          )}
          {selectedAccount && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-slate-700">Número de cuenta para depositar</p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-950">{selectedAccount.accountNumber}</p>
                  <p className="text-xs text-slate-500">{selectedAccount.accountType} · {selectedAccount.accountHolder}</p>
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
            <input
              className={inputClass}
              name="amount"
              required
              type="number"
              min={selected.amount}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </Field>
          <Field label="Fecha de transferencia"><input className={inputClass} name="transferDate" required type="date" /></Field>
          <Field label="Comprobante de pago"><input className={`${inputClass} file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-700 file:px-3 file:py-2 file:font-bold file:text-white`} name="receipt" required type="file" accept="image/*" /></Field>
          <Button className="w-full">Enviar para validacion</Button>
        </form>
        {error && <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-700">{error}</p>}
        <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
          Tu inversion sera activada cuando el pago sea validado por administracion.
        </p>
      </Card>
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
