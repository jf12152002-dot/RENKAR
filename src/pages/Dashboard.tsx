import { ArrowDownToLine, CalendarClock, CheckCircle2, Clock, History, Landmark, ShieldCheck, TrendingUp, UserRoundPlus, WalletCards } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { accruedProfit, availableBalance, creditedReferralLineBonus, completedReferralCycles, nextReferralCycle, paidWithdrawals, referralBonus, referralCycleBonuses } from '../utils/calculations';
import { dateOnly, dateTime, money } from '../utils/format';
import { Badge, Card, Stat } from '../components/ui';
import { Tab } from '../components/BottomNav';

export function Dashboard({ setTab }: { setTab: (tab: Tab) => void }) {
  const { currentUser, state } = useApp();
  const investments = state.investments.filter((item) => item.userId === currentUser?.id);
  const withdrawals = state.withdrawals.filter((item) => item.userId === currentUser?.id);
  const referrals = state.referrals.filter((item) => item.userId === currentUser?.id);
  const movements = state.movements.filter((item) => item.userId === currentUser?.id);
  const recharges = state.recharges.filter((item) => item.userId === currentUser?.id);
  const balance = availableBalance(investments, withdrawals, referrals, movements, recharges);
  const activeInvestment = investments.reduce((sum, item) => sum + item.amount, 0);
  const totalReferralBonus = referralBonus(referrals) + creditedReferralLineBonus(movements);
  const totalProfit = accruedProfit(investments) + totalReferralBonus;
  const directReferrals = referrals.filter((item) => !item.line || item.line === 1);
  const activeReferrals = directReferrals.filter((item) => item.status === 'Activo').length;
  const completedCycles = completedReferralCycles(directReferrals);
  const nextCycle = nextReferralCycle(directReferrals);
  const previousCycle = completedCycles[completedCycles.length - 1];
  const progressStart = previousCycle?.active || 0;
  const progressTarget = nextCycle?.active || referralCycleBonuses[referralCycleBonuses.length - 1].active;
  const progressCurrent = Math.max(0, activeReferrals - progressStart);
  const progressTotal = Math.max(1, progressTarget - progressStart);
  const referralPercent = nextCycle ? Math.min(100, (progressCurrent / progressTotal) * 100) : 100;
  const chartItems = [
    { label: 'Inversión', value: activeInvestment, color: '#047857' },
    { label: 'Ganancias', value: accruedProfit(investments), color: '#16a34a' },
    { label: 'Retiros', value: paidWithdrawals(withdrawals), color: '#dc2626' },
    { label: 'Referidos', value: totalReferralBonus, color: '#c69214' }
  ].filter((item) => item.value > 0);
  const latestMovements = movements
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const shortcuts = [
    { id: 'recharge', label: 'Recargas', icon: WalletCards, color: 'from-sky-500 to-blue-700' },
    { id: 'withdraw', label: 'Retirar', icon: ArrowDownToLine, color: 'from-emerald-500 to-green-700' },
    { id: 'referrals', label: 'Referidos', icon: UserRoundPlus, color: 'from-amber-400 to-orange-600' },
    { id: 'history', label: 'Historial', icon: History, color: 'from-fuchsia-500 to-violet-700' }
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-500">Bienvenido de nuevo</p>
          <h1 className="mt-1 text-2xl font-black text-slate-950">{currentUser?.name.split(' ')[0]}</h1>
        </div>
        <Badge tone="ok">Cuenta verificada</Badge>
      </div>

      <Card className="green-hero-card relative overflow-hidden p-5 text-white">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 left-6 h-36 w-36 rounded-full bg-emerald-200/20 blur-3xl" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-white shadow-sm backdrop-blur">
              <Landmark className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-white/75">Balance disponible</p>
              <p className="text-xs text-white/75">Actualizado con datos internos</p>
            </div>
          </div>
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>

        <h2 className="mt-6 text-[2.9rem] font-black leading-none tracking-[-.06em] text-white">{money(balance)}</h2>
        <div className="mt-5">
          <div className="rounded-2xl border border-white/20 bg-white/15 p-3 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-wide text-white/70">Horario retiros</p>
            <p className="mt-1 text-sm font-black text-white">9 AM - 5 PM</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-4 gap-2">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-[1.35rem] bg-gradient-to-br ${item.color} p-3 text-center text-xs font-black text-white shadow-lg shadow-slate-300/50 transition hover:-translate-y-0.5`}>
              <span className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <Icon className="h-5 w-5 text-white" />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">Distribución de cuenta</p>
            <p className="text-xs text-slate-500">Resumen visual de tus fondos</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">En vivo</span>
        </div>
        <AccountPieChart items={chartItems} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Inversion total" value={money(activeInvestment)} accent="text-blue-700" />
        <Stat label="Ganancias totales" value={money(totalProfit)} accent="text-emerald-700" />
        <Stat label="Retiros totales" value={money(paidWithdrawals(withdrawals))} accent="text-rose-700" />
        <Stat label="Referidos" value={String(referrals.length)} accent="text-violet-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-700" />
            <h2 className="font-black text-slate-900">Retiro</h2>
          </div>
          <p className="text-sm text-slate-500">Diarios, 9:00 AM - 5:00 PM.</p>
          <button onClick={() => setTab('withdraw')} className="mt-4 w-full rounded-2xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white">
            Solicitar
          </button>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5 text-amber-700" />
            <h2 className="font-black text-slate-900">Referidos</h2>
          </div>
          <p className="text-sm font-black text-slate-900">{activeReferrals} activos</p>
          <p className="mt-1 text-xs text-slate-500">
            {nextCycle ? `${activeReferrals}/${nextCycle.active} para bono de ${money(nextCycle.amount)}` : 'Todas las metas completadas'}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-700">{completedCycles.length} metas completadas</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-emerald-700" style={{ width: `${referralPercent}%` }} />
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-slate-900">Rendimiento activo</h2>
          <TrendingUp className="text-emerald-700" />
        </div>
        <div className="space-y-3">
          {investments.map((investment) => (
            <div key={investment.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div>
                <p className="font-semibold">Plan {money(investment.amount)}</p>
                <p className="text-xs text-slate-400">Desde {dateOnly(investment.startedAt)}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-emerald-700">{money(investment.dailyProfit)}</p>
                <p className="text-xs text-slate-400">diario</p>
              </div>
            </div>
          ))}
          {!investments.length && <p className="text-sm text-slate-400">Aun no tienes inversiones activas.</p>}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black text-slate-900">Últimos movimientos</h2>
          <button onClick={() => setTab('history')} className="text-sm font-bold text-emerald-700">Ver todo</button>
        </div>
        <div className="space-y-3">
          {latestMovements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-slate-800">{movement.type}</p>
                  <p className="text-xs text-slate-500">{dateTime(movement.createdAt)}</p>
                </div>
              </div>
              <p className={`font-black ${movement.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(movement.amount)}</p>
            </div>
          ))}
          {!latestMovements.length && <p className="text-sm text-slate-500">Todavía no hay movimientos.</p>}
        </div>
      </Card>

      <p className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 shadow-sm">
        Transparencia: Todas las compras y los retiros son validados por la administración mediante transferencia bancaria.
      </p>

      <Card className="flex items-center gap-3">
        <Clock className="text-amber-600" />
        <p className="text-sm text-slate-600">Retiros diarios, 9:00 AM - 5:00 PM, con comision de retiro del 15%.</p>
      </Card>
    </div>
  );
}

function AccountPieChart({ items }: { items: Array<{ label: string; value: number; color: string }> }) {
  const fallback = [{ label: 'Sin datos', value: 1, color: '#e2e8f0' }];
  const chartItems = items.length ? items : fallback;
  const total = chartItems.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90;

  return (
    <div className="grid grid-cols-[132px_1fr] items-center gap-4">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-sm" role="img" aria-label="Gráfico de distribución de cuenta">
          {chartItems.length === 1 ? (
            <circle cx="60" cy="60" r="54" fill={chartItems[0].color} stroke="#fff" strokeWidth="3" />
          ) : chartItems.map((item) => {
            const angle = (item.value / total) * 360;
            const path = describeArc(60, 60, 54, currentAngle, currentAngle + angle);
            currentAngle += angle;
            return <path key={item.label} d={path} fill={item.color} stroke="#fff" strokeWidth="3" />;
          })}
          <circle cx="60" cy="60" r="31" fill="#fff" />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</p>
            <p className="text-sm font-black text-slate-950">{money(total)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {chartItems.map((item) => {
          const percent = Math.round((item.value / total) * 100);
          return (
            <div key={item.label} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-xs font-bold text-slate-700">{item.label}</span>
              </div>
              <span className="text-xs font-black text-slate-900">{percent}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}
