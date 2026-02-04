// 1. Variável Global para controlar o "Fiscal" e o Estado
let meuSortable = null;
let ESTA_REORDENANDO = false; // Nosso "interruptor"

// Sua função principal (com a chamada da busca adicionada no final)
async function renderizarListItensTemplate(currentTemplateId) {
  // 1. TRAVA DE SEGURANÇA: Se o ID for nulo, indefinido ou "null", pare tudo.
  if (!currentTemplateId || currentTemplateId === "null") {
    console.warn("Tentativa de carregar itens sem ID de template válido.");
    return;
  }

  // --- CÓDIGO NOVO: VINCULAR O BOTÃO PLAY ---
  // A lógica é: O Router me deu o ID, então eu dou o ID para o botão.
  const btnStart = document.getElementById("btn-start-internal");

  if (btnStart) {
    btnStart.onclick = () => {
      // Reutiliza a mesma função que o menu de 3 pontinhos usa
      if (typeof abrirTemplate === "function") {
        console.log("Iniciando treino pelo botão interno:", currentTemplateId);
        abrirTemplate(currentTemplateId);
      } else {
        console.error(
          "Função abrirTemplate não encontrada (verifique se ela é global)",
        );
      }
    };
  }

  const container = document.getElementById("itens-template-container");
  const template = document.querySelector(".template-template-list-item");

  // RESET DO ESTADO: Sempre que entrar na tela, começa no modo normal
  ESTA_REORDENANDO = false;
  configurarBotaoReordenar(currentTemplateId); // <--- NOVA FUNÇÃO AQUI

  if (!container || !template) return;

  // --- CORREÇÃO DE OURO: Limpeza Imediata ---
  // Isso mata qualquer dado antigo instantaneamente antes do 'await'

  // container.innerHTML =
  // '<p style="text-align:center; padding: 20px;">Carregando...</p>';

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const exercicios = await TemplateItensService.getByid(currentTemplateId);

    console.log("Exercícios do template:", exercicios);
    container.innerHTML = "";

    if (!exercicios || exercicios.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; opacity: 0.6;">Nenhum exercício cadastrado.</p>';
      return;
    }

    exercicios.forEach((exercicio) => {
      const clone = template.content.cloneNode(true);

      // --- NOVO: IDENTIFICAR O ITEM PARA O SORTABLE ---
      // Pegamos a div principal do card
      const cardPrincipal = clone.querySelector(".exercise-item");
      // "Tatuamos" o ID do item nela. O Sortable vai ler isso depois.
      cardPrincipal.dataset.id = exercicio.id;
      // -----------------------------------------------

      const nomeEl = clone.querySelector(".exercise-item__name");
      const grupoEl = clone.querySelector(".exercise-item__group");

      nomeEl.innerText = exercicio.exercicios.nome;
      grupoEl.innerText =
        exercicio.exercicios.grupo_muscular?.nome || "Sem grupo";

      // --- Botão Editar ---
      const btnEdit = clone.querySelector(".exercise-item__btn--edit");
      btnEdit.dataset.id = exercicio.id;

      btnEdit.onclick = () => {
        // 1. A chave correta é 'editTemplateItem' (o formulário espera essa)
        localStorage.setItem("editTemplateItem", exercicio.id);

        // 2. A rota correta é 'templateItensForm'
        roteador("templateItensForm");
      };

      // --- Botão Excluir ---
      const btnDelete = clone.querySelector(".exercise-item__btn--delete");
      btnDelete.dataset.id = exercicio.id;

      btnDelete.onclick = async () => {
        // O nome está dentro do objeto aninhado 'exercicios'
        const confirmacao = confirm(
          `Deseja realmente excluir "${exercicio.exercicios.nome}"?`,
        );
        if (confirmacao) {
          try {
            await TemplateItensService.delete(exercicio.id);
            // Recarrega a própria lista
            renderizarListItensTemplate(currentTemplateId);
          } catch (err) {
            alert("Erro ao excluir: " + err.message);
          }
        }
      };

      container.appendChild(clone);
    });

    // --- A MÁGICA DO SORTABLE COMEÇA AQUI ---
    initSortable(container);
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar lista.</p>';
  }
}

// --- FUNÇÃO 1: CONFIGURAR O BOTÃO DO HEADER ---
function configurarBotaoReordenar(templateId) {
  const btnReorder = document.getElementById("template-itens-reorder");

  // Se o botão não existir (ex: header errado), sai fora
  if (!btnReorder) return;

  // Reseta visual do botão para "Reordenar"
  atualizarVisualBotaoHeader(false);

  btnReorder.onclick = async () => {
    if (!ESTA_REORDENANDO) {
      // FASE 1: Entrar no modo Reordenar
      alternarModoVisual(true);
      ESTA_REORDENANDO = true;
    } else {
      // FASE 2: Salvar e Sair
      await salvarNovaOrdem();
      // Só sai do modo se der tudo certo (o salvarNovaOrdem cuida dos erros)
    }
  };
}

// --- FUNÇÃO 2: A MÁGICA VISUAL (ESCONDE/MOSTRA) ---
function alternarModoVisual(ativo) {
  const container = document.getElementById("screen-template-itens");
  const btnReorder = document.getElementById("template-itens-reorder");

  // 1. Alterna o botão do Header
  atualizarVisualBotaoHeader(ativo);

  // 2. Alterna os botões de cada card
  // Seleciona tudo de uma vez
  const editBtns = container.querySelectorAll(".exercise-item__btn--edit");
  const delBtns = container.querySelectorAll(".exercise-item__btn--delete");
  const dragBtns = container.querySelectorAll(".exercise-item__btn--drag");
  const addBtn = container.querySelectorAll(".primary-button--add-center");
  const startBtn = container.querySelectorAll(".primary-button--start");
  const CancelBtn = container.querySelectorAll(".default-form-button--cancel");

  if (ativo) {
    // MODO REORDENAR: Some Edit/Delete, Aparece Drag
    editBtns.forEach((b) => b.classList.add("hidden"));
    delBtns.forEach((b) => b.classList.add("hidden"));
    dragBtns.forEach((b) => b.classList.remove("hidden"));
    CancelBtn.forEach((b) => b.classList.remove("hidden"));
    addBtn.forEach((b) => b.classList.add("hidden"));
    startBtn.forEach((b) => b.classList.add("hidden"));
  } else {
    // MODO NORMAL: Aparece Edit/Delete, Some Drag
    editBtns.forEach((b) => b.classList.remove("hidden"));
    delBtns.forEach((b) => b.classList.remove("hidden"));
    dragBtns.forEach((b) => b.classList.add("hidden"));
    CancelBtn.forEach((b) => b.classList.add("hidden"));
    addBtn.forEach((b) => b.classList.remove("hidden"));
    startBtn.forEach((b) => b.classList.remove("hidden"));
  }
}

// --- FUNÇÃO 3: ATUALIZA O CABEÇALHO ---
function atualizarVisualBotaoHeader(ativo) {
  const btnReorder = document.getElementById("template-itens-reorder");
  if (!btnReorder) return;

  const icon = btnReorder.querySelector(".material-symbols-rounded");
  const text = btnReorder.querySelector(".btn-text-header");

  if (ativo) {
    // Virou botão SALVAR
    icon.innerText = "check";
    text.innerText = "Salvar";
    icon.classList.remove("rotate180"); // Remove rotação se tiver
    icon.style.color = "#FF6B00"; // Laranja destaque
    text.style.color = "#FF6B00";
  } else {
    // Virou botão REORDENAR
    icon.innerText = "low_priority";
    text.innerText = "Reordenar";
    icon.classList.add("rotate180");
    icon.style.color = ""; // Volta ao padrão
    text.style.color = "";
  }
}

// --- FUNÇÃO 4: SALVAR NO BANCO ---
async function salvarNovaOrdem() {
  if (!meuSortable) return;

  const btnReorder = document.getElementById("template-itens-reorder");
  const icon = btnReorder.querySelector(".material-symbols-rounded");

  try {
    // Feedback visual de carregando
    icon.innerText = "hourglass_empty";

    // Pega a lista de IDs na nova ordem
    const novaOrdemIds = meuSortable.toArray();
    console.log("Salvando ordem:", novaOrdemIds);

    // Chama o serviço
    await TemplateItensService.updateOrderBatch(novaOrdemIds);

    // Sucesso: Volta ao normal
    alternarModoVisual(false);
    ESTA_REORDENANDO = false;
  } catch (err) {
    alert("Erro ao salvar ordem: " + err.message);
    // Se der erro, volta o ícone para check para ele tentar de novo
    icon.innerText = "check";
  }
}

function cancelarReordenacao() {
  if (!ESTA_REORDENANDO) return;
  // Volta ao modo normal sem salvar
  alternarModoVisual(false);
  ESTA_REORDENANDO = false;
  // Recarrega a lista para desfazer mudanças visuais
  const currentTemplateId = localStorage.getItem("currentTemplateId");
  renderizarListItensTemplate(currentTemplateId);
}

// --- FUNÇÃO 5: INICIALIZA O SORTABLE ---
function initSortable(elementoLista) {
  if (typeof Sortable === "undefined") return;

  // Destroi anterior se existir para não duplicar
  if (meuSortable) meuSortable.destroy();

  meuSortable = new Sortable(elementoLista, {
    animation: 150,
    handle: ".drag-handle", // Só arrasta pelo ícone
    // Importante: Removi o onEnd automático.
    // Agora só salvamos quando clica no botão do header!
  });
}

// Função para o botão de Adicionar
function adicionarItemTemplate() {
  // <--- Renomeado para bater com o HTML
  // Pegamos o ID do template atual da URL ou de onde salvamos
  // Como o roteador não salva estado global, idealmente salvamos no localStorage ao entrar na tela
  // Mas para simplificar, vamos assumir que você tem acesso ao ID.

  // DICA: O botão "Adicionar" precisa saber qual é o Template Pai.
  // Vamos garantir que limpamos a edição, mas precisamos passar o ID do template pai
  // para a tela de adicionar, senão ele cria um item órfão.

  localStorage.removeItem("editTemplateItem");

  // Aqui tem um pulo do gato: Para adicionar um item, você vai para a tela de exercícios?
  // Se sim, o roteador("exercisesAddEdit") precisa saber que é para esse template.
  // Sugestão: salvar o ID do template no localStorage quando a tela carrega.
  roteador("templateItensForm");
}

// --- FUNÇÃO AUXILIAR PARA LIGAR O SORTABLE ---
// function initSortable(elementoLista) {
//   // Verifica se a biblioteca carregou
//   if (typeof Sortable === "undefined") return;

//   // Cria a instância (o "fiscal")
//   new Sortable(elementoLista, {
//     animation: 250, // Animação suave ao mover (ms)
//     handle: ".drag-handle", // SÓ arrasta se clicar no ícone de 3 risquinhos
//     ghostClass: "sortable-ghost", // Classe css visual enquanto arrasta (opcional)

//     // EVENTO: Dispara quando o usuário solta o item
//     onEnd: async function (evt) {
//       console.log("Item movido!");

//       // 1. Pega a nova ordem dos IDs baseada no HTML atual
//       // O toArray() lê aqueles dataset.id que colocamos no cardPrincipal
//       const novaOrdemIds = this.toArray();

//       console.log("Nova ordem:", novaOrdemIds);

//       // 2. Chama o serviço para salvar no banco
//       try {
//         await TemplateItensService.updateOrderBatch(novaOrdemIds);
//         console.log("Ordem salva com sucesso!");
//       } catch (err) {
//         alert("Erro ao salvar nova ordem.");
//         console.error(err);
//       }
//     },
//   });
// }

// Exponha ela para o HTML com o nome correto
window.adicionarItemTemplate = adicionarItemTemplate;

// PEQUENO TRUQUE: Salvar o ID globalmente quando renderizar
const renderizarOriginal = renderizarListItensTemplate;
renderizarListItensTemplate = async (id) => {
  localStorage.setItem("currentTemplateId", id); // Salva para usar no botão adicionar
  await renderizarOriginal(id);
};
