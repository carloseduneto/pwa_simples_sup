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

  async getUserDataByIdPreferences(userId) {
    const { data, error } = await client
      .from("user_context")
      .select("preferences")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async updateUserPreferences(userId, newPreferences) {
    // Busca as preferências atuais para fazer o merge
    const currentData = await this.getUserDataByIdPreferences(userId);
    const currentPrefs = currentData?.preferences || {};

    const mergedPreferences = { ...currentPrefs, ...newPreferences };

    const { data, error } = await client
      .from("user_context")
      .update({ preferences: mergedPreferences })
      .eq("owner_id", userId);

    if (error) throw error;
    return data;
  },
};