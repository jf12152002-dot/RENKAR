import { FormEvent, ReactNode, useMemo, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { banks } from '../data/banks';
import { GiftCode, Investment, InvestmentPlan, Movement, PaymentAccount, RechargeRequest, RechargeStatus, Referral, Role, User, WithdrawalRequest, WithdrawalStatus } from '../types';
import { Badge, Button, Card, Field, inputClass } from '../components/ui';
import { dateOnly, dateTime, money } from '../utils/format';

type Section = 'recargas-pendientes' | 'recargas-procesadas' | 'retiros-pendientes' | 'retiros-procesados' | 'planes' | 'bonos' | 'cuentas' | 'usuarios' | 'inversiones' | 'referidos' | 'historial';
type StatusFilter = 'Todos' | RechargeStatus | WithdrawalStatus;
const pageSizeOptions = [25, 50, 100];

export function Admin() {
  const { state, currentUser, updateRecharge, updateWithdrawal, updatePaymentAccounts, updateUserBlock, updatePlans, updateGiftCodes } = useApp();
  const [section, setSection] = useState<Section>('recargas-pendientes');
  const [voucher, setVoucher] = useState<RechargeRequest | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todos');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const userById = (id: string) => state.users.find((user) => user.id === id);
  const userName = (id: string) => userById(id)?.name || 'Usuario';
  const role = currentUser?.role || 'user';
  const canRecharges = ['admin', 'admin_recharges', 'supervisor'].includes(role);
  const canWithdrawals = ['admin', 'admin_withdrawals', 'supervisor'].includes(role);
  const canSystem = ['admin', 'supervisor'].includes(role);
  const sections: Section[] = [
    ...(canRecharges ? ['recargas-pendientes', 'recargas-procesadas'] as Section[] : []),
    ...(canWithdrawals ? ['retiros-pendientes', 'retiros-procesados'] as Section[] : []),
    ...(canSystem ? ['planes', 'bonos', 'cuentas', 'usuarios', 'inversiones', 'referidos', 'historial'] as Section[] : [])
  ];
  const pendingRecharges = state.recharges.filter((item) => item.status === 'Pendiente de validacion').length;
  const pendingWithdrawals = state.withdrawals.filter((item) => item.status === 'Pendiente').length;

  async function savePaymentAccounts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const accounts: PaymentAccount[] = banks.map((bank) => ({
      id: String(data.get(`${bank}-id`) || `pay-${bank.toLowerCase().replace(/\s+/g, '-')}`),
      bank,
      accountHolder: String(data.get(`${bank}-holder`) || ''),
      accountNumber: String(data.get(`${bank}-number`) || ''),
      accountType: String(data.get(`${bank}-type`) || 'Corriente'),
      active: data.get(`${bank}-active`) === 'on'
    }));
    await updatePaymentAccounts(accounts);
  }

  function switchSection(item: Section) {
    setSection(item);
    setQuery('');
    setStatusFilter('Todos');
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Panel de administracion</h1>
        <p className="text-sm text-slate-400">Gestion manual de transferencias, inversiones y retiros.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recargas pendientes</p>
          <p className="mt-1 text-3xl font-black text-emerald-700">{pendingRecharges}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Retiros pendientes</p>
          <p className="mt-1 text-3xl font-black text-amber-700">{pendingWithdrawals}</p>
        </Card>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {sections.map((item) => (
          <button key={item} onClick={() => switchSection(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${section === item ? 'bg-emerald-700 text-white' : 'border border-slate-100 bg-white text-slate-600 shadow-sm'}`}>
            {sectionLabel(item)}
          </button>
        ))}
      </div>

      {(section === 'recargas-pendientes' || section === 'recargas-procesadas') && (
        <RechargeAdminTable
          items={state.recharges}
          processed={section === 'recargas-procesadas'}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          userById={userById}
          onVoucher={setVoucher}
          onUpdate={updateRecharge}
        />
      )}

      {(section === 'retiros-pendientes' || section === 'retiros-procesados') && (
        <WithdrawalAdminTable
          items={state.withdrawals}
          processed={section === 'retiros-procesados'}
          query={query}
          setQuery={setQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          userById={userById}
          onUpdate={updateWithdrawal}
        />
      )}

      {section === 'planes' && (
        <PlansAdminTable plans={state.plans} onSave={updatePlans} />
      )}

      {section === 'bonos' && (
        <GiftCodesAdminTable giftCodes={state.giftCodes} onSave={updateGiftCodes} />
      )}

      {section === 'cuentas' && (
        <Card>
          <h2 className="mb-1 font-bold">Cuentas para recibir transferencias</h2>
          <p className="mb-4 text-sm text-slate-400">Estas son las cuentas que el usuario vera en Perfil para realizar recargas.</p>
          <form className="space-y-4" onSubmit={savePaymentAccounts}>
            {banks.map((bank) => {
              const account = state.paymentAccounts.find((item) => item.bank === bank);
              return (
                <div key={bank} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <input type="hidden" name={`${bank}-id`} defaultValue={account?.id} />
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-emerald-100">{bank}</p>
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      Activa
                      <input className="h-5 w-5 accent-emerald-300" type="checkbox" name={`${bank}-active`} defaultChecked={account?.active ?? true} />
                    </label>
                  </div>
                  <Field label="Titular">
                    <input className={inputClass} name={`${bank}-holder`} defaultValue={account?.accountHolder || 'RENKAR SRL'} required />
                  </Field>
                  <Field label="Numero de cuenta">
                    <input className={inputClass} name={`${bank}-number`} defaultValue={account?.accountNumber || ''} required />
                  </Field>
                  <Field label="Tipo de cuenta">
                    <select className={inputClass} name={`${bank}-type`} defaultValue={account?.accountType || 'Corriente'} required>
                      <option>Corriente</option>
                      <option>Ahorro</option>
                    </select>
                  </Field>
                </div>
              );
            })}
            <Button className="w-full">Guardar cuentas</Button>
          </form>
        </Card>
      )}

      {section === 'usuarios' && (
        <UsersAdminTable
          items={state.users}
          currentUserId={currentUser?.id || ''}
          query={query}
          setQuery={setQuery}
          page={page}
          setPage={setPage}
          pageSize={pageSize}
          setPageSize={setPageSize}
          onBlock={updateUserBlock}
        />
      )}
      {section === 'inversiones' && <InvestmentsAdminTable items={state.investments} query={query} setQuery={setQuery} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} userName={userName} />}
      {section === 'referidos' && <ReferralsAdminTable items={state.referrals} query={query} setQuery={setQuery} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} />}
      {section === 'historial' && <MovementsAdminTable items={state.movements} query={query} setQuery={setQuery} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} userName={userName} />}
      {voucher && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <h2 className="font-black text-slate-950">Voucher de pago</h2>
                <p className="text-xs text-slate-500">{userName(voucher.userId)} · {money(voucher.amount)}</p>
              </div>
              <button onClick={() => setVoucher(null)} className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                Cerrar
              </button>
            </div>
            <div className="p-4">
              <img src={voucher.receiptDataUrl} alt={`Voucher ${voucher.receiptName}`} className="max-h-[70vh] w-full rounded-2xl object-contain" />
              <p className="mt-3 text-xs text-slate-500">{voucher.receiptName}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminList({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="space-y-2">
        {items.map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">{item}</div>)}
      </div>
    </Card>
  );
}

function PlansAdminTable({ plans, onSave }: { plans: InvestmentPlan[]; onSave: (plans: InvestmentPlan[]) => Promise<void> }) {
  const [draft, setDraft] = useState<InvestmentPlan[]>(plans);
  const [notice, setNotice] = useState('');

  function updatePlan(id: string, field: keyof InvestmentPlan, value: string) {
    setDraft((prev) =>
      prev.map((plan) => {
        if (plan.id !== id) return plan;
        const next = {
          ...plan,
          [field]: field === 'name' || field === 'id' ? value : Number(value)
        };
        next.dailyProfit = Math.round(Number(next.amount) * Number(next.roiPercent) / 100);
        return next;
      })
    );
  }

  function addPlan() {
    const letter = String.fromCharCode(65 + draft.length);
    const id = `plan-renkar-${letter.toLowerCase()}-${Date.now()}`;
    setDraft((prev) => [
      ...prev,
      { id, name: `RENKAR ${letter}`, amount: 0, roiPercent: 7, dailyProfit: 0, durationDays: 30 }
    ]);
  }

  function removePlan(id: string) {
    setDraft((prev) => prev.filter((plan) => plan.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = draft
      .map((plan) => ({
        ...plan,
        name: plan.name.trim(),
        amount: Number(plan.amount),
        roiPercent: Number(plan.roiPercent),
        dailyProfit: Math.round(Number(plan.amount) * Number(plan.roiPercent) / 100),
        durationDays: Number(plan.durationDays) || 30
      }))
      .filter((plan) => plan.name && plan.amount > 0 && plan.roiPercent > 0);
    await onSave(cleaned);
    setDraft(cleaned);
    setNotice('Planes guardados correctamente.');
  }

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-black">Planes de inversion</h2>
          <p className="text-sm text-slate-400">Agrega nuevos planes o modifica los existentes. La ganancia diaria se calcula automaticamente.</p>
        </div>
        <Badge tone="neutral">{draft.length}</Badge>
      </div>
      {notice && <p className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      <form className="space-y-4" onSubmit={submit}>
        {draft.map((plan, index) => (
          <div key={plan.id} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-slate-900">{plan.name || `Plan ${index + 1}`}</p>
              <button type="button" onClick={() => removePlan(plan.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                Quitar
              </button>
            </div>
            <Field label="Nombre del plan">
              <input className={inputClass} value={plan.name} onChange={(event) => updatePlan(plan.id, 'name', event.target.value)} placeholder="RENKAR A" required />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Monto">
                <input className={inputClass} value={plan.amount || ''} onChange={(event) => updatePlan(plan.id, 'amount', event.target.value)} type="number" min="1" required />
              </Field>
              <Field label="Porcentaje diario">
                <input className={inputClass} value={plan.roiPercent || ''} onChange={(event) => updatePlan(plan.id, 'roiPercent', event.target.value)} type="number" min="0.01" step="0.01" required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Dias">
                <input className={inputClass} value={plan.durationDays || ''} onChange={(event) => updatePlan(plan.id, 'durationDays', event.target.value)} type="number" min="1" required />
              </Field>
              <div className="rounded-2xl border border-emerald-100 bg-white p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ganancia diaria</p>
                <p className="mt-1 text-lg font-black text-emerald-700">{money(Math.round(plan.amount * plan.roiPercent / 100))}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={addPlan}>Agregar plan</Button>
          <Button>Guardar planes</Button>
        </div>
      </form>
    </Card>
  );
}

function GiftCodesAdminTable({ giftCodes, onSave }: { giftCodes: GiftCode[]; onSave: (giftCodes: GiftCode[]) => Promise<void> }) {
  const [draft, setDraft] = useState<GiftCode[]>(giftCodes);
  const [notice, setNotice] = useState('');

  function updateGiftCode(id: string, field: keyof GiftCode, value: string | boolean) {
    setDraft((prev) =>
      prev.map((giftCode) => {
        if (giftCode.id !== id) return giftCode;
        return {
          ...giftCode,
          [field]: field === 'amount' ? Number(value) : field === 'active' ? Boolean(value) : String(value).toUpperCase()
        };
      })
    );
  }

  function addGiftCode() {
    setDraft((prev) => [
      ...prev,
      {
        id: `gift-${Date.now()}`,
        code: '',
        amount: 0,
        active: true,
        createdAt: new Date().toISOString(),
        redeemedBy: []
      }
    ]);
  }

  function removeGiftCode(id: string) {
    setDraft((prev) => prev.filter((giftCode) => giftCode.id !== id));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = draft
      .map((giftCode) => ({
        ...giftCode,
        code: giftCode.code.trim().toUpperCase(),
        amount: Number(giftCode.amount),
        redeemedBy: Array.isArray(giftCode.redeemedBy) ? giftCode.redeemedBy : []
      }))
      .filter((giftCode) => giftCode.code && giftCode.amount > 0);
    await onSave(cleaned);
    setDraft(cleaned);
    setNotice('Codigos de regalo guardados correctamente.');
  }

  return (
    <Card>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-black">Codigos de regalo</h2>
          <p className="text-sm text-slate-400">Crea bonos canjeables. Si desactivas o quitas un codigo, ya no podra ser canjeado.</p>
        </div>
        <Badge tone="neutral">{draft.length}</Badge>
      </div>
      {notice && <p className="mb-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}
      <form className="space-y-4" onSubmit={submit}>
        {draft.map((giftCode) => (
          <div key={giftCode.id} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-black text-slate-900">{giftCode.code || 'Nuevo codigo'}</p>
                <p className="text-xs text-slate-500">{giftCode.redeemedBy.length} canjes realizados</p>
              </div>
              <button type="button" onClick={() => removeGiftCode(giftCode.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                Quitar
              </button>
            </div>
            <Field label="Codigo">
              <input className={inputClass} value={giftCode.code} onChange={(event) => updateGiftCode(giftCode.id, 'code', event.target.value)} placeholder="RENKAR200" required />
            </Field>
            <Field label="Monto del bono">
              <input className={inputClass} value={giftCode.amount || ''} onChange={(event) => updateGiftCode(giftCode.id, 'amount', event.target.value)} type="number" min="1" required />
            </Field>
            <label className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3">
              <span>
                <span className="block font-bold text-slate-900">Disponible para canjear</span>
                <span className="text-xs text-slate-500">{giftCode.active ? 'Activo' : 'Desactivado'}</span>
              </span>
              <input
                type="checkbox"
                checked={giftCode.active}
                onChange={(event) => updateGiftCode(giftCode.id, 'active', event.target.checked)}
                className="h-5 w-5 accent-emerald-700"
              />
            </label>
          </div>
        ))}
        {!draft.length && <EmptyState />}
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="ghost" onClick={addGiftCode}>Agregar bono</Button>
          <Button>Guardar bonos</Button>
        </div>
      </form>
    </Card>
  );
}

function UsersAdminTable({
  items,
  currentUserId,
  query,
  setQuery,
  page,
  setPage,
  pageSize,
  setPageSize,
  onBlock
}: {
  items: User[];
  currentUserId: string;
  query: string;
  setQuery: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  onBlock: (id: string, blocked: boolean) => Promise<void>;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((user) => !needle || [user.name, user.email, roleLabel(user.role), user.blocked ? 'bloqueado' : 'activo'].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => Number(b.blocked) - Number(a.blocked) || a.name.localeCompare(b.name));
  }, [items, query]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <Card>
      <SimpleToolbar title="Usuarios registrados" count={filtered.length} query={query} setQuery={setQuery} placeholder="Buscar nombre, correo, rol o estado" pageSize={pageSize} setPageSize={(value) => { setPageSize(value); setPage(1); }} />
      <p className="mt-3 text-sm text-slate-400">Bloquea o desbloquea el acceso de cualquier usuario al sistema.</p>
      <div className="mt-4 space-y-3">
        {paged.items.map((user) => {
          const isCurrentAdmin = user.id === currentUserId;
          return (
            <div key={user.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email} · {roleLabel(user.role)}</p>
                </div>
                <Badge tone={user.blocked ? 'danger' : 'ok'}>{user.blocked ? 'Bloqueado' : 'Activo'}</Badge>
              </div>
              <Button
                className="mt-3 w-full"
                variant={user.blocked ? 'primary' : 'danger'}
                disabled={isCurrentAdmin}
                onClick={() => void onBlock(user.id, !user.blocked)}
              >
                {isCurrentAdmin ? 'Tu cuenta admin' : user.blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
              </Button>
            </div>
          );
        })}
        {!paged.items.length && <EmptyState />}
      </div>
      <Pagination page={page} totalPages={paged.totalPages} setPage={setPage} />
    </Card>
  );
}

function InvestmentsAdminTable({ items, query, setQuery, page, setPage, pageSize, setPageSize, userName }: {
  items: Investment[];
  query: string;
  setQuery: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  userName: (id: string) => string;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((inv) => !needle || [userName(inv.userId), inv.amount, inv.dailyProfit, inv.durationDays, dateOnly(inv.startedAt), inv.active ? 'activa' : 'inactiva'].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => Number(b.active) - Number(a.active) || new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [items, query, userName]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <Card>
      <SimpleToolbar title="Inversiones activas" count={filtered.length} query={query} setQuery={setQuery} placeholder="Buscar usuario, monto, ganancia o fecha" pageSize={pageSize} setPageSize={(value) => { setPageSize(value); setPage(1); }} />
      <div className="mt-4 space-y-2">
        {paged.items.map((inv) => (
          <div key={inv.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-bold text-slate-900">{userName(inv.userId)} · {money(inv.amount)}</p>
            <p className="text-xs text-slate-500">{money(inv.dailyProfit)} diario · {inv.durationDays || 30} dias · {dateOnly(inv.startedAt)}</p>
          </div>
        ))}
        {!paged.items.length && <EmptyState />}
      </div>
      <Pagination page={page} totalPages={paged.totalPages} setPage={setPage} />
    </Card>
  );
}

function ReferralsAdminTable({ items, query, setQuery, page, setPage, pageSize, setPageSize }: {
  items: Referral[];
  query: string;
  setQuery: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((ref) => !needle || [ref.name, ref.status, ref.investedAmount, dateOnly(ref.registeredAt)].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => Number(a.status !== 'Activo') - Number(b.status !== 'Activo') || new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
  }, [items, query]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <Card>
      <SimpleToolbar title="Referidos" count={filtered.length} query={query} setQuery={setQuery} placeholder="Buscar nombre, estado, monto o fecha" pageSize={pageSize} setPageSize={(value) => { setPageSize(value); setPage(1); }} />
      <div className="mt-4 space-y-2">
        {paged.items.map((ref) => (
          <div key={ref.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <div>
              <p className="font-bold text-slate-900">{ref.name}</p>
              <p className="text-xs text-slate-500">{dateOnly(ref.registeredAt)} · {money(ref.investedAmount)}</p>
            </div>
            <Badge tone={ref.status === 'Activo' ? 'ok' : 'warn'}>{ref.status}</Badge>
          </div>
        ))}
        {!paged.items.length && <EmptyState />}
      </div>
      <Pagination page={page} totalPages={paged.totalPages} setPage={setPage} />
    </Card>
  );
}

function MovementsAdminTable({ items, query, setQuery, page, setPage, pageSize, setPageSize, userName }: {
  items: Movement[];
  query: string;
  setQuery: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  userName: (id: string) => string;
}) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items
      .filter((mov) => !needle || [userName(mov.userId), mov.type, mov.amount, mov.status, dateTime(mov.createdAt)].join(' ').toLowerCase().includes(needle))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, query, userName]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <Card>
      <SimpleToolbar title="Historial general" count={filtered.length} query={query} setQuery={setQuery} placeholder="Buscar usuario, tipo, monto, estado o fecha" pageSize={pageSize} setPageSize={(value) => { setPageSize(value); setPage(1); }} />
      <div className="mt-4 space-y-2">
        {paged.items.map((mov) => (
          <div key={mov.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <p className="font-bold text-slate-900">{userName(mov.userId)} · {mov.type} · {money(mov.amount)}</p>
            <p className="text-xs text-slate-500">{mov.status} · {dateTime(mov.createdAt)}</p>
          </div>
        ))}
        {!paged.items.length && <EmptyState />}
      </div>
      <Pagination page={page} totalPages={paged.totalPages} setPage={setPage} />
    </Card>
  );
}

function RechargeAdminTable({
  items,
  processed,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
  pageSize,
  setPageSize,
  userById,
  onVoucher,
  onUpdate
}: {
  items: RechargeRequest[];
  processed: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  userById: (id: string) => { name: string; email: string } | undefined;
  onVoucher: (item: RechargeRequest) => void;
  onUpdate: (id: string, status: RechargeStatus) => Promise<void>;
}) {
  const filtered = useMemo(() => {
    const base = items.filter((item) => processed ? item.status !== 'Pendiente de validacion' : item.status === 'Pendiente de validacion');
    return filterAndSort(base, query, statusFilter, (item) => {
      const user = userById(item.userId);
      return [user?.name, user?.email, item.amount, item.bankName, item.referenceNumber, item.receiptName, item.status, dateOnly(item.createdAt)].join(' ');
    }, pendingRankRecharge);
  }, [items, processed, query, statusFilter, userById]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <Card>
      <AdminTableToolbar
        title={processed ? 'Recargas procesadas' : 'Recargas pendientes'}
        count={filtered.length}
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statuses={['Todos', 'Pendiente de validacion', 'Aprobada', 'Rechazada']}
        pageSize={pageSize}
        setPageSize={(value) => { setPageSize(value); setPage(1); }}
      />
      <div className="mt-4 space-y-3">
        {paged.items.map((rec) => {
          const user = userById(rec.userId);
          return (
            <div key={rec.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <RecordHeader title={`${user?.name || 'Usuario'} · ${money(rec.amount)}`} subtitle={`${user?.email || ''} · ${dateTime(rec.createdAt)}`} status={rec.status} />
              <p className="mt-2 text-xs text-slate-500">{rec.bankName} · Cuenta {rec.referenceNumber} · {rec.receiptName}</p>
              {rec.receiptDataUrl && (
                <button onClick={() => onVoucher(rec)} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-2 text-left shadow-sm">
                  <img src={rec.receiptDataUrl} alt={`Voucher ${rec.receiptName}`} className="h-14 w-14 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="font-bold text-emerald-700">Ver voucher enviado</p>
                    <p className="truncate text-xs text-slate-500">{rec.receiptName}</p>
                  </div>
                </button>
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button onClick={() => void onUpdate(rec.id, 'Aprobada')}>Aprobar</Button>
                <Button variant="danger" onClick={() => void onUpdate(rec.id, 'Rechazada')}>Rechazar</Button>
              </div>
            </div>
          );
        })}
        {!paged.items.length && <EmptyState />}
      </div>
      <Pagination page={page} totalPages={paged.totalPages} setPage={setPage} />
    </Card>
  );
}

function WithdrawalAdminTable({
  items,
  processed,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
  pageSize,
  setPageSize,
  userById,
  onUpdate
}: {
  items: WithdrawalRequest[];
  processed: boolean;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  page: number;
  setPage: (value: number) => void;
  pageSize: number;
  setPageSize: (value: number) => void;
  userById: (id: string) => { name: string; email: string } | undefined;
  onUpdate: (id: string, status: WithdrawalStatus) => Promise<void>;
}) {
  const filtered = useMemo(() => {
    const base = items.filter((item) => processed ? item.status !== 'Pendiente' : item.status === 'Pendiente');
    return filterAndSort(base, query, statusFilter, (item) => {
      const user = userById(item.userId);
      return [user?.name, user?.email, item.amount, item.bank, item.accountHolder, item.accountNumber, item.accountType, item.status, dateOnly(item.createdAt)].join(' ');
    }, pendingRankWithdrawal);
  }, [items, processed, query, statusFilter, userById]);
  const paged = paginate(filtered, page, pageSize);

  return (
    <Card>
      <AdminTableToolbar
        title={processed ? 'Retiros procesados' : 'Retiros pendientes'}
        count={filtered.length}
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        statuses={['Todos', 'Pendiente', 'Aprobado', 'Rechazado', 'Pagado']}
        pageSize={pageSize}
        setPageSize={(value) => { setPageSize(value); setPage(1); }}
      />
      <div className="mt-4 space-y-3">
        {paged.items.map((withdrawal) => {
          const user = userById(withdrawal.userId);
          return (
            <div key={withdrawal.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <RecordHeader title={`${user?.name || 'Usuario'} · ${money(withdrawal.amount)}`} subtitle={`${user?.email || ''} · ${dateTime(withdrawal.createdAt)}`} status={withdrawal.status} />
              <p className="mt-2 text-xs text-slate-500">{withdrawal.bank} · {withdrawal.accountType} · {withdrawal.accountNumber} · Titular {withdrawal.accountHolder}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button onClick={() => void onUpdate(withdrawal.id, 'Aprobado')}>Aprobar</Button>
                <Button onClick={() => void onUpdate(withdrawal.id, 'Pagado')}>Pagado</Button>
                <Button variant="danger" onClick={() => void onUpdate(withdrawal.id, 'Rechazado')}>Rechazar</Button>
              </div>
            </div>
          );
        })}
        {!paged.items.length && <EmptyState />}
      </div>
      <Pagination page={page} totalPages={paged.totalPages} setPage={setPage} />
    </Card>
  );
}

function AdminTableToolbar({
  title,
  count,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  statuses,
  pageSize,
  setPageSize
}: {
  title: string;
  count: number;
  query: string;
  setQuery: (value: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (value: StatusFilter) => void;
  statuses: StatusFilter[];
  pageSize: number;
  setPageSize: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="text-xs text-slate-500">{count} registros encontrados</p>
        </div>
        <Badge tone="neutral">{count}</Badge>
      </div>
      <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nombre, correo, monto, banco o fecha" />
      <div className="grid grid-cols-2 gap-2">
        <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select className={inputClass} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
          {pageSizeOptions.map((size) => <option key={size} value={size}>{size} por pagina</option>)}
        </select>
      </div>
    </div>
  );
}

function SimpleToolbar({
  title,
  count,
  query,
  setQuery,
  placeholder,
  pageSize,
  setPageSize
}: {
  title: string;
  count: number;
  query: string;
  setQuery: (value: string) => void;
  placeholder: string;
  pageSize: number;
  setPageSize: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black">{title}</h2>
          <p className="text-xs text-slate-500">{count} registros encontrados</p>
        </div>
        <Badge tone="neutral">{count}</Badge>
      </div>
      <input className={inputClass} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} />
      <select className={inputClass} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
        {pageSizeOptions.map((size) => <option key={size} value={size}>{size} por pagina</option>)}
      </select>
    </div>
  );
}

function RecordHeader({ title, subtitle, status }: { title: string; subtitle: string; status: string }) {
  return (
    <div className="flex justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold">{title}</p>
        <p className="truncate text-xs text-slate-400">{subtitle}</p>
      </div>
      <Badge tone={status === 'Aprobada' || status === 'Pagado' || status === 'Aprobado' ? 'ok' : status === 'Rechazada' || status === 'Rechazado' ? 'danger' : 'warn'}>{status}</Badge>
    </div>
  );
}

function Pagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (value: number) => void }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
      <p className="text-sm font-bold text-slate-500">Pagina {Math.min(page, totalPages)} de {totalPages}</p>
      <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
    </div>
  );
}

function EmptyState() {
  return <p className="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-semibold text-slate-500">No hay registros con esos filtros.</p>;
}

function filterAndSort<T extends { createdAt: string; status: string }>(
  items: T[],
  query: string,
  statusFilter: StatusFilter,
  searchableText: (item: T) => string,
  rank: (status: string) => number
) {
  const needle = query.trim().toLowerCase();
  return items
    .filter((item) => statusFilter === 'Todos' || item.status === statusFilter)
    .filter((item) => !needle || searchableText(item).toLowerCase().includes(needle))
    .sort((a, b) => rank(a.status) - rank(b.status) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages
  };
}

function pendingRankRecharge(status: string) {
  return status === 'Pendiente de validacion' ? 0 : 1;
}

function pendingRankWithdrawal(status: string) {
  return status === 'Pendiente' ? 0 : 1;
}

function sectionLabel(section: Section) {
  const labels: Record<Section, string> = {
    'recargas-pendientes': 'Recargas pendientes',
    'recargas-procesadas': 'Recargas procesadas',
    'retiros-pendientes': 'Retiros pendientes',
    'retiros-procesados': 'Retiros procesados',
    planes: 'Planes',
    bonos: 'Bonos',
    cuentas: 'Cuentas',
    usuarios: 'Usuarios',
    inversiones: 'Inversiones',
    referidos: 'Referidos',
    historial: 'Historial'
  };
  return labels[section];
}

function roleLabel(role: Role) {
  const labels: Record<Role, string> = {
    user: 'Usuario',
    admin: 'Admin principal',
    admin_recharges: 'Admin de recargas',
    admin_withdrawals: 'Admin de retiros',
    supervisor: 'Supervisor'
  };
  return labels[role];
}
