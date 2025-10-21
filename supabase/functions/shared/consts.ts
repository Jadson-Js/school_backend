export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const JSON_HEADERS = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
}