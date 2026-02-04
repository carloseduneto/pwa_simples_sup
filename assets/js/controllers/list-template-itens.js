// Sua função principal (com a chamada da busca adicionada no final)
async function renderizarListItensTemplate(currentTemplateId) {
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

// E adicione essa funçãozinha no final do exercises-list.js (fora da função principal)
function addTemplateItem() {
  // REGRA DE OURO: Vai criar? Garanta que não tem lixo antigo.
  localStorage.removeItem("editTemplateItem");
  roteador("templateItens");
}

// Exponha ela para o HTML (já que estamos usando script global)
window.addTemplateItem = addTemplateItem;
