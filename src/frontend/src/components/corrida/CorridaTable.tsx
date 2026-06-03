import type { CorridaResumoResponse } from "../../types/corrida";

type CorridasTableProps = {
  corridas: CorridaResumoResponse[];
  carregando: boolean;
  mensagemVazio: string | null;
  onSelecionar: (idCorrida: number) => void;
};

function formatarDataHora(valor: string | null): string {
  if (!valor) return "--";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(valor));
}

function formatarNumero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) {
    return "--";
  }

  return valor.toFixed(casas);
}

function rotuloStatus(status: CorridaResumoResponse["status_corrida"]): string {
  switch (status) {
    case "CONCLUIDA":
      return "Concluída";
    case "ABORTADA":
      return "Abortada";
    default:
      return "Em andamento";
  }
}

function statusBadgeClass(
  status: CorridaResumoResponse["status_corrida"],
): string {
  switch (status) {
    case "CONCLUIDA":
      return "bg-emerald-100 text-emerald-700";
    case "ABORTADA":
      return "bg-red-100 text-red-700";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

export function CorridasTable({
  corridas,
  carregando,
  mensagemVazio,
  onSelecionar,
}: CorridasTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200">
      <div className="grid grid-cols-5 bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span>Data/hora</span>
        <span>Labirinto</span>
        <span>Tempo</span>
        <span>Status</span>
        <span>Velocidade média</span>
      </div>

      {carregando ? (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          Carregando corridas...
        </div>
      ) : mensagemVazio ? (
        <div className="px-4 py-10 text-center text-sm text-zinc-500">
          {mensagemVazio}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100">
          {corridas.map((corrida) => (
            <button
              key={corrida.id_corrida}
              type="button"
              onClick={() => onSelecionar(corrida.id_corrida)}
              className="grid w-full grid-cols-5 items-center px-4 py-4 text-left text-sm transition hover:bg-zinc-50"
            >
              <span className="text-zinc-700">
                {formatarDataHora(corrida.data_hora_inicio)}
              </span>
              <span className="font-medium text-zinc-900">
                {corrida.tipo_labirinto ?? "--"}
              </span>
              <span className="text-zinc-700">
                {corrida.tempo_total ?? "--"}
              </span>
              <span>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(
                    corrida.status_corrida,
                  )}`}
                >
                  {rotuloStatus(corrida.status_corrida)}
                </span>
              </span>
              <span className="text-zinc-700">
                {formatarNumero(corrida.velocidade_media)} cm/s
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}