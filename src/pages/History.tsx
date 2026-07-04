import { useMemo, useState } from 'react';
import { useApp } from '../hooks/useApp';
import { MovementType } from '../types';
import { dateTime, money } from '../utils/format';
import { Badge, Card } from '../components/ui';

const filters: Array<MovementType | 'Todos'> = ['Todos', 'Deposito', 'Ganancia diaria', 'Retiro', 'Bono por referidos', 'Bono de registro', 'Bono de regalo'];

export function History() {
  const { currentUser, state } = useApp();
  const [filter, setFilter] = useState<MovementType | 'Todos'>('Todos');
  const movements = useMemo(
    () =>
      state.movements
        .filter((item) => item.userId === currentUser?.id)
        .filter((item) => filter === 'Todos' || item.type === filter)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [currentUser?.id, filter, state.movements]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Historial</h1>
        <p className="text-sm text-slate-400">Movimientos, estados y validaciones.</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${filter === item ? 'bg-emerald-700 text-white' : 'border border-slate-100 bg-white text-slate-600 shadow-sm'}`}>
            {item}
          </button>
        ))}
      </div>
      <Card>
        <div className="space-y-3">
          {movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div>
                <p className="font-semibold">{movement.type}</p>
                <p className="text-xs text-slate-400">{dateTime(movement.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold ${movement.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{money(movement.amount)}</p>
                <Badge tone={movement.status.includes('Rechaz') ? 'danger' : movement.status.includes('Pendiente') ? 'warn' : 'ok'}>{movement.status}</Badge>
              </div>
            </div>
          ))}
          {!movements.length && <p className="text-sm text-slate-400">No hay movimientos para este filtro.</p>}
        </div>
      </Card>
    </div>
  );
}
