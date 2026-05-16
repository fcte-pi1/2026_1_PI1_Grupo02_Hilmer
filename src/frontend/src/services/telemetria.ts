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

// ---------------------------------------------------------------------------
// Formatadores
// ---------------------------------------------------------------------------

/**
 * Formata tempo em milissegundos para o formato mm:ss.ms (ex: "01:23.456").
 */
export function formatarTempo(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return "--:--.---";

  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.floor(ms % 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

/**
 * Formata percentual de bateria (ex: "95%").
 */
export function formatarBateria(valor: number | null | undefined): string {
  if (valor == null) return "--%";
  return `${Math.round(valor)}%`;
}

/**
 * Formata velocidade em cm/s (ex: "12.5 cm/s").
 */
export function formatarVelocidade(valor: number | null | undefined): string {
  if (valor == null) return "-- cm/s";
  return `${valor.toFixed(1)} cm/s`;
}
