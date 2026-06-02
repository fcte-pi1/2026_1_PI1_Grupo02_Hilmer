import { useState } from "react";

import type { CorridaStart, TipoLabirinto } from "../../types/corrida";

type CorridaFormStartProps = {
  onSubmit: (payload: CorridaStart) => Promise<void>;
};

function nowAsDatetimeLocalValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function CorridaFormStart({ onSubmit }: CorridaFormStartProps) {
  const [tipoLabirinto, setTipoLabirinto] = useState<TipoLabirinto>("4X4");
  const [dataHoraInicio, setDataHoraInicio] = useState(nowAsDatetimeLocalValue());
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErroLocal(null);
    setEnviando(true);

    try {
      await onSubmit({
        tipo_labirinto: tipoLabirinto,
        data_hora_inicio: new Date(dataHoraInicio).toISOString(),
      });
    } catch {
      setErroLocal("Não foi possível iniciar a corrida.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Tipo do labirinto</span>
        <select
          value={tipoLabirinto}
          onChange={(e) => setTipoLabirinto(e.target.value as TipoLabirinto)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
        >
          <option value="4X4">4X4</option>
          <option value="8X8">8X8</option>
          <option value="16X16">16X16</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        <span className="font-medium text-zinc-700">Data/hora de início</span>
        <input
          type="datetime-local"
          value={dataHoraInicio}
          onChange={(e) => setDataHoraInicio(e.target.value)}
          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 outline-none focus:border-zinc-400"
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
          {enviando ? "Enviando..." : "Enviar POST /api/corridas/iniciar"}
        </button>
      </div>
    </form>
  );
}