// Mapeamento: Nome da Rota -> ID da Div
const rotas = {
  templates: "screen-templates-list",
  detalhes: "screen-workout-details",
  config: "screen-configuracoes", // Nova tela
};

function roteador(nomeRota, params = null) {
  // 1. Esconde todas as telas
  Object.values(rotas).forEach(id => {
    document.getElementById(id).classList.add("hidden");
  });

  // 2. Mostra a tela desejada
  const idAlvo = rotas[nomeRota];
  if (idAlvo) {
    document.getElementById(idAlvo).classList.remove("hidden");
  }

  // 3. Atualiza a URL (Magia da SPA)
  let url = `?page=${nomeRota}`;
  if (params) {
    url += `&id=${params}`; // Ex: ?page=detalhes&id=3
  }
  // pushState(dados, titulo, url) - muda a URL sem recarregar
  window.history.pushState({ rota: nomeRota, params }, "", url);
}

// Escuta o botão "Voltar" do navegador para navegar de verdade
window.addEventListener("popstate", event => {
  const estado = event.state;
  if (estado && estado.rota) {
    // Recupera a tela anterior sem dar pushState de novo
    // A lógica aqui seria levemente diferente para apenas trocar a div
    // simplificando: recarregar a página resolve ou precisa de refatoração leve
    location.reload();
  }
});
