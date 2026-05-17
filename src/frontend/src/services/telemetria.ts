/**
 * Constantes e funções utilitárias para telemetria.
 */

// ---------------------------------------------------------------------------
// Configuração do WebSocket
// ---------------------------------------------------------------------------

/**
 * URL base do WebSocket de telemetria.
 * Em desenvolvimento usa localhost; em produção, ajustar conforme deploy.
 */
export const WS_TELEMETRIA_URL =
  import.meta.env.VITE_WS_TELEMETRIA_URL ?? "ws://localhost:8000/api/telemetria/ws";

