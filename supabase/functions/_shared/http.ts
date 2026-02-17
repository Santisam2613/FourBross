export function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

export function errorResponse(status: number, message: string, details?: unknown) {
  return jsonResponse({ error: message, details }, { status });
}
