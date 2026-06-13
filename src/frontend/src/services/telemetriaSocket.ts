/**
 * Singleton de conexão WebSocket de telemetria.
 *
 * Garante que exista UMA única conexão WebSocket com o backend,
 * independentemente de quantos componentes usem o hook useTelemetria.
 *
 * Antes, cada componente que chamava useTelemetria() abria seu próprio
 * WebSocket (ex.: TelemetriaPage + MazeViewer = 2 conexões na mesma tela).
 * Agora todos compartilham esta instância e a reconexão é centralizada.
 */

import { WS_TELEMETRIA_URL } from "./telemetria";

type MessageListener = (data: unknown) => void;
type VoidListener = () => void;

/** Intervalo entre tentativas de reconexão (ms). */
const RECONNECT_INTERVAL_MS = 3000;

interface SubscribeHandlers {
  onMessage: MessageListener;
  onOpen?: VoidListener;
  onClose?: VoidListener;
  onError?: VoidListener;
}

class TelemetriaSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageListeners = new Set<MessageListener>();
  private openListeners = new Set<VoidListener>();
  private closeListeners = new Set<VoidListener>();
  private errorListeners = new Set<VoidListener>();

  /** Abre a conexão se ainda não houver uma ativa/conectando. */
  private connect = (): void => {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN ||
        this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const ws = new WebSocket(WS_TELEMETRIA_URL);

    ws.onopen = () => {
      this.openListeners.forEach((l) => l());
    };

    ws.onmessage = (event) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch (e) {
        console.error("[telemetriaSocket] Erro ao parsear mensagem:", e);
        return;
      }
      this.messageListeners.forEach((l) => l(parsed));
    };

    ws.onerror = () => {
      this.errorListeners.forEach((l) => l());
    };

    ws.onclose = () => {
      this.ws = null;
      this.closeListeners.forEach((l) => l());
      this.reconnectTimer = setTimeout(this.connect, RECONNECT_INTERVAL_MS);
    };

    this.ws = ws;
  };

  /**
   * Inscreve um consumidor. Abre a conexão (se necessário) e retorna
   * uma função de cancelamento para ser chamada no cleanup do efeito.
   */
  subscribe(handlers: SubscribeHandlers): () => void {
    this.messageListeners.add(handlers.onMessage);
    if (handlers.onOpen) this.openListeners.add(handlers.onOpen);
    if (handlers.onClose) this.closeListeners.add(handlers.onClose);
    if (handlers.onError) this.errorListeners.add(handlers.onError);

    this.connect();

    // Se já estiver conectado, notifica este novo consumidor imediatamente.
    if (handlers.onOpen && this.ws && this.ws.readyState === WebSocket.OPEN) {
      handlers.onOpen();
    }

    return () => {
      this.messageListeners.delete(handlers.onMessage);
      if (handlers.onOpen) this.openListeners.delete(handlers.onOpen);
      if (handlers.onClose) this.closeListeners.delete(handlers.onClose);
      if (handlers.onError) this.errorListeners.delete(handlers.onError);
    };
  }

  /** Envia um objeto serializado. Retorna false se a conexão não estiver aberta. */
  send(data: unknown): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
}

export const telemetriaSocket = new TelemetriaSocket();
