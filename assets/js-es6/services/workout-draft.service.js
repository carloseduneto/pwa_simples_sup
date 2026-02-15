export const WorkoutDraftService = {
  // Gera chave única: treino_cache_{exercicioId}_{linhaIndex}_{tipo}
  gerarChave(exercicioId, linhaIndex, tipo) {
    return `treino_cache_${exercicioId}_${linhaIndex}_${tipo}`;
  },

  salvarInput(input) {
    const row = input.closest(".rowExercise");
    const container = input.closest(".container-exercicio");
    if (!row || !container) return;

    const exercicioId = container.dataset.exercicioId;
    const rows = Array.from(container.querySelectorAll(".rowExercise"));
    const linhaIndex = rows.indexOf(row);

    let tipo = "generic";
    if (input.classList.contains("kgExercise")) tipo = "kgExercise";
    else if (input.classList.contains("repsExercise")) tipo = "repsExercise";
    else if (input.classList.contains("seriesExercise"))
      tipo = "seriesExercise";

    const chave = this.gerarChave(exercicioId, linhaIndex, tipo);
    localStorage.setItem(chave, input.value);
  },

  salvarStatus(row) {
    const container = row.closest(".container-exercicio");
    if (!container) return;

    const exercicioId = container.dataset.exercicioId;
    const rows = Array.from(container.querySelectorAll(".rowExercise"));
    const linhaIndex = rows.indexOf(row);
    const isRealizado = row.classList.contains("concluido");

    const chave = this.gerarChave(exercicioId, linhaIndex, "status");
    localStorage.setItem(chave, isRealizado ? "true" : "false");
  },

  restaurarDados() {
    const containers = document.querySelectorAll(".container-exercicio");

    containers.forEach(container => {
      const exercicioId = container.dataset.exercicioId;
      const rows = container.querySelectorAll(".rowExercise");

      rows.forEach((row, index) => {
        // 1. Carga (Kg)
        const inputKg = row.querySelector(".kgExercise");
        const cacheKg = localStorage.getItem(
          this.gerarChave(exercicioId, index, "kgExercise"),
        );
        if (cacheKg !== null && inputKg) inputKg.value = cacheKg;

        // 2. Repetições
        const inputReps = row.querySelector(".repsExercise");
        const cacheReps = localStorage.getItem(
          this.gerarChave(exercicioId, index, "repsExercise"),
        );
        if (cacheReps !== null && inputReps) inputReps.value = cacheReps;

        // 3. Status (Check)
        const cacheStatus = localStorage.getItem(
          this.gerarChave(exercicioId, index, "status"),
        );
        if (cacheStatus === "true") {
          row.classList.add("concluido");
          row.dataset.realizado = "true";
        } else {
          row.classList.remove("concluido");
          row.dataset.realizado = "false";
        }
      });
    });
  },

  // Limpar dados ao concluir ou reiniciar
  limparRascunho(templateId) {
    // Por enquanto limpamos tudo que começa com treino_cache
    // Idealmente filtraríamos por templateId se a chave tivesse isso.
    // Como não tem, limpamos tudo que é cache de treino.
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("treino_cache_")) {
        localStorage.removeItem(key);
      }
    });
  },
  gerarChave(exercicioId, linhaIndex, tipo) {
    return `treino_cache_${exercicioId}_${linhaIndex}_${tipo}`;
  },

  salvarInput(input) {
    const row = input.closest(".rowExercise");
    const container = input.closest(".container-exercicio");
    if (!row || !container) return;

    const exercicioId = container.dataset.exercicioId;
    const rows = Array.from(container.querySelectorAll(".rowExercise"));
    const linhaIndex = rows.indexOf(row);

    let tipo = "generic";
    if (input.classList.contains("kgExercise")) tipo = "kgExercise";
    else if (input.classList.contains("repsExercise")) tipo = "repsExercise";
    else if (input.classList.contains("seriesExercise"))
      tipo = "seriesExercise";

    const chave = this.gerarChave(exercicioId, linhaIndex, tipo);
    localStorage.setItem(chave, input.value);
  },

  salvarStatus(row) {
    const container = row.closest(".container-exercicio");
    if (!container) return;

    const exercicioId = container.dataset.exercicioId;
    const rows = Array.from(container.querySelectorAll(".rowExercise"));
    const linhaIndex = rows.indexOf(row);
    const isRealizado = row.classList.contains("concluido");

    const chave = this.gerarChave(exercicioId, linhaIndex, "status");
    localStorage.setItem(chave, isRealizado ? "true" : "false");
  },

  restaurarDados() {
    const containers = document.querySelectorAll(".container-exercicio");

    containers.forEach(container => {
      const exercicioId = container.dataset.exercicioId;
      const rows = container.querySelectorAll(".rowExercise");

      rows.forEach((row, index) => {
        // 1. Carga (Kg)
        const inputKg = row.querySelector(".kgExercise");
        const cacheKg = localStorage.getItem(
          this.gerarChave(exercicioId, index, "kgExercise"),
        );
        if (cacheKg !== null && inputKg) inputKg.value = cacheKg;

        // 2. Repetições
        const inputReps = row.querySelector(".repsExercise");
        const cacheReps = localStorage.getItem(
          this.gerarChave(exercicioId, index, "repsExercise"),
        );
        if (cacheReps !== null && inputReps) inputReps.value = cacheReps;

        // 3. Status (Check)
        const cacheStatus = localStorage.getItem(
          this.gerarChave(exercicioId, index, "status"),
        );
        if (cacheStatus === "true") {
          row.classList.add("concluido");
          row.dataset.realizado = "true";
        } else {
          row.classList.remove("concluido");
          row.dataset.realizado = "false";
        }
      });
    });
  },

  // --- NOVO: LÓGICA DE TEMPO ---
  registrarInicio() {
    const key = "treino_cache_inicio_utc";
    if (localStorage.getItem(key)) return; // Já começou

    const now = new Date().toISOString(); // ISO é melhor que aquela formatação manual
    localStorage.setItem(key, now);
    console.log("⏱️ Treino iniciado em:", now);
  },

  getInicio() {
    return (
      localStorage.getItem("treino_cache_inicio_utc") ||
      new Date().toISOString()
    );
  },

  // --- LIMPEZA ---
  limparRascunho() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("treino_cache_")) {
        localStorage.removeItem(key);
      }
    });
  },
};
