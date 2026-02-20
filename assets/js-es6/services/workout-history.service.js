//Essa forma de consulta é válida para poucos dados, caso queira otimizar, o ideal é criar uma view no banco que já traga tudo junto (JOIN) e consultar só ela.

import { client } from "../config/config.js";

export const WorkoutHistoryService = {
  async getRecentSessions(limit = 50) {
    const { data, error } = await client
      .from("sessao_treino")
      .select(
        `
        id,
        data_inicio,
        data_fim,
        semana_base,
        templates (nome),
        sessao_series_realizadas (
          exercicios (
            grupo_muscular (nome)
          )
        )
      `,
      )
      .order("data_inicio", { ascending: false })
      .limit(limit);

    if (error) throw new Error("Erro ao buscar histórico: " + error.message);

    // Mapeia os dados para injetar o "distinct" via JavaScript
    return data.map((sessao) => {
      // 1. Extrai apenas os nomes dos músculos de todas as séries (com repetições)
      const musculosBrutos = sessao.sessao_series_realizadas
        .map((serie) => serie.exercicios?.grupo_muscular?.nome)
        .filter(Boolean); // Remove undefined/null caso algum exercício venha sem grupo

      // 2. O Set() remove as duplicatas automaticamente. O [...] transforma de volta em array.
      const musculosUnicos = [...new Set(musculosBrutos)];

      return {
        id: sessao.id,
        data_inicio: sessao.data_inicio,
        data_fim: sessao.data_fim,
        semana_base: sessao.semana_base,
        template_nome: sessao.templates?.nome,
        grupos_musculares: musculosUnicos.join(" • "), // Já devolve formatado para o card
      };
    });
  },
};