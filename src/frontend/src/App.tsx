import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { LabirintoPage } from './pages/LabirintoPage';
import { TelemetriaPage } from './pages/TelemetriaPage';
import Session from './components/Session';

function App() {
  const [currentView, setCurrentView] = useState<'session' | 'telemetria' | 'labirinto'>('session');

  return (
    <main className="app">
      <Toaster position="top-right" />
      {currentView === 'session' ? (

        <Session onNavigate={() => setCurrentView('telemetria')} />
      ) : currentView === 'telemetria' ? (
        <TelemetriaPage
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
        />
      ) : (
        <LabirintoPage
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
        />
      )}
    </main>
  );
}

export default App;