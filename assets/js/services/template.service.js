// Corrigido: TemplateService (estava Tempalte)
const TemplateService = {
  async getAll() {
    const { data, error } = await client
      .from("templates")
      .select(`id, created_at, nome, descricao, status`)
      .order("created_at", { ascending: true });

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
