import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zfeywfbfagjbarpcsskn.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmZXl3ZmJmYWdqYmFycGNzc2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDA3NjAsImV4cCI6MjA3NjI3Njc2MH0.CM5LZ2WRx76DJavPR0EOfZgGzyvrXLnX4kcDCXVIPt8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos
export type Document = {
  id: string
  content: string
  filename: string
  file_type: string
  embedding?: number[]
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id?: string
  question: string
  answer: string
  context_used: string[]
  created_at: string
}
