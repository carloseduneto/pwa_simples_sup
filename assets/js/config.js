// config.js

// Suas chaves REAIS
const SUPABASE_URL = "https://zmagogzkopaidsknopoz.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptYWdvZ3prb3BhaWRza25vcG96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDEyOTgsImV4cCI6MjA3NjA3NzI5OH0.2uAm-cyg6DKUOaaJoOHktJPhegdeMQopliUhFvmT5s4";

// Iniciando o cliente (agora ele fica disponível para os outros arquivos)
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
