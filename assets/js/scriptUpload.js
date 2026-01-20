// ======================================================
// CONFIGURAÇÃO SUPABASE
// ======================================================
// Certifique-se de que 'client' vem do config.js
let cacheDadosTreino = null;

// ======================================================
// 1. CAPTURA DA SEMANA
// ======================================================
function getSemanaBase() {
  const tituloElement = document.querySelector("h1.titulo-treino");
  if (tituloElement) {
    const classes = Array.from(tituloElement.classList);
    const classeSemana = classes.find((cls) => cls.startsWith("data-week-"));
    if (classeSemana) {
      return parseInt(classeSemana.split("-")[2]);
    }
  }
  return null;
}

// ======================================================
// 2. FUNÇÃO PRINCIPAL: BOTÃO "CONCLUIR TREINO"
// ======================================================
window.marcarTreinoComoConcluido = async function () {
  const containers = document.querySelectorAll(".container-exercicio");
  const seriesParaSalvar = [];
  let temSeriePendente = false;

  containers.forEach((container) => {
    const exercicioId = parseInt(container.dataset.exercicioId);
    const rows = container.querySelectorAll(".rowExercise");

    rows.forEach((row, index) => {
      const inputKg = row.querySelector(".kgExercise");
      const inputReps = row.querySelector(".repsExercise");

      // NOVA CAPTURA: Tipo da série (input de texto)
      const inputTipo = row.querySelector(".seriesExercise");
      const valorTipo = inputTipo ? inputTipo.value.trim() : "";

      const kg = parseFloat(inputKg.value);
      const reps = parseFloat(inputReps.value);
      const foiRealizado = row.dataset.realizado === "true";

      // Verifica se tem dados preenchidos
      const temDados = inputKg.value !== "" || inputReps.value !== "";

      if (temDados && !foiRealizado) {
        temSeriePendente = true;
      }

      if (temDados || foiRealizado) {
        seriesParaSalvar.push({
          exercicio_id: exercicioId,
          carga: kg || 0,
          repeticoes: reps || 0,
          ordem: index + 1,
          realizado: foiRealizado,
          // Salva o que foi digitado ou 'N' se estiver vazio
          tipo: valorTipo || "N",
        });
      }
    });
  });

  cacheDadosTreino = {
    semana_base: getSemanaBase(),
    data_inicio: new Date().toISOString(),
    data_fim: new Date().toISOString(),
    series: seriesParaSalvar,
  };

  if (temSeriePendente) {
    document.getElementById("modal-conclusao").classList.remove("hidden");
  } else {
    const apenasRealizados = cacheDadosTreino.series.filter((s) => s.realizado);
    await enviarParaSupabase(apenasRealizados);
  }
};

// ======================================================
// 3. CONTROLE DO MODAL
// ======================================================
window.fecharModal = function () {
  document.getElementById("modal-conclusao").classList.add("hidden");
};

window.resolverTreino = async function (acao) {
  if (!cacheDadosTreino) return;
  let seriesFinais = [];

  if (acao === "descartar") {
    seriesFinais = cacheDadosTreino.series.filter((s) => s.realizado);
  } else if (acao === "completar") {
    seriesFinais = cacheDadosTreino.series;
  }

  fecharModal();
  await enviarParaSupabase(seriesFinais);
};

// ======================================================
// 4. ENVIO PARA O SUPABASE
// ======================================================
async function enviarParaSupabase(listaSeries) {
  if (listaSeries.length === 0) {
    alert("Nenhuma série realizada para salvar.");
    return;
  }

  try {
    // Tenta pegar o usuário logado (Compatível com v1 e v2)
    let userId = null;

    // Método seguro para pegar ID:
    const {
      data: { user },
    } = await client.auth.getUser(); // Tenta v2
    if (user) {
      userId = user.id;
    } else {
      // Se der erro ou for nulo, tenta v1 (legado) ou define anônimo
      const userV1 = client.auth.user && client.auth.user();
      userId = userV1 ? userV1.id : "usuario_anonimo_ou_teste";
    }

    // PASSO A: Criar a Sessão
    const sessaoPayload = {
      data_inicio: horarioInicioUTC || cacheDadosTreino.data_inicio,
      data_fim: cacheDadosTreino.data_fim,
      semana_base: cacheDadosTreino.semana_base,
      owner_id: userId, // Usa o ID recuperado acima
      template_id: templateAtualId, // Pega da variável global que definimos no passo 2
    };
    // data_fim: cacheDadosTreino.data_fim,

    const { data: sessaoData, error: sessaoError } = await client
      .from("sessao_treino")
      .insert([sessaoPayload])
      .select()
      .single();

    if (sessaoError) throw sessaoError;

    const sessaoId = sessaoData.id;
    console.log("Sessão criada:", sessaoId);

    // PASSO B: Preparar Séries
    const seriesPayload = listaSeries.map((s) => ({
      sessao_id: sessaoId,
      exercicio_id: s.exercicio_id,
      carga: s.carga,
      repeticoes: s.repeticoes,
      ordem: s.ordem,
      tipo: s.tipo, // Agora usa o valor capturado do input
    }));

    // PASSO C: Salvar Séries
    const { error: seriesError } = await client
      .from("sessao_series_realizadas")
      .insert(seriesPayload);

    if (seriesError) throw seriesError;

    alert("Treino salvo com sucesso!");

    // === ADICIONE ISSO AQUI ===
    if (typeof limparDadosLocais === "function") {
      limparDadosLocais(); // Limpa o cache pois já salvou no banco
    }

    // Opcional: Recarregar a página ou limpar os inputs visualmente
    window.location.reload();
    
  } catch (error) {
    console.error("Erro fatal:", error);
    alert("Erro ao salvar: " + error.message);
  }
}


// 3. Chamada APENAS quando salvar no Supabase com sucesso
function limparDadosLocais() {
  // Remove apenas as chaves que começam com nosso prefixo
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('treino_cache_')) {
      localStorage.removeItem(key);
    }
  });
  window.location.reload();
}

// limparDadosLocais();



// variável global (fica nula até o primeiro clique)
const CACHE_KEY = "treino_cache_conclusao_utc";

// carrega do cache ao iniciar
let horarioInicioUTC = localStorage.getItem(CACHE_KEY);

// listener único
document.addEventListener("click", (e) => {
  if (!e.target.closest(".checkExercise")) return;
  if (horarioInicioUTC !== null) return;

  const now = new Date();
  const pad = (n, z = 2) => String(n).padStart(z, "0");

  horarioInicioUTC =
    `${now.getUTCFullYear()}-` +
    `${pad(now.getUTCMonth() + 1)}-` +
    `${pad(now.getUTCDate())} ` +
    `${pad(now.getUTCHours())}:` +
    `${pad(now.getUTCMinutes())}:` +
    `${pad(now.getUTCSeconds())}.` +
    `${pad(now.getUTCMilliseconds(), 6)}+00`;

  localStorage.setItem(CACHE_KEY, horarioInicioUTC);

  console.log("Registrado:", horarioInicioUTC);
});

// ======================================================
// 3. ATUALIZAR NO SUPABASE (UPSERT)
// ======================================================
async function atualizarSupabaseContextRecomendacoes(novoId) {
  if (!novoId) return;

  try {
    const userId = await getUserId();
    console.log(`Atualizando contexto para Semana ID: ${novoId}...`);

    // UPSERT: Se já existe um registro para esse owner_id, atualiza.
    // Se não existe, cria um novo.
    const { data, error } = await client
      .from("user_context")
      .upsert(
        { 
          owner_id: userId, 
          current_modifier_id_series: parseInt(novoId) 
        },
        { onConflict: 'owner_id' } // Garante que usa a coluna unique para decidir
      );

    if (error) throw error;

    console.log("Contexto atualizado com sucesso!", data);
    
    // Opcional: Feedback visual (ex: mudar cor da borda rapidinho)
    const selectEl = document.getElementById("select-semana");
    selectEl.style.borderColor = "green";
    setTimeout(() => selectEl.style.borderColor = "", 1000);

    // Opcional: Se precisar recarregar algo na tela que dependa disso:
    // window.location.reload(); 

  } catch (error) {
    console.error("Erro ao atualizar contexto:", error);
    alert("Erro ao mudar semana: " + error.message);
  }
}


// screens/exerciseScreen.js
export function renderExerciseScreen() {
  /*html*/
  return `
    <div id="screen-exercises">
      <div class="search-container">
        <input type="text" id="search-exercise" placeholder="Buscar">
      </div>
      <div id="exercise-list">
        </div>
      <button onclick="navegar('exercicesAddEdit')">Add</button>
    </div>
  `;
}