// script.js

// === 1. MONITORAMENTO DE SESSÃO ===
// Variável de controle fora do evento
let templatesJaCarregados = false;

client.auth.onAuthStateChange((event, session) => {
  // Console log para você ver o evento que está disparando (provavelmente TOKEN_REFRESHED)
  console.log("Evento de Auth:", event);

  if (session) {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    document.getElementById("user-email").innerText = session.user.email;

    // SÓ busca se ainda não tiver buscado
    if (!templatesJaCarregados) {
      buscarTemplates();
      templatesJaCarregados = true; // Marca como carregado
    }
  } else {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");

    // Reseta a flag quando deslogar, para que no próximo login busque de novo
    templatesJaCarregados = false;

    // Opcional: Limpar a lista visualmente também
    document.getElementById("lista-templates").innerHTML = "";
  }
});

// === 2. FUNÇÕES DE AUTENTICAÇÃO ===
async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await client.auth.signUp({ email, password });

  if (error) alert(error.message);
  else alert("Verifique seu email!");
}

async function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) alert(error.message);
}

async function signOut() {
  await client.auth.signOut();
}

// === 3. CONSULTA VIA EDGE FUNCTION (A parte robusta) ===
async function callEdgeFunction() {
  const output = document.getElementById("result");
  output.innerText = "Carregando Edge Function...";

  const { data, error } = await client.functions.invoke("get-examples", {
    method: "GET",
  });

  if (error) {
    output.innerText = "Erro: " + JSON.stringify(error, null, 2);
  } else {
    output.innerText = JSON.stringify(data, null, 2);
  }
}

// === 4. CONSULTA VIA FRONTEND (A parte simples - SEM CACHE) ===
async function buscarExercicios() {
  const container = document.getElementById("lista-exercicios");
  container.innerHTML = "Carregando exercícios...";

  // Vai direto no banco buscar os dados
  const { data, error } = await client
    .from("exercicios")
    .select("id, nome, grupo_muscular")
    .order("nome");

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }

  // Renderiza na tela
  renderizarExercicios(data);
}

function renderizarExercicios(lista) {
  const container = document.getElementById("lista-exercicios");
  container.innerHTML = ""; // Limpa a mensagem de "carregando"

  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum exercício encontrado.</p>";
    return;
  }

  lista.forEach((item) => {
    const div = document.createElement("div");
    div.className = "exercicio-item";
    div.textContent = item.nome;
    container.appendChild(div);
  });
}

//=== 5. CONSULTA TEMPLATES (SEM CACHE) ===
async function buscarTemplates() {
  const container = document.getElementById("lista-templates");
  container.innerHTML = "Carregando templates...";

  // Vai direto no banco buscar os dados
  const { data, error } = await client
    .from("templates")
    .select("id, nome, descricao")
    .order("nome");

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }
  // Renderiza na tela

  console.log("Templates encontrados:");
  console.log(data);
  renderizarTemplates(data);
}

function renderizarTemplates(lista) {
  const container = document.getElementById("lista-templates");
  container.innerHTML = ""; // Limpa a mensagem de "carregando"
  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum template encontrado.</p>";
    return;
  }
  lista.forEach((item) => {
    const div = document.createElement("button");
    div.className = "template-item";
    div.textContent = item.nome + " - " + item.descricao;

    // ADICIONE AQUI
    // O "() =>" serve para a função não rodar sozinha, só no clique
    div.onclick = () => renderizarItensDeTemplate(item.id);

    container.appendChild(div);
  });
}

//
//
//
// No topo do seu arquivo JS principal
let templateAtualId = null;

// Atualize sua função de clique (onde você chama o renderizar)
function aoClicarNoTemplate(id) {
  templateAtualId = id; // <--- Guarda o ID na memória
  renderizarItensDeTemplate(id);
}

// === 6. CONSULTA ITENS DE TEMPLATE (SEM CACHE, POR ENQUANTO) ===
async function buscarItensDeTemplate(templateId) {
  
  // Atualiza a variável global por segurança
  templateAtualId = templateId; 

  // 1. Busca Itens (Igual)
  const itensPromise = client
    .from("template_itens")
    .select(
      "id, exercicios(id, nome), treino_recomendacoes(valor, detalhes, description), templates(nome), series_alvo, tecnica_intensificacao"
    )
    .eq("template_id", templateId)
    .order("ordem");

  // 2. Busca Contexto (Igual)
  const contextoPromise = client
    .from("user_context")
    .select("series_repeticoes(nome, week, series, min_reps, max_reps)")
    .single();

  // 3. (ATUALIZADO) Busca a ÚLTIMA sessão DESTE TEMPLATE ESPECÍFICO
  const ultimaSessaoPromise = client
    .from("sessao_treino")
    .select(`
      id, 
      created_at,
      sessao_series_realizadas (
        exercicio_id,
        carga,
        repeticoes,
        ordem,
        tipo
      )
    `)
    // FILTRO MÁGICO AQUI:
    .eq("template_id", templateId) 
    // Ordena do mais recente
    .order("created_at", { ascending: false })
    .limit(1)
    // .maybeSingle() é melhor que .single() pois não dá erro se não existir nenhum treino anterior
    .maybeSingle(); 

  // 4. Executa
  const [resItens, resContexto, resUltimaSessao] = await Promise.all([
    itensPromise,
    contextoPromise,
    ultimaSessaoPromise,
  ]);

  if (resItens.error) {
    console.error("Erro itens:", resItens.error);
    return null;
  }

  // Se não tiver treino anterior (resUltimaSessao.data for null), retorna array vazio
  const historico = resUltimaSessao.data
    ? resUltimaSessao.data.sessao_series_realizadas
    : [];

  console.log("Histórico deste template recuperado:", historico);

  return {
    itens: resItens.data,
    contexto: resContexto.data,
    historico: historico,
  };
}

async function renderizarItensDeTemplate(templateId) {
  const { itens, contexto, historico } = await buscarItensDeTemplate(
    templateId
  );

  const wrapperTraining = document.createElement("div");
  wrapperTraining.className = "container-treino";
  const container = document.querySelector(".itensTemplate");

  // Templates do HTML
  const templateInputExercise = document.querySelector(
    ".template-input-exercise"
  );
  const templateHeaderExercise = document.querySelector(
    ".template-header-exercise"
  );

  container.innerHTML = ""; // 1. Limpa tudo
  if (!itens) return;

  // --- O TRUQUE COMEÇA AQUI ---
  // Não crie uma variável 'detalhes'. Jogue direto no container.

  // Parte 1: Título Principal (String é mais fácil aqui)
  wrapperTraining.insertAdjacentHTML(
    "beforeend",
    `<h3 class="titulo-treino data-week-${contexto.series_repeticoes.week}">${itens[0].templates.nome}</h3>`
  );

  // Botão reiniciar treino
  wrapperTraining.insertAdjacentHTML(
    "beforeend",
    `<button id="concluir-treino-btn" onclick="limparDadosLocais()">Reiniciar/zerar treino</button>`
  );

  console.log(historico);

  // Início do loop pelos itens do template
  for (const item of itens) {
    // 1. CRIA A "CAIXA" DO EXERCÍCIO
    const wrapperExercises = document.createElement("div");
    wrapperExercises.className = "container-exercicio";
    wrapperExercises.dataset.exercicioId = item.exercicios.id;
    wrapperExercises.innerHTML = ""; // 1. Limpa tudo

    // Cria uma lista temporária só com as séries DESTE exercício (item.exercicios.id)
    const seriesPassadas = historico.filter(
      (h) => h.exercicio_id === item.exercicios.id
    );

    console.log(
      "Séries passadas para o exercício",
      item.exercicios.nome,
      seriesPassadas
    );

    // Parte 2: Título do Exercício + Header (String)
    // O 'beforeend' significa: adicione no final do que já existe dentro do container

    if (item.tecnica_intensificacao) {
      wrapperExercises.insertAdjacentHTML(
        "beforeend",
        `<h4>${item.exercicios.nome} - <em>${item.tecnica_intensificacao}</em></h4>`
      );
    } else {
      wrapperExercises.insertAdjacentHTML(
        "beforeend",
        `<h4>${item.exercicios.nome}</h4>`
      );
    }

    if (item.treino_recomendacoes !== null) {
      // Adiciona as recomendações uma única vez
      wrapperExercises.insertAdjacentHTML(
        "beforeend",
        `<details class="detalhes-exercicio"> 
        <summary>Recomendações:</summary>
        ${item.treino_recomendacoes.description} ${contexto.series_repeticoes.nome}</details>`
      );
    }

    // Nota: templateHeaderExercise.innerHTML retorna uma string, então usamos insertAdjacentHTML
    wrapperExercises.insertAdjacentHTML(
      "beforeend",
      templateHeaderExercise.innerHTML
    );

    // Parte 3: A Lógica Complexa (Nodes / Clones)
    if (item.treino_recomendacoes !== null) {
      // Aqui usamos o DOM Node, pois você quer usar querySelector e cloneNode

      // Parte 3a: Itens vindos do treino_recomendacoes (valor e detalhes)
      for (let i = 0; i < item.treino_recomendacoes.valor; i++) {
        const cloneInputSeries = templateInputExercise.content.cloneNode(true);

        // Manipula o clone à vontade
        cloneInputSeries.querySelector(".seriesExercise").value =
          item.treino_recomendacoes.detalhes[i].label;

        if (seriesPassadas[i] != undefined) {
          cloneInputSeries.querySelector(".anteriorExercise").textContent =
            seriesPassadas[i]?.repeticoes + " x " + seriesPassadas[i]?.carga ||
            " - ";
          cloneInputSeries.querySelector(".kgExercise").value =
            seriesPassadas[i]?.carga || "";
          cloneInputSeries.querySelector(".repsExercise").value =
            seriesPassadas[i]?.repeticoes || "";
        }
        // Joga o NODE direto no container. Ele vai ficar logo depois do Header que inserimos acima
        wrapperExercises.appendChild(cloneInputSeries);
      }

      // Parte 3b: Itens das séries TOPs do contexto
      for (let i = 0; i < contexto.series_repeticoes.series; i++) {
        // Seu cálculo de índice atual
        let lastPrepareSerie =
          item.treino_recomendacoes.detalhes.at(-1).label + i + 1;

        const cloneInputSeries = templateInputExercise.content.cloneNode(true);

        // --- A MÁGICA ATUALIZADA AQUI ---

        let dadoHistorico;

        // NOVO: Verifica se é o cenário "Semana Pesada -> Semana Leve"
        // Se for a ÚLTIMA série de hoje E o histórico tiver MAIS séries que hoje...
        if (
          i === contexto.series_repeticoes.series - 1 &&
          seriesPassadas.length > contexto.series_repeticoes.series
        ) {
          // ...Ignora a sequência e pega a ÚLTIMA série do histórico (o pico de carga)
          dadoHistorico = seriesPassadas[seriesPassadas.length - 1];
        } else {
          // Senão, segue o fluxo normal (índice com índice)
          dadoHistorico = seriesPassadas[lastPrepareSerie];
        }

        // 2. Lógica antiga (Mantida para o inverso: Semana Leve -> Pesada)
        // Se for undefined (ex: aumentou de 1 para 2 séries), usa a ÚLTIMA disponível
        if (!dadoHistorico && seriesPassadas.length > 0) {
          dadoHistorico = seriesPassadas[seriesPassadas.length - 1];
        }

        // -----------------------------

        // Agora usamos 'dadoHistorico' em vez de acessar o array direto
        if (dadoHistorico) {
          const textoAnterior =
            (dadoHistorico.repeticoes || 0) +
            " x " +
            (dadoHistorico.carga || 0);

          // Preenche os campos de carga e repetições
          cloneInputSeries.querySelector(".kgExercise").value =
            dadoHistorico.carga || "";
          cloneInputSeries.querySelector(".repsExercise").value =
            dadoHistorico.repeticoes || "";

          cloneInputSeries.querySelector(".anteriorExercise").textContent =
            textoAnterior;
        } else {
          cloneInputSeries.querySelector(".anteriorExercise").textContent =
            " - ";
        }

        cloneInputSeries.querySelector(".seriesExercise").value =
          lastPrepareSerie;
        wrapperExercises.appendChild(cloneInputSeries);
      }

      // Parte 3c: Apenas recomendações semanais
    } else if (
      item.treino_recomendacoes === null &&
      item.series_alvo === null
    ) {
      console.log(
        "Número de séries para preencher:",
        contexto.series_repeticoes.series
      );

      for (let i = 0; i < contexto.series_repeticoes.series; i++) {
        // --- CORREÇÃO: O clone deve ser criado AQUI, para cada nova série ---
        const cloneInputSeries = templateInputExercise.content.cloneNode(true);

        // Manipula o clone à vontade
        cloneInputSeries.querySelector(".seriesExercise").value =
          i + 1 + " Série Alternativa";

        // Verifica se existe histórico, mas cria o input de qualquer forma (ou ajuste conforme sua lógica)
        const serieAnterior =
          seriesPassadas && seriesPassadas[i] ? seriesPassadas[i] : null;

        if (serieAnterior) {
          console.log("Série passada encontrada:", serieAnterior);

          cloneInputSeries.querySelector(".anteriorExercise").textContent =
            serieAnterior.repeticoes + " x " + serieAnterior.carga || " - ";

          cloneInputSeries.querySelector(".kgExercise").value =
            serieAnterior.carga || "";
          cloneInputSeries.querySelector(".repsExercise").value =
            serieAnterior.repeticoes || "";
        } else {
          // Lógica opcional: O que fazer se não tiver série anterior?
          // Deixar em branco ou colocar um traço?
          cloneInputSeries.querySelector(".anteriorExercise").textContent =
            " - ";
          cloneInputSeries.querySelector(".kgExercise").value = "";
          cloneInputSeries.querySelector(".repsExercise").value = "";
        }

        // Configura o label da série atual
        const inputSerieLabel =
          cloneInputSeries.querySelector(".seriesExercise");
        if (inputSerieLabel) {
          inputSerieLabel.textContent = i + 1 + "ª Série"; // Ex: 1ª Série, 2ª Série...
        }

        // Adiciona ao DOM
        wrapperExercises.appendChild(cloneInputSeries);
      }
    } else {
      for (let i = 0; i < item.series_alvo; i++) {
        const cloneInputSeries = templateInputExercise.content.cloneNode(true);

        if (seriesPassadas[i] != undefined) {
          cloneInputSeries.querySelector(".anteriorExercise").textContent =
            seriesPassadas[i]?.repeticoes + " x " + seriesPassadas[i]?.carga ||
            " - ";
          cloneInputSeries.querySelector(".kgExercise").value =
            seriesPassadas[i]?.carga || "";
          cloneInputSeries.querySelector(".repsExercise").value =
            seriesPassadas[i]?.repeticoes || "";
          console.log(
            "Série passada para preencher o anterior:",
            seriesPassadas[i]
          );
        }

        // Manipula o clone à vontade
        cloneInputSeries.querySelector(".seriesExercise").value =
          i + 1 + " Série Padrão";

        // Joga o NODE direto no container. Ele vai ficar logo depois do Header que inserimos acima
        wrapperExercises.appendChild(cloneInputSeries);
      }
    }

    wrapperTraining.appendChild(wrapperExercises);
    container.appendChild(wrapperTraining);
  }

  // Botão marcar como concluído
  wrapperTraining.insertAdjacentHTML(
    "beforeend",
    `<button id="concluir-treino-btn" onclick="marcarTreinoComoConcluido()">Marcar Treino como Concluído</button>
    `
  );

  if (typeof restaurarDadosLocais === "function") {
    restaurarDadosLocais();
  }

  // 2. Adiciona o evento para salvar automaticamente a cada digitação
  // Usamos "Event Delegation": adicionamos no container pai para não travar a memória
  const containerPrincipal = document.querySelector(".container-treino"); // Ou onde você injeta o HTML
  if (containerPrincipal) {
    containerPrincipal.addEventListener("input", (event) => {
      // Verifica se quem foi digitado é um dos nossos inputs
      if (event.target.matches(".kgExercise, .repsExercise, .seriesExercise")) {
        salvarInputLocalmente(event.target);
      }
    });
  }
}
