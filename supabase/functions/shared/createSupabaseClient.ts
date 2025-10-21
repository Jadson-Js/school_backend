//@ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export function createSupabaseClient(authHeader: string) {
  //@ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  //@ts-ignore
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY variables not set.')
  }

  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  })
}