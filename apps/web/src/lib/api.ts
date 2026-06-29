import { PUBLIC_API_BASE_URL } from "@/lib/public-env";

const API_BASE_URL = PUBLIC_API_BASE_URL;

export async function apiFetch(path: string, options?: RequestInit) {
  const url = `${API_BASE_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  } catch {
    return { data: null, error: "Network error", meta: null };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    return { error: data?.error || `HTTP ${res.status}`, data: null, meta: null };
  }

  if (data === null) {
    return { error: "Resposta inválida do servidor", data: null, meta: null };
  }

  return { data: data.data ?? null, error: data.error ?? null, meta: data.meta ?? null };
}
