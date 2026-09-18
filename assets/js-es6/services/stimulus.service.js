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
  async getVolumeAnalysis(ownerId, startDate, endDate, agrupamento, timezone) {
    const { data, error } = await client.rpc("get_analise_volume", {
      p_owner_id: ownerId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_agrupamento: agrupamento, // Deve receber: 'day', 'week', 'month' ou 'year'
      p_timezone: timezone,
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
  async getAdjacentSessionDate(ownerId, referenceDate, direction) {
    const { data, error } = await client.rpc("get_data_adjacente_sessao", {
      p_owner_id: ownerId,
      p_reference_date: referenceDate,
      p_direction: direction,
    });

    if (error) throw error;
    return data; // Retorna diretamente a string ISO ou null
  },
};
