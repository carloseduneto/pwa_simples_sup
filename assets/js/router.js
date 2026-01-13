// assets/js/router.js

const rotas = {
  login: "auth-section", // Tela de Login
  templates: "screen-templates-list", // Lista de Treinos
  detalhes: "screen-workout-details", // Detalhes do Treino
  config: "screen-config", // Futura tela
};

/**
 * Função Central de Navegação
 * @param {string} nomeRota - O nome da chave no objeto 'rotas'
 * @param {string|null} paramId - (Opcional) ID do template/item
 * @param {boolean} adicionarAoHistorico - Se true, cria entrada no histórico (padrão). Se false (botão voltar), só troca a tela.
 */
function roteador(nomeRota, paramId = null, adicionarAoHistorico = true) {
  // 1. Ocultar TUDO
  // Primeiro, garante que estamos no modo "App" (oculta login), exceto se a rota for login
  if (nomeRota === "login") {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");
    return; // Para por aqui
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

  // 4. Gerencia a URL (Somente se não for o botão voltar)
  if (adicionarAoHistorico) {
    let url = `?page=${nomeRota}`;
    if (paramId) url += `&id=${paramId}`;

    // pushState(dados, titulo, url)
    window.history.pushState({ rota: nomeRota, id: paramId }, "", url);
  }
}

// Escuta o botão "Voltar" do navegador
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
