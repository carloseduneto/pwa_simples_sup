const TemplateFilterUX = {
  // Função chamada ao carregar a tela para ligar o botão
  init: () => {
    const btn = document.getElementById("template-button-inactived");

    // Se o botão não existir (estiver em outra tela), não faz nada
    if (!btn) return;

    // Reconecta o clique (A "cura" do bug do roteador)
    btn.onclick = () => {
      // Chama a função lógica que está no list-templates.js
      if (typeof alternarVisualizacaoInativos === "function") {
        alternarVisualizacaoInativos();
      }
    };

    // Garante que o ícone esteja com a cor certa ao carregar
    TemplateFilterUX.atualizarVisual();
  },

  // Função apenas visual (Muda cor e ícone)
  atualizarVisual: () => {
    const btn = document.getElementById("template-button-inactived");
    if (!btn) return;

    const icon = btn.querySelector(".material-symbols-rounded");
    const text = btn.querySelector(".btn-text-header");

    // Verifica a variável global de controle (definida no list-templates.js)
    const estaFiltrando =
      typeof EXIBINDO_INATIVOS !== "undefined" && EXIBINDO_INATIVOS;

    if (estaFiltrando) {
      // Estado: EXIBINDO INATIVOS (Laranja)
      icon.innerHTML = "check";
      text.innerText = "Ativos";
      icon.style.color = "#FF6B00";
      text.style.color = "#FF6B00";
    } else {
      // Estado: PADRÃO (Cinza)
      icon.innerHTML = "block";
      text.innerText = "Inativos";
      icon.style.color = "";
      text.style.color = "#000000";
    }
  },
};
