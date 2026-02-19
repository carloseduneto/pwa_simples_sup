import { GlobalLoader } from "../ui/global-loader.js";
import { WorkoutService } from "../services/workout.service.js";
import { WorkoutDraftService } from "../services/workout-draft.service.js";
import { AuthService } from "../services/auth.service.js";

// Variáveis locais de estado
let dadosParaEnvio = null;
let semanaBaseCache = null;

export async function initWorkoutPlayer(onNavigate, templateId) {
  const container = document.getElementById("screen-workout-details");
  const contentDiv = container.querySelector(".itensTemplate");

  if (!contentDiv) return;

  // 1. Loader
  contentDiv.innerHTML = GlobalLoader.getSimple();

  try {
    // 2. Busca Dados
    const { itens, contexto, historico } =
      await WorkoutService.getFullWorkoutData(templateId);

    semanaBaseCache = contexto?.series_repeticoes?.week || null;

    // 3. Limpeza
    contentDiv.innerHTML = "";

    if (!itens || itens.length === 0) {
      contentDiv.innerHTML =
        "<p style='padding:20px; text-align:center'>Template vazio.</p>";
      return;
    }

    // 4. Templates HTML (Clonagem)
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
    if (templateSmartHeader) {
      wrapperTraining.insertAdjacentHTML(
        "beforeend",
        templateSmartHeader.innerHTML,
      );
    }

    const headerHtml = `
      <section class="header-itens-template">
         <div class="header-session-content">
            <h1 class="titulo-treino data-week-${contexto?.series_repeticoes?.week || "1"}">${itens[0].templates.nome}</h1>
            <p class="subtitulo-treino">${itens[0].templates.descricao || ""}</p>
         </div>
         <button id="reiniciar-treino-btn" class="btn-icon-dynamic-header">
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

      const seriesPassadas = historico.filter(
        (h) => h.exercicio_id === item.exercicios.id,
      );

      let titleHtml = `<h4>${item.exercicios.nome}`;
      if (item.tecnica_intensificacao) {
        titleHtml += ` - <em>${item.tecnica_intensificacao}</em>`;
      }
      titleHtml += `</h4>`;
      wrapperExercises.insertAdjacentHTML("beforeend", titleHtml);

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

      if (templateHeaderExercise) {
        wrapperExercises.insertAdjacentHTML(
          "beforeend",
          templateHeaderExercise.innerHTML,
        );
      }

      // --- GERAÇÃO DOS INPUTS ---
      const gerarLinha = (labelOuIndice, idxHistorico) => {
        const clone = templateInputExercise.content.cloneNode(true);
        const serieInput = clone.querySelector(".seriesExercise");
        serieInput.value = labelOuIndice;
        preencherHistoricoNoInput(clone, seriesPassadas[idxHistorico]);
        wrapperExercises.appendChild(clone);
      };

      if (item.treino_recomendacoes) {
        for (let i = 0; i < item.treino_recomendacoes.valor; i++) {
          gerarLinha(item.treino_recomendacoes.detalhes[i].label, i);
        }
        const qtdSeries = contexto?.series_repeticoes?.series || 3;
        const offset = item.treino_recomendacoes.detalhes.length;
        for (let i = 0; i < qtdSeries; i++) {
          const currentIdx = offset + i;
          let idxHistorico = currentIdx;
          if (i === qtdSeries - 1 && seriesPassadas.length > qtdSeries) {
            idxHistorico = seriesPassadas.length - 1;
          }
          gerarLinha(currentIdx + 1, idxHistorico);
        }
      } else {
        const qtdSeries = item.series_alvo || 3;
        for (let i = 0; i < qtdSeries; i++) {
          gerarLinha(i + 1, i);
        }
      }

      wrapperTraining.appendChild(wrapperExercises);
    }

    contentDiv.appendChild(wrapperTraining);

    // --- RESTAURAÇÃO: BOTÃO CONCLUIR NO HEADER ---
    const divConteudoHeader = document.querySelector(".header-content");
    const btnAntigo = document.getElementById("concluir-treino-btn");
    if (btnAntigo) btnAntigo.remove();

    const btnConcluirHtml = `
      <button id="concluir-treino-btn" class="btn-icon-dynamic-header">
         <span class="material-symbols-rounded">done_all</span> 
         <span class="btn-text-header">Concluir</span>
      </button>
    `;

    if (divConteudoHeader) {
      divConteudoHeader.insertAdjacentHTML("beforeend", btnConcluirHtml);
    } else {
      wrapperTraining.insertAdjacentHTML(
        "beforeend",
        `<div style="text-align:center; margin-top:20px;">${btnConcluirHtml}</div>`,
      );
    }

    // --- O MODAL FOI REMOVIDO DA INJEÇÃO E AGORA USA O DO INDEX.HTML ---

    // --- EVENTOS E LOGICA ---
    WorkoutDraftService.restaurarDados();

    const btnReiniciar = document.getElementById("reiniciar-treino-btn");
    if (btnReiniciar) {
      const novoReiniciar = btnReiniciar.cloneNode(true);
      btnReiniciar.parentNode.replaceChild(novoReiniciar, btnReiniciar);

      novoReiniciar.onclick = () => {
        if (confirm("Limpar dados e reiniciar?")) {
          WorkoutDraftService.limparRascunho();
          initWorkoutPlayer(onNavigate, templateId);
        }
      };
    }

    const btnConcluir = document.getElementById("concluir-treino-btn");
    if (btnConcluir) {
      const novoConcluir = btnConcluir.cloneNode(true);
      btnConcluir.parentNode.replaceChild(novoConcluir, btnConcluir);

      novoConcluir.onclick = async () => {
        await processarConclusao(templateId, onNavigate);
      };
    }

    if (typeof window.salvarInputLocalmente === "function") {
      wrapperTraining.addEventListener("input", (event) => {
        if (
          event.target.matches(".kgExercise, .repsExercise, .seriesExercise")
        ) {
          window.salvarInputLocalmente(event.target);
        }
      });
    }

    // Conecta os botões do modal fixo
    setupModalEvents(templateId, onNavigate);
  } catch (error) {
    console.error(error);
    contentDiv.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Erro ao carregar: ${error.message}</p>`;
  }
}

// --- HELPERS E LÓGICA DE SALVAMENTO ---

function preencherHistoricoNoInput(clone, dadoHistorico) {
  const elAnterior = clone.querySelector(".anteriorExercise");
  const elKg = clone.querySelector(".kgExercise");
  const elReps = clone.querySelector(".repsExercise");

  if (dadoHistorico) {
    const txt = `${dadoHistorico.repeticoes || 0} x ${dadoHistorico.carga || 0}`;
    if (elAnterior) elAnterior.textContent = txt;
    if (elKg) elKg.placeholder = dadoHistorico.carga || "";
    if (elReps) elReps.placeholder = dadoHistorico.repeticoes || "";
  } else {
    if (elAnterior) elAnterior.textContent = " - ";
  }
}

async function processarConclusao(templateId, onNavigate) {
  const containers = document.querySelectorAll(".container-exercicio");
  const seriesParaSalvar = [];
  let temPendencia = false;

  containers.forEach((container) => {
    const exercicioId = parseInt(container.dataset.exercicioId);
    const rows = container.querySelectorAll(".rowExercise");

    rows.forEach((row, index) => {
      const inputKg = row.querySelector(".kgExercise");
      const inputReps = row.querySelector(".repsExercise");
      const inputTipo = row.querySelector(".seriesExercise");
      const foiRealizado = row.dataset.realizado === "true";

      const valKg = inputKg.value !== "" ? inputKg.value : inputKg.placeholder;
      const valReps =
        inputReps.value !== "" ? inputReps.value : inputReps.placeholder;

      const kg = parseFloat(valKg) || 0;
      const reps = parseFloat(valReps) || 0;
      const tipo = inputTipo ? inputTipo.value.trim() : "N";

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
          realizado: foiRealizado, // Usado localmente para o Modal, descartado no envio
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
    const modal = document.getElementById("modal-conclusao");
    if (modal) modal.classList.remove("hidden");
  } else {
    const seriesFiltradas = seriesParaSalvar.filter((s) => s.realizado);
    await enviarTreino(seriesFiltradas, onNavigate);
  }
}

async function enviarTreino(series, onNavigate) {
  if (!series || series.length === 0) {
    alert("Nenhuma série marcada como realizada.");
    return;
  }

  // Limpa o atributo 'realizado' antes de passar para o Service,
  // garantindo que não dê erro de coluna inexistente no banco.
  const seriesLimpas = series.map((s) => {
    const { realizado, ...resto } = s;
    return resto;
  });

  dadosParaEnvio.series = seriesLimpas;

  try {
    const btn = document.getElementById("concluir-treino-btn");
    if (btn) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML =
        "<span class='material-symbols-rounded'>hourglass_empty</span> Salvando...";
      btn.disabled = true;
    }

    await WorkoutService.saveSession(dadosParaEnvio);

    alert("Treino concluído com sucesso!");
    WorkoutDraftService.limparRascunho();

    if (btn) btn.remove();

    if (onNavigate) onNavigate("templates");
  } catch (err) {
    console.error(err);
    alert("Erro ao salvar: " + err.message);
    const btn = document.getElementById("concluir-treino-btn");
    if (btn) {
      if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
      btn.disabled = false;
    }
  }
}

// Configura os ouvintes para o Modal do HTML
function setupModalEvents(templateId, onNavigate) {
  const modal = document.getElementById("modal-conclusao");
  if (!modal) return;

  const btnCompletar = document.getElementById("btn-modal-completar");
  const btnDescartar = document.getElementById("btn-modal-descartar");
  const btnCancelar = document.getElementById("btn-modal-cancelar");

  if (btnCompletar) {
    const novoBtn = btnCompletar.cloneNode(true);
    btnCompletar.parentNode.replaceChild(novoBtn, btnCompletar);
    novoBtn.onclick = async () => {
      modal.classList.add("hidden");
      // Envia TODAS as séries extraídas do DOM
      await enviarTreino(dadosParaEnvio.series, onNavigate);
    };
  }

  if (btnDescartar) {
    const novoBtn = btnDescartar.cloneNode(true);
    btnDescartar.parentNode.replaceChild(novoBtn, btnDescartar);

    novoBtn.onclick = async () => {
      modal.classList.add("hidden");
      // Filtra apenas as que o usuário ativamente checou
      const seriesFiltradas = dadosParaEnvio.series.filter((s) => s.realizado);
      await enviarTreino(seriesFiltradas, onNavigate);
    };
  }

  if (btnCancelar) {
    const novoBtn = btnCancelar.cloneNode(true);
    btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);

    novoBtn.onclick = () => {
      modal.classList.add("hidden");
    };
  }
}
