import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Clock, Gift, LogOut, WalletCards, X } from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { BottomNav, Tab } from '../components/BottomNav';
import { ChatSupport } from '../components/ChatSupport';
import { dateTime, money } from '../utils/format';

export function AppLayout({ children, tab, setTab }: { children: ReactNode; tab: Tab; setTab: (tab: Tab) => void }) {
  const { currentUser, state, logout } = useApp();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const notifications = useMemo(() => buildNotifications(state, currentUser?.id), [state, currentUser?.id]);
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !readNotificationIds.includes(item.id)),
    [notifications, readNotificationIds]
  );
  const unreadCount = Math.min(9, visibleNotifications.length);

  useEffect(() => {
    if (!currentUser?.id) {
      setReadNotificationIds([]);
      return;
    }
    const stored = localStorage.getItem(notificationStorageKey(currentUser.id));
    setReadNotificationIds(stored ? JSON.parse(stored) : []);
  }, [currentUser?.id]);

  function markNotificationAsRead(item: NotificationItem) {
    if (!currentUser?.id) return;
    setReadNotificationIds((prev) => {
      const next = prev.includes(item.id) ? prev : [...prev, item.id];
      localStorage.setItem(notificationStorageKey(currentUser.id), JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="relative mx-auto min-h-screen max-w-md px-4 pb-32 pt-5 text-slate-900">
      <header className="sticky top-0 z-20 -mx-4 mb-5 flex items-center justify-between border-b border-emerald-900/5 bg-white/82 px-4 py-3 backdrop-blur-2xl">
        <button onClick={() => setTab('dashboard')} className="text-left">
          <p className="text-xs font-black uppercase tracking-[.28em] text-emerald-700">RENKAR</p>
          <p className="font-semibold text-slate-600">{currentUser?.name}</p>
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setNotificationsOpen(true)}
            className="relative rounded-full border border-emerald-100 bg-white p-3 shadow-sm"
            aria-label="Abrir notificaciones"
          >
            <Bell className="h-5 w-5 text-emerald-700" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-emerald-700 px-1 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button onClick={logout} className="rounded-full border border-slate-100 bg-white p-3 shadow-sm"><LogOut className="h-5 w-5 text-slate-500" /></button>
        </div>
      </header>
      {children}
      {notificationsOpen && (
        <NotificationsPanel
          items={visibleNotifications}
          onClose={() => setNotificationsOpen(false)}
          onNotificationClick={(item) => {
            markNotificationAsRead(item);
            if (item.tab) setTab(item.tab);
            setNotificationsOpen(false);
          }}
        />
      )}
      <ChatSupport />
      <BottomNav tab={tab} setTab={setTab} isAdmin={currentUser ? currentUser.role !== 'user' : false} />
    </div>
  );
}

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  createdAt?: string;
  icon: typeof Bell;
  tone: 'emerald' | 'amber' | 'rose' | 'slate';
  tab?: Tab;
};

function notificationStorageKey(userId: string) {
  return `renkar-read-notifications-${userId}`;
}

function buildNotifications(state: ReturnType<typeof useApp>['state'], userId?: string): NotificationItem[] {
  if (!userId) return [];
  const userRecharges = state.recharges.filter((item) => item.userId === userId);
  const userWithdrawals = state.withdrawals.filter((item) => item.userId === userId);
  const userMovements = state.movements.filter((item) => item.userId === userId);

  const rechargeItems = userRecharges.slice(0, 3).map((item) => ({
    id: `rec-${item.id}`,
    title: item.status === 'Pendiente de validacion' ? 'Recarga en validacion' : `Recarga ${item.status.toLowerCase()}`,
    detail: `${money(item.amount)} · ${item.bankName}`,
    createdAt: item.createdAt,
    icon: item.status === 'Aprobada' ? CheckCircle2 : Clock,
    tone: (item.status === 'Aprobada' ? 'emerald' : item.status === 'Rechazada' ? 'rose' : 'amber') as NotificationItem['tone'],
    tab: 'invest' as Tab
  }));

  const withdrawalItems = userWithdrawals.slice(0, 3).map((item) => ({
    id: `with-${item.id}`,
    title: item.status === 'Pendiente' ? 'Retiro pendiente' : `Retiro ${item.status.toLowerCase()}`,
    detail: `${money(item.amount)} · ${item.bank}`,
    createdAt: item.createdAt,
    icon: WalletCards,
    tone: (item.status === 'Pagado' ? 'emerald' : item.status === 'Rechazado' ? 'rose' : 'amber') as NotificationItem['tone'],
    tab: 'withdraw' as Tab
  }));

  const bonusItems = userMovements
    .filter((item) => item.type.includes('Bono') && item.status === 'Acreditado')
    .slice(0, 3)
    .map((item) => ({
      id: `mov-${item.id}`,
      title: item.type,
      detail: `${money(item.amount)} acreditados a tu cuenta`,
      createdAt: item.createdAt,
      icon: Gift,
      tone: 'emerald' as const,
      tab: 'history' as Tab
    }));

  const staticItems: NotificationItem[] = [
    {
      id: 'schedule-withdrawals',
      title: 'Horario de retiros',
      detail: 'Lunes a sabado de 10:00 AM a 5:00 PM.',
      icon: Clock,
      tone: 'slate',
      tab: 'withdraw'
    }
  ];

  return [...rechargeItems, ...withdrawalItems, ...bonusItems, ...staticItems]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 8);
}

function NotificationsPanel({ items, onClose, onNotificationClick }: { items: NotificationItem[]; onClose: () => void; onNotificationClick: (item: NotificationItem) => void }) {
  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/45 px-4 pb-4 pt-20 backdrop-blur-sm">
      <div className="mx-auto max-h-[78vh] w-full max-w-md overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-100 p-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">Notificaciones</h2>
            <p className="text-xs text-slate-500">Actualizaciones importantes de tu cuenta</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[62vh] space-y-3 overflow-y-auto p-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNotificationClick(item)}
                className="flex w-full gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:bg-emerald-50"
              >
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneClass(item.tone)}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-black text-slate-900">{item.title}</span>
                  <span className="block text-sm text-slate-500">{item.detail}</span>
                  {item.createdAt && <span className="mt-1 block text-xs font-semibold text-slate-400">{dateTime(item.createdAt)}</span>}
                </span>
              </button>
            );
          })}
          {!items.length && (
            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
              No tienes notificaciones nuevas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function toneClass(tone: NotificationItem['tone']) {
  const tones = {
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    slate: 'bg-slate-100 text-slate-600'
  };
  return tones[tone];
}
