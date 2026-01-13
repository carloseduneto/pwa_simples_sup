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
    // 5. Salva o status localmente
    salvarStatusLocalmente(linha);
  }
});

// --- Lógica de Persistência (Salvar rascunho) ---

// Gera uma chave única para cada campo: ex: "treino_cache_12_0_kgExercise"
// (ID do exercicio + indice da linha + classe do input)
function gerarChaveCache(exercicioId, linhaIndex, classeInput) {
  return `treino_cache_${exercicioId}_${linhaIndex}_${classeInput}`;
}

// 1. Chamada a cada tecla digitada
function salvarInputLocalmente(input) {
  const row = input.closest(".rowExercise");
  const container = input.closest(".container-exercicio");

  if (!row || !container) return;

  const exercicioId = container.dataset.exercicioId;
  // Descobre qual é o índice dessa linha (0, 1, 2, 3...)
  const rowsDoExercicio = Array.from(
    container.querySelectorAll(".rowExercise")
  );
  const linhaIndex = rowsDoExercicio.indexOf(row);

  // Pega a classe principal para identificar o tipo (kgExercise, repsExercise, etc)
  // Assumindo que a classe relevante é a primeira ou segunda. Vamos usar o name ou a classe específica.
  let tipo = "generic";
  if (input.classList.contains("kgExercise")) tipo = "kgExercise";
  else if (input.classList.contains("repsExercise")) tipo = "repsExercise";
  else if (input.classList.contains("seriesExercise")) tipo = "seriesExercise";

  const chave = gerarChaveCache(exercicioId, linhaIndex, tipo);
  localStorage.setItem(chave, input.value);
}

// 2. Chamada logo após renderizar o HTML do treino
// No arquivo scriptManipulation.js

function restaurarDadosLocais() {
  const containers = document.querySelectorAll(".container-exercicio");

  containers.forEach((container) => {
    const exercicioId = container.dataset.exercicioId;
    const rows = container.querySelectorAll(".rowExercise");

    rows.forEach((row, index) => {
      // 1. Restaura Inputs (Código que já funcionava)
      const inputKg = row.querySelector(".kgExercise");
      const cacheKg = localStorage.getItem(
        gerarChaveCache(exercicioId, index, "kgExercise")
      );
      if (cacheKg !== null && inputKg) inputKg.value = cacheKg;

      const inputReps = row.querySelector(".repsExercise");
      const cacheReps = localStorage.getItem(
        gerarChaveCache(exercicioId, index, "repsExercise")
      );
      if (cacheReps !== null && inputReps) inputReps.value = cacheReps;

      const inputSeries = row.querySelector(".seriesExercise");
      const cacheSeries = localStorage.getItem(
        gerarChaveCache(exercicioId, index, "seriesExercise")
      );
      if (cacheSeries !== null && inputSeries) inputSeries.value = cacheSeries;

      // 2. NOVO: Restaura o Status (Check ✔️)
      const cacheStatus = localStorage.getItem(
        gerarChaveCache(exercicioId, index, "status")
      );

      // Se no cache diz "true", marcamos a linha visualmente
      if (cacheStatus === "true") {
        row.classList.add("concluido");
        row.dataset.realizado = "true";
      } else {
        // Garante que está limpo caso contrário
        row.classList.remove("concluido");
        row.dataset.realizado = "false";
      }
    });
  });
}

// No arquivo scriptManipulation.js
function salvarStatusLocalmente(row) {
  const container = row.closest(".container-exercicio");
  if (!container) return;

  const exercicioId = container.dataset.exercicioId;

  // Descobre o índice da linha
  const rowsDoExercicio = Array.from(
    container.querySelectorAll(".rowExercise")
  );
  const linhaIndex = rowsDoExercicio.indexOf(row);

  // Verifica se a linha acabou de ficar realizada
  const isRealizado = row.dataset.realizado === "true";

  // Salva "true" ou "false" no localStorage
  const chave = gerarChaveCache(exercicioId, linhaIndex, "status");
  localStorage.setItem(chave, isRealizado);
}


// Função para alternar telas
function navegarPara(tela) {
  const screenList = document.getElementById("screen-templates-list");
  const screenDetails = document.getElementById("screen-workout-details");

  if (tela === 'lista') {
    screenList.classList.remove("hidden");
    screenDetails.classList.add("hidden");
    
    // Opcional: Limpar a URL para ficar limpa (sem ?template=3)
    window.history.pushState({}, "", "/"); 
  } 
  else if (tela === 'detalhes') {
    screenList.classList.add("hidden");
    screenDetails.classList.remove("hidden");
  }
}

// Função chamada pelo botão "Voltar"
function voltarParaLista() {
  navegarPara('lista');
  // Se quiser limpar o conteúdo do treino anterior para não piscar dados velhos:
  document.querySelector(".itensTemplate").innerHTML = "";
  
} 


window.addEventListener("popstate", event => {
  // O usuário apertou "Voltar" no navegador/celular
  const params = new URLSearchParams(window.location.search);
  const idSalvo = params.get("template");

  if (idSalvo) {
    // Se a URL voltou para uma que tem template (ex: avançou e voltou)
    renderizarItensDeTemplate(idSalvo);
  } else {
    // Se a URL está limpa, mostra a lista
    navegarPara("lista");
  }
});