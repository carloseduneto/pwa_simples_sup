import { client } from "../config/config.js";


export const UserContextService = {
  async getUserData(userId) {
    const { data, error } = await client
      .from("user_context")
      .select("sexo, data_nascimento")
      .eq("owner_id", userId)
      .maybeSingle(); // Retorna null se não tiver registro, sem dar erro
    if (error) throw error;
    return data;
  },
};