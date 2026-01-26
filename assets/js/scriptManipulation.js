//TODO Refatorar para usar funções reutilizáveis

function propagarValor(inputAtual, classeAlvo) {
  const valorDigitado = inputAtual.value;
  const container = inputAtual.closest(".container-exercicio");

  // O input atual deixa de ser automático pois o usuário mexeu nele
  inputAtual.dataset.auto = "false";

  if (!container) return;

  const todosInputs = container.querySelectorAll(`.${classeAlvo}`);
  let encontrouOAtual = false;

  for (const input of todosInputs) {
    if (input === inputAtual) {
      encontrouOAtual = true;
      continue;
    }

    if (encontrouOAtual) {
      // 1. Verifica se tem placeholder (histórico)
      const temPlaceholder =
        input.placeholder && input.placeholder.trim() !== "";

      // Se tiver placeholder, ABORTA a automação neste campo.
      // Respeitamos o histórico.
      if (temPlaceholder) continue;

      // 2. Lógica padrão: preenche se estiver vazio ou se já for "do robô"
      const foiPreenchidoPeloRobo = input.dataset.auto === "true";
      const estaVazio = input.value === "";

      if (estaVazio || foiPreenchidoPeloRobo) {
        input.value = valorDigitado;
        input.dataset.auto = "true";
      }
    }
  }
}

// Listener único para os dois casos
document.addEventListener("input", function (event) {
  if (event.target.classList.contains("kgExercise")) {
    propagarValor(event.target, "kgExercise");
  }
  if (event.target.classList.contains("repsExercise")) {
    propagarValor(event.target, "repsExercise");
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
  // 1. Verifica se o clique foi no botão (ou no ícone dentro dele)
  // MUDANÇA AQUI: Troquei 'event.target.classList...' por 'event.target.closest'
  const botao = event.target.closest(".checkExercise");

  if (botao) {
    // 2. Encontra a linha inteira (o pai do botão)
    const linha = botao.closest(".rowExercise");

    if (linha) {
      // 3. A MÁGICA: 'toggle' adiciona a classe se não tiver, e remove se tiver
      linha.classList.toggle("concluido");

      // --- CÓDIGO NOVO (ADICIONE ISSO AQUI) ---
      const estaConcluido = linha.classList.contains("concluido");

      // Se acabou de concluir, faz o botão pular
      if (estaConcluido) {
        // Adiciona a classe que tem a animação no CSS
        botao.classList.add("animando");

        // Remove a classe depois de 0.6s (tempo da animação)
        // para ficar limpo e poder animar de novo se desmarcar e marcar
        setTimeout(() => {
          botao.classList.remove("animando");
        }, 600);
      }

      // 4. LÓGICA DE DADOS (Para você salvar no banco depois)
      // Se tem a classe 'concluido', o atributo vira "true", senão "false"
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


// // Função para alternar telas
// function navegarPara(tela) {
//   const screenList = document.getElementById("screen-templates-list");
//   const screenDetails = document.getElementById("screen-workout-details");

//   if (tela === 'lista') {
//     screenList.classList.remove("hidden");
//     screenDetails.classList.add("hidden");
    
//     // Opcional: Limpar a URL para ficar limpa (sem ?template=3)
//     window.history.pushState({}, "", "/"); 
//   } 
//   else if (tela === 'detalhes') {
//     screenList.classList.add("hidden");
//     screenDetails.classList.remove("hidden");
//   }
// }

// // Função chamada pelo botão "Voltar"
// function voltarParaLista() {
//   navegarPara('lista');
//   // Se quiser limpar o conteúdo do treino anterior para não piscar dados velhos:
//   document.querySelector(".itensTemplate").innerHTML = "";
  
// } 


window.addEventListener("popstate", (event) => {
  // Pega o estado salvo pelo pushState do roteador
  const estado = event.state; // { rota: 'detalhes', id: '123' }

  if (estado && estado.rota) {
    // Usa o roteador para trocar a tela visualmente (false para não criar histórico novo)
    roteador(estado.rota, estado.id, false);

    // Se for a tela de detalhes, precisamos recarregar os dados
    if (estado.rota === "detalhes" && estado.id) {
      renderizarItensDeTemplate(estado.id);
    }
  } else {
    // Se não tem estado (o usuário voltou até o início), vai para a home
    roteador("templates", null, false);
  }
});