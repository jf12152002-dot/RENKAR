import { MessageCircle, ShieldCheck, X } from 'lucide-react';

const whatsappGroupUrl = 'https://chat.whatsapp.com/B94LQlPGVl2C3AojCxseUY';

export function WelcomeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-emerald-700 to-emerald-500 px-5 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white backdrop-blur transition hover:bg-white/25"
            aria-label="Cerrar bienvenida"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/16">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <p className="text-xs font-black uppercase tracking-[.28em] text-emerald-50">Bienvenido a</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight">RENKAR</h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm leading-6 text-slate-600">
            Gestiona tu cuenta RENKAR desde un solo lugar, con seguimiento de tus planes activos, movimientos, referidos y solicitudes bancarias.
          </p>
          <p className="text-sm leading-6 text-slate-600">
            RENKAR tambien te ofrece premios adicionales: trabaja, invita y comienza a ganar codigos canjeables.
          </p>
          <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            Unete al grupo oficial de WhatsApp para recibir avisos, soporte y novedades importantes de la plataforma.
          </p>
          <a
            href={whatsappGroupUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-center font-black text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800"
          >
            <MessageCircle className="h-5 w-5" />
            Entrar al grupo de WhatsApp
          </a>
          <button onClick={onClose} className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            Continuar en la aplicacion
          </button>
        </div>
      </div>
    </div>
  );
}
