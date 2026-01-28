document.addEventListener("DOMContentLoaded", () => {
  const sheet = document.querySelector(".templates-options-container");
  const backdrop = document.querySelector(".templates-backdrop");
  const dragger = document.querySelector(".tmp-opt-dragger-place");

  // SELEÇÃO DO BOTÃO: Buscamos dentro da 'sheet' que já foi selecionada acima
  const btnDeleteTemplate = sheet.querySelector(".tmp-opt-item--delete");

  let currentTemplateId = null;
  let longPressTimer;

  // --- Botão Excluir (Lógica corrigida) ---
  if (btnDeleteTemplate) {
    btnDeleteTemplate.onclick = async () => {
      if (!currentTemplateId) return; // Segurança caso o ID suma

      if (!confirm("Deseja realmente excluir este template?")) return;

      try {
        await TemplateService.delete(currentTemplateId);
        location.reload(); // Forma mais simples de recarregar a página no MVP
      } catch (err) {
        alert(`Erro ao excluir: ${err.message}`);
        console.error(err);
      }
    };
  }

  // --- FUNÇÕES DE CONTROLE ---
  const btnSession = document.getElementById("start-session");
  if (btnSession) {
    btnSession.addEventListener("click", () => {
      abrirTemplate(currentTemplateId);
    });
  }

  // const openMenu = (id) => {
  //   currentTemplateId = id;
  //   sheet.classList.add("active");
  //   backdrop.classList.add("active");
  //   document.body.classList.add("modal-open");
  // };

  const openMenu = (id) => {
    currentTemplateId = id;

    // --- CÓDIGO NOVO ADICIONADO AQUI ---
    // Verifica se estamos na tela de inativos (usando a variável global do list-templates.js)
    const isModoInativo =
      typeof EXIBINDO_INATIVOS !== "undefined" && EXIBINDO_INATIVOS;

    const btnStatus = sheet.querySelector(".tmp-opt-item--deactive");
    if (btnStatus) {
      const icon = btnStatus.querySelector(".material-symbols-rounded");
      const text = btnStatus.querySelector("span:last-child"); // Pega o span do texto

      if (isModoInativo) {
        // Se já está inativo, mostramos opção de ATIVAR
        icon.innerText = "check";
        text.innerText = "Ativar";
        // Opcional: mudar cor para verde ou laranja se quiser destaque
        // icon.style.color = "#4CAF50";
        icon.style.color = "#FF6B00";
        text.style.color = "#FF6B00";
      } else {
        // Padrão: Desativar
        icon.innerText = "block";
        text.innerText = "Inativar";
        // icon.style.color = "";
        icon.style.color = ""; // Volta ao CSS original
        text.style.color = "#000000";
      }
    }
    // --- FIM DO CÓDIGO NOVO ---

    sheet.classList.add("active");
    backdrop.classList.add("active");
    document.body.classList.add("modal-open");
  };

  const closeMenu = () => {
    sheet.classList.remove("active");
    backdrop.classList.remove("active");
    document.body.classList.remove("modal-open");
    sheet.style.transform = ""; // Limpa o transform do arrastar
    currentTemplateId = null;
  };

  // --- EVENTOS ---

  // Dentro do seu addEventListener onde gerencia o sheet
  const btnEditTemplate = sheet.querySelector(
    ".tmp-opt-item[onclick*='templateForm']",
  );

  if (btnEditTemplate) {
    // Removemos o onclick do HTML e fazemos via JS para controle total
    btnEditTemplate.removeAttribute("onclick");

    btnEditTemplate.onclick = () => {
      if (currentTemplateId) {
        localStorage.setItem("editTemplateId", currentTemplateId); // Passo essencial!
        closeMenu();
        roteador("templateForm");
      }
    };
  }

  const btnDisableTemplate = sheet.querySelector(".tmp-opt-item--deactive");
  if (btnDisableTemplate) {
    btnDisableTemplate.onclick = async () => {
      if (!currentTemplateId) return;

      // --- CÓDIGO NOVO: LÓGICA DINÂMICA ---
      const isModoInativo =
        typeof EXIBINDO_INATIVOS !== "undefined" && EXIBINDO_INATIVOS;

      // Se está no modo inativo, o novo status deve ser 'active'. Se não, 'inactive'.
      const novoStatus = isModoInativo ? "active" : "inactive";
      const acaoTexto = isModoInativo ? "ativar" : "desativar";

      if (!confirm(`Deseja realmente ${acaoTexto} este template?`)) return;

      try {
        // Passamos o novoStatus calculado
        await TemplateService.updateStatus(currentTemplateId, novoStatus);
        location.reload();
      } catch (err) {
        alert(`Erro ao atualizar status: ${err.message}`);
        console.error(err);
      }
    };
  }

  // 1. Cliques Globais
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".card-dots");
    if (btn) {
      e.stopPropagation();
      openMenu(btn.dataset.templateId);
    }

    if (e.target === backdrop) closeMenu();
  });

  // 2. Toque Longo
  document.addEventListener(
    "touchstart",
    (e) => {
      const item = e.target.closest(".template-item");
      if (item) {
        const btn = item.querySelector(".card-dots");
        if (btn) {
          const id = btn.dataset.templateId;
          longPressTimer = setTimeout(() => openMenu(id), 600);
        }
      }
    },
    { passive: true },
  );

  document.addEventListener("touchend", () => clearTimeout(longPressTimer));
  document.addEventListener("touchmove", () => clearTimeout(longPressTimer));

  // 3. Botão direito
  document.addEventListener("contextmenu", (e) => {
    const item = e.target.closest(".template-item");
    if (item) {
      e.preventDefault();
      const id = item.querySelector(".card-dots").dataset.templateId;
      openMenu(id);
    }
  });

  // 4. Arrastar para fechar (Mobile)
  let startY = 0;
  dragger.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
  });
  dragger.addEventListener("touchmove", (e) => {
    let deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) sheet.style.transform = `translateY(${deltaY}px)`;
  });
  dragger.addEventListener("touchend", (e) => {
    let deltaY = e.changedTouches[0].clientY - startY;
    if (deltaY > 100) closeMenu();
    else sheet.style.transform = "";
  });

  // 5. Fechar ao clicar em qualquer opção (exceto excluir, se preferir)
  sheet.querySelectorAll(".tmp-opt-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      // Se for o botão de deletar, não fechamos o menu imediatamente
      // para não sumir o confirm() no mobile
      if (!item.classList.contains("tmp-opt-item--delete")) {
        closeMenu();
      }
    });
  });
});
