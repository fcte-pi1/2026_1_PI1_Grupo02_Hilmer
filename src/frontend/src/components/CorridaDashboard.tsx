import React from "react";
import { AlertCircle, Search, RefreshCw } from "lucide-react";
import type { UseCorridasReturn } from "../hooks/useCorrida";

interface CorridasDashboardProps {
  corridas: UseCorridasReturn;
}

/**
 * Componente que exibe a lista de corridas e detalhes básicos.
 * Utilizado para integração e visualização rápida.
 */
export const CorridasDashboard: React.FC<CorridasDashboardProps> = ({ corridas }) => {
  const {
    corridas: lista,
    tipoFiltro,
    setTipoFiltro,
    selecionarCorrida,
    corridaSelecionada,
    carregandoLista,
    erro,
    recarregar,
  } = corridas;

  const TIPOS = ["TODOS", "4X4", "8X8", "16X16"] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-zinc-100">Lista de corridas</h2>
        <p className="text-zinc-400 text-sm">
          Selecione uma corrida na lista para ver o detalhe completo e o percurso.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Search size={18} className="text-zinc-500" />
          <div className="flex gap-1 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
            {TIPOS.map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoFiltro(tipo as any)}
                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition duration-200 ${
                  tipoFiltro === tipo
                    ? "bg-zinc-800 text-yellow-400 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => recarregar()}
          className="flex items-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-100 transition"
        >
          <RefreshCw size={14} className={carregandoLista ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/30">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">ID</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-zinc-500">Dimensão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {erro ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-rose-400 font-medium">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle size={24} />
                    <span>{erro}</span>
                  </div>
                </td>
              </tr>
            ) : lista.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-20 text-center text-zinc-600 italic">
                  Nenhuma corrida encontrada.
                </td>
              </tr>
            ) : (
              lista.map((c: any) => (
                <tr
                  key={c.id_corrida}
                  onClick={() => selecionarCorrida(c.id_corrida)}
                  className="group cursor-pointer transition hover:bg-zinc-900/40"
                >
                  <td className="px-6 py-5 font-mono text-xs font-bold text-yellow-500/60 group-hover:text-yellow-400">
                    <span className="cursor-pointer">#{c.id_corrida}</span>
                  </td>
                  <td className="px-6 py-5 text-zinc-300">
                    <span className="cursor-pointer">{c.status_corrida}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-black border border-zinc-800 text-zinc-400">
                      {c.tipo_labirinto}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {corridaSelecionada && (
        <div className="mt-8 p-8 rounded-3xl border border-zinc-800 bg-zinc-900 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-black uppercase tracking-tighter text-zinc-100 mb-6">
            Detalhes da Corrida #{corridaSelecionada.id_corrida}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Desafio Cumprido</p>
                <p className="text-xl font-bold text-zinc-200">
                  {corridaSelecionada.desafio_cumprido ? "Sim" : "Não"}
                </p>
             </div>
             <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Velocidade Média</p>
                <p className="text-xl font-bold text-zinc-200">
                  {corridaSelecionada.velocidade_media?.toFixed(2)} cm/s
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
