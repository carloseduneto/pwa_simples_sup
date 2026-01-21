const MuscleGroupService = {
  async getAll() {
    const { data, error } = await client
      .from("grupos_musculares")
      .select("id, nome")
      .order("nome");

    if (error) throw error;
    return data;
  },
};
