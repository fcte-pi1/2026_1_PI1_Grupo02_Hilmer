import type { CorridaDetailResponse } from "../../types/corrida";

type CorridaDetailPanelProps = {
  corrida: CorridaDetailResponse | null;
  carregando: boolean;
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

export function CorridaDetailPanel({
  corrida,
  carregando,
}: CorridaDetailPanelProps) {
  if (!corrida) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Detalhes
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Selecione uma corrida na lista para ver o detalhe completo e o percurso.
        </p>
      </section>
    );
  }

  if (carregando) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-500">Carregando detalhe...</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Detalhes
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">ID</span>
          <span className="font-semibold text-zinc-900">
            #{corrida.id_corrida}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Tipo do labirinto</span>
          <span className="font-semibold text-zinc-900">
            {corrida.tipo_labirinto ?? "--"}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Início</span>
          <span className="font-semibold text-zinc-900">
            {formatarDataHora(corrida.data_hora_inicio)}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Fim</span>
          <span className="font-semibold text-zinc-900">
            {formatarDataHora(corrida.data_hora_fim)}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Tempo total</span>
          <span className="font-semibold text-zinc-900">
            {corrida.tempo_total ?? "--"}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Velocidade média</span>
          <span className="font-semibold text-zinc-900">
            {formatarNumero(corrida.velocidade_media)} cm/s
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Desafio cumprido</span>
          <span className="font-semibold text-zinc-900">
            {corrida.desafio_cumprido === null
              ? "--"
              : corrida.desafio_cumprido
                ? "Sim"
                : "Não"}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <span className="block text-xs text-zinc-500">Percurso</span>
          <span className="font-semibold text-zinc-900">
            {corrida.percurso.length} passos
          </span>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Percurso
        </p>

        <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
          {corrida.percurso.map((passo) => (
            <div
              key={passo.id_percurso}
              className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">
                  {passo.tipo_percurso}
                </span>
                <span className="text-xs text-zinc-500">#{passo.id_percurso}</span>
              </div>

              <p className="mt-1 text-zinc-600">
                Célula: {passo.id_celula ?? "--"}
              </p>
              <p className="text-zinc-600">
                Passagem: {formatarDataHora(passo.data_hora_passagem)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}