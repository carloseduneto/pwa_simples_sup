// const TemplateItensService = {
//   async getByid(templateId) {
//     const { data, error } = await client
//       .from("template_itens")
//       .select(
//         `
//         id,
//         ordem,
//         series_alvo,
//         repeticoes_alvo,
//         tecnica_intensificacao,
//         exercicios (
//             id,
//             nome,
//             grupo_muscular ( id, nome )
//         ),
//         treino_recomendacoes ( valor, detalhes, description ),
//         templates ( nome, descricao )
//       `,
//       )
//       .eq("template_id", templateId)
//       .order("ordem");

//     if (error) throw error;
//     return data;
//   },
//   // NOVA FUNÇÃO: Busca APENAS UM item para preencher o formulário de edição
//   async getByIdSingle(itemId) {
//     const { data, error } = await client
//       .from("template_itens")
//       .select(
//         `
//         id,
//         exercicio_id,
//         series_alvo,
//         repeticoes_alvo,
//         tecnica_intensificacao,
//         treino_recomendacoes,
//         exercicios (
//             id,
//             nome,
//             grupo_muscular
//         )
//       `,
//       )
//       .eq("id", itemId)
//       .single(); // Traz um objeto só, não um array

//     if (error) throw error;
//     return data;
//   },

//   async getAll() {
//     const { data, error } = await client
//       .from("template_itens")
//       .select(
//         "id, exercicios, treino_recomendacoes, templates, series_alvo, repeticoes_alvo,tecnica_intensificacao",
//       )
//       .order("ordem");

//     if (error) throw error;
//     return data;
//   },

//   async getUserContext() {
//     const { data, error } = await client
//       .from("user_context")
//       .select("series_repeticoes(nome, week, series, min_reps, max_reps)")
//       .single();
//     if (error) throw error;
//     return data;
//   },

//   async create(templateItemData) {
//     // Corrigido: templateItemData (estava tempateData)
//     const { data, error } = await client
//       .from("template_itens")
//       .insert([templateItemData])
//       .select();

//     if (error) throw error;
//     return data;
//   },

//   async update(id, templateItemData) {
//     const { data, error } = await client
//       .from("template_itens")
//       .update(templateItemData)
//       .eq("id", id);

//     if (error) throw error;
//     return data;
//   },

//   async updateOrder(id, novaOrdem) {
//     // Mudei o nome do parametro para ficar claro
//     const { data, error } = await client
//       .from("template_itens")
//       .update({ ordem: novaOrdem }) // <--- AQUI ESTÁ O SEGRED0
//       .eq("id", id);

//     if (error) throw error;
//     return data;
//   },

//   async delete(id) {
//     const { error } = await client.from("template_itens").delete().eq("id", id);
//     if (error) throw error;
//     return true;
//   },
// };

const TemplateItensService = {
  // Busca a lista para a tela principal
  async getByid(templateId) {
    const { data, error } = await client
      .from("template_itens")
      .select(
        `
        id, ordem, series_alvo, repeticoes_alvo, tecnica_intensificacao,
        exercicios ( id, nome, grupo_muscular ( id, nome ) ),
        treino_recomendacoes ( id, name, detalhes, description )
      `,
      )
      .eq("template_id", templateId)
      .order("ordem");

    if (error) throw error;
    return data;
  },

  // Busca UM único item para edição (CORREÇÃO DO ERRO 9)
  async getByIdSingle(itemId) {
    const { data, error } = await client
      .from("template_itens")
      .select(
        `
        id, exercicio_id, series_alvo, repeticoes_alvo,
        tecnica_intensificacao, treino_recomendacoes,
        exercicios ( id, nome, grupo_muscular )
      `,
      )
      .eq("id", Number(itemId))
      .single();

    if (error) throw error;
    return data;
  },

  // SALVAR NOVO
  async create(payload) {
    const { data, error } = await client
      .from("template_itens")
      .insert([payload])
      .select();

    if (error) throw error;
    return data;
  },

  // ATUALIZAR (Ajustado para ser mais rigoroso)
  async update(id, payload) {
    const { data, error } = await client
      .from("template_itens")
      .update(payload)
      .eq("id", Number(id))
      .select(); // O select() confirma se a linha foi realmente afetada

    if (error) throw error;

    // Se o data vier vazio, significa que o ID não foi encontrado no banco
    if (!data || data.length === 0) {
      throw new Error("Nenhum item foi atualizado. Verifique se o ID existe.");
    }

    return data;
  },

  async delete(id) {
    const { error } = await client.from("template_itens").delete().eq("id", id);
    if (error) throw error;
    return true;
  },

  // NOVA FUNÇÃO: Atualizar vários de uma vez
  async updateOrderBatch(listaDeIds) {
    // listaDeIds é algo tipo: ["50", "52", "51"]

    // Vamos criar uma promessa para cada item da lista
    const promessas = listaDeIds.map((idItem, index) => {
      // A nova ordem é o índice + 1 (porque array começa em 0)
      const novaOrdem = index + 1;

      // Chama o Supabase para atualizar SÓ a coluna ordem desse ID
      return client
        .from("template_itens")
        .update({ ordem: novaOrdem })
        .eq("id", Number(idItem));
    });

    // O Promise.all espera TODOS os updates terminarem antes de continuar.
    // Isso garante que a gente não avise que salvou antes de terminar.
    await Promise.all(promessas);

    return true;
  },
};
