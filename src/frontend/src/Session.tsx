import { apiFetch } from "@/config/api";
import { useState } from "react";
import type { Corrida } from "@/types/corrida";

export async function startSession(tipoLabirinto: string): Promise<Corrida> {
    const response = await apiFetch<Corrida>("/api/corridas/iniciar", "POST", {
        tipo_labirinto: tipoLabirinto,
        data_hora_inicio: new Date().toISOString()
    });
    return response;
}

export default function Session() {
    const [tipoLabirinto, setTipoLabirinto] = useState("4X4");
    const [loading, setLoading] = useState(false);
    const [corrida, setCorrida] = useState<Corrida | null>(null);

    const handleStart = async () => {
        setLoading(true);
        try {
            const data = await startSession(tipoLabirinto);
            setCorrida(data);
        } catch (error) {
            console.error("Erro ao iniciar sessão:", error);
            alert("Erro ao iniciar sessão");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Nova Corrida</h1>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecione o tipo de labirinto:
                </label>
                <select 
                    value={tipoLabirinto} 
                    onChange={(e) => setTipoLabirinto(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="4X4">4X4</option>
                    <option value="8X8">8X8</option>
                    <option value="16X16">16X16</option>
                </select>
            </div>

            <button 
                onClick={handleStart}
                disabled={loading}
                className={`w-full p-2 rounded-md text-white font-semibold transition-colors ${
                    loading 
                        ? "bg-gray-400 cursor-not-allowed" 
                        : "bg-blue-600 hover:bg-blue-700"
                }`}
            >
                {loading ? "Iniciando..." : "Iniciar Sessão"}
            </button>

            {corrida && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
                    <h2 className="text-lg font-semibold text-green-800">Sessão Iniciada!</h2>
                    <p className="text-sm text-green-700">ID da Corrida: <span className="font-mono font-bold">{corrida.id_corrida}</span></p>
                    <p className="text-sm text-green-700">Status: {corrida.status_corrida}</p>
                    <p className="text-sm text-green-700">Labirinto: {corrida.tipo_labirinto}</p>
                </div>
            )}
        </div>
    );
}
