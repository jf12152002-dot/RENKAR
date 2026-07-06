import { Copy, Send, Share2, Ticket, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../hooks/useApp';
import { creditedReferralLineBonus, completedReferralCycles, nextReferralCycle, referralBonus, referralCycleBonuses } from '../utils/calculations';
import { dateOnly, money } from '../utils/format';
import { Badge, Button, Card, Stat } from '../components/ui';

type LineFilter = 'all' | 1 | 2 | 3;
const pageSize = 5;

export function Referrals() {
  const { currentUser, state } = useApp();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [lineFilter, setLineFilter] = useState<LineFilter>('all');
  const [page, setPage] = useState(1);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const directReferrals = referrals.filter((item) => !item.line || item.line === 1);
  const filteredReferrals = lineFilter === 'all' ? referrals : referrals.filter((item) => (item.line || 1) === lineFilter);
  const totalPages = Math.max(1, Math.ceil(filteredReferrals.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleReferrals = filteredReferrals.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const active = directReferrals.filter((item) => item.status === 'Activo').length;
  const link = `https://renkarapp.com/register?code=${currentUser?.referralCode}`;
  const shareMessage = `Unete a RENKAR con mi codigo ${currentUser?.referralCode} y empieza a invertir desde RD$ 600. ${link}`;
  const completedCycles = completedReferralCycles(directReferrals);
  const nextCycle = nextReferralCycle(directReferrals);
  const previousCycle = completedCycles[completedCycles.length - 1];
  const progressStart = previousCycle?.active || 0;
  const progressTarget = nextCycle?.active || referralCycleBonuses[referralCycleBonuses.length - 1].active;
  const progressCurrent = Math.max(0, active - progressStart);
  const progressTotal = Math.max(1, progressTarget - progressStart);
  const cycleProgress = nextCycle ? Math.min(100, (progressCurrent / progressTotal) * 100) : 100;
  const cycleBonus = referralBonus(directReferrals);
  const lineBonus = creditedReferralLineBonus(movements);
  const teamTotal = referrals.reduce((sum, referral) => sum + referral.investedAmount, 0);
  const teamLineTotals = [1, 2, 3].map((line) => ({
    line,
    total: referrals
      .filter((referral) => (referral.line || 1) === line)
      .reduce((sum, referral) => sum + referral.investedAmount, 0)
  }));

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
        <p className="text-sm text-slate-400">Gana bonos cuando tus referidos activos de Linea 1 completan ciclos y cuando tu red compra planes.</p>
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
        <Stat label="Referidos activos" value={`${active}`} accent="text-emerald-700" />
        <Stat label="Proxima meta" value={nextCycle ? `${active}/${nextCycle.active}` : 'Completadas'} accent="text-amber-700" />
        <Stat label="Metas completadas" value={`${completedCycles.length}`} accent="text-sky-700" />
        <Stat label="Bonos por ciclos" value={money(cycleBonus)} accent="text-emerald-700" />
        <Stat label="Bonos por lineas" value={money(lineBonus)} accent="text-emerald-700" />
        <Stat label="Total ganado" value={money(cycleBonus + lineBonus)} accent="text-emerald-700" />
      </div>
      <Card className="team-total-card relative overflow-hidden p-4 text-white">
        <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-white/15 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[.18em] text-white/75">Total de Equipo</p>
          <h2 className="mt-2 text-4xl font-black tracking-[-.05em] drop-shadow-sm">{money(teamTotal)}</h2>
          <p className="mt-1 text-xs font-bold text-white/80">Suma de planes comprados por tus Lineas 1, 2 y 3.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {teamLineTotals.map((item) => (
              <div key={item.line} className="rounded-2xl border border-white/25 bg-white/20 p-3 text-center shadow-sm backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-wide text-white/75">Linea {item.line}</p>
                <p className="mt-1 text-sm font-black text-white">{money(item.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
            <TrendingUp className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-black text-slate-900">Bonos por lineas</h2>
            <p className="text-xs text-slate-500">Se acreditan automaticamente cuando tus referidos compran planes.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['Linea 1', '15%', 'from-emerald-500 to-green-700'],
            ['Linea 2', '3%', 'from-sky-500 to-blue-700'],
            ['Linea 3', '2%', 'from-fuchsia-500 to-violet-700']
          ].map(([label, percent, color]) => (
            <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-3 text-center text-white shadow-lg shadow-slate-300/50`}>
              <p className="text-[11px] font-black uppercase tracking-wide text-white/75">{label}</p>
              <p className="mt-1 text-xl font-black">{percent}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          Bonos por ciclos de Linea 1: 5 activos $100, 15 activos $250, 30 activos $500, 45 activos $650, 60 activos $800, 80 activos $1,200 y 100 activos $1,800.
        </p>
      </Card>
      <Card>
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-700" style={{ width: `${cycleProgress}%` }} />
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Lista de referidos ({filteredReferrals.length})</h2>
            <p className="text-xs font-semibold text-slate-400">
              {lineFilter === 'all' ? 'Todas las lineas' : `Mostrando Linea ${lineFilter}`}
            </p>
          </div>
          <Badge tone="neutral">Pag. {currentPage}/{totalPages}</Badge>
        </div>
        <div className="mb-3 grid grid-cols-4 gap-2">
          {[
            ['all', 'Todas'],
            [1, 'L1'],
            [2, 'L2'],
            [3, 'L3']
          ].map(([value, label]) => (
            <button
              key={String(value)}
              onClick={() => {
                setLineFilter(value as LineFilter);
                setPage(1);
              }}
              className={`rounded-2xl px-2 py-2 text-xs font-black transition ${
                lineFilter === value ? 'bg-emerald-700 text-white shadow-glow' : 'border border-slate-100 bg-white text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {visibleReferrals.map((referral) => (
            <div key={referral.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{referral.name}</p>
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">Linea {referral.line || 1}</Badge>
                  <Badge tone={referral.status === 'Activo' ? 'ok' : 'warn'}>{referral.status}</Badge>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">{dateOnly(referral.registeredAt)} · Invertido {money(referral.investedAmount)}</p>
            </div>
          ))}
          {!visibleReferrals.length && (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              No hay referidos en esta linea.
            </p>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="ghost" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Anterior
          </Button>
          <Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>
            Siguiente
          </Button>
        </div>
      </Card>
    </div>
  );
}
