import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { LabirintoPage } from './pages/LabirintoPage';
import { TelemetriaPage } from './pages/TelemetriaPage';
import Session from './components/Session';

function App() {

  const [currentView, setCurrentView] = useState<'session' | 'telemetria' | 'labirinto' | 'estados'>('session');

  return (
    <main className="app">
      <Toaster position="top-right" />
      {currentView === 'session' ? (

        <Session onNavigate={() => setCurrentView('telemetria')} />
      ) : currentView === 'telemetria' || currentView === 'estados' ? (
        <TelemetriaPage
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
          onNavigateEstados={() => setCurrentView('estados')}
        />
      ) : (
        <LabirintoPage
          
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
          onNavigateEstados={() => setCurrentView('estados')}
        />
      )}
    </main>
  );
}

export default App;