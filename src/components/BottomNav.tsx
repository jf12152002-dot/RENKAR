import { BarChart3, Home, User, Users, WalletCards } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Inicio', icon: Home },
  { id: 'invest', label: 'Invertir', icon: WalletCards },
  { id: 'withdraw', label: 'Retiros', icon: BarChart3 },
  { id: 'referrals', label: 'Referidos', icon: Users },
  { id: 'profile', label: 'Perfil', icon: User }
] as const;

export type Tab = (typeof items)[number]['id'] | 'history' | 'admin';

export function BottomNav({ tab, setTab, isAdmin }: { tab: Tab; setTab: (tab: Tab) => void; isAdmin: boolean }) {
  const visible = isAdmin ? [...items, { id: 'admin' as const, label: 'Admin', icon: BarChart3 }] : items;
  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto max-w-md px-4">
      <div className={`glass premium-ring grid gap-1 rounded-[1.75rem] p-2 ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {visible.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`rounded-2xl px-2 py-2 text-[11px] font-bold transition ${active ? 'bg-emerald-700 text-white shadow-glow' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-800'}`}>
              <Icon className="mx-auto mb-1 h-5 w-5" strokeWidth={active ? 2.7 : 2} />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
