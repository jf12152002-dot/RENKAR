import { FormEvent, useEffect, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { availableBalance } from '../utils/calculations';
import { dateOnly, money } from '../utils/format';
import { Badge, Button, Card, Field, inputClass } from '../components/ui';
import { banks } from '../data/banks';

export function Withdraw() {
  const { currentUser, state, createWithdrawal } = useApp();
  const [sent, setSent] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const investments = state.investments.filter((item) => item.userId === currentUser?.id);
  const withdrawals = state.withdrawals.filter((item) => item.userId === currentUser?.id);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const userBankAccounts = currentUser?.bankMethods || [];
  const selectedAccount = userBankAccounts.find((account) => account.id === selectedAccountId) || userBankAccounts[0];
  const manualAccount = selectedAccountId === 'manual' || !selectedAccount;
  const hasApprovedRecharge = state.recharges.some((item) => item.userId === currentUser?.id && item.status === 'Aprobada');
  const hasPurchasedPlan = investments.length > 0;
  const hasWithdrawalToday = withdrawals.some((item) => isSameDominicanDate(item.createdAt, new Date()));
  const balance = availableBalance(investments, withdrawals, referrals, movements);
  const withdrawScheduleOpen = isWithdrawalScheduleOpen();
  const minimumWithdrawalAmount = 200;
  const withdrawalCommissionRate = 0.15;
  const requestedAmount = Number(withdrawAmount) || 0;
  const commissionAmount = Math.round(requestedAmount * withdrawalCommissionRate);
  const netWithdrawalAmount = Math.max(0, requestedAmount - commissionAmount);
  const canSubmit = balance >= minimumWithdrawalAmount && withdrawScheduleOpen && hasApprovedRecharge && hasPurchasedPlan && !hasWithdrawalToday;

  useEffect(() => {
    if (!selectedAccountId && userBankAccounts[0]) setSelectedAccountId(userBankAccounts[0].id);
  }, [selectedAccountId, userBankAccounts]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    await createWithdrawal({
      bank: manualAccount ? String(data.get('bank')) : selectedAccount?.bank || '',
      accountHolder: manualAccount ? String(data.get('accountHolder')) : selectedAccount?.accountHolder || '',
      accountNumber: manualAccount ? String(data.get('accountNumber')) : selectedAccount?.accountNumber || '',
      accountType: manualAccount ? String(data.get('accountType')) : selectedAccount?.accountType || '',
      amount: Number(data.get('amount'))
    });
    setSent(true);
    setWithdrawAmount('');
    form.reset();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Retiros</h1>
        <p className="text-sm text-slate-400">Retiros diarios, 9:00 AM - 5:00 PM. Comision de retiro 15%.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <WithdrawStat label="Saldo disponible" value={money(balance)} color="from-emerald-500 to-green-700" />
        <WithdrawStat label="Horario" value="9 AM - 5 PM" color="from-amber-400 to-orange-600" />
      </div>
      <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
        Para retirar es obligatorio tener al menos una recarga aprobada y haber comprado un plan. El monto minimo de retiro es RD$200.
        Luego de comprar un plan, podras retirar tu balance disponible dentro del horario.
      </p>
      {!hasApprovedRecharge && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Retiro deshabilitado: necesitas realizar una recarga y que sea aprobada por administracion antes de poder solicitar retiros.
        </p>
      )}
      {hasApprovedRecharge && !hasPurchasedPlan && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Retiro deshabilitado: primero debes comprar un plan con tu balance disponible. Despues podras retirar sin problema.
        </p>
      )}
      {hasWithdrawalToday && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Ya solicitaste un retiro hoy. Podras solicitar otro retiro mañana dentro del horario disponible.
        </p>
      )}
      {!withdrawScheduleOpen && (
        <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-bold text-rose-700">
          Solicitudes de retiro deshabilitadas fuera de horario. Disponible todos los dias, 9:00 AM - 5:00 PM.
        </p>
      )}
      <Card>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Cuenta bancaria">
            <select className={inputClass} name="savedAccount" value={manualAccount ? 'manual' : selectedAccount?.id || ''} onChange={(event) => setSelectedAccountId(event.target.value)} required>
              {userBankAccounts.map((account) => (
                <option key={account.id} value={account.id}>{account.bank} - {account.accountNumber}</option>
              ))}
              <option value="manual">Escribir otra cuenta</option>
            </select>
          </Field>
          {!userBankAccounts.length && (
            <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Puedes agregar una cuenta en Perfil para usarla mas rapido, o escribir una cuenta manualmente aqui.
            </p>
          )}
          <div key={manualAccount ? 'manual' : selectedAccount?.id || 'empty'} className="space-y-4">
            <Field label="Banco">
              {manualAccount ? (
                <select className={inputClass} name="bank" required>
                  {banks.map((bank) => <option key={bank}>{bank}</option>)}
                </select>
              ) : (
                <input className={`${inputClass} bg-slate-50`} value={selectedAccount?.bank || ''} readOnly />
              )}
            </Field>
            <Field label="Nombre del titular">
              <input className={`${inputClass} ${manualAccount ? '' : 'bg-slate-50'}`} name="accountHolder" defaultValue={manualAccount ? currentUser?.name : selectedAccount?.accountHolder || ''} readOnly={!manualAccount} required />
            </Field>
            <Field label="Numero de cuenta">
              <input className={`${inputClass} ${manualAccount ? '' : 'bg-slate-50'}`} name="accountNumber" defaultValue={manualAccount ? '' : selectedAccount?.accountNumber || ''} readOnly={!manualAccount} required inputMode="numeric" />
            </Field>
            <Field label="Tipo de cuenta">
              {manualAccount ? (
                <select className={inputClass} name="accountType" required>
                  <option>Ahorro</option>
                  <option>Corriente</option>
                </select>
              ) : (
                <input className={`${inputClass} bg-slate-50`} value={selectedAccount?.accountType || ''} readOnly />
              )}
            </Field>
          </div>
          <Field label="Monto a retirar">
            <input
              className={inputClass}
              name="amount"
              required
              type="number"
              min={minimumWithdrawalAmount}
              max={Math.max(minimumWithdrawalAmount, balance)}
              value={withdrawAmount}
              onChange={(event) => setWithdrawAmount(event.target.value)}
            />
          </Field>
          {requestedAmount > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-center justify-between">
                <span>Monto solicitado</span>
                <strong>{money(requestedAmount)}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between text-amber-700">
                <span>Comision 15%</span>
                <strong>-{money(commissionAmount)}</strong>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-emerald-100 pt-2 text-base">
                <span className="font-black">Monto a recibir</span>
                <strong className="text-emerald-700">{money(netWithdrawalAmount)}</strong>
              </div>
            </div>
          )}
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
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  return minutes >= 9 * 60 && minutes <= 17 * 60;
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
