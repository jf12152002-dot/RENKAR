import { useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

const supportWhatsappUrl = 'https://wa.me/18093213196?text=Hola%20RENKAR%2C%20necesito%20soporte.';

function openWhatsappSupport() {
  window.open(supportWhatsappUrl, '_blank', 'noopener,noreferrer');
}

export function ChatSupport() {
  useEffect(() => {
    const openChat = () => openWhatsappSupport();
    window.addEventListener('renkar:open-chat', openChat);
    return () => window.removeEventListener('renkar:open-chat', openChat);
  }, []);

  return (
    <button onClick={openWhatsappSupport} className="fixed bottom-28 right-5 z-30 grid h-16 w-16 place-items-center rounded-full bg-emerald-700 text-white shadow-glow" aria-label="Abrir WhatsApp de soporte">
      <MessageCircle />
    </button>
  );
}
