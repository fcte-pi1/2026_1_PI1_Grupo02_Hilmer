import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { LabirintoPage } from './pages/LabirintoPage';
import { TelemetriaPage } from './pages/TelemetriaPage';
import { SessionsPage } from './pages/SessionsPage';
import { EstadosPage } from './pages/EstadosPage'; // 1. Importação da nova página
import Session from './components/Session';

function App() {
  // 2. Atualizado o estado para aceitar a nova view 'estados'
  const [currentView, setCurrentView] = useState<'session' | 'telemetria' | 'labirinto' | 'corridas' | 'estados'>('session');

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
          onNavigateCorridas={() => setCurrentView('corridas')}
          onNavigateEstados={() => setCurrentView('estados')} // 3. Repassando callback de navegação
        />
      ) : currentView === 'labirinto' ? (
        <LabirintoPage
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
          onNavigateCorridas={() => setCurrentView('corridas')}
          onNavigateEstados={() => setCurrentView('estados')} // 3. Repassando callback de navegação
        />
      ) : currentView === 'corridas' ? (
        <SessionsPage
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
          onNavigateCorridas={() => setCurrentView('corridas')}
          onNavigateEstados={() => setCurrentView('estados')} // 3. Repassando callback de navegação
        />
      ) : (
        // 4. Renderização da nova EstadosPage caso currentView seja 'estados'
        <EstadosPage
          activeView={currentView}
          onNavigateTelemetria={() => setCurrentView('telemetria')}
          onNavigateLabirinto={() => setCurrentView('labirinto')}
          onNavigateCorridas={() => setCurrentView('corridas')}
          onNavigateEstados={() => setCurrentView('estados')}
        />
      )}
    </main>
  );
}

export default App;