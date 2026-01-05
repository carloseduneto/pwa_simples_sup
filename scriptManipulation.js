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

// OUVINTE DE CLIQUES (Para os botões de Check)
document.addEventListener("click", function (event) {
  // 1. Verifica se o clique foi no botão de check
  if (event.target.classList.contains("checkExercise")) {
    const botao = event.target;

    // 2. Encontra a linha inteira (o pai do botão)
    const linha = botao.closest(".rowExercise");

    if (linha) {
      // 3. A MÁGICA: 'toggle' adiciona a classe se não tiver, e remove se tiver
      linha.classList.toggle("concluido");

      // 4. LÓGICA DE DADOS (Para você salvar no banco depois)
      // Se tem a classe 'concluido', o atributo vira "true", senão "false"
      const estaConcluido = linha.classList.contains("concluido");
      linha.dataset.realizado = estaConcluido ? "true" : "false";

      // (Opcional) Feedback no Console para você ver acontecendo
      console.log(`Série concluída? ${linha.dataset.realizado}`);
    }
  }
});
