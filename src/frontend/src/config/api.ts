export const API_BASE_URL: string = "http://localhost:8000";
export const API_TIMEOUT: number = 5000;

export async function apiFetch<T>(endpoint: string, method:string, body?: any): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Erro na API: ${response.status}`);
  }

  return response.json();
}