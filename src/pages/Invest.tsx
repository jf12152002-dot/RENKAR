import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, CirclePlus, Clipboard, ShieldCheck, TrendingUp } from 'lucide-react';
import { plans } from '../data/plans';
import { useApp } from '../hooks/useApp';
import { Button, Card, Field, inputClass } from '../components/ui';

const rdMoney = (value: number) => `RD$${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
const dailyRoi = (dailyEarnings: number, investmentAmount: number) => ((dailyEarnings / investmentAmount) * 100).toFixed(2);
const planCameraImages: Record<string, string> = {
  'plan-renkar-a': '/images/camera-plan-700.png',
  'plan-renkar-b': '/images/camera-plan-3500.png',
  'plan-renkar-c': '/images/camera-plan-5500.png',
  'plan-renkar-d': '/images/camera-plan-8700.png',
  'plan-renkar-e': '/images/camera-plan-25500.png',
  'plan-renkar-f': '/images/camera-plan-47000.png',
  'plan-renkar-g': '/images/camera-plan-68000.png'
};

export function Invest() {
  const { state, createRecharge } = useApp();
  const availablePlans = state.plans?.length ? state.plans : plans;
  const [selected, setSelected] = useState(availablePlans[0]);
  const [amount, setAmount] = useState(availablePlans[0].amount);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
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
        <h1 className="text-2xl font-black">Invertir</h1>
        <p className="text-sm text-slate-400">Horario para invertir: 9:00 AM - 7:00 PM.</p>
      </div>
      <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
        Las solicitudes de inversion solo se reciben dentro del horario establecido.
      </p>

      <div className="grid gap-3">
        {availablePlans.map((plan) => {
          const isSelected = selected.id === plan.id;
          const roi = dailyRoi(plan.dailyProfit, plan.amount);
          const cameraImage = planCameraImages[plan.id] || '/images/security-camera-plan.png';
          return (
          <Card key={plan.id} className={`transition hover:-translate-y-0.5 ${isSelected ? 'premium-ring border-emerald-200 shadow-glow' : ''}`}>
            <div className="grid grid-cols-[1fr_6.75rem] items-center gap-4">
              <div className="min-w-0">
                <p className="text-sm font-black text-emerald-700">{plan.name}</p>
                <h2 className="text-3xl font-black text-slate-950">{rdMoney(plan.amount)}</h2>
                <div className={`mt-3 flex flex-wrap items-center gap-2 ${isSelected ? 'plan-selected-fade' : ''}`}>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-700">
                    <CirclePlus className="h-4 w-4" />
                    +{rdMoney(plan.dailyProfit)}/dia
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-800">
                    <TrendingUp className="h-3.5 w-3.5" />
                    ROI {roi}%
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                    {plan.durationDays} dias
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-stretch gap-2">
                <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
                  <img src={cameraImage} alt={`Camara de seguridad del plan ${rdMoney(plan.amount)}`} className="h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black text-emerald-800 shadow-sm">
                    1 camara
                  </span>
                </div>
                <Button className="w-full px-3 py-3 text-xs" onClick={() => selectPlan(plan)}>{isSelected ? 'Comprado' : 'Comprar'}</Button>
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      <Card>
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
        {sent && <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Solicitud enviada.</p>}
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
