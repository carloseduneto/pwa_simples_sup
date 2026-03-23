import { client } from "../config/config.js";

// Corrigido: TemplateService (estava Tempalte)
export const TemplateService = {
  async getAll() {
    const { data, error } = await client
      .from("templates")
      .select("id, nome, descricao, status, data_registro, created_at")
      .order("status", { ascending: true, nullsFirst: true }) // 1. Ativos primeiro
      .order("data_registro", { ascending: false, nullsLast: true }) // 2. Mais novos no topo (descendente)
      .order("nome", { ascending: true }) // 3. Alfabético como desempate dentro do mesmo mês
      .limit(500);

    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await client
      .from("templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(templateData) {
    // Corrigido: templateData (estava tempateData)
    const { data, error } = await client
      .from("templates")
      .insert([templateData])
      .select();

    if (error) throw error;
    return data;
  },

  async update(id, templateData) {
    const { data, error } = await client
      .from("templates")
      .update(templateData)
      .eq("id", id);

    if (error) throw error;
    return data;
  },

  async updateStatus(id, novoStatus) {
    // Mudei o nome do parametro para ficar claro
    const { data, error } = await client
      .from("templates")
      .update({ status: novoStatus }) // <--- AQUI ESTÁ O SEGRED0
      .eq("id", id);

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await client.from("templates").delete().eq("id", id);
    if (error) throw error;
    return true;
  },
};
