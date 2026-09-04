import { client } from "../config/config.js";

export const TemplateItensService = {
  // Busca a lista para a tela principal
  async getByid(templateId) {
    const { data, error } = await client
      .from("template_itens")
      .select(
        `
        id, ordem, series_alvo, repeticoes_alvo, tecnica_intensificacao,
        exercicios ( 
          id, nome, grupo_muscular ( id, nome ),
          musculo_exercicio (
            tipo,
            musculos_granulares ( nome )
          )
        ),
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
