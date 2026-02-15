import { client } from "../config/config.js";

export const TreinoRecomendacoesService = {
  // 1. Busca recomendações genéricas (Drop-set, Rest-pause...)
  async getAll() {
    const { data, error } = await client
      .from("treino_recomendacoes")
      .select("id, name, description")
      .order("name");

    if (error) {
      console.error("Erro ao buscar recomendações:", error);
      throw error;
    }
    return data;
  },

  // 2. Busca as opções de Semanas (Tabela: series_repeticoes)
  async getSemanasOptions() {
    const { data, error } = await client
      .from("series_repeticoes")
      .select("id, nome, week")
      .not("week", "is", null) // Garante que tem número da semana
      .order("week", { ascending: true });

    if (error) throw error;
    return data;
  },

  // 3. Busca qual semana o usuário selecionou (Tabela: user_context)
  async getUserContext(userId) {
    const { data, error } = await client
      .from("user_context")
      .select("current_modifier_id_series")
      .eq("owner_id", userId)
      .maybeSingle(); // Retorna null se não tiver registro, sem dar erro

    if (error) throw error;
    return data;
  },

  // 4. Salva a nova seleção do usuário (Upsert: Atualiza ou Cria)
  async updateUserContext(userId, semanaId) {
    const { error } = await client.from("user_context").upsert(
      {
        owner_id: userId,
        current_modifier_id_series: semanaId,
      },
      { onConflict: "owner_id" }, // Garante que só existe 1 registro por usuário
    );

    if (error) throw error;
  },
};
