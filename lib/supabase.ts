import { createClient } from '@supabase/supabase-js'
// Import the types you just generated
import { Database } from './database.types' 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Pass the types into the client
export const supabase = createClient<Database>(supabaseUrl, supabaseKey)