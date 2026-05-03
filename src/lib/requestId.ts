export function getRequestId(headers: Headers): string | null {
  const v = headers.get("x-request-id");
  return v && v.trim() ? v.trim() : null;
}

