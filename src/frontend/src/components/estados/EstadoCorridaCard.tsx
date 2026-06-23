import type { IndicadoresDesempenho } from "../../types/telemetria";

type Props = {
  indicadores: IndicadoresDesempenho;
};

export function EstadoCorridaCard({ indicadores }: Props) {
  const status = indicadores.status_corrida;

  const config =
    status === "aguardando"
      ? {
          titulo: "Aguardando início",
          cor: "border-zinc-700 bg-zinc-900",
          texto: "text-zinc-300",
        }
      : status === "em_andamento"
      ? {
          titulo: "Corrida em andamento",
          cor: "border-amber-500/30 bg-amber-500/10",
          texto: "text-amber-400",
        }
      : status === "concluida"
      ? {
          titulo: "Desafio cumprido",
          cor: "border-emerald-500/30 bg-emerald-500/10",
          texto: "text-emerald-400",
        }
      : {
          titulo: "Desafio não cumprido",
          cor: "border-rose-500/30 bg-rose-500/10",
          texto: "text-rose-400",
        };

  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${config.cor}`}
    >
      <p className="text-xs uppercase tracking-widest text-zinc-500">
        Estado atual
      </p>

      <h2 className={`mt-2 text-2xl font-bold ${config.texto}`}>
        {config.titulo}
      </h2>
    </section>
  );
}