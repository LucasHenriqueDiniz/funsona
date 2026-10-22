import { apiTransport } from "@/lib/api-transport";
import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

const API_BASE_URL = PUBLIC_API_BASE_URL;

/** `status` is the API's HTTP status, or 0 when the request never got an answer. */
export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await apiTransport(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  } catch {
    return { data: null, error: "Network error", meta: null, status: 0 };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { error: data?.error || `HTTP ${res.status}`, data: null, meta: null, status: res.status };
  }

  if (data === null) {
    return { error: "Resposta inválida do servidor", data: null, meta: null, status: res.status };
  }

  return { data: data.data ?? null, error: data.error ?? null, meta: data.meta ?? null, status: res.status };
}
