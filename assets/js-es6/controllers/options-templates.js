import { TemplateService } from "../services/template.service.js"; // Verifique se o caminho e extensão .js estão certos
import { roteador } from "../router.js";
import { abrirTemplate } from "../scriptGeneration.js"; // Certifique-se que exportou isso no Passo 3

// Variável de controle para limpar eventos anteriores se a função for recarregada
let cleanupListeners = null;

export function initTemplateOptions() {
  const sheet = document.querySelector(".templates-options-container");
  const backdrop = document.querySelector(".templates-backdrop");
  const dragger = document.querySelector(".tmp-opt-dragger-place");

  // Se os elementos não existirem na página (ex: tela de login), sai da função.
  if (!sheet || !dragger) return;

  // 1. Limpeza de eventos anteriores (Evita "Event Stacking")
  if (cleanupListeners) {
    cleanupListeners();
    cleanupListeners = null;
  }

  // --- VARIÁVEIS DE ESTADO ---
  let currentTemplateId = null;
  let longPressTimer;

  // --- FUNÇÕES AUXILIARES ---
  const openMenu = (id) => {
    // Lógica visual dos botões (Ativar/Inativar)
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
        text.style.color = "#000000";
      }
    }

    currentTemplateId = id;
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

  // --- CONFIGURAÇÃO DOS BOTÕES DO MENU (Listeners Locais) ---
  // Esses listeners estão no elemento 'sheet', que é fixo, então podemos usar onclick ou addEventListener simples.

  // Excluir
  const btnDeleteTemplate = sheet.querySelector(".tmp-opt-item--delete");
  if (btnDeleteTemplate) {
    btnDeleteTemplate.onclick = async () => {
      if (!currentTemplateId) return;
      if (!confirm("Deseja realmente excluir este template?")) return;
      try {
        await TemplateService.delete(currentTemplateId);
        location.reload();
      } catch (err) {
        alert(`Erro ao excluir: ${err.message}`);
      }
    };
  }

  // Editar
  const btnEditTemplate = sheet.querySelector(
    ".tmp-opt-item[onclick*='templateForm']",
  );
  if (btnEditTemplate) {
    btnEditTemplate.removeAttribute("onclick");
    btnEditTemplate.onclick = () => {
      if (currentTemplateId) {
        localStorage.setItem("editTemplateId", currentTemplateId);
        closeMenu();
        roteador("templateForm");
        // if (onNavigate) onNavigate("templateForm");
      }
    };
  }

  // Desativar/Ativar
  const btnDisableTemplate = sheet.querySelector(".tmp-opt-item--deactive");
  if (btnDisableTemplate) {
    btnDisableTemplate.onclick = async () => {
      if (!currentTemplateId) return;
      const isModoInativo =
        typeof window.EXIBINDO_INATIVOS !== "undefined" &&
        window.EXIBINDO_INATIVOS;
      const novoStatus = isModoInativo ? "active" : "inactive";
      const acaoTexto = isModoInativo ? "ativar" : "desativar";

      if (!confirm(`Deseja realmente ${acaoTexto} este template?`)) return;

      try {
        await TemplateService.updateStatus(currentTemplateId, novoStatus);
        location.reload();
      } catch (err) {
        alert(`Erro ao atualizar: ${err.message}`);
      }
    };
  }

  // Botões de Ação Rápida (Sessão / Itens) - Verificando se existem na DOM
  const btnSession = document.getElementById("start-session");
  if (btnSession) {
    // Remove listener antigo clonando o nó ou apenas sobrescrevendo onclick (mais simples p/ migração)
    btnSession.onclick = () => abrirTemplate(currentTemplateId);
  }

  const btnItensTemplate = document.getElementById("template-itens");
  if (btnItensTemplate) {
    btnItensTemplate.onclick = () => {
      if (currentTemplateId) {
        const idSalvo = currentTemplateId;
        closeMenu();
        // if (onNavigate) onNavigate("templateItens", idSalvo);
        roteador("templateItens", idSalvo);
      }
    };
  }

  // Fechar ao clicar nas opções (exceto delete)
  sheet.querySelectorAll(".tmp-opt-item").forEach((item) => {
    item.onclick = () => {
      if (!item.classList.contains("tmp-opt-item--delete")) closeMenu();
    };
  });

  // --- LISTENERS GLOBAIS (DOCUMENT) ---
  // Aqui está a correção principal. Definimos as funções para poder adicionar e remover.

  const handleGlobalClick = (e) => {
    const btn = e.target.closest(".card-dots");
    if (btn) {
      e.stopPropagation();
      openMenu(btn.dataset.templateId);
    }
    if (e.target === backdrop) closeMenu();
  };

  const handleTouchStart = (e) => {
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

  const handleContextMenu = (e) => {
    const item = e.target.closest(".template-item");
    if (item) {
      e.preventDefault();
      const id = item.querySelector(".card-dots").dataset.templateId;
      openMenu(id);
    }
  };

  // Adiciona os eventos
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchend", handleTouchEnd);
  document.addEventListener("touchmove", handleTouchEnd);
  document.addEventListener("contextmenu", handleContextMenu);

  // Lógica do Dragger (Mobile)
  let startY = 0;
  const handleDragStart = (e) => {
    startY = e.touches[0].clientY;
  };
  const handleDragMove = (e) => {
    let deltaY = e.touches[0].clientY - startY;
    if (deltaY > 0) sheet.style.transform = `translateY(${deltaY}px)`;
  };
  const handleDragEnd = (e) => {
    let deltaY = e.changedTouches[0].clientY - startY;
    if (deltaY > 100) closeMenu();
    else sheet.style.transform = "";
  };

  dragger.addEventListener("touchstart", handleDragStart);
  dragger.addEventListener("touchmove", handleDragMove);
  dragger.addEventListener("touchend", handleDragEnd);

  // 2. Define a função de limpeza para a próxima execução
  cleanupListeners = () => {
    document.removeEventListener("click", handleGlobalClick);
    document.removeEventListener("touchstart", handleTouchStart);
    document.removeEventListener("touchend", handleTouchEnd);
    document.removeEventListener("touchmove", handleTouchEnd);
    document.removeEventListener("contextmenu", handleContextMenu);

    dragger.removeEventListener("touchstart", handleDragStart);
    dragger.removeEventListener("touchmove", handleDragMove);
    dragger.removeEventListener("touchend", handleDragEnd);
  };

  // 3. Ponte para HTML legado (se necessário)
  window.openTemplateOptions = openMenu;
}
