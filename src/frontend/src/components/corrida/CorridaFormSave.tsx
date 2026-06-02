import { useState } from "react";

import type {
  CelulaCreate,
  ConexaoCreate,
  CorridaSave,
  PercursoCreate,
  StatusCorrida,
} from "../../types/corrida";

type CorridaFormSaveProps = {
  onSubmit: (idCorrida: number, payload: CorridaSave) => Promise<void>;
};

function nowAsDatetimeLocalValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function parseJsonOrFallback<T>(value: string, fallback: T): T {
  if (!value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function CorridaFormSave({ onSubmit }: CorridaFormSaveProps) {
  const [idCorrida, setIdCorrida] = useState("");
  const [tempoTotal, setTempoTotal] = useState("0");
  const [tensaoMedia, setTensaoMedia] = useState("");
  const [correnteMedia, setCorrenteMedia] = useState("");
  const [velocidadeMaximaPercurso, setVelocidadeMaximaPercurso] = useState("");
  const [velocidadeMedia, setVelocidadeMedia] = useState("");
  const [statusCorrida, setStatusCorrida] =
    useState<StatusCorrida>("CONCLUIDA");
  const [desafioCumprido, setDesafioCumprido] = useState(true);
  const [dataHoraFim, setDataHoraFim] = useState(nowAsDatetimeLocalValue());

  const [celulasJson, setCelulasJson] = useState<string>("[]");
  const [conexoesJson, setConexoesJson] = useState<string>("[]");
  const [percursoJson, setPercursoJson] = useState<string>("[]");

  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErroLocal(null);

    const id = Number(idCorrida);
    if (!Number.isFinite(id) || id <= 0) {
      setErroLocal("Informe um ID de corrida válido.");
      return;
    }

    const payload: CorridaSave = {
      tempo_total: Number(tempoTotal),
      tensao_media: tensaoMedia.trim() ? Number(tensaoMedia) : null,
      corrente_media: correnteMedia.trim() ? Number(correnteMedia) : null,
      velocidade_maxima_percurso: velocidadeMaximaPercurso.trim()
        ? Number(velocidadeMaximaPercurso)
        : null,
      velocidade_media: velocidadeMedia.trim() ? Number(velocidadeMedia) : null,
      status_corrida: statusCorrida,
      desafio_cumprido: desafioCumprido,
      data_hora_fim: dataHoraFim ? new Date(dataHoraFim).toISOString() : null,
      celulas: parseJsonOrFallback<CelulaCreate[]>(celulasJson, []),
      conexoes: parseJsonOrFallback<ConexaoCreate[]>(conexoesJson, []),
      percurso: parseJsonOrFallback<PercursoCreate[]>(percursoJson, []),
    };

    setEnviando(true);
    try {
      await onSubmit(id, payload);
    } catch {
      setErroLocal("Não foi possível salvar a corrida.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-zinc-700">ID da corrida</span>
        <input
          value={idCorrida}
          onChange={(e) => setIdCorrida(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
          placeholder="Ex.: 12"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Tempo total</span>
        <input
          type="number"
          value={tempoTotal}
          onChange={(e) => setTempoTotal(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Tensão média</span>
        <input
          type="number"
          step="0.01"
          value={tensaoMedia}
          onChange={(e) => setTensaoMedia(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Corrente média</span>
        <input
          type="number"
          step="0.01"
          value={correnteMedia}
          onChange={(e) => setCorrenteMedia(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Velocidade máxima</span>
        <input
          type="number"
          step="0.01"
          value={velocidadeMaximaPercurso}
          onChange={(e) => setVelocidadeMaximaPercurso(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Velocidade média</span>
        <input
          type="number"
          step="0.01"
          value={velocidadeMedia}
          onChange={(e) => setVelocidadeMedia(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Status da corrida</span>
        <select
          value={statusCorrida}
          onChange={(e) => setStatusCorrida(e.target.value as StatusCorrida)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        >
          <option value="EM_ANDAMENTO">EM_ANDAMENTO</option>
          <option value="CONCLUIDA">CONCLUIDA</option>
          <option value="ABORTADA">ABORTADA</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Data/hora de fim</span>
        <input
          type="datetime-local"
          value={dataHoraFim}
          onChange={(e) => setDataHoraFim(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        />
      </label>

      <label className="flex items-center gap-3 text-sm md:col-span-2">
        <input
          type="checkbox"
          checked={desafioCumprido}
          onChange={(e) => setDesafioCumprido(e.target.checked)}
        />
        <span className="font-medium text-zinc-700">Desafio cumprido</span>
      </label>

      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-zinc-700">
          Células (JSON)
        </span>
        <textarea
          rows={5}
          value={celulasJson}
          onChange={(e) => setCelulasJson(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-zinc-700">
          Conexões (JSON)
        </span>
        <textarea
          rows={4}
          value={conexoesJson}
          onChange={(e) => setConexoesJson(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
        />
      </label>

      <label className="grid gap-2 text-sm md:col-span-2">
        <span className="font-medium text-zinc-700">
          Percurso (JSON)
        </span>
        <textarea
          rows={5}
          value={percursoJson}
          onChange={(e) => setPercursoJson(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-zinc-400"
        />
      </label>

      {erroLocal && (
        <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erroLocal}
        </div>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={enviando}
          className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? "Enviando..." : "Enviar POST /api/corridas/{id}/salvar"}
        </button>
      </div>
    </form>
  );
}