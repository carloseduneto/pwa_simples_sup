import { WorkoutDraftService } from "../services/workout-draft.service.js";

export function initWorkoutUIHelper() {
  // 1. PROPAGAR VALOR (Automático)
  document.addEventListener("input", event => {
    if (event.target.matches(".kgExercise, .repsExercise")) {
      propagarValor(
        event.target,
        event.target.className.includes("kg") ? "kgExercise" : "repsExercise",
      );
      // Salva rascunho automaticamente
      WorkoutDraftService.salvarInput(event.target);
    }
  });

  // 2. SELECIONAR TUDO AO FOCAR
  document.addEventListener("focusin", event => {
    if (event.target.matches(".kgExercise, .repsExercise, .seriesExercise")) {
      event.target.select();
    }
  });

  // 3. CHECKBOX (Concluir Série)
  document.addEventListener("click", event => {
    const botao = event.target.closest(".checkExercise");
    if (botao) {
      const linha = botao.closest(".rowExercise");
      if (linha) {
        linha.classList.toggle("concluido");
        const estaConcluido = linha.classList.contains("concluido");

        // Animação
        if (estaConcluido) {
          botao.classList.add("animando");
          setTimeout(() => botao.classList.remove("animando"), 600);
        }

        linha.dataset.realizado = estaConcluido ? "true" : "false";

        // Salva status
        WorkoutDraftService.salvarStatus(linha);
      }
    }
  });
}

// --- FUNÇÃO DE PROPAGAÇÃO ---
function propagarValor(inputAtual, classeAlvo) {
  const valor = inputAtual.value;
  const container = inputAtual.closest(".container-exercicio");

  // Marca que este foi editado manualmente
  inputAtual.dataset.auto = "false";

  if (!container) return;

  const inputs = container.querySelectorAll(`.${classeAlvo}`);
  let encontrou = false;

  for (const input of inputs) {
    if (input === inputAtual) {
      encontrou = true;
      continue;
    }

    if (encontrou) {
      // Se tem placeholder (histórico), não mexe
      if (input.placeholder && input.placeholder.trim() !== "") continue;

      // Se está vazio ou foi preenchido por robô antes
      const isAuto = input.dataset.auto === "true";
      if (input.value === "" || isAuto) {
        input.value = valor;
        input.dataset.auto = "true";
        // Importante: Salvar esse input automático no rascunho também!
        WorkoutDraftService.salvarInput(input);
      }
    }
  }
}
