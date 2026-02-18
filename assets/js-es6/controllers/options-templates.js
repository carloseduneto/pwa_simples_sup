import { TemplateService } from "../services/template.service.js";
import { roteador } from "../router.js";

let cleanupListeners = null;

export function initTemplateOptions() {
  const sheet = document.querySelector(".templates-options-container");
  const backdrop = document.querySelector(".templates-backdrop");
  const dragger = document.querySelector(".tmp-opt-dragger-place");

  if (!sheet || !dragger) return;

  if (cleanupListeners) {
    cleanupListeners();
    cleanupListeners = null;
  }

  // --- ESTADO ---
  let currentTemplateId = null;
  let longPressTimer;

  // --- FUNÇÕES VISUAIS ---
  const openMenu = id => {
    currentTemplateId = id;

    // Atualiza visual do botão Inativar/Ativar
    const isModoInativo =
      typeof window.EXIBINDO_INATIVOS !== "undefined" &&
      window.EXIBINDO_INATIVOS;
    const btnStatus = sheet.querySelector(".tmp-opt-item--deactive");

    if (btnStatus) {
      const icon = btnStatus.querySelector(".material-symbols-rounded");
      const text = btnStatus.querySelector("span:last-child");
      if (isModoInativo) {
        icon.innerText = "check";
        text.innerText = "Ativar";
        icon.style.color = "#FF6B00";
        text.style.color = "#FF6B00";
      } else {
        icon.innerText = "block";
        text.innerText = "Inativar";
        icon.style.color = "";
        text.style.color = "";
      }
    }

    sheet.classList.add("active");
    backdrop.classList.add("active");
    document.body.classList.add("modal-open");
  };

  const closeMenu = () => {
    sheet.classList.remove("active");
    backdrop.classList.remove("active");
    document.body.classList.remove("modal-open");
    sheet.style.transform = "";
    currentTemplateId = null;
  };

  // --- GERENCIADOR DE CLIQUES DO MENU (DELEGAÇÃO) ---
  const handleMenuClick = async e => {
    // Procura qual botão foi clicado (subindo a árvore DOM se clicar no ícone)
    const item = e.target.closest(".tmp-opt-item");

    if (!item) return; // Clicou no vazio do menu

    // 1. INICIAR TREINO (ID: start-session)
    if (item.id === "start-session") {
      if (currentTemplateId) {
        roteador("detalhes", currentTemplateId);
        closeMenu();
      }
    }

    // 2. VER ITENS (ID: template-itens)
    else if (item.id === "template-itens") {
      if (currentTemplateId) {
        const idSalvo = currentTemplateId; // Salva antes de fechar e limpar
        closeMenu();
        roteador("templateItens", idSalvo);
      }
    }

    // 3. EDITAR (data-route="templateForm")
    else if (item.dataset.route === "templateForm") {
      if (currentTemplateId) {
        localStorage.setItem("editTemplateId", currentTemplateId);
        closeMenu();
        roteador("templateForm");
      }
    }

    // 4. ATIVAR/INATIVAR (Classe: tmp-opt-item--deactive)
    else if (item.classList.contains("tmp-opt-item--deactive")) {
      if (!currentTemplateId) return;

      const isModoInativo =
        typeof window.EXIBINDO_INATIVOS !== "undefined" &&
        window.EXIBINDO_INATIVOS;
      const novoStatus = isModoInativo ? "active" : "inactive";
      const acao = isModoInativo ? "ativar" : "desativar";

      if (confirm(`Deseja realmente ${acao} este template?`)) {
        try {
          await TemplateService.updateStatus(currentTemplateId, novoStatus);
          location.reload();
        } catch (err) {
          alert(`Erro: ${err.message}`);
        }
      }
    }

    // 5. EXCLUIR (Classe: tmp-opt-item--delete)
    else if (item.classList.contains("tmp-opt-item--delete")) {
      if (!currentTemplateId) return;
      if (confirm("Deseja realmente excluir este template?")) {
        try {
          await TemplateService.delete(currentTemplateId);
          location.reload();
        } catch (err) {
          alert(`Erro: ${err.message}`);
        }
      }
    }

    // Se for botão comum (não delete/status), fecha o menu
    // (Opcional, pois a maioria das ações acima já fecha ou recarrega)
  };

  // --- LISTENERS GLOBAIS ---
  const handleGlobalClick = e => {
    // Abre menu ao clicar nos 3 pontinhos
    const btn = e.target.closest(".card-dots");
    if (btn) {
      e.stopPropagation();
      openMenu(btn.dataset.templateId);
    }
    // Fecha ao clicar fora
    if (e.target === backdrop) closeMenu();
  };

  const handleTouchStart = e => {
    const item = e.target.closest(".template-item");
    if (item) {
      const btn = item.querySelector(".card-dots");
      if (btn) {
        const id = btn.dataset.templateId;
        longPressTimer = setTimeout(() => openMenu(id), 600);
      }
    }
  };

  const handleTouchEnd = () => clearTimeout(longPressTimer);

  const handleContextMenu = e => {
    const item = e.target.closest(".template-item");
    if (item) {
      e.preventDefault();
      const id = item.querySelector(".card-dots").dataset.templateId;
      openMenu(id);
    }
  };

  // --- REGISTRO DE EVENTOS ---

  // 1. O clique principal dentro do menu
  sheet.addEventListener("click", handleMenuClick);

  // 2. Eventos globais (abrir, fechar, longpress)
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd);
  document.addEventListener("touchmove", handleTouchEnd);
  document.addEventListener("contextmenu", handleContextMenu);

  // 3. Dragger (Arrastar para fechar)
  let startY = 0;
  const handleDragStart = e => {
    startY = e.touches[0].clientY;
  };
  const handleDragMove = e => {
    let deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) sheet.style.transform = `translateY(${deltaY}px)`;
  };
  const handleDragEnd = e => {
    let deltaY = e.changedTouches[0].clientY - startY;
    if (deltaY > 100) closeMenu();
    else sheet.style.transform = "";
  };

  dragger.addEventListener("touchstart", handleDragStart);
  dragger.addEventListener("touchmove", handleDragMove);
  dragger.addEventListener("touchend", handleDragEnd);

  // --- LIMPEZA ---
  cleanupListeners = () => {
    sheet.removeEventListener("click", handleMenuClick);
    document.removeEventListener("click", handleGlobalClick);
    document.removeEventListener("touchstart", handleTouchStart);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchmove", handleTouchEnd);
    document.removeEventListener("contextmenu", handleContextMenu);
    dragger.removeEventListener("touchstart", handleDragStart);
    dragger.removeEventListener("touchmove", handleDragMove);
    dragger.removeEventListener("touchend", handleDragEnd);
  };

  window.openTemplateOptions = openMenu;
}
