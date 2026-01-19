// assets/js/router.js

const rotas = {
  login: "auth-section", // Tela de Login
  templates: "screen-templates-list", // Lista de Treinos
  detalhes: "screen-workout-details", // Detalhes do Treino
  config: "screen-config", // Tela de Configurações
  exercices: "screen-exercises", // Tela de Exercícios
};

/**
 * Função Central de Navegação
 */
function roteador(nomeRota, paramId = null, adicionarAoHistorico = true) {
  // ---------------------------------------------------------
  // 1. Ocultar TUDO (Lógica Original)
  // ---------------------------------------------------------

  // Primeiro, garante que estamos no modo "App" (oculta login), exceto se a rota for login
  if (nomeRota === "login") {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");
    return; // Se for login, para por aqui e não mexe no header do App
  } else {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
  }

  // 2. Esconde todas as telas internas do App
  Object.values(rotas).forEach((idDiv) => {
    // Ignora a div de login que já tratamos acima
    if (idDiv !== "auth-section") {
      const el = document.getElementById(idDiv);
      if (el) el.classList.add("hidden");
    }
  });

  // 3. Mostra a tela desejada
  const idAlvo = rotas[nomeRota];
  if (idAlvo) {
    document.getElementById(idAlvo).classList.remove("hidden");
  }

  // ---------------------------------------------------------
  // 2. A MÁGICA DO HEADER (Novo Código Integrado)
  // ---------------------------------------------------------

  // Configuração de Título e Visibilidade para cada rota
  const configHeader = {
    templates: { titulo: "Templates", exibir: true },
    config: { titulo: "Configurações", exibir: true },
    detalhes: { titulo: "Detalhes do Treino", exibir: false },
    exercices: { titulo: "Exercícios", exibir: false },
    // Se tiver uma tela que não precisa de header, coloque exibir: false
  };

  // Pegamos os elementos do HTML (Certifique-se que os IDs existem no HTML!)
  const headerEl = document.getElementById("app-header");
  const tituloEl = document.getElementById("header-title");

  // Só executa se os elementos existirem para evitar erro
  if (headerEl && tituloEl) {
    // Pegamos a config da tela atual (ou um padrão se não existir)
    const dadosTela = configHeader[nomeRota] || { titulo: "App", exibir: true };

    // APLICAMOS AS MUDANÇAS:

    // 2.1 Troca o Texto
    tituloEl.innerText = dadosTela.titulo;

    // 2.2 Mostra ou Esconde o Header inteiro
    if (dadosTela.exibir) {
      headerEl.style.display = "flex"; // Use flex para manter o layout alinhado
    } else {
      headerEl.style.display = "none";
    }
  }

  // ---------------------------------------------------------
  // 3. Gerencia a URL (Lógica Original)
  // ---------------------------------------------------------

  if (adicionarAoHistorico) {
    let url = `?page=${nomeRota}`;
    if (paramId) url += `&id=${paramId}`;

    // pushState(dados, titulo, url)
    window.history.pushState({ rota: nomeRota, id: paramId }, "", url);
  }
}

// Escuta o botão "Voltar" do navegador (Mantido idêntico)
window.addEventListener("popstate", (event) => {
  const estado = event.state;

  if (estado && estado.rota) {
    // Se temos estado salvo, recupera a tela (passando false para não duplicar histórico)
    roteador(estado.rota, estado.id, false);

    // Se voltou para detalhes, precisa recarregar os dados
    if (estado.rota === "detalhes" && estado.id) {
      if (typeof renderizarItensDeTemplate === "function") {
        renderizarItensDeTemplate(estado.id);
      }
    }
  } else {
    // Se o histórico acabou ou está vazio, volta para o início
    roteador("templates", null, false);
  }
});
