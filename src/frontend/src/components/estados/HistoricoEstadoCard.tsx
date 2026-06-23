import type { HistoricoEstado } from "../../types/estados";

type Props = {
  historico: HistoricoEstado[];
};

export function HistoricoEstadoCard({
  historico,
}: Props) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="mb-4 text-sm font-bold text-zinc-200">
        Histórico de Estados
      </h3>

      <div className="max-h-28 overflow-y-auto space-y-2 pr-2">
        {historico.length === 0 ? (
          <p className="text-zinc-500">
            Nenhum evento registrado.
          </p>
        ) : (
          historico.map((evento, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2"
            >
              <span className="text-zinc-300">
                {evento.descricao}
              </span>

              <span className="text-xs text-zinc-500">
                {evento.tempo}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}