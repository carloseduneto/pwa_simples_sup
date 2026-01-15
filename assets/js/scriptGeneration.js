// script.js

const MEXENDO_NO_CSS = true; // Ative para usar cache local durante desenvolvimento

// ======================================================
// 1. VARIÁVEIS DE CONTROLE E AUTH
// ======================================================
let templatesJaCarregados = false;

// Escuta de Autenticação (O Chefe da Segurança)
client.auth.onAuthStateChange((event, session) => {
  if (session) {
    document.getElementById("user-email").innerText = session.user.email;

    // Assim que logar, verifica para onde ir baseado na URL
    verificarRotaInicial();

    // Busca contexto (o select de semanas) se necessário
    if (typeof buscarContextRecomendacoes === "function") {
      buscarContextRecomendacoes();
    }
  } else {
    roteador("login");
    templatesJaCarregados = false;
  }
});

// ======================================================
// 2. FUNÇÕES DE LOGIN (RESTAURADAS)
// ======================================================
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

  // Limpa visualmente a URL para a raiz do site (remove o ?page=...)
  // replaceState substitui a entrada atual no histórico em vez de criar uma nova
  window.history.replaceState(null, "", window.location.pathname);

  // O seu listener onAuthStateChange vai perceber o logout e chamar o roteador('login')
  // mas agora a URL já estará limpa.
}

// ======================================================
// 3. SISTEMA DE ROTEAMENTO INTEGRADO
// ======================================================

// Lê a URL ao carregar e decide o que abrir
function verificarRotaInicial() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  const id = params.get("id");

  if (page === "detalhes" && id) {
    // URL pede detalhes -> Vai para detalhes e busca o template
    abrirTemplate(id);

    // Background: carrega a lista para quando voltar
    if (!templatesJaCarregados) {
      buscarTemplates();
      templatesJaCarregados = true;
    }
  } else {
    // Padrão -> Vai para lista
    roteador("templates", null, false);

    if (!templatesJaCarregados) {
      buscarTemplates();
      templatesJaCarregados = true;
    }
  }
}

// Função chamada pelo botão "Voltar" no HTML
function voltarParaLista() {
  // Limpa a tela de detalhes para economizar memória e evitar bugs visuais
  const container = document.querySelector(".itensTemplate");
  if (container) container.innerHTML = "";

  roteador("templates");
}

// Função CLIQUE do Usuário (A Ponte entre o Clique e o Router)
function abrirTemplate(idTemplate) {
  // 1. Muda a tela e a URL
  roteador("detalhes", idTemplate);
  // 2. Busca os dados
  renderizarItensDeTemplate(idTemplate);
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

  // [CACHE - LEITURA]
  if (MEXENDO_NO_CSS) {
    const cache = localStorage.getItem("cache_exercicios");
    if (cache) {
      console.log("📦 Usando cache local (Exercícios)");
      renderizarExercicios(JSON.parse(cache));
      return;
    }
  }

  const { data, error } = await client
    .from("exercicios")
    .select("id, nome, grupo_muscular")
    .order("nome");

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }

  // [CACHE - GRAVAÇÃO]
  if (MEXENDO_NO_CSS)
    localStorage.setItem("cache_exercicios", JSON.stringify(data));

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

  // [CACHE - LEITURA]
  if (MEXENDO_NO_CSS) {
    const cache = localStorage.getItem("cache_templates");
    if (cache) {
      console.log("📦 Usando cache local (Templates)");
      renderizarTemplates(JSON.parse(cache));
      return;
    }
  }

  const { data, error } = await client
    .from("templates")
    .select("id, nome, descricao")
    .order("nome");

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }

  // [CACHE - GRAVAÇÃO]
  if (MEXENDO_NO_CSS)
    localStorage.setItem("cache_templates", JSON.stringify(data));

  console.log("Templates encontrados:", data);
  renderizarTemplates(data);
}

function renderizarTemplates(lista) {
  const container = document.getElementById("lista-templates");
  container.innerHTML = "";

  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum template encontrado.</p>";
    return;
  }

  lista.forEach((item) => {
    const articleExercicio = document.createElement("article");
    articleExercicio.className = "template-item";

    // Criamos a estrutura interna do card
    articleExercicio.innerHTML = `
      <div class="card-info">
        <h3 class="card-title">${item.nome}</h3>
        <p class="card-subtitle">${item.descricao}</p>
      </div>
      <span class="card-dots">&#8942;</span>
    `;

    articleExercicio.onclick = () => {
      abrirTemplate(item.id);
    };

    container.appendChild(articleExercicio);
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
  templateAtualId = templateId; // Mantive sua lógica global

  // [CACHE - LEITURA] - Usamos o ID na chave para não misturar templates
  const cacheKey = `cache_template_full_${templateId}`;
  if (MEXENDO_NO_CSS) {
    const cache = localStorage.getItem(cacheKey);
    if (cache) {
      console.log(`📦 Usando cache local (Itens do Template ${templateId})`);
      return JSON.parse(cache);
    }
  }

  // --- Lógica Original ---
  const itensPromise = client
    .from("template_itens")
    .select(
      "id, exercicios(id, nome), treino_recomendacoes(valor, detalhes, description), templates(nome), series_alvo, tecnica_intensificacao"
    )
    .eq("template_id", templateId)
    .order("ordem");

  const contextoPromise = client
    .from("user_context")
    .select("series_repeticoes(nome, week, series, min_reps, max_reps)")
    .single();

  const ultimaSessaoPromise = client
    .from("sessao_treino")
    .select(
      `
      id, created_at,
      sessao_series_realizadas (exercicio_id, carga, repeticoes, ordem, tipo)
    `
    )
    .eq("template_id", templateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const [resItens, resContexto, resUltimaSessao] = await Promise.all([
    itensPromise,
    contextoPromise,
    ultimaSessaoPromise,
  ]);

  if (resItens.error) {
    console.error("Erro itens:", resItens.error);
    return null;
  }

  const historico = resUltimaSessao.data
    ? resUltimaSessao.data.sessao_series_realizadas
    : [];

  // Montamos o objeto final
  const resultadoFinal = {
    itens: resItens.data,
    contexto: resContexto.data,
    historico: historico,
  };

  // [CACHE - GRAVAÇÃO]
  if (MEXENDO_NO_CSS)
    localStorage.setItem(cacheKey, JSON.stringify(resultadoFinal));

  return resultadoFinal;
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

  const templateSmartHeader = document.querySelector(".template-smart-header");

  container.innerHTML = ""; // 1. Limpa tudo
  if (!itens) return;

  // --- O TRUQUE COMEÇA AQUI ---
  // Não crie uma variável 'detalhes'. Jogue direto no container.

  // Parte 1: Título Principal (String é mais fácil aqui)
  wrapperTraining.insertAdjacentHTML(
    "beforeend",
    templateSmartHeader.innerHTML
  );

  wrapperTraining.insertAdjacentHTML(
    "beforeend",
    `<h3 class="titulo-treino data-week-${contexto.series_repeticoes.week}">${itens[0].templates.nome}</h3>`
  );

  // Botão reiniciar treino
  wrapperTraining.insertAdjacentHTML(
    "beforeend",
    `<button id="concluir-treino-btn" onclick="limparDadosLocais()"><span class="material-symbols-rounded">
rotate_left
</span>
    Reiniciar/zerar treino</button>`
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

  const divConteudoHeader = document.querySelector(".header-content");

  if (divConteudoHeader) {
    divConteudoHeader.insertAdjacentHTML(
      "beforeend",
      `<button id="concluir-treino-btn" onclick="marcarTreinoComoConcluido()" class="btn-icon-dynamic-header">
           <span class="material-symbols-rounded">done_all</span> 
           <span class="btn-text-header">Concluir</span>
           </button>`
    );
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

  const containerPrincipal = document.querySelector(".container-treino");
  if (containerPrincipal) {
    containerPrincipal.addEventListener("input", (event) => {
      if (event.target.matches(".kgExercise, .repsExercise, .seriesExercise")) {
        salvarInputLocalmente(event.target);
      }
    });
  }
}

// // Verifica se já tem algo na URL quando abre o app
// window.addEventListener("load", () => {
//   const params = new URLSearchParams(window.location.search);
//   const idSalvo = params.get("template");

//   if (idSalvo) {
//     // Se tem ID, busca o template e o próprio renderizar vai trocar a tela
//     renderizarItensDeTemplate(idSalvo);
//   } else {
//     // Se não tem ID, garante que estamos na lista
//     navegarPara("lista");
//     buscarTemplates(); // Sua função original
//   }
// });

// No arquivo assets/js/scriptGeneration.js

function verificarRotaInicial() {
  const params = new URLSearchParams(window.location.search);

  // Lemos apenas o padrão novo
  const page = params.get("page");
  const id = params.get("id");

  // 1. Lógica principal: Rota de Detalhes com ID
  if (page === "detalhes" && id) {
    abrirTemplate(id);
  }
  // 2. Outras rotas genéricas (Config, Histórico, etc.)
  // Verifica se 'page' existe e se está listada no nosso objeto 'rotas'
  else if (page && typeof rotas !== "undefined" && rotas[page]) {
    roteador(page, null, false);
  }
  // 3. Fallback: Se não tiver rota ou for inválida, vai para a Home
  else {
    roteador("templates", null, false);
  }

  // Carrega a lista em background se necessário (para garantir dados ao voltar)
  if (!templatesJaCarregados) {
    buscarTemplates();
    templatesJaCarregados = true;
  }
}

// ======================================================
// UTILITÁRIO: PEGAR ID DO USUÁRIO
// ======================================================
async function getUserId() {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (user) return user.id;

  const userV1 = client.auth.user && client.auth.user();
  return userV1 ? userV1.id : "usuario_anonimo_ou_teste";
}

// ======================================================
// 1. BUSCAR DADOS (Opções + Seleção Atual)
// ======================================================
async function buscarContextRecomendacoes() {
  const container = document.getElementById("container-recomendacoes");
  if (!container) return; // Segurança caso não tenha o elemento na tela

  try {
    const userId = await getUserId();

    // A. Busca as opções disponíveis (Semanas)
    const promiseOpcoes = client
      .from("series_repeticoes")
      .select("id, nome, week")
      // A forma correta de dizer "IS NOT NULL"
      .not("week", "is", null)
      .order("week", { ascending: true }); // ou order('week')

    // B. Busca qual está selecionada atualmente pelo usuário
    const promiseContexto = client
      .from("user_context")
      .select("current_modifier_id_series")
      .eq("owner_id", userId)
      .maybeSingle(); // maybeSingle não dá erro se não existir (usuário novo)

    // Executa as duas buscas ao mesmo tempo
    const [resOpcoes, resContexto] = await Promise.all([
      promiseOpcoes,
      promiseContexto,
    ]);

    if (resOpcoes.error) throw resOpcoes.error;

    const listaOpcoes = resOpcoes.data;
    // Se tiver contexto salvo, pega o ID, senão null
    const idSelecionado = resContexto.data
      ? resContexto.data.current_modifier_id_series
      : null;

    // Chama a renderização passando os dados
    renderizarContextRecomendacoes(listaOpcoes, idSelecionado);
  } catch (error) {
    console.error("Erro ao buscar contexto:", error);
    container.innerHTML = "Erro ao carregar opções.";
  }
}

// ======================================================
// 2. RENDERIZAR O SELECT
// ======================================================
function renderizarContextRecomendacoes(opcoes, idSelecionado) {
  const container = document.getElementById("container-recomendacoes");

  // Cria o HTML do select
  // Note o evento onchange: assim que mudar, já salva no banco!
  // <label for="select-semana">Semana do Treino:</label>
  let html = `
    <select id="select-semana" onchange="atualizarSupabaseContextRecomendacoes(this.value)" style="padding: 8px; width: 100%;" class="input-select-context-recomendacoes">
      <option value="" disabled ${
        !idSelecionado ? "selected" : ""
      }>Selecione uma semana...</option>
  `;

  opcoes.forEach((opcao) => {
    // Verifica se essa é a opção que estava salva no banco
    const isSelected = opcao.id === idSelecionado ? "selected" : "";

    html += `
      <option value="${opcao.id}" ${isSelected} class="lista-opcoes"> Semana ${opcao.week} -
        ${opcao.nome}
      </option>
    `;
  });

  html += `</select>`;

  container.innerHTML = html;
}
