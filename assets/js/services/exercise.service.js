// Se estiver usando módulos: import { client } from '../config.js';

const ExerciseService = {
  // LISTAR (READ) - Trazendo o nome do grupo muscular (JOIN)
  async getAll() {
    // O select usa a sintaxe de relacionamento para trazer o nome do grupo
    const { data, error } = await client
      .from("exercicios")
      .select(
        `
        id, 
        nome, 
        grupo_muscular,
        grupos_musculares ( id, nome )
      `,
      )
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao buscar exercícios:", error);
      throw error;
    }
    return data;
  },

  // BUSCAR POR ID (READ SINGLE)
  async getById(id) {
    const { data, error } = await client
      .from("exercicios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // CRIAR (CREATE)
  async create(exerciseData) {
    // exerciseData deve ser { nome: "...", grupo_muscular: ID }
    const { data, error } = await client
      .from("exercicios")
      .insert([exerciseData])
      .select();

    if (error) throw error;
    return data;
  },

  // ATUALIZAR (UPDATE)
  async update(id, exerciseData) {
    const { data, error } = await client
      .from("exercicios")
      .update(exerciseData)
      .eq("id", id);

    if (error) throw error;
    return data;
  },

  // DELETAR (DELETE)
  async delete(id) {
    const { error } = await client.from("exercicios").delete().eq("id", id);

    if (error) throw error;
    return true;
  },
};
