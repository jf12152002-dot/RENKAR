import { FormEvent, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { availableBalance } from '../utils/calculations';
import { dateOnly, money } from '../utils/format';
import { Badge, Button, Card, Field, inputClass } from '../components/ui';

export function Withdraw() {
  const { currentUser, state, createWithdrawal } = useApp();
  const [sent, setSent] = useState(false);
  const investments = state.investments.filter((item) => item.userId === currentUser?.id);
  const withdrawals = state.withdrawals.filter((item) => item.userId === currentUser?.id);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const activeAccounts = (state.paymentAccounts || []).filter((account) => account.active);
  const hasApprovedRecharge = state.recharges.some((item) => item.userId === currentUser?.id && item.status === 'Aprobada');
  const hasWithdrawalToday = withdrawals.some((item) => isSameDominicanDate(item.createdAt, new Date()));
  const balance = availableBalance(investments, withdrawals, referrals, movements);
  const withdrawScheduleOpen = isWithdrawalScheduleOpen();
  const minimumWithdrawalAmount = 200;
  const canSubmit = balance >= minimumWithdrawalAmount && withdrawScheduleOpen && hasApprovedRecharge && !hasWithdrawalToday;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await createWithdrawal({
      bank: String(data.get('bank')),
      accountHolder: String(data.get('accountHolder')),
      accountNumber: String(data.get('accountNumber')),
      accountType: String(data.get('accountType')),
      amount: Number(data.get('amount'))
    });
    setSent(true);
    form.reset();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Retiros</h1>
        <p className="text-sm text-slate-400">Retiros diarios de lunes a sabado, 10:00 AM - 5:00 PM. Comision de retiro 15%.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WithdrawStat label="Saldo disponible" value={money(balance)} color="from-emerald-500 to-green-700" />
        <WithdrawStat label="Horario" value="10 AM - 5 PM" color="from-amber-400 to-orange-600" />
      </div>
      <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
        Para retirar es obligatorio tener al menos una recarga aprobada por administracion. El monto minimo de retiro es RD$200.
        Los bonos, comisiones o referidos no habilitan retiros por si solos.
      </p>
      {!hasApprovedRecharge && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Retiro deshabilitado: necesitas realizar una recarga y que sea aprobada por administracion antes de poder solicitar retiros.
        </p>
      )}
      {hasWithdrawalToday && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Ya solicitaste un retiro hoy. Podras solicitar otro retiro manana dentro del horario disponible.
        </p>
      )}
      {!withdrawScheduleOpen && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Solicitudes de retiro deshabilitadas fuera de horario. Disponible de lunes a sabado, 10:00 AM - 5:00 PM.
        </p>
      )}
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Banco">
            <select className={inputClass} name="bank" required>
              {activeAccounts.map((account) => <option key={account.id} value={account.bank}>{account.bank}</option>)}
            </select>
          </Field>
          {!activeAccounts.length && (
            <p className="rounded-2xl bg-amber-300/10 p-3 text-sm text-amber-100">
              No hay bancos activos configurados por administracion.
            </p>
          )}
          <Field label="Nombre del titular"><input className={inputClass} name="accountHolder" required defaultValue={currentUser?.name} /></Field>
          <Field label="Numero de cuenta"><input className={inputClass} name="accountNumber" required /></Field>
          <Field label="Tipo de cuenta">
            <select className={inputClass} name="accountType" required><option>Ahorro</option><option>Corriente</option></select>
          </Field>
          <Field label="Monto a retirar"><input className={inputClass} name="amount" required type="number" min={minimumWithdrawalAmount} max={Math.max(minimumWithdrawalAmount, balance)} /></Field>
          <Button disabled={!canSubmit} className="w-full">Solicitar retiro</Button>
        </form>
        {sent && <p className="mt-3 text-sm font-semibold text-emerald-700">Solicitud creada con estado Pendiente.</p>}
      </Card>
      <Card>
        <h2 className="mb-3 font-bold">Historial de retiros</h2>
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div>
                <p className="font-semibold">{money(withdrawal.amount)}</p>
                <p className="text-xs text-slate-400">{dateOnly(withdrawal.createdAt)} · {withdrawal.bank}</p>
              </div>
              <Badge tone={withdrawal.status === 'Pagado' ? 'ok' : withdrawal.status === 'Rechazado' ? 'danger' : 'warn'}>{withdrawal.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WithdrawStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-lg shadow-slate-300/50`}>
      <p className="text-[11px] font-black uppercase tracking-wide text-white/75">{label}</p>
      <p className="mt-2 text-lg font-black">{value}</p>
    </div>
  );
}

function isWithdrawalScheduleOpen() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santo_Domingo',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const weekday = value('weekday');
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  return weekday !== 'Sun' && minutes >= 10 * 60 && minutes <= 17 * 60;
}

function isSameDominicanDate(date: string, compareDate: Date) {
  return dominicanDateKey(new Date(date)) === dominicanDateKey(compareDate);
}

function dominicanDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}
