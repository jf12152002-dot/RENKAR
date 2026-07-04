import { Copy, Send, Share2, Ticket, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { creditedReferralLineBonus, referralBonus } from '../utils/calculations';
import { dateOnly, money } from '../utils/format';
import { Badge, Button, Card, Stat } from '../components/ui';

export function Referrals() {
  const { currentUser, state } = useApp();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const active = referrals.filter((item) => item.status === 'Activo').length;
  const link = `https://renkarapp.com/register?code=${currentUser?.referralCode}`;
  const shareMessage = `Unete a RENKAR con mi codigo ${currentUser?.referralCode} y empieza a invertir desde RD$ 600. ${link}`;
  const progress = active % 5;
  const blockBonus = referralBonus(referrals);
  const lineBonus = creditedReferralLineBonus(movements);

  async function copy() {
    await navigator.clipboard?.writeText(link);
    setCopied(true);
  }

  async function copyCode() {
    await navigator.clipboard?.writeText(currentUser?.referralCode || '');
    setCopiedCode(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Referidos</h1>
        <p className="text-sm text-slate-400">Gana bonos cuando tus referidos activan planes validados por administracion.</p>
      </div>
      <Card>
        <p className="text-xs text-slate-400">Tu enlace unico</p>
        <div className="mt-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{link}</div>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <Button onClick={copy} className="col-span-2"><Copy className="mr-2 inline h-4 w-4" />{copied ? 'Copiado' : 'Copiar'}</Button>
          <a className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm" href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank"><Share2 className="mx-auto h-5 w-5 text-emerald-700" /></a>
          <a className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-sm" href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareMessage)}`} target="_blank"><Send className="mx-auto h-5 w-5 text-sky-600" /></a>
        </div>
        <button onClick={copyCode} className="mt-2 flex w-full items-center justify-center rounded-2xl border border-slate-100 bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-emerald-50">
          <Ticket className="mr-2 h-4 w-4 text-emerald-700" />
          {copiedCode ? 'Codigo copiado' : `Copiar codigo: ${currentUser?.referralCode}`}
        </button>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Progreso al bono" value={`${progress}/5`} accent="text-amber-700" />
        <Stat label="Bono 5 activos" value={money(blockBonus)} accent="text-emerald-700" />
        <Stat label="Bonos por lineas" value={money(lineBonus)} accent="text-emerald-700" />
        <Stat label="Total referidos" value={money(blockBonus + lineBonus)} accent="text-emerald-700" />
      </div>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black text-slate-900">Bonos por lineas</h2>
            <p className="text-xs text-slate-500">Se acreditan automaticamente al aprobarse el pago del plan.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Linea 1', '15%'],
            ['Linea 2', '3%'],
            ['Linea 3', '2%']
          ].map(([label, percent]) => (
            <div key={label} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-black text-emerald-700">{percent}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Tambien recibes un pago unico de $100 por cada bloque de 5 referidos activos.
        </p>
      </Card>
      <Card>
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-700" style={{ width: `${(progress / 5) * 100}%` }} />
        </div>
        <h2 className="mb-3 font-bold">Lista de referidos</h2>
        <div className="space-y-3">
          {referrals.map((referral) => (
            <div key={referral.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{referral.name}</p>
                <Badge tone={referral.status === 'Activo' ? 'ok' : 'warn'}>{referral.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-400">{dateOnly(referral.registeredAt)} · Invertido {money(referral.investedAmount)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
