import { client } from "../config/config.js";

export const WorkoutService = {
  /**
   * Busca TUDO que o player precisa de uma vez só:
   * 1. Itens do Template
   * 2. Contexto do Usuário (Semana Leve/Pesada)
   * 3. Histórico Recente (RPC)
   */
  async getFullWorkoutData(templateId) {
    const cacheKey = `cache_template_full_${templateId}`;

    // Se quiser manter cache (opcional), descomente a lógica abaixo
    // const cached = localStorage.getItem(cacheKey);
    // if (cached) return JSON.parse(cached);

    // 1. Buscas em paralelo
    const itensPromise = client
      .from("template_itens")
      .select(
        "id, exercicios(id, nome), treino_recomendacoes(valor, detalhes, description), templates(nome, descricao), series_alvo, tecnica_intensificacao",
      )
      .eq("template_id", templateId)
      .order("ordem");

    const contextoPromise = client
      .from("user_context")
      .select("series_repeticoes(nome, week, series, min_reps, max_reps)")
      .single();

    // Chama a função RPC do banco
    const historicoPromise = client.rpc("get_ultimo_historico_por_template", {
      t_id: templateId,
    });

    // 2. Aguarda tudo
    const [resItens, resContexto, resHistorico] = await Promise.all([
      itensPromise,
      contextoPromise,
      historicoPromise,
    ]);

    // 3. Validação
    if (resItens.error)
      throw new Error("Erro ao buscar itens: " + resItens.error.message);

    // Histórico pode falhar silenciosamente (não trava o app)
    if (resHistorico.error)
      console.warn("Aviso de histórico:", resHistorico.error.message);

    const resultado = {
      itens: resItens.data,
      contexto: resContexto.data,
      historico: resHistorico.data || [],
    };

    // Salva Cache
    // localStorage.setItem(cacheKey, JSON.stringify(resultado));

    return resultado;
  },

  async getFullWorkoutData(templateId) {
    // ... código anterior mantido ...
    const cacheKey = `cache_template_full_${templateId}`;
    const itensPromise = client
      .from("template_itens")
      .select(
        "id, exercicios(id, nome), treino_recomendacoes(valor, detalhes, description), templates(nome, descricao), series_alvo, tecnica_intensificacao",
      )
      .eq("template_id", templateId)
      .order("ordem");

    const contextoPromise = client
      .from("user_context")
      .select("series_repeticoes(nome, week, series, min_reps, max_reps)")
      .single();

    // Chama a função RPC do banco
    const historicoPromise = client.rpc("get_ultimo_historico_por_template", {
      t_id: templateId,
    });

    // 2. Aguarda tudo
    const [resItens, resContexto, resHistorico] = await Promise.all([
      itensPromise,
      contextoPromise,
      historicoPromise,
    ]);

    // 3. Validação
    if (resItens.error)
      throw new Error("Erro ao buscar itens: " + resItens.error.message);

    // Histórico pode falhar silenciosamente (não trava o app)
    if (resHistorico.error)
      console.warn("Aviso de histórico:", resHistorico.error.message);

    const resultado = {
      itens: resItens.data,
      contexto: resContexto.data,
      historico: resHistorico.data || [],
    };

    return resultado;
  },

  // --- NOVO: SALVAR SESSÃO ---
  async saveSession(payload) {
    // 1. Cria a Sessão
    const { data: sessaoData, error: sessaoError } = await client
      .from("sessao_treino")
      .insert([
        {
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim,
          semana_base: payload.semana_base,
          owner_id: payload.owner_id,
          template_id: payload.template_id,
        },
      ])
      .select()
      .single();

    if (sessaoError) throw sessaoError;

    const sessaoId = sessaoData.id;

    // 2. Prepara as Séries com o ID da Sessão
    // IMPORTANTE: Removemos 'realizado' daqui pois não existe na tabela SQL
    const seriesParaSalvar = payload.series.map((s) => ({
      sessao_id: sessaoId,
      exercicio_id: s.exercicio_id,
      carga: s.carga,
      repeticoes: s.repeticoes,
      ordem: s.ordem,
      tipo: s.tipo,
      // REMOVIDO: realizado: s.realizado
    }));

    // 3. Salva as Séries em Lote
    const { error: seriesError } = await client
      .from("sessao_series_realizadas")
      .insert(seriesParaSalvar);

    if (seriesError) throw seriesError;

    return sessaoId;
  },
};
