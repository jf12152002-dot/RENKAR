import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { AppProvider, useApp } from './hooks/useApp';
import { Auth } from './components/Auth';
import { AppLayout } from './layouts/AppLayout';
import { Tab } from './components/BottomNav';
import { Dashboard } from './pages/Dashboard';
import { Invest } from './pages/Invest';
import { Withdraw } from './pages/Withdraw';
import { Referrals } from './pages/Referrals';
import { History } from './pages/History';
import { Profile } from './pages/Profile';
import { Admin } from './pages/Admin';
import { WelcomeModal } from './components/WelcomeModal';

function Shell() {
  const { currentUser, loading, error } = useApp();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (currentUser) setShowWelcome(true);
  }, [currentUser?.id]);

  if (loading) {
    return (
      <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5 text-center">
        <div>
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-emerald-300" />
          <p className="font-semibold">Conectando con RENKAR API...</p>
          {error && <p className="mt-2 text-sm text-rose-100">{error}</p>}
        </div>
      </main>
    );
  }

  if (!currentUser) return <Auth />;

  const pages: Record<Tab, ReactNode> = {
    dashboard: <Dashboard setTab={setTab} />,
    invest: <Invest />,
    withdraw: <Withdraw />,
    referrals: <Referrals />,
    history: <History />,
    profile: <Profile />,
    admin: <Admin />
  };

  return (
    <>
      <AppLayout tab={tab} setTab={setTab}>
        {pages[tab]}
      </AppLayout>
      {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
