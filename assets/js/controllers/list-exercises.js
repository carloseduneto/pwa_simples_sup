// Função auxiliar de busca (Fica aqui dentro mesmo, pois só é usada aqui)
function configurarBusca() {
  const searchInput = document.getElementById("search-exercise");
  const container = document.getElementById("lista-exercicios-container");

  // Se não tiver campo de busca ou lista, aborta
  if (!searchInput || !container) return;

  // AJUSTE TÉCNICO: Criamos um elemento para a mensagem para não apagar a lista
  let msgSemResultados = document.getElementById("msg-no-results");
  if (!msgSemResultados) {
    msgSemResultados = document.createElement("div");
    msgSemResultados.id = "msg-no-results";
    msgSemResultados.innerText = "Sem resultados encontrados";
    msgSemResultados.style.textAlign = "center";
    msgSemResultados.style.padding = "20px";
    msgSemResultados.style.width = "100%";
    msgSemResultados.style.display = "none"; // Começa invisível
    container.appendChild(msgSemResultados);
  }

  searchInput.addEventListener("input", (e) => {
    const termo = e.target.value.toLowerCase();
    const itens = container.querySelectorAll(".exercise-item");
    let foundItem = false;

    itens.forEach((item) => {
      // Pega o texto do nome e do grupo dentro do item
      const nome = item
        .querySelector(".exercise-item__name")
        .innerText.toLowerCase();
      const grupo = item
        .querySelector(".exercise-item__group")
        .innerText.toLowerCase();

      // Verifica se o termo digitado existe no nome OU no grupo
      if (nome.includes(termo) || grupo.includes(termo)) {
        item.style.display = "flex"; // Mostra (use 'flex' pois seu CSS original usa flexbox)
        foundItem = true;
      } else {
        item.style.display = "none"; // Esconde
      }
    });

    // MANTIDA SUA LÓGICA, APENAS CORRIGIDO O MÉTODO DE EXIBIÇÃO
    if (foundItem == false) {
      // container.innerHTML = "Sem resultados encontrados" <-- ISSO APAGAVA A LISTA
      msgSemResultados.style.display = "block"; // Agora só mostramos a mensagem
    } else {
      msgSemResultados.style.display = "none"; // Escondemos a mensagem se achou algo
    }
  });
}

// Sua função principal (com a chamada da busca adicionada no final)
async function renderizarListaExercicios() {
  const container = document.getElementById("lista-exercicios-container");
  const template = document.querySelector(".template-exercices-item");

  if (!container || !template) return;

  // --- CORREÇÃO DE OURO: Limpeza Imediata ---
  // Isso mata qualquer dado antigo instantaneamente antes do 'await'

  // container.innerHTML =
  // '<p style="text-align:center; padding: 20px;">Carregando...</p>';

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const exercicios = await ExerciseService.getAll();

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
            await ExerciseService.delete(exercicio.id);
            renderizarListaExercicios();
          } catch (err) {
            alert("Erro ao excluir: " + err.message);
          }
        }
      };

      container.appendChild(clone);
    });

    // --- NOVA CHAMADA: Ativa a busca depois de criar os elementos na tela ---
    configurarBusca();
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar lista.</p>';
  }
}

// E adicione essa funçãozinha no final do exercises-list.js (fora da função principal)
function irParaCriacao() {
  // REGRA DE OURO: Vai criar? Garanta que não tem lixo antigo.
  localStorage.removeItem("editExerciseId");
  roteador("exercisesAddEdit");
}

// Exponha ela para o HTML (já que estamos usando script global)
window.irParaCriacao = irParaCriacao;
