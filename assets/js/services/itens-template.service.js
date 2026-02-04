const TemplateItensService = {
  async getByid(templateId) {
    const { data, error } = await client
      .from("template_itens")
      .select(
        `
        id,
        ordem,
        series_alvo,
        repeticoes_alvo,
        tecnica_intensificacao,
        exercicios (
            id,
            nome,
            grupo_muscular ( id, nome )
        ),
        treino_recomendacoes ( valor, detalhes, description ),
        templates ( nome, descricao )
      `,
      )
      .eq("template_id", templateId)
      .order("ordem");

    if (error) throw error;
    return data;
  },

  async getAll() {
    const { data, error } = await client
      .from("template_itens")
      .select(
        "id, exercicios, treino_recomendacoes, templates, series_alvo, repeticoes_alvo,tecnica_intensificacao",
      )
      .order("ordem");

    if (error) throw error;
    return data;
  },

  async getUserContext() {
    const { data, error } = await client
      .from("user_context")
      .select("series_repeticoes(nome, week, series, min_reps, max_reps)")
      .single();
    if (error) throw error;
    return data;
  },

  async create(templateItemData) {
    // Corrigido: templateItemData (estava tempateData)
    const { data, error } = await client
      .from("template_itens")
      .insert([templateItemData])
      .select();

    if (error) throw error;
    return data;
  },

  async update(id, templateItemData) {
    const { data, error } = await client
      .from("template_itens")
      .update(templateItemData)
      .eq("id", id);

    if (error) throw error;
    return data;
  },

  async updateOrder(id, novaOrdem) {
    // Mudei o nome do parametro para ficar claro
    const { data, error } = await client
      .from("template_itens")
      .update({ ordem: novaOrdem }) // <--- AQUI ESTÁ O SEGRED0
      .eq("id", id);

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await client.from("template_itens").delete().eq("id", id);
    if (error) throw error;
    return true;
  },
};
