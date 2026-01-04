//TODO Refatorar para usar funções reutilizáveis

document.addEventListener("input", function (event) {
  if (event.target.classList.contains("kgExercise")) {
    const inputAtual = event.target;
    const valorDigitado = inputAtual.value;
    const container = inputAtual.closest(".container-exercicio");

    // Se o usuário está digitando neste campo, ele deixa de ser "automático"
    // Isso impede que ele seja sobrescrito se alguém editar o de cima depois
    inputAtual.dataset.auto = "false";

    if (!container) return;

    const todosInputs = container.querySelectorAll(".kgExercise");
    let encontrouOAtual = false;

    for (const input of todosInputs) {
      if (input === inputAtual) {
        encontrouOAtual = true;
        continue;
      }

      if (encontrouOAtual) {
        // A MÁGICA: Preenche se estiver vazio OU se já foi preenchido automaticamente antes
        const foiPreenchidoPeloRobo = input.dataset.auto === "true";
        const estaVazio = input.value === "";

        if (estaVazio || foiPreenchidoPeloRobo) {
          input.value = valorDigitado;
          input.dataset.auto = "true"; // Marca que foi o robô que fez
        }
      }
    }
  }
});

document.addEventListener("input", function (event) {
  if (event.target.classList.contains("repsExercise")) {
    const inputAtual = event.target;
    const valorDigitado = inputAtual.value;
    const container = inputAtual.closest(".container-exercicio");

    // Se o usuário está digitando neste campo, ele deixa de ser "automático"
    // Isso impede que ele seja sobrescrito se alguém editar o de cima depois
    inputAtual.dataset.auto = "false";

    if (!container) return;

    const todosInputs = container.querySelectorAll(".repsExercise");
    let encontrouOAtual = false;

    for (const input of todosInputs) {
      if (input === inputAtual) {
        encontrouOAtual = true;
        continue;
      }

      if (encontrouOAtual) {
        // A MÁGICA: Preenche se estiver vazio OU se já foi preenchido automaticamente antes
        const foiPreenchidoPeloRobo = input.dataset.auto === "true";
        const estaVazio = input.value === "";

        if (estaVazio || foiPreenchidoPeloRobo) {
          input.value = valorDigitado;
          input.dataset.auto = "true"; // Marca que foi o robô que fez
        }
      }
    }
  }
});

// PARTE 2: Selecionar tudo ao clicar (Focus)
// Usamos 'focusin' porque 'focus' não propaga (bubble) para o document
document.addEventListener("focusin", function (event) {
  // Lista de classes que devem selecionar tudo ao clicar
  if (event.target.matches(".kgExercise, .repsExercise, .seriesExercise")) {
    event.target.select();
  }
});
