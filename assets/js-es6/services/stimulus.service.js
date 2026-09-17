import { client } from "../config/config.js";

export const StimulusService = {
  // Retorna o log linear (calendário e listagem de treinos com duração e nome)
  async getSessionHistory(ownerId, startDate, endDate) {
    const { data, error } = await client.rpc("get_historico_sessoes", {
      p_owner_id: ownerId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) throw error;
    return data;
  },

  // Retorna os dados agregados para o gráfico, tabela e quebra de exercícios
  async getVolumeAnalysis(ownerId, startDate, endDate, agrupamento) {
    const { data, error } = await client.rpc("get_analise_volume", {
      p_owner_id: ownerId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_agrupamento: agrupamento, // Deve receber: 'day', 'week', 'month' ou 'year'
    });

    if (error) throw error;
    return data;
    // Estrutura de retorno esperada:
    // {
    //   grafico_tabela: [{ musculo: "Peito", periodo: "2026-08-17T00:00:00", series: 12 }, ...],
    //   lista_exercicios: [{ musculo: "Peito", exercicio: "Supino Reto", tipo: "principal", series: 12 }, ...]
    // }
  },
  // Busca a data da sessão imediatamente anterior ou posterior
  async getAdjacentSessionDate(ownerId, currentDate, direction) {
    const operator = direction > 0 ? "gt" : "lt";
    const order = direction > 0; // true para ASC (próximo), false para DESC (anterior)

    const { data, error } = await client
      .from("sessao_treino")
      .select("created_at")
      .eq("owner_id", ownerId)
      [operator]("created_at", currentDate.toISOString())
      .order("created_at", { ascending: order })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data ? data.created_at : null;
  },
};
