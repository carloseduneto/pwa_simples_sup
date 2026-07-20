import { GlobalLoader } from "../ui/global-loader.js";
import { WorkoutService } from "../services/workout.service.js";
import { WorkoutDraftService } from "../services/workout-draft.service.js";
import { AuthService } from "../services/auth.service.js";

// Variáveis locais de estado
let dadosParaEnvio = null;
let semanaBaseCache = null;

// Variáveis do Cronômetro
let timerInterval = null;
let timerSeconds = 0;

function updateTimerDisplay() {
  const display = document.getElementById("stopwatch-display");
  if (display) {
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
    const s = String(timerSeconds % 60).padStart(2, "0");
    display.textContent = `${m}:${s}`;
  }
}

function playTimer() {
  clearInterval(timerInterval);
  document.getElementById("btn-play-timer")?.classList.add("hidden");
  document.getElementById("btn-pause-timer")?.classList.remove("hidden");
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  document.getElementById("btn-pause-timer")?.classList.add("hidden");
  document.getElementById("btn-play-timer")?.classList.remove("hidden");
}

function stopTimer() {
  pauseTimer();
  timerSeconds = 0;
  updateTimerDisplay();
}

function restartAndPlayTimer() {
  stopTimer();
  playTimer();
}

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

    /*html*/
    const headerHtml = `
      <section class="header-itens-template">
         <div class="header-session-content">
            <h1 class="titulo-treino data-week-${contexto?.series_repeticoes?.week || "1"}">${itens[0].templates.nome}</h1>
            <p class="subtitulo-treino">${itens[0].templates.descricao || ""}</p>
         </div>
          <button id="toggle-stopwatch-btn" class="btn-icon-dynamic-header btn-toggle-stopwatch">
            <span id="toggle-stopwatch-btn-icon" class="material-symbols-rounded btn-toggle-stopwatch-icon">timer</span>
            <span class="btn-text-header">Cronô<br>metro</span>
         </button>
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

    // --- NOVO: CAMPO DE OBSERVAÇÕES ---
    // const obsHtml = `
    //   <div class="container-exercicio" style="margin-top: 20px; padding: 15px;">
    //       <h4 style="margin-bottom: 10px;">Observações</h4>
    //       <textarea id="obs-treino" style="width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: transparent; color: inherit; font-family: inherit;" rows="3" placeholder="Como foi o treino?"></textarea>
    //   </div>
    // `;
    /* html */
    const obsHtml = `
      <div class="container-exercicio" style="margin-top: 20px; padding: 15px;">
          <h4 style="margin-bottom: 10px;">Observações</h4>
          <textarea id="obs-treino" style="width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: transparent; color: inherit; font-family: inherit;" rows="3" placeholder="Como foi o treino?"></textarea>
      </div>

      <div class="container-exercicio" style="margin-top: 20px; padding: 15px;">
        <h4 style="margin-bottom: 15px;">Estatísticas da Sessão</h4>
        
        <div style="display: flex; gap: 15px; margin-bottom: 15px;">
          <div style="flex: 1;">
            <label style="display: block; font-size: 0.8rem; margin-bottom: 5px; opacity: 0.8;">Pausa (min : seg)</label>
            <div style="display: flex; gap: 5px; align-items: center;">
              <input type="number" id="est-pausa-m" value="1" min="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center;"> :
              <input type="number" id="est-pausa-s" value="30" min="0" max="59" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center;">
            </div>
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-size: 0.8rem; margin-bottom: 5px; opacity: 0.8;">Execução (min : seg)</label>
            <div style="display: flex; gap: 5px; align-items: center;">
              <input type="number" id="est-exec-m" value="0" min="0" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center;"> :
              <input type="number" id="est-exec-s" value="45" min="0" max="59" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center;">
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9rem; opacity: 0.9;">
          <div>Séries restantes: <strong id="est-series">0</strong></div>
          <div>Ex. restantes: <strong id="est-ex">0</strong></div>
          <div>Tempo ativo: <strong id="est-tempo">00m</strong></div>
          <div>Faltam aprox.: <strong id="est-falta">0m</strong></div>
        </div>
        
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #444; display: flex; justify-content: space-between;">
          <span>Fim previsto: <strong id="est-hora-fim">--:--</strong></span>
          <!-- <span style="color: var(--primary-color);">Volume: <strong id="est-vol">0</strong> kg</span>-->

        </div>
      </div>
    `;
    // wrapperTraining.insertAdjacentHTML("beforeend", obsHtml);
    wrapperTraining.insertAdjacentHTML("beforeend", obsHtml);

    contentDiv.appendChild(wrapperTraining);

    // --- EVENTOS DO CRONÔMETRO ---
    const btnPlay = document.getElementById("btn-play-timer");
    const btnPause = document.getElementById("btn-pause-timer");
    const btnStop = document.getElementById("btn-stop-timer");
    const btnToggleTimer = document.getElementById("toggle-stopwatch-btn");
    const btnToggleTimerIcon = document.getElementById(
      "toggle-stopwatch-btn-icon",
    );
    const containerTimer = document.getElementById("stopwatch-container");

    if (btnPlay) btnPlay.onclick = playTimer;
    if (btnPause) btnPause.onclick = pauseTimer;
    if (btnStop) btnStop.onclick = stopTimer;

    if (btnToggleTimer && containerTimer) {
      btnToggleTimer.classList.add("active"); // Inicia ativo
      btnToggleTimerIcon.classList.add("active"); // Inicia ativo

      btnToggleTimer.onclick = () => {
        const isHidden = containerTimer.classList.toggle("hidden");
        if (isHidden) {
          btnToggleTimer.classList.remove("active");
          btnToggleTimerIcon.classList.remove("active"); // Inicia ativo
          stopTimer(); // Zera o cronômetro ao ocultar
        } else {
          btnToggleTimer.classList.add("active");
          btnToggleTimerIcon.classList.add("active"); // Inicia ativo
        }
      };
    }

    // --- SETUP ESTATÍSTICAS ---
    atualizarEstatisticas(); // Chamada inicial

    // Atualiza a cada 1 minuto para manter o tempo ativo e hora final sincronizados
    setInterval(atualizarEstatisticas, 60000);

    // Atualiza quando os inputs de tempo mudam
    wrapperTraining.addEventListener("input", (e) => {
      if (e.target.id.startsWith("est-")) atualizarEstatisticas();
    });

    // Interceptar clique para marcação da série e reiniciar o cronômetro
    wrapperTraining.addEventListener("click", (event) => {
      const checkBtn = event.target.closest(".checkExercise");
      if (checkBtn) {
        const row = checkBtn.closest(".rowExercise");
        // Timeout garante que sua lógica externa de marcar data-realizado="true" execute primeiro
        setTimeout(() => {
          if (row.dataset.realizado === "true") {
            restartAndPlayTimer();
          }
          // Atualiza estatísticas após a marcação
          atualizarEstatisticas();
        }, 50);
      }
    });

    // --- RESTAURAÇÃO: BOTÃO CONCLUIR NO HEADER ---
    const divConteudoHeader = document.querySelector(".header-content");
    const btnAntigo = document.getElementById("concluir-treino-btn");
    if (btnAntigo) btnAntigo.remove();

    const btnConcluirHtml = `
      <button id="concluir-treino-btn" class="btn-icon-dynamic-header-transparent">
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

    // NOVO: Restaurar e salvar cache de observações
    const obsEl = document.getElementById("obs-treino");
    if (obsEl) {
      obsEl.value = localStorage.getItem("treino_cache_observacoes") || "";
      obsEl.addEventListener("input", (e) => {
        localStorage.setItem("treino_cache_observacoes", e.target.value);
      });
    }

    const btnReiniciar = document.getElementById("reiniciar-treino-btn");
    if (btnReiniciar) {
      const novoReiniciar = btnReiniciar.cloneNode(true);
      btnReiniciar.parentNode.replaceChild(novoReiniciar, btnReiniciar);

      novoReiniciar.onclick = () => {
        if (confirm("Limpar dados e reiniciar?")) {
          WorkoutDraftService.limparRascunho();
          stopTimer(); // Zera o cronômetro ao ocultar
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

    // --- ESTATÍSTICAS ---
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

  // ADICIONADO AQUI: A captura dos valores diretamente do DOM antes de salvar
  const tituloElement = document.querySelector(".titulo-treino");
  const nomeDoTreino = tituloElement
    ? tituloElement.innerText
    : "Treino Avulso";
  const obsTreino = document.getElementById("obs-treino")?.value || "";

  dadosParaEnvio = {
    data_inicio: WorkoutDraftService.getInicio(),
    data_fim: new Date().toISOString(),
    semana_base: semanaBaseCache,
    owner_id: userId,
    template_id: templateId,
    template_nome: nomeDoTreino, // Novo
    observacoes: obsTreino, // Novo
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

  const btn = document.getElementById("concluir-treino-btn");
  if (btn) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML =
    "<span class='material-symbols-rounded'>hourglass_empty</span> Salvando...";
    btn.disabled = true;
  }
  try {

    await WorkoutService.saveSession(dadosParaEnvio);

    alert("Treino concluído com sucesso!");
    WorkoutDraftService.limparRascunho();

    stopTimer(); // <-- Adicionado aqui para zerar ao concluir

    
    if (onNavigate) onNavigate("templates");
    if (btn) btn.remove();
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

function atualizarEstatisticas() {
  const rows = document.querySelectorAll(".rowExercise");
  if (!rows.length) return;

  let seriesRestantes = 0;
  let volumeTotal = 0;
  const exerciciosIncompletos = new Set();

  rows.forEach((row) => {
    const container = row.closest(".container-exercicio");
    if (!container) return;

    const exId = container.dataset.exercicioId;
    const realizado = row.dataset.realizado === "true";

    if (!realizado) {
      seriesRestantes++;
      exerciciosIncompletos.add(exId);
    } else {
      const kg = parseFloat(
        row.querySelector(".kgExercise").value ||
          row.querySelector(".kgExercise").placeholder ||
          0,
      );
      const reps = parseFloat(
        row.querySelector(".repsExercise").value ||
          row.querySelector(".repsExercise").placeholder ||
          0,
      );
      volumeTotal += kg * reps;
    }
  });

  const pMin = parseInt(document.getElementById("est-pausa-m")?.value || 0);
  const pSeg = parseInt(document.getElementById("est-pausa-s")?.value || 0);
  const eMin = parseInt(document.getElementById("est-exec-m")?.value || 0);
  const eSeg = parseInt(document.getElementById("est-exec-s")?.value || 0);

  const totalSegPorSerie = pMin * 60 + pSeg + (eMin * 60 + eSeg);
  const tempoRestanteSeg = seriesRestantes * totalSegPorSerie;

  const faltamH = String(Math.floor(tempoRestanteSeg / 3600)).padStart(2, "0");
  const faltamM = String(Math.floor((tempoRestanteSeg % 3600) / 60)).padStart(
    2,
    "0",
  );

  document.getElementById("est-series").textContent = seriesRestantes;
  document.getElementById("est-ex").textContent = exerciciosIncompletos.size;
  document.getElementById("est-falta").textContent = `${faltamH}:${faltamM}`;
  // document.getElementById("est-vol").textContent = volumeTotal.toFixed(0);

  const inicioStr = WorkoutDraftService.getInicio();
  if (inicioStr) {
    const inicioMs = new Date(inicioStr).getTime();
    const agoraMs = Date.now();

    const decorridoSeg = Math.floor((agoraMs - inicioMs) / 1000);
    const ativoH = String(Math.floor(decorridoSeg / 3600)).padStart(2, "0");
    const ativoM = String(Math.floor((decorridoSeg % 3600) / 60)).padStart(
      2,
      "0",
    );

    document.getElementById("est-tempo").textContent = `${ativoH}:${ativoM}`;

    if (seriesRestantes > 0) {
      const dataFim = new Date(agoraMs + tempoRestanteSeg * 1000);
      const fimH = String(dataFim.getHours()).padStart(2, "0");
      const fimM = String(dataFim.getMinutes()).padStart(2, "0");
      document.getElementById("est-hora-fim").textContent = `${fimH}:${fimM}`;
    } else {
      document.getElementById("est-hora-fim").textContent = "--:--";
    }
  }
}