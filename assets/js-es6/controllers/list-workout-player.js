import { GlobalLoader } from "../ui-ux/global-loader.js";
import { WorkoutService } from "../services/workout.service.js";
import { WorkoutDraftService } from "../services/workout-draft.service.js";
import { AuthService } from "../services/auth.service.js";

// Variável local para armazenar dados temporários antes de enviar
let dadosParaEnvio = null;
let semanaBaseCache = null; // Para guardar a semana sem precisar ler do DOM

// Funções auxiliares que ainda podem estar no scriptManipulation.js
// Se elas não existirem lá ainda, teremos que importá-las ou criá-las depois.
// Por enquanto, assumimos que 'salvarInputLocalmente' e 'restaurarDadosLocais' existem globalmente ou serão migradas.

export async function initWorkoutPlayer(onNavigate, templateId) {
  const container = document.getElementById("screen-workout-details"); // ID da Div Principal
  const contentDiv = container.querySelector(".itensTemplate"); // A div interna onde o conteúdo entra

  if (!contentDiv) return;

  // 1. Loader
  contentDiv.innerHTML = GlobalLoader.getSimple();

  try {
    // 2. Busca Dados
    const { itens, contexto, historico } =
      await WorkoutService.getFullWorkoutData(templateId);

    // 3. Limpeza
    contentDiv.innerHTML = "";

    if (!itens || itens.length === 0) {
      contentDiv.innerHTML = "<p>Template vazio.</p>";
      return;
    }

    // 4. Preparação dos Templates HTML (Tags <template>)
    const templateInputExercise = document.querySelector(
      ".template-input-exercise",
    );
    const templateHeaderExercise = document.querySelector(
      ".template-header-exercise",
    );
    const templateSmartHeader = document.querySelector(
      ".template-smart-header",
    );

    const wrapperTraining = document.createElement("div");
    wrapperTraining.className = "container-treino";

    // --- RENDERIZAÇÃO DO CABEÇALHO ---
    // Header Inteligente (Voltar/Menu)
    if (templateSmartHeader) {
      wrapperTraining.insertAdjacentHTML(
        "beforeend",
        templateSmartHeader.innerHTML,
      );
    }

    // Header do Treino (Título e Descrição)
    const headerHtml = `
      <section class="header-itens-template">
         <div class="header-session-content">
            <h1 class="titulo-treino data-week-${contexto?.series_repeticoes?.week || "1"}">${itens[0].templates.nome}</h1>
            <p class="subtitulo-treino">${itens[0].templates.descricao || ""}</p>
         </div>
         <button id="btn-reiniciar-treino" class="btn-icon-dynamic-header">
            <span class="material-symbols-rounded">rotate_left</span>
            <span class="btn-text-header">Reiniciar <br>treino</span>
         </button>
      </section>
    `;
    wrapperTraining.insertAdjacentHTML("beforeend", headerHtml);

    // --- LOOP DOS EXERCÍCIOS ---
    for (const item of itens) {
      const wrapperExercises = document.createElement("div");
      wrapperExercises.className = "container-exercicio";
      wrapperExercises.dataset.exercicioId = item.exercicios.id;

      // Filtra histórico deste exercício
      const seriesPassadas = historico.filter(
        h => h.exercicio_id === item.exercicios.id,
      );

      // Título do Exercício
      let titleHtml = `<h4>${item.exercicios.nome}`;
      if (item.tecnica_intensificacao) {
        titleHtml += ` - <em>${item.tecnica_intensificacao}</em>`;
      }
      titleHtml += `</h4>`;
      wrapperExercises.insertAdjacentHTML("beforeend", titleHtml);

      // Recomendações (Details/Summary)
      if (item.treino_recomendacoes) {
        wrapperExercises.insertAdjacentHTML(
          "beforeend",
          `
                <details class="detalhes-exercicio"> 
                    <summary>Recomendações:</summary>
                    ${item.treino_recomendacoes.description} ${contexto?.series_repeticoes?.nome || ""}
                </details>
            `,
        );
      }

      // Header da Tabela (Série | Anterior | Kg | Reps)
      if (templateHeaderExercise) {
        wrapperExercises.insertAdjacentHTML(
          "beforeend",
          templateHeaderExercise.innerHTML,
        );
      }

      // --- GERAÇÃO DAS LINHAS DE INPUT (A Lógica Complexa) ---

      // CASO A: Séries de Aquecimento/Recomendação
      if (item.treino_recomendacoes) {
        // A1. Aquecimentos
        for (let i = 0; i < item.treino_recomendacoes.valor; i++) {
          const clone = templateInputExercise.content.cloneNode(true);
          const label = item.treino_recomendacoes.detalhes[i].label;
          clone.querySelector(".seriesExercise").value = label;

          // Preenche dados anteriores se existirem
          preencherHistoricoNoInput(clone, seriesPassadas[i]);
          wrapperExercises.appendChild(clone);
        }

        // A2. Séries de Trabalho (Baseadas no Contexto)
        const qtdSeriesTrabalho = contexto?.series_repeticoes?.series || 3; // Fallback 3
        const offset = item.treino_recomendacoes.detalhes.length;

        for (let i = 0; i < qtdSeriesTrabalho; i++) {
          const clone = templateInputExercise.content.cloneNode(true);
          const currentIdx = offset + i;

          // Lógica de Match do Histórico (Última com Última se diminuiu volume)
          let historicoMatch = seriesPassadas[currentIdx];
          if (
            i === qtdSeriesTrabalho - 1 &&
            seriesPassadas.length > qtdSeriesTrabalho
          ) {
            historicoMatch = seriesPassadas[seriesPassadas.length - 1];
          }

          // Numeração da série
          clone.querySelector(".seriesExercise").value = currentIdx + 1; // 1, 2, 3...

          preencherHistoricoNoInput(clone, historicoMatch);
          wrapperExercises.appendChild(clone);
        }
      }
      // CASO B: Séries Fixas (Sem recomendação)
      else {
        const qtdSeries = item.series_alvo || 3;
        for (let i = 0; i < qtdSeries; i++) {
          const clone = templateInputExercise.content.cloneNode(true);
          clone.querySelector(".seriesExercise").value = i + 1;
          preencherHistoricoNoInput(clone, seriesPassadas[i]);
          wrapperExercises.appendChild(clone);
        }
      }

      wrapperTraining.appendChild(wrapperExercises);
    } // Fim do Loop

    // Botão Concluir
    const btnConcluirHtml = `
        <div style="text-align:center; margin-top:30px; margin-bottom:50px;">
            <button id="btn-concluir-treino" class="primary-button">
                <span class="material-symbols-rounded">done_all</span> 
                Concluir Treino
            </button>
        </div>
    `;
    wrapperTraining.insertAdjacentHTML("beforeend", btnConcluirHtml);

    // Adiciona tudo ao DOM
    contentDiv.appendChild(wrapperTraining);

    // --- EVENT LISTENERS (Ligando os fios) ---

    // 1. Botão Reiniciar
    const btnReiniciar = contentDiv.querySelector("#btn-reiniciar-treino");
    if (btnReiniciar) {
      // btnReiniciar.onclick = () => {
      //   if (confirm("Limpar todos os dados digitados agora?")) {
      //     if (typeof window.limparDadosLocais === "function")
      //       window.limparDadosLocais();
      //     // Recarrega a tela
      //     initWorkoutPlayer(onNavigate, templateId);
      //   }
      // };
      btnReiniciar.onclick = () => {
        if (confirm("Limpar dados e reiniciar?")) {
          WorkoutDraftService.limparRascunho(); // <--- Limpa cache
          initWorkoutPlayer(onNavigate, templateId); // Recarrega
        }
      };
    }

    // 2. Botão Concluir
    // Botão Concluir (A Lógica Principal)
    const btnConcluir = contentDiv.querySelector("#btn-concluir-treino");
    if (btnConcluir) {
      btnConcluir.onclick = async () => {
        await processarConclusao(templateId, onNavigate);
      };
    }

    // 3. Listener de Input (Salvar rascunho)
    // Se o scriptManipulation já lida com isso globalmente, ok.
    // Senão, adicionamos aqui:
    if (typeof window.salvarInputLocalmente === "function") {
      wrapperTraining.addEventListener("input", event => {
        if (
          event.target.matches(".kgExercise, .repsExercise, .seriesExercise")
        ) {
          window.salvarInputLocalmente(event.target);
        }
      });
    }

    // 4. Restaurar Rascunho
    // if (typeof window.restaurarDadosLocais === "function") {
    //   window.restaurarDadosLocais();
    // }
    // 4. Restaurar Rascunho (Substitui window.restaurarDadosLocais)
    WorkoutDraftService.restaurarDados();

    // Configurar Modal (Se existir no DOM agora)
    setupModalEvents(templateId, onNavigate);
  } catch (error) {
    console.error(error);
    contentDiv.innerHTML = `<p style="color:red">Erro ao carregar treino: ${error.message}</p>`;
  }
}

// --- HELPER: Preenche Placeholders ---
function preencherHistoricoNoInput(clone, dadoHistorico) {
  const elAnterior = clone.querySelector(".anteriorExercise");
  const elKg = clone.querySelector(".kgExercise");
  const elReps = clone.querySelector(".repsExercise");

  if (dadoHistorico) {
    const txt = `${dadoHistorico.repeticoes || 0} x ${dadoHistorico.carga || 0}`;
    if (elAnterior) elAnterior.textContent = txt;

    // Placeholder
    if (elKg) elKg.placeholder = dadoHistorico.carga || "";
    if (elReps) elReps.placeholder = dadoHistorico.repeticoes || "";
  } else {
    if (elAnterior) elAnterior.textContent = " - ";
  }
}

// --- LÓGICA DE CONCLUSÃO (Migrada do scriptUpload) ---
async function processarConclusao(templateId, onNavigate) {
  const containers = document.querySelectorAll(".container-exercicio");
  const seriesParaSalvar = [];
  let temPendencia = false;

  containers.forEach(container => {
    const exercicioId = parseInt(container.dataset.exercicioId);
    const rows = container.querySelectorAll(".rowExercise");

    rows.forEach((row, index) => {
      const inputKg = row.querySelector(".kgExercise");
      const inputReps = row.querySelector(".repsExercise");
      const inputTipo = row.querySelector(".seriesExercise");
      const foiRealizado = row.dataset.realizado === "true";

      // Pega valor ou placeholder
      const valKg = inputKg.value !== "" ? inputKg.value : inputKg.placeholder;
      const valReps =
        inputReps.value !== "" ? inputReps.value : inputReps.placeholder;

      const kg = parseFloat(valKg) || 0;
      const reps = parseFloat(valReps) || 0;
      const tipo = inputTipo ? inputTipo.value.trim() : "N";

      // Verifica se digitou mas não marcou
      const digitouAlgo = inputKg.value !== "" || inputReps.value !== "";
      if (digitouAlgo && !foiRealizado) {
        temPendencia = true;
      }

      if (digitouAlgo || foiRealizado) {
        seriesParaSalvar.push({
          exercicio_id: exercicioId,
          carga: kg,
          repeticoes: reps,
          ordem: index + 1,
          realizado: foiRealizado,
          tipo: tipo,
        });
      }
    });
  });

  const userId = await AuthService.getUserId();

  dadosParaEnvio = {
    data_inicio: WorkoutDraftService.getInicio(),
    data_fim: new Date().toISOString(),
    semana_base: semanaBaseCache,
    owner_id: userId,
    template_id: templateId,
    series: seriesParaSalvar,
  };

  if (temPendencia) {
    // Abre Modal
    const modal = document.getElementById("modal-conclusao");
    if (modal) modal.classList.remove("hidden");
  } else {
    // Envia apenas realizados
    const seriesFiltradas = seriesParaSalvar.filter(s => s.realizado);
    await enviarTreino(seriesFiltradas, onNavigate);
  }
}

// --- ENVIO FINAL ---
async function enviarTreino(series, onNavigate) {
  if (!series || series.length === 0) {
    alert("Nenhuma série realizada.");
    return;
  }

  // Atualiza o payload com a lista filtrada
  dadosParaEnvio.series = series;

  try {
    const btn = document.getElementById("btn-concluir-treino");
    if (btn) {
      btn.innerText = "Salvando...";
      btn.disabled = true;
    }

    await WorkoutService.saveSession(dadosParaEnvio);

    alert("Treino salvo com sucesso!");
    WorkoutDraftService.limparRascunho();

    if (onNavigate) onNavigate("templates"); // Volta pra home
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar: " + err.message);
    const btn = document.getElementById("btn-concluir-treino");
    if (btn) {
      btn.innerText = "Concluir Treino";
      btn.disabled = false;
    }
  }
}

// --- EVENTOS DO MODAL ---
function setupModalEvents(templateId, onNavigate) {
  const btnDescartar = document.getElementById("btn-modal-descartar");
  const btnCancelar = document.getElementById("btn-modal-cancelar");
  const modal = document.getElementById("modal-conclusao");

  if (btnDescartar) {
    btnDescartar.onclick = async () => {
      modal.classList.add("hidden");
      // Salva apenas os que tem check
      const seriesFiltradas = dadosParaEnvio.series.filter(s => s.realizado);
      await enviarTreino(seriesFiltradas, onNavigate);
    };
  }

  if (btnCancelar) {
    btnCancelar.onclick = () => {
      modal.classList.add("hidden");
    };
  }
}
