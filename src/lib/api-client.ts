"use client";

// Single fetch wrapper used by all frontend API calls.
// Handles: JSON parsing, error normalization, 401 redirect.
// Replaces 32 bare fetch() calls scattered across OpsBoard, CRM pages, and widgets.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });

  if (res.status === 401) {
    // Let the caller decide — don't hard-navigate from a library function.
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const apiClient = {
  get<T>(url: string): Promise<T> {
    return request<T>(url);
  },
  post<T>(url: string, data: unknown): Promise<T> {
    return request<T>(url, { method: "POST", body: JSON.stringify(data) });
  },
  put<T>(url: string, data: unknown): Promise<T> {
    return request<T>(url, { method: "PUT", body: JSON.stringify(data) });
  },
  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: "DELETE" });
  },
};
