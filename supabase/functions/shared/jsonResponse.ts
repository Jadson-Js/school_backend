import { JSON_HEADERS } from "./consts.ts";

export function jsonResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: JSON_HEADERS }
  )
}