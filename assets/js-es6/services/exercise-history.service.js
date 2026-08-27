import { client } from "../config/config.js";

export const ExerciseHistoryService = {
  async getSessionHistory(exercicioId, limiteBusca) {
    const { data, error } = await client.rpc(
      "get_historico_sessoes_exercicio",
      {
        e_id: exercicioId,
        limit_sessoes: limiteBusca,
      },
    );

    if (error) throw error;
    return data;
  },
};
