// Sua função principal (com a chamada da busca adicionada no final)
async function renderizarListItensTemplate(currentTemplateId) {
  // 1. TRAVA DE SEGURANÇA: Se o ID for nulo, indefinido ou "null", pare tudo.
  if (!currentTemplateId || currentTemplateId === "null") {
    console.warn("Tentativa de carregar itens sem ID de template válido.");
    return;
  }
  
  const container = document.getElementById("itens-template-container");
  const template = document.querySelector(".template-template-list-item");

  if (!container || !template) return;

  // --- CORREÇÃO DE OURO: Limpeza Imediata ---
  // Isso mata qualquer dado antigo instantaneamente antes do 'await'

  // container.innerHTML =
  // '<p style="text-align:center; padding: 20px;">Carregando...</p>';

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const exercicios = await TemplateItensService.getByid(currentTemplateId);

    container.innerHTML = "";

    if (!exercicios || exercicios.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; opacity: 0.6;">Nenhum exercício cadastrado.</p>';
      return;
    }

    exercicios.forEach((exercicio) => {
      const clone = template.content.cloneNode(true);

      const nomeEl = clone.querySelector(".exercise-item__name");
      const grupoEl = clone.querySelector(".exercise-item__group");

      nomeEl.innerText = exercicio.nome;
      grupoEl.innerText = exercicio.grupos_musculares?.nome || "Sem grupo";

      // --- Botão Editar ---
      const btnEdit = clone.querySelector(".exercise-item__btn--edit");
      btnEdit.dataset.id = exercicio.id;

      btnEdit.onclick = () => {
        localStorage.setItem("editExerciseId", exercicio.id);
        roteador("exercisesAddEdit");
      };

      // --- Botão Excluir ---
      const btnDelete = clone.querySelector(".exercise-item__btn--delete");
      btnDelete.dataset.id = exercicio.id;

      btnDelete.onclick = async () => {
        const confirmacao = confirm(
          `Deseja realmente excluir "${exercicio.nome}"?`,
        );
        if (confirmacao) {
          try {
            await TemplateItensService.delete(exercicio.id);
            renderizarListaExercicios();
          } catch (err) {
            alert("Erro ao excluir: " + err.message);
          }
        }
      };

      container.appendChild(clone);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar lista.</p>';
  }
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
  roteador("exercisesAddEdit");
}

// Exponha ela para o HTML com o nome correto
window.adicionarItemTemplate = adicionarItemTemplate;

// PEQUENO TRUQUE: Salvar o ID globalmente quando renderizar
const renderizarOriginal = renderizarListItensTemplate;
renderizarListItensTemplate = async (id) => {
  localStorage.setItem("currentTemplateId", id); // Salva para usar no botão adicionar
  await renderizarOriginal(id);
};
