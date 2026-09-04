// Se estiver usando módulos: import { client } from '../config.js';

import { client } from "../config/config.js";

export const ExerciseService = {
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
      .select("*, musculo_exercicio(musculo_granular_id, tipo)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // NOVO MÉTODO: Buscar músculos granulares
  async getGranularMuscles() {
    const { data, error } = await client
      .from("musculos_granulares")
      .select("*")
      .order("nome", { ascending: true });
    if (error) throw error;
    return data;
  },

  async getByMuscleGroup(grupo_muscular_id) {
    const { data, error } = await client
      .from("exercicios")
      .select("*")
      .eq("grupo_muscular", grupo_muscular_id)
      .order("nome", { ascending: true });
    if (error) throw error;
    return data;
  },

  // CRIAR (CREATE) - Ajustado para inserir relações
  async create(exerciseData, musculosRelations) {
    const { data, error } = await client
      .from("exercicios")
      .insert([exerciseData])
      .select();

    if (error) throw error;

    const exerciseId = data[0].id;

    if (musculosRelations && musculosRelations.length > 0) {
      const relations = musculosRelations.map((m) => ({
        ...m,
        exercicio_id: exerciseId,
      }));
      const { error: relError } = await client
        .from("musculo_exercicio")
        .insert(relations);
      if (relError) throw relError;
    }

    return data;
  },

  // ATUALIZAR (UPDATE) - Ajustado para recriar relações
  async update(id, exerciseData, musculosRelations) {
    const { data, error } = await client
      .from("exercicios")
      .update(exerciseData)
      .eq("id", id)
      .select();

    if (error) throw error;

    // Limpa antigas e insere novas
    await client.from("musculo_exercicio").delete().eq("exercicio_id", id);

    if (musculosRelations && musculosRelations.length > 0) {
      const relations = musculosRelations.map((m) => ({
        ...m,
        exercicio_id: id,
      }));
      const { error: relError } = await client
        .from("musculo_exercicio")
        .insert(relations);
      if (relError) throw relError;
    }

    return data;
  },

  // DELETAR (DELETE)
  async delete(id) {
    const { error } = await client.from("exercicios").delete().eq("id", id);

    if (error) throw error;
    return true;
  },
};
