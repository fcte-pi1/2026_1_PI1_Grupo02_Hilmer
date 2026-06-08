/**
 * Componente de destaque visual para o melhor tempo registrado em um labirinto.
 * Refatorado para Tema Escuro.
 */

import React from "react";
import { Trophy, Clock, Calendar, Hash } from "lucide-react";
import type { MelhorTempoResponse, TipoLabirinto } from "../types/corrida";
import { useMelhorTempo } from "../hooks/useMelhorTempo";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatarTempo = (ms?: number | null): string => {
  if (ms === null || ms === undefined || Number.isNaN(ms) || ms < 0) {
    return "00:00.000";
  }
  const minutos = Math.floor(ms / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  const milissegundos = Math.floor(ms % 1000);
  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}.${String(milissegundos).padStart(3, "0")}`;
};

const formatarIdCorrida = (id: number): string => {
  return `#${id}`;
};

const formatarData = (dataIso: string | null): string => {
  if (!dataIso) return "--";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dataIso));
  } catch {
    return dataIso;
  }
};

// ---------------------------------------------------------------------------
// CardIndicador
// ---------------------------------------------------------------------------

type CardIndicadorProps = {
  titulo: string;
  valor: string;
  descricao?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "vazio";
};

const CardIndicador: React.FC<CardIndicadorProps> = ({
  titulo,
  valor,
  descricao,
  icon,
  variant = "default",
}) => {
  const baseClasses = "rounded-2xl border p-5 transition-all duration-300";
  const variants = {
    default: "border-zinc-800 bg-zinc-900/40 text-zinc-100",
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    vazio: "border-zinc-800 bg-zinc-900/20 text-zinc-500 opacity-60",
  };

  return (
    <section className={`${baseClasses} ${variants[variant]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${variant === 'success' ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
          {icon}
        </div>
        <p className="text-xs font-bold uppercase tracking-widest opacity-70">
          {titulo}
        </p>
      </div>
      <p className="text-2xl font-bold tracking-tight font-mono">{valor}</p>
      {descricao && (
        <p className="mt-2 text-[10px] uppercase font-bold tracking-tighter opacity-50">{descricao}</p>
      )}
    </section>
  );
};

// ---------------------------------------------------------------------------
// CardMelhorTempo
// ---------------------------------------------------------------------------

export type CardMelhorTempoProps = {
  tipo: TipoLabirinto;
  melhorTempo?: MelhorTempoResponse | null;
  loading?: boolean;
  erro?: string | null;
};

export const CardMelhorTempo: React.FC<CardMelhorTempoProps> = ({
  tipo,
  melhorTempo: melhorTempoProp,
  loading: loadingProp,
  erro: erroProp,
}) => {
  const autonomo = useMelhorTempo(
    melhorTempoProp === undefined && loadingProp === undefined ? tipo : "__skip__",
  );

  const melhorTempo = melhorTempoProp !== undefined ? melhorTempoProp : autonomo.melhorTempo;
  const loading = loadingProp !== undefined ? loadingProp : autonomo.loading;
  const erro = erroProp !== undefined ? erroProp : autonomo.erro;

  if (loading) {
    return (
      <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl animate-pulse">
        <div className="h-4 w-24 bg-zinc-800 rounded mb-4" />
        <div className="h-8 w-64 bg-zinc-800 rounded mb-8" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-zinc-900/50 rounded-2xl border border-zinc-800" />
          ))}
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="w-full rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8 shadow-2xl">
        <div className="flex items-center gap-3 text-rose-400 mb-2">
          <span className="text-xl">⚠️</span>
          <h3 className="font-bold">Erro ao carregar recorde</h3>
        </div>
        <p className="text-sm text-rose-400/70">{erro}</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl transition-all hover:border-zinc-700">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy size={16} className="text-yellow-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Recorde Atual
            </p>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">
            Melhor Performance em {tipo}
          </h2>
        </div>
        
        {melhorTempo && (
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            RECORDE ESTABELECIDO
          </div>
        )}
      </header>

      {!melhorTempo ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <CardIndicador
            titulo="Sessão"
            valor="N/A"
            descricao="Sem dados para este labirinto"
            icon={<Hash size={18} />}
            variant="vazio"
          />
          <CardIndicador 
            titulo="Tempo Total" 
            valor="--:--.---" 
            icon={<Clock size={18} />} 
            variant="vazio" 
          />
          <CardIndicador 
            titulo="Data" 
            valor="--/--/----" 
            icon={<Calendar size={18} />} 
            variant="vazio" 
          />
        </div>
      ) : (
        <main className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <CardIndicador
            titulo="Sessão"
            valor={formatarIdCorrida(melhorTempo.id_corrida)}
            descricao="ID da corrida recordista"
            icon={<Hash size={18} className="text-blue-400" />}
          />
          <CardIndicador
            titulo="Tempo Total"
            valor={formatarTempo(melhorTempo.tempo_total)}
            descricao="Menor tempo com sucesso"
            icon={<Clock size={18} className="text-emerald-400" />}
            variant="success"
          />
          <CardIndicador
            titulo="Data da Conquista"
            valor={formatarData(melhorTempo.data_hora_fim)}
            descricao="Data e hora do término"
            icon={<Calendar size={18} className="text-purple-400" />}
          />
        </main>
      )}
    </div>
  );
};