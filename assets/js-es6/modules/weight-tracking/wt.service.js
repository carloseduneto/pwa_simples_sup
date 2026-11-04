import { client } from "../../config/config.js";

const TABLE_NAME = "body_weight_tracking";

export const WeightTrackingService = {
  // LISTAR TODOS (READ)
  async getAll() {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select("*")
      .order("data_registro", { ascending: false });

    if (error) {
      console.error("Erro ao buscar histórico de pesagens:", error);
      throw error;
    }
    return data;
  },

  // BUSCAR POR ID
  async getById(id) {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error(`Erro ao buscar pesagem com ID ${id}:`, error);
      throw error;
    }
    return data;
  },

  // BUSCAR ÚLTIMO REGISTRO
  async getLastRegistered() {
    const { data, error } = await client
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Erro ao buscar a última pesagem registrada:", error);
      throw error;
    }
    return data;
  },

  // CRIAR (CREATE)
  async create(weightData) {
    // weightData deve ser um objeto contendo { peso: 75.50, data_registro: "..." }
    const { data, error } = await client
      .from(TABLE_NAME)
      .insert([weightData])
      .select();

    if (error) {
      console.error("Erro ao registrar nova pesagem:", error);
      throw error;
    }
    return data;
  },

  // ATUALIZAR (UPDATE)
  async update(id, weightData) {
    const { data, error } = await client
      .from(TABLE_NAME)
      .update(weightData)
      .eq("id", id)
      .select();

    if (error) {
      console.error(`Erro ao atualizar pesagem com ID ${id}:`, error);
      throw error;
    }
    return data;
  },

  // DELETAR (DELETE)
  async delete(id) {
    const { data, error } = await client.from(TABLE_NAME).delete().eq("id", id);

    if (error) {
      console.error(`Erro ao deletar pesagem com ID ${id}:`, error);
      throw error;
    }
    return data;
  },
};
