// ============================================================================
// 1. CONFIGURAÇÃO MESTRE (O "Cérebro" do App)
// ============================================================================

const rotasConfig = {
  // --- TELA DE LOGIN ---
  login: {
    idDiv: "auth-section",
    tipoHeader: "nenhum", // Opções: 'padrao', 'alternativo', 'nenhum'
    titulo: "Login",
  },

  // --- TELAS ANTIGAS ---
  templates: {
    idDiv: "screen-templates-list",
    tipoHeader: "padrao", // Usa o header azulzão normal
    titulo: "Meus Treinos",
    onLoad: null,
  },
  config: {
    idDiv: "screen-config",
    tipoHeader: "padrao",
    titulo: "Configurações",
    onLoad: null,
  },

  // --- TELAS NOVAS ---
  exercises: {
    idDiv: "screen-exercises",
    html: "assets/screens/exercises.html",
    tipoHeader: "alternativo", // <--- AQUI A MÁGICA: Usa o novo header!
    titulo: "Exercícios",
    onLoad: id => {
      if (typeof renderizarListaExercicios === "function") {
        renderizarListaExercicios(id);
      }
    },
  },
  exercisesAddEdit: {
    idDiv: "screen-exercises-add-edit",
    html: "assets/screens/exercisesAddEdit.html",
    tipoHeader: "alternativo", // Usa o novo header
    titulo: "Editar Exercício",
    onLoad: null,
  },
  detalhes: {
    idDiv: "screen-workout-details",
    tipoHeader: "nenhum", // Detalhes geralmente não tem header ou tem um próprio
    titulo: "Treino em Andamento",
    onLoad: id => {
      if (typeof renderizarItensDeTemplate === "function")
        renderizarItensDeTemplate(id);
    },
  },
};

// ============================================================================
// 2. FUNÇÕES AUXILIARES
// ============================================================================

async function carregarConteudoExterno(config, nomeRota) {
  if (!config.html) return;

  const elemento = document.getElementById(config.idDiv);
  if (!elemento) return;

  // Cache: Se já tem conteúdo, não baixa de novo
  if (elemento.innerHTML.trim().length > 0) return;

  try {
    const resposta = await fetch(config.html);
    if (resposta.ok) {
      const htmlTexto = await resposta.text();
      elemento.innerHTML = htmlTexto;
    }
  } catch (erro) {
    console.error(`Erro ao baixar a tela ${nomeRota}:`, erro);
  }
}

function gerenciarLayoutPrincipal(nomeRota) {
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");

  if (nomeRota === "login") {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    return false;
  } else {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    return true;
  }
}

/**
 * Atualiza o Cabeçalho (Agora manipulando as classes corretamente)
 */
function atualizarHeader(config) {
  // 1. Pegar os elementos
  const headerPadrao = document.getElementById("app-header");
  const headerAlt = document.getElementById("app-header-alt");
  
  const tituloPadrao = document.getElementById("header-title");
  const tituloAlt = document.getElementById("header-title-alt");

  // 2. Primeiro, GARANTE que tudo está escondido
  // Usamos classList para respeitar o CSS do seu projeto
  if (headerPadrao) {
      headerPadrao.classList.add("hidden");
      headerPadrao.style.display = "none"; // Segurança extra
  }
  if (headerAlt) {
      headerAlt.classList.add("hidden");
      headerAlt.style.display = "none"; // Segurança extra
  }

  // 3. Decide qual mostrar e remove o 'hidden' do escolhido
  const tipo = config.tipoHeader || "nenhum";

  if (tipo === "padrao" && headerPadrao) {
    headerPadrao.classList.remove("hidden");
    headerPadrao.style.display = "flex"; // Força o layout flex
    if (tituloPadrao) tituloPadrao.innerText = config.titulo;
  } 
  else if (tipo === "alternativo" && headerAlt) {
    headerAlt.classList.remove("hidden");
    headerAlt.style.display = "flex"; // Força o layout flex
    if (tituloAlt) tituloAlt.innerText = config.titulo;
  }
}

// ============================================================================
// 3. ROTEADOR CENTRAL
// ============================================================================

async function roteador(nomeRota, paramId = null, adicionarAoHistorico = true) {
  // 1. Validação básica
  const config = rotasConfig[nomeRota];
  if (!config) {
    console.warn(`Rota ${nomeRota} inexistente. Indo para home.`);
    roteador("templates"); // Rota padrão de segurança
    return;
  }

  // 2. Layout (Login vs App)
  const ehTelaInterna = gerenciarLayoutPrincipal(nomeRota);
  if (!ehTelaInterna) return;

  // 3. Carregar HTML se necessário
  await carregarConteudoExterno(config, nomeRota);

  // 4. Oculta telas
  Object.values(rotasConfig).forEach(rotaItem => {
    if (rotaItem.idDiv !== "auth-section") {
      const el = document.getElementById(rotaItem.idDiv);
      if (el) el.classList.add("hidden");
    }
  });

  // 5. Mostra tela atual
  const telaAlvo = document.getElementById(config.idDiv);
  if (telaAlvo) telaAlvo.classList.remove("hidden");

  // 6. Atualiza Header (Nova lógica)
  atualizarHeader(config);

  // 7. Executa scripts da tela
  if (typeof config.onLoad === "function") {
    config.onLoad(paramId);
  }

  // 8. Histórico URL
  if (adicionarAoHistorico) {
    let url = `?page=${nomeRota}`;
    if (paramId) url += `&id=${paramId}`;
    window.history.pushState({ rota: nomeRota, id: paramId }, "", url);
  }
}

// ============================================================================
// 4. EVENTOS GLOBAIS & INICIALIZAÇÃO (Correção do F5)
// ============================================================================

// Botão Voltar do Navegador
window.addEventListener("popstate", event => {
  const estado = event.state;
  if (estado && estado.rota) {
    roteador(estado.rota, estado.id, false);
  } else {
    roteador("templates", null, false);
  }
});

// AQUI ESTÁ A CORREÇÃO DO "REFRESH" (F5)
// Assim que a janela carrega, lemos a URL e navegamos para o lugar certo
window.addEventListener("load", () => {
  // Lê os parâmetros da URL (ex: ?page=exercises&id=10)
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  const id = params.get("id");

  // Se tiver uma página na URL, vai pra ela. Se não, vai pra templates.
  if (page) {
    roteador(page, id, false); // false para não duplicar histórico
  } else {
    // Se for o primeiro acesso sem nada na URL, decide se vai pra login ou home
    // (Ajuste conforme sua lógica de auth)
    roteador("templates", null, false);
  }
});
