import { GlobalLoader } from "../ui-ux/global-loader.js";
import { TemplateItensService } from "../services/itens-template.service.js";
// REMOVIDO: import { abrirTemplate } ... (Dependência morta)

// --- ESTADO LOCAL DO MÓDULO ---
let sortableInstance = null;
let isReordering = false;

// --- FUNÇÕES AUXILIARES DE UI ---
function toggleReorderUI(isActive, container) {
  const btnReorder = document.getElementById("template-itens-reorder");

  // Seleciona botões internos
  const editBtns = container.querySelectorAll(".exercise-item__btn--edit");
  const delBtns = container.querySelectorAll(".exercise-item__btn--delete");
  const dragHandles = container.querySelectorAll(".exercise-item__btn--drag");

  // Botões de ação flutuantes/fixos
  const btnAdd = document.querySelector(".primary-button--add-center");
  const btnStart = document.getElementById("btn-start-internal");

  if (isActive) {
    // MODO REORDENAR ATIVO
    container.classList.add("reordering-mode");
    editBtns.forEach(b => b.classList.add("hidden"));
    delBtns.forEach(b => b.classList.add("hidden"));
    dragHandles.forEach(b => b.classList.remove("hidden"));

    if (btnAdd) btnAdd.classList.add("hidden");
    if (btnStart) btnStart.classList.add("hidden");

    // Atualiza botão do Header
    if (btnReorder) {
      const icon = btnReorder.querySelector(".material-symbols-rounded");
      const text = btnReorder.querySelector(".btn-text-header");
      if (icon) {
        icon.innerText = "check";
        icon.style.color = "#FF6B00";
      }
      if (text) {
        text.innerText = "Salvar";
        text.style.color = "#FF6B00";
      }
    }
  } else {
    // MODO NORMAL
    container.classList.remove("reordering-mode");
    editBtns.forEach(b => b.classList.remove("hidden"));
    delBtns.forEach(b => b.classList.remove("hidden"));
    dragHandles.forEach(b => b.classList.add("hidden"));

    if (btnAdd) btnAdd.classList.remove("hidden");
    if (btnStart) btnStart.classList.remove("hidden");

    // Atualiza botão do Header
    if (btnReorder) {
      const icon = btnReorder.querySelector(".material-symbols-rounded");
      const text = btnReorder.querySelector(".btn-text-header");
      if (icon) {
        icon.innerText = "low_priority";
        icon.style.color = "";
      }
      if (text) {
        text.innerText = "Reordenar";
        text.style.color = "";
      }
    }
  }
}

// --- FUNÇÃO PRINCIPAL ---
export async function renderizarListItensTemplate(onNavigate) {
  // 1. Recupera o ID (O Router deve ter salvo no localStorage antes de chamar aqui)
  const currentTemplateId = localStorage.getItem("currentTemplateId");

  if (!currentTemplateId) {
    console.warn("Sem ID de template para listar itens.");
    if (onNavigate) onNavigate("templates");
    return;
  }

  const container = document.getElementById("itens-template-container");
  const template = document.getElementById("template-template-list-item");
  const btnStart = document.getElementById("btn-start-internal");
  const btnReorder = document.getElementById("template-itens-reorder");
  const btnAdd = document.getElementById("btn-add-item-template");

  // --- CONFIGURAÇÃO DE EVENTOS FIXOS ---

  // Botão START (ONDE ESTAVA O PROBLEMA)
  if (btnStart) {
    btnStart.onclick = () => {
      // CORREÇÃO: Usamos o onNavigate para ir para a tela de detalhes (Player)
      if (onNavigate) {
        onNavigate("detalhes", currentTemplateId);
      } else {
        console.error("Navegação não disponível.");
      }
    };
  }

  // Botão ADICIONAR ITEM
  if (btnAdd) {
    btnAdd.removeAttribute("onclick");
    btnAdd.onclick = () => {
      localStorage.removeItem("editTemplateItem");
      if (onNavigate) onNavigate("templateItensForm");
    };
  }

  // Botão REORDENAR (Header)
  if (btnReorder) {
    toggleReorderUI(false, container);
    isReordering = false;

    const novoBtn = btnReorder.cloneNode(true);
    btnReorder.parentNode.replaceChild(novoBtn, btnReorder);

    novoBtn.onclick = async () => {
      if (!isReordering) {
        // Ativa modo
        isReordering = true;
        toggleReorderUI(true, container);

        if (sortableInstance) sortableInstance.destroy();
        if (typeof Sortable !== "undefined") {
          sortableInstance = new Sortable(container, {
            handle: ".drag-handle",
            animation: 150,
          });
        }
      } else {
        // Salvar
        try {
          const icon = novoBtn.querySelector(".material-symbols-rounded");
          if (icon) icon.innerText = "hourglass_empty";

          const novaOrdemIds = sortableInstance.toArray();
          await TemplateItensService.updateOrderBatch(novaOrdemIds);

          isReordering = false;
          toggleReorderUI(false, container);
          if (sortableInstance) sortableInstance.destroy();
        } catch (err) {
          alert("Erro ao salvar ordem: " + err.message);
          toggleReorderUI(true, container);
        }
      }
    };
  }

  // --- CARREGAMENTO DA LISTA ---
  if (!container || !template) return;

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const itens = await TemplateItensService.getByid(currentTemplateId);
    container.innerHTML = "";

    if (!itens || itens.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; opacity:0.6; padding:20px;">Nenhum exercício neste treino.</p>';
      return;
    }

    itens.forEach(item => {
      const clone = template.content
        ? template.content.cloneNode(true)
        : template.cloneNode(true);

      const cardDiv = clone.querySelector(".exercise-item");
      if (cardDiv) cardDiv.dataset.id = item.id;

      const nomeEl = clone.querySelector(".exercise-item__name");
      const grupoEl = clone.querySelector(".exercise-item__group");

      if (nomeEl) nomeEl.innerText = item.exercicios?.nome || "Exercicio";
      if (grupoEl)
        grupoEl.innerText = item.exercicios?.grupo_muscular?.nome || "";

      // Botão Editar
      const btnEdit = clone.querySelector(".exercise-item__btn--edit");
      if (btnEdit) {
        btnEdit.onclick = () => {
          localStorage.setItem("editTemplateItem", item.id);
          if (onNavigate) onNavigate("templateItensForm");
        };
      }

      // Botão Excluir
      const btnDelete = clone.querySelector(".exercise-item__btn--delete");
      if (btnDelete) {
        btnDelete.onclick = async () => {
          if (confirm("Remover este exercício do treino?")) {
            try {
              await TemplateItensService.delete(item.id);
              // Recarrega a tela passando onNavigate novamente
              renderizarListItensTemplate(onNavigate);
            } catch (e) {
              alert("Erro: " + e.message);
            }
          }
        };
      }

      container.appendChild(clone);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar.</p>';
  }
}
