import { useEffect, useRef } from "react";

export type CriticalAlertType = "battery" | "stopped";

type CriticalAlertModalProps = {
  open: boolean;
  type?: CriticalAlertType;
  soundKey?: string | null;
  onDismiss: () => void;
  onConfirm: () => void;
  playSound?: boolean;
};

const alertData: Record<
  CriticalAlertType,
  {
    subtitle: string;
    title: string;
    description: string;
  }
> = {
  battery: {
    subtitle: "Bateria baixa detectada",
    title: "Nível de bateria ≤ 10%",
    description:
      "O sistema detectou que o nível de bateria entrou em estado crítico. Alerta visual e sonoro ativados para ação imediata do avaliador.",
  },
  stopped: {
    subtitle: "Possível parada inesperada",
    title: "Velocidade igual a zero por mais de 3 segundos",
    description:
      "O sistema detectou ausência de deslocamento durante a corrida ativa. Verifique o robô e a sessão para evitar perda de dados ou danos ao equipamento.",
  },
};

export function CriticalAlertModal({
  open,
  type = "battery",
  soundKey = null,
  onDismiss,
  onConfirm,
  playSound = true,
}: CriticalAlertModalProps) {
  const alert = alertData[type];
  const lastPlayedSoundKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !playSound || !soundKey) {
      return;
    }

    if (lastPlayedSoundKeyRef.current === soundKey) {
      return;
    }

    lastPlayedSoundKeyRef.current = soundKey;

    let audioContext: AudioContext | null = null;
    let cleanupTimer: number | null = null;

    try {
      audioContext = new window.AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startTime = audioContext.currentTime;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, startTime);
      oscillator.frequency.setValueAtTime(660, startTime + 0.12);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.12);
      gain.gain.linearRampToValueAtTime(0.0001, startTime + 0.24);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.24);

      cleanupTimer = window.setTimeout(() => {
        void audioContext?.close();
      }, 320);
    } catch {
      // Navegadores podem bloquear reprodução sem interação prévia.
    }

    return () => {
      if (cleanupTimer !== null) {
        window.clearTimeout(cleanupTimer);
      }

      if (audioContext && audioContext.state !== "closed") {
        void audioContext.close();
      }
    };
  }, [open, playSound, soundKey]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
      aria-describedby="critical-alert-description"
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-3xl border border-red-500 bg-white shadow-2xl shadow-red-950/20">
        <div className="border-b border-red-100 bg-white px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 9v4m0 4h.01M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <h2
                  id="critical-alert-title"
                  className="text-2xl font-bold uppercase leading-tight text-red-700"
                >
                  Alerta Crítico
                </h2>
                <p className="mt-1 text-sm text-neutral-600">{alert.subtitle}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md p-1 text-neutral-400 transition hover:bg-white hover:text-neutral-700"
              aria-label="Fechar alerta crítico"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_6px_rgba(239,68,68,0.16)]" />
              <h3 className="text-sm font-semibold">{alert.title}</h3>
            </div>

            <p
              id="critical-alert-description"
              className="mt-3 text-sm leading-relaxed text-neutral-700"
            >
              {alert.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              Dispensar
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Confirmar alerta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
