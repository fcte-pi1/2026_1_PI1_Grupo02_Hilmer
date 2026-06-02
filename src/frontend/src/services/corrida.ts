import type {
  CorridaDetailResponse,
  CorridaResponse,
  CorridaResumoResponse,
  TipoLabirinto,
} from "../types/corrida";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Erro ao acessar ${path}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listarCorridasResumo(
  tipo?: TipoLabirinto | "TODOS",
): Promise<CorridaResumoResponse[]> {
  const query =
    tipo && tipo !== "TODOS" ? `?tipo=${encodeURIComponent(tipo)}` : "";
  return request<CorridaResumoResponse[]>(`/api/corridas/resumo${query}`);
}

export async function obterCorrida(
  idCorrida: number,
): Promise<CorridaDetailResponse> {
  return request<CorridaDetailResponse>(`/api/corridas/${idCorrida}`);
}
