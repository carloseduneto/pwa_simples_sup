export const BottomNavComponent = {
  containerId: "bottom-nav-container",
  htmlPath: "assets/components/bottom-nav.html",
  foiRenderizado: false,

  async renderizar() {
    if (this.foiRenderizado) return;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    try {
      const resposta = await fetch(this.htmlPath);
      if (resposta.ok) {
        container.innerHTML = await resposta.text();
        this.foiRenderizado = true;
      }
    } catch (erro) {
      console.error("Erro ao carregar Bottom Nav:", erro);
    }
  },

  // Recebe o nome da rota E o contexto (none, workout, diet, etc)
  atualizarEstado(rotaAtual, contexto) {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // 1. Lógica de Visibilidade e Tema (Cor)
    if (!contexto || contexto === "none") {
      container.style.display = "none";
      return;
    } else {
      container.style.display = "block";

      // MÁGICA DO TEMA:
      // Limpa classes antigas e adiciona a nova baseada no contexto
      container.className = `theme-${contexto}`;
    }

    // 2. Atualiza qual ícone está "ativo"
    const itens = container.querySelectorAll(".nav-item");
    itens.forEach((item) => {
      // Se a rota atual for igual ao data-route DO BOTÃO, ele fica ativo
      if (item.dataset.route === rotaAtual) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  },
};
