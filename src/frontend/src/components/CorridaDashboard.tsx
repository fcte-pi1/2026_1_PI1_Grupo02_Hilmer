import { CorridaDetailPanel } from "./corrida/CorridaDetailPanel";
import { CorridasTable } from "./corrida/CorridaTable";
import type { UseCorridasReturn } from "../hooks/useCorrida";

type CorridasDashboardProps = {
  corridas: UseCorridasReturn;
};

export function CorridasDashboard({ corridas }: CorridasDashboardProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-100 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Histórico
            </p>

            <h2 className="text-xl font-semibold text-zinc-950">
              Lista de corridas
            </h2>
          </div>
        </div>

        {corridas.erro && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {corridas.erro}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {(["TODOS", "4X4", "8X8", "16X16"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => corridas.setTipoFiltro(tipo)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                corridas.tipoFiltro === tipo
                  ? "bg-zinc-950 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {tipo === "TODOS" ? "Todos" : tipo}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <CorridasTable
            corridas={corridas.corridas}
            carregando={corridas.carregandoLista}
            mensagemVazio={corridas.mensagemVazio}
            onSelecionar={(idCorrida) =>
              void corridas.selecionarCorrida(idCorrida)
            }
          />
        </div>
      </section>

      <aside className="space-y-6">
        <CorridaDetailPanel
          corrida={corridas.corridaSelecionada}
          carregando={corridas.carregandoDetalhe}
        />
      </aside>
    </div>
  );
}