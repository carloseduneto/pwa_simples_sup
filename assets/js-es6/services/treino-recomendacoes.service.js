import { client } from "../config/config";

export const TreinoRecomendacoesService = {
  async getAll() {
    // Busca na tabela 'treino_recomendacoes'
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
};
