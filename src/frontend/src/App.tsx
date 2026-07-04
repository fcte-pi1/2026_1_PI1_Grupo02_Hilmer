import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { TelemetriaPage } from './pages/TelemetriaPage';
import { HistoricoCorridasPage } from './pages/HistoricoCorridasPage';
import Session from './components/Session';

function App() {
  const [currentView, setCurrentView] = useState<
    'session' | 'telemetria' | 'corridas'>('session');
  const monitoringStarted = currentView !== 'session';

  return (
    <main className="app">
      <Toaster position="top-right" />
      {!monitoringStarted ? (
        <Session onNavigate={() => setCurrentView('telemetria')} />
      ) : (
        <>
          <div
            className={currentView === 'telemetria' ? 'block' : 'hidden'}
            aria-hidden={currentView !== 'telemetria'}
          >
            <TelemetriaPage
              activeView={currentView}
              onNavigateTelemetria={() => setCurrentView('telemetria')}
              onNavigateCorridas={() => setCurrentView('corridas')}
            />
          </div>

          <div
            className={currentView === 'corridas' ? 'block' : 'hidden'}
            aria-hidden={currentView !== 'corridas'}
          >
            <HistoricoCorridasPage
              activeView={currentView}
              onNavigateTelemetria={() => setCurrentView('telemetria')}
              onNavigateCorridas={() => setCurrentView('corridas')}
            />
          </div>
        </>
      )}
    </main>
  );
}

export default App;