document.addEventListener("DOMContentLoaded", () => {
  const sheet = document.querySelector(".templates-options-container");
  const backdrop = document.querySelector(".templates-backdrop");
  const dragger = document.querySelector(".tmp-opt-dragger-place");
  let currentTemplateId = null;
  let longPressTimer;

  // --- FUNÇÕES DE CONTROLE ---

  const openMenu = (id) => {
    currentTemplateId = id;
    console.log("Editando template ID:", currentTemplateId); // Aqui você tem o ID

    sheet.classList.add("active");
    backdrop.classList.add("active");
    document.body.classList.add("modal-open");
  };

  const closeMenu = () => {
    sheet.classList.remove("active");
    backdrop.classList.remove("active");
    document.body.classList.remove("modal-open");
    currentTemplateId = null;
  };

  // --- EVENTOS ---

  // 1. Clique nos três pontinhos (Delegação de evento)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".card-dots");
    if (btn) {
      e.stopPropagation();
      openMenu(btn.dataset.templateId);
    }

    // Fechar ao clicar fora (no backdrop)
    if (e.target === backdrop) closeMenu();
  });

  // 2. Toque Longo e Botão Direito
  document.addEventListener(
    "touchstart",
    (e) => {
      const item = e.target.closest(".template-item");
      if (item) {
        const id = item.querySelector(".card-dots").dataset.templateId;
        longPressTimer = setTimeout(() => openMenu(id), 600);
      }
    },
    { passive: true },
  );

  document.addEventListener("touchend", () => clearTimeout(longPressTimer));
  document.addEventListener("touchmove", () => clearTimeout(longPressTimer));

  // Botão direito (Context Menu)
  document.addEventListener("contextmenu", (e) => {
    const item = e.target.closest(".template-item");
    if (item) {
      e.preventDefault();
      const id = item.querySelector(".card-dots").dataset.templateId;
      openMenu(id);
    }
  });

  // 3. Arrastar para baixo para fechar (Mobile)
  let startY = 0;
  dragger.addEventListener("touchstart", (e) => {
    startY = e.touches[0].clientY;
  });
  dragger.addEventListener("touchmove", (e) => {
    let deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) {
      sheet.style.transform = `translateY(${deltaY}px)`;
    }
  });
  dragger.addEventListener("touchend", (e) => {
    let deltaY = e.changedTouches[0].clientY - startY;
    sheet.style.transform = ""; // Reseta para o CSS controlar
    if (deltaY > 100) closeMenu();
  });

  // 4. Fechar ao clicar em uma opção
  sheet.querySelectorAll(".tmp-opt-item").forEach((item) => {
    item.addEventListener("click", () => {
      // Aqui você executaria a ação baseada no currentTemplateId
      const acao = item.querySelector("span:last-child").innerText;
      console.log(`Ação: ${acao} no ID: ${currentTemplateId}`);
      closeMenu();
    });
  });
});
