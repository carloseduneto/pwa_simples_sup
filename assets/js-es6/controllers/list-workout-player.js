import { GlobalLoader } from "../ui/global-loader.js";
import { WorkoutService } from "../services/workout.service.js";
import { WorkoutDraftService } from "../services/workout-draft.service.js";
import { AuthService } from "../services/auth.service.js";

// Variáveis locais de estado
let dadosParaEnvio = null;
let semanaBaseCache = null;

// Variáveis do Cronômetro
let timerInterval = null;

function updateTimerDisplay() {
  const display = document.getElementById("stopwatch-display");
  if (!display) return;

  let elapsed = parseInt(
    localStorage.getItem("treino_stopwatch_elapsed") || 0,
    10,
  );
  const startTime = parseInt(
    localStorage.getItem("treino_stopwatch_start") || 0,
    10,
  );

  if (startTime > 0) {
    elapsed += Date.now() - startTime;
  }

  const totalSeconds = Math.floor(elapsed / 1000);
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  display.textContent = `${m}:${s}`;
}

function playTimer() {
  clearInterval(timerInterval);
  if (!localStorage.getItem("treino_stopwatch_start")) {
    localStorage.setItem("treino_stopwatch_start", Date.now().toString());
  }
  document.getElementById("btn-play-timer")?.classList.add("hidden");
  document.getElementById("btn-pause-timer")?.classList.remove("hidden");

  updateTimerDisplay();
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function pauseTimer() {
  clearInterval(timerInterval);
  const startTime = parseInt(
    localStorage.getItem("treino_stopwatch_start") || 0,
    10,
  );
  if (startTime > 0) {
    const elapsed = parseInt(
      localStorage.getItem("treino_stopwatch_elapsed") || 0,
      10,
    );
    localStorage.setItem(
      "treino_stopwatch_elapsed",
      (elapsed + (Date.now() - startTime)).toString(),
    );
    localStorage.removeItem("treino_stopwatch_start");
  }
  document.getElementById("btn-pause-timer")?.classList.add("hidden");
  document.getElementById("btn-play-timer")?.classList.remove("hidden");
  updateTimerDisplay();
}

function stopTimer() {
  clearInterval(timerInterval);
  localStorage.removeItem("treino_stopwatch_start");
  localStorage.setItem("treino_stopwatch_elapsed", "0");
  document.getElementById("btn-pause-timer")?.classList.add("hidden");
  document.getElementById("btn-play-timer")?.classList.remove("hidden");
  updateTimerDisplay();
}

function restartAndPlayTimer() {
  stopTimer();
  playTimer();
}

function restoreTimerState() {
  if (localStorage.getItem("treino_stopwatch_start")) {
    playTimer();
  } else {
    updateTimerDisplay();
  }
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

      let titleHtml = `<div class="header-exercicio"><h4>${item.exercicios.nome}`;
      if (item.tecnica_intensificacao == null) {
        item.tecnica_intensificacao = "";
      }
      titleHtml += ` - <em>${item.series_alvo}&times${item.repeticoes_alvo} ${item.tecnica_intensificacao}</em>`;
      titleHtml += `</h4>`;
      titleHtml += `<button class="btn-opcoes-exercicio btn-icon-dynamic-header-transparent">
         <span class="material-symbols-rounded">more_vert</span> 
      </button></div>`;
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
    // --- FUNDO DA TELA E MODAL ---
    const bottomHtml = `
      <div class="container-exercicio" style="margin-top: 20px; padding: 15px;">
          <h4 style="margin-bottom: 10px;">Observações</h4>
          <textarea id="obs-treino" style="width: 100%; border: 1px solid #ddd; border-radius: 8px; padding: 10px; background: transparent; color: inherit; font-family: inherit;" rows="3" placeholder="Como foi o treino?"></textarea>
      </div>

      <div style="text-align: center; margin: 20px 15px 100px 15px;">
          <button id="concluir-treino-btn" style="width: 100%; padding: 15px; border-radius: 8px; background: var(--primary-color); color: #fff; font-size: 1.1rem; border: none; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 10px;">
             <span class="material-symbols-rounded">done_all</span> 
             Concluir Treino
          </button>
      </div>

<div id="modal-estatisticas" class="modal-overlay hidden" style="z-index: 1000;">
  <div class="modal-content" style="max-width: 90%; width: 360px; padding: 24px; background: var(--bg-color, #fff); border-radius: 16px; color: inherit; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
    
<div style="display: flex; width: 100%; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h3 style="margin: 0; font-size: 1.3rem; font-weight: 600; text-align: left; line-height: 1.2; flex: 1;">Estatísticas da Sessão</h3>
      <button id="btn-close-stats" style="width: 10%; aspect-ratio: 1/1; background: none; border: none; font-size: 1.8rem; color: inherit; line-height: 0.8; padding: 0; cursor: pointer; opacity: 0.7;">&times;</button>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <div style="text-align: center;">
        <label style="display: block; font-size: 0.85rem; margin-bottom: 8px; opacity: 0.8; white-space: nowrap;">Pausa (min : seg)</label>
        <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
          <input type="number" id="est-pausa-m" value="1" min="0" style="flex: 1; width: 100%; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center; font-size: 1rem;">
          <span style="opacity: 0.6; font-weight: bold;">:</span>
          <input type="number" id="est-pausa-s" value="30" min="0" max="59" style="flex: 1; width: 100%; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center; font-size: 1rem;">
        </div>
      </div>
      <div style="text-align: center;">
        <label style="display: block; font-size: 0.85rem; margin-bottom: 8px; opacity: 0.8; white-space: nowrap;">Execução (min : seg)</label>
        <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
          <input type="number" id="est-exec-m" value="0" min="0" style="flex: 1; width: 100%; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center; font-size: 1rem;">
          <span style="opacity: 0.6; font-weight: bold;">:</span>
          <input type="number" id="est-exec-s" value="30" min="0" max="59" style="flex: 1; width: 100%; padding: 8px 4px; border-radius: 8px; border: 1px solid #ddd; background: transparent; color: inherit; text-align: center; font-size: 1rem;">
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 0.95rem; opacity: 0.9; margin-bottom: 24px;">
      <div style="text-align: left; white-space: nowrap;">Séries rest.: <strong id="est-series">0</strong></div>
      <div style="text-align: left; white-space: nowrap;">Ex. rest.: <strong id="est-ex">0</strong></div>
      <div style="text-align: left; white-space: nowrap;">Tempo ativo: <strong id="est-tempo">00:00</strong></div>
      <div style="text-align: left; white-space: nowrap;">Falta aprox.: <strong id="est-falta">00:00</strong></div>
    </div>
    
    <div style="padding-top: 20px; border-top: 1px solid rgba(128, 128, 128, 0.2); text-align: center;">
      <span style="font-size: 1.05rem; opacity: 0.9;">Fim previsto: <strong id="est-hora-fim" style="font-size: 1.15rem; margin-left: 4px;">--:--</strong></span>
      <!-- <span style="color: var(--primary-color);">Volume: <strong id="est-vol">0</strong> kg</span>-->
    </div>
  </div>
</div>
    `;
    /*html*/
    const menuOpcoesHtml = `
      <div id="pop-opcoes-exercicio" style="display: none; position: absolute; z-index: 9999; background: var(--bg-color, #fff); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 12px 16px; width: max-content; flex-direction: column; gap: 8px;">
        <div id="btn-open-estatisticas-ex" class="menu-item-opcao" style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: inherit;">
          <span class="material-symbols-rounded" style="font-size: 1.2rem;">data_usage</span>
          <span style="font-size: 1rem;">Estatísticas</span>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(128, 128, 128, 0.2); margin: 4px 16px;">
        <div id="btn-open-avaliar-intensidade" class="menu-item-opcao" style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: inherit;">
          <span class="material-symbols-rounded" style="font-size: 1.2rem;">bar_chart</span>
          <span style="font-size: 0.95rem;">Avaliar intes. e vol.</span>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(128, 128, 128, 0.2); margin: 4px 16px;">
        <div id="btn-toggle-desconsiderar" class="menu-item-opcao" style="display: flex; align-items: center; gap: 12px; cursor: pointer; color: inherit;">
          <span class="material-symbols-rounded icon-desconsiderar" style="font-size: 1.2rem;">do_not_disturb_on</span>
          <span class="text-desconsiderar" style="font-size: 1rem;">Desconsiderar ex.</span>
        </div>
      </div>

      <div id="pop-estatisticas-exercicio" style="display: none; position: absolute; z-index: 9999; background: var(--bg-color, #fff); border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 16px; width: max-content; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; gap: 24px;">
          <span style="opacity: 0.8;">Volume anterior</span>
          <strong id="pop-est-vol-ant">0kg</strong>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(128, 128, 128, 0.2); margin: 0;">
        <div style="display: flex; justify-content: space-between; gap: 24px;">
          <span style="opacity: 0.8;">Volume atual</span>
          <strong id="pop-est-vol-atual">0kg</strong>
        </div>
        <hr style="border: 0; border-top: 1px solid rgba(128, 128, 128, 0.2); margin: 0;">
        <div style="display: flex; justify-content: space-between; gap: 24px;">
          <span style="opacity: 0.8;">% variação</span>
          <strong id="pop-est-vol-var">0%</strong>
        </div>
      </div>
    `;
    wrapperTraining.insertAdjacentHTML("beforeend", menuOpcoesHtml);
    wrapperTraining.insertAdjacentHTML("beforeend", bottomHtml);

    contentDiv.appendChild(wrapperTraining);

    // --- EVENTOS DO CRONÔMETRO ---

    // --- ESTADO INICIAL DO CRONÔMETRO ---
    restoreTimerState();

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

    const popOpcoes = document.getElementById("pop-opcoes-exercicio");
    const popEstatisticas = document.getElementById(
      "pop-estatisticas-exercicio",
    );

    wrapperTraining.addEventListener("click", (event) => {
      // 1. Lógica de Marcar Check
      const checkBtn = event.target.closest(".checkExercise");
      if (checkBtn) {
        const row = checkBtn.closest(".rowExercise");
        setTimeout(() => {
          if (row.dataset.realizado === "true") {
            restartAndPlayTimer();
          }
          atualizarEstatisticas();
        }, 50);
        return;
      }

      // 2. Lógica de Desconsiderar / Reconsiderar
      const targetToggleDesconsiderar = event.target.closest(
        "#btn-toggle-desconsiderar",
      );
      if (targetToggleDesconsiderar) {
        const exercicioId = popOpcoes.dataset.exercicioId;
        const container = document.querySelector(
          `.container-exercicio[data-exercicio-id="${exercicioId}"]`,
        );

        if (container) {
          const isDesconsiderado = container.dataset.desconsiderado === "true";
          const h4 = container.querySelector("h4");

          let desconsideradosCache = JSON.parse(
            localStorage.getItem("treino_cache_desconsiderados") || "[]",
          );

          if (isDesconsiderado) {
            container.dataset.desconsiderado = "false";
            container.style.opacity = "1";
            const iconElement = h4.querySelector(".icon-h4-desconsiderado");
            if (iconElement) iconElement.remove();

            desconsideradosCache = desconsideradosCache.filter(
              (id) => id !== exercicioId,
            );
          } else {
            container.dataset.desconsiderado = "true";
            container.style.opacity = "0.5";
            if (!h4.querySelector(".icon-h4-desconsiderado")) {
              h4.insertAdjacentHTML(
                "afterbegin",
                `<span class="material-symbols-rounded icon-h4-desconsiderado" style="font-size: 1.2rem; margin-right: 4px; vertical-align: middle;">do_not_disturb_on</span>`,
              );
            }

            if (!desconsideradosCache.includes(exercicioId)) {
              desconsideradosCache.push(exercicioId);
            }
          }

          localStorage.setItem(
            "treino_cache_desconsiderados",
            JSON.stringify(desconsideradosCache),
          );
          atualizarEstatisticas();
          popOpcoes.style.display = "none";
        }
        event.stopPropagation();
        return;
      }

      // 3. Lógica de Abertura das Estatísticas e Cálculos
      const targetOpenEstatisticas = event.target.closest(
        "#btn-open-estatisticas-ex",
      );
      if (targetOpenEstatisticas) {
        const exercicioId = popOpcoes.dataset.exercicioId;
        const container = document.querySelector(
          `.container-exercicio[data-exercicio-id="${exercicioId}"]`,
        );

        if (container) {
          let volAnterior = 0;
          let volAtual = 0;

          const rows = container.querySelectorAll(".rowExercise");
          rows.forEach((row) => {
            // Volume Anterior
            const btnAnt = row.querySelector(".anteriorExercise");
            if (btnAnt && btnAnt.textContent.includes("x")) {
              const partes = btnAnt.textContent.split("x");
              const rAnt = parseFloat(partes[0]) || 0;
              const kAnt = parseFloat(partes[1]) || 0;
              volAnterior += rAnt * kAnt;
            }

            // Volume Atual (Usa value ou placeholder)
            const inputKg = row.querySelector(".kgExercise");
            const inputReps = row.querySelector(".repsExercise");
            const kAtual = parseFloat(
              inputKg.value || inputKg.placeholder || 0,
            );
            const rAtual = parseFloat(
              inputReps.value || inputReps.placeholder || 0,
            );
            volAtual += kAtual * rAtual;
          });

          // Variação
          let variacao = 0;
          let sinal = "";
          if (volAnterior > 0) {
            variacao = ((volAtual - volAnterior) / volAnterior) * 100;
            if (variacao > 0) sinal = "+";
          }
          let variacaoComma = variacao.toFixed(2).replace(".", ",");

          document.getElementById("pop-est-vol-ant").textContent =
            `${volAnterior.toFixed(0)}kg`;
          document.getElementById("pop-est-vol-atual").textContent =
            `${volAtual.toFixed(0)}kg`;
          document.getElementById("pop-est-vol-var").textContent =
            volAnterior > 0 ? `${sinal}${variacaoComma}%` : "--";

          // Alterna as telas
          popOpcoes.style.display = "none";

          const btnOpcoesRef = container.querySelector(".btn-opcoes-exercicio");
          const rect = btnOpcoesRef.getBoundingClientRect();
          popEstatisticas.style.display = "flex";

          const top = rect.bottom + window.scrollY;
          let left =
            rect.left +
            window.scrollX -
            (popEstatisticas.offsetWidth - rect.width);
          if (left < 10) left = 10;

          popEstatisticas.style.top = `${top}px`;
          popEstatisticas.style.left = `${left}px`;
          popEstatisticas.dataset.exercicioId = exercicioId;
        }
        event.stopPropagation();
        return;
      }

      // 3.5 Lógica de Navegação para Avaliar Intensidade e Volume
      const targetOpenAvaliar = event.target.closest(
        "#btn-open-avaliar-intensidade",
      );
      if (targetOpenAvaliar) {
        const exercicioId = popOpcoes.dataset.exercicioId;
        const container = document.querySelector(
          `.container-exercicio[data-exercicio-id="${exercicioId}"]`,
        );

        // Extrai os dados digitados agora
        const seriesHoje = [];
        if (container) {
          container.querySelectorAll(".rowExercise").forEach((row, index) => {
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
            seriesHoje.push({ ordem: index + 1, carga: kg, repeticoes: reps });
          });

          const nomeExercicio = container.querySelector("h4").textContent;
          // Salva na sessão temporária
          sessionStorage.setItem(
            "treino_atual_avaliacao",
            JSON.stringify({
              exercicioId,
              nome: nomeExercicio,
              series: seriesHoje,
            }),
          );
        }

        popOpcoes.style.display = "none";

        if (typeof onNavigate === "function") {
          onNavigate("exercisesIntensityVolume", exercicioId);
        }

        event.stopPropagation();
        return;
      }

      // 4. Lógica de Abertura/Fechamento do Pop-up Principal (Três Pontos)
      const btnOpcoes = event.target.closest(".btn-opcoes-exercicio");
      if (btnOpcoes) {
        const container = btnOpcoes.closest(".container-exercicio");
        const exercicioIdAtual = container.dataset.exercicioId;

        const isOpcoesAberto =
          popOpcoes.style.display === "flex" &&
          popOpcoes.dataset.exercicioId === exercicioIdAtual;
        const isEstatAberto =
          popEstatisticas.style.display === "flex" &&
          popEstatisticas.dataset.exercicioId === exercicioIdAtual;

        // Fecha se um dos dois já estiver aberto no mesmo exercício
        if (isOpcoesAberto || isEstatAberto) {
          popOpcoes.style.display = "none";
          popEstatisticas.style.display = "none";
        } else {
          popEstatisticas.style.display = "none"; // Garante que a de estatística não sobreponha

          const isDesconsiderado = container.dataset.desconsiderado === "true";
          const btnToggle = document.getElementById("btn-toggle-desconsiderar");
          const iconDesc = btnToggle.querySelector(".icon-desconsiderar");
          const textDesc = btnToggle.querySelector(".text-desconsiderar");

          if (isDesconsiderado) {
            iconDesc.textContent = "check";
            textDesc.textContent = "Reconsiderar exerc.";
          } else {
            iconDesc.textContent = "do_not_disturb_on";
            textDesc.textContent = "Desconsiderar ex.";
          }

          popOpcoes.style.display = "flex";

          const rect = btnOpcoes.getBoundingClientRect();
          const top = rect.bottom + window.scrollY;
          let left =
            rect.left + window.scrollX - (popOpcoes.offsetWidth - rect.width);

          if (left < 10) left = 10;

          popOpcoes.style.top = `${top}px`;
          popOpcoes.style.left = `${left}px`;
          popOpcoes.dataset.exercicioId = exercicioIdAtual;
        }
        event.stopPropagation();
      }
    });

    document.addEventListener("click", (e) => {
      if (popOpcoes && popOpcoes.style.display === "flex") {
        if (!popOpcoes.contains(e.target)) {
          popOpcoes.style.display = "none";
        }
      }
      if (popEstatisticas && popEstatisticas.style.display === "flex") {
        if (!popEstatisticas.contains(e.target)) {
          popEstatisticas.style.display = "none";
        }
      }
    });

    // --- RESTAURAÇÃO: BOTÃO CONCLUIR NO HEADER ---
    // const divConteudoHeader = document.querySelector(".header-content");
    // const btnAntigo = document.getElementById("concluir-treino-btn");
    // if (btnAntigo) btnAntigo.remove();

    // const btnConcluirHtml = `
    //   <button id="concluir-treino-btn" class="btn-icon-dynamic-header-transparent">
    //      <span class="material-symbols-rounded">done_all</span>
    //      <span class="btn-text-header">Concluir</span>
    //   </button>
    // `;

    // if (divConteudoHeader) {
    //   divConteudoHeader.insertAdjacentHTML("beforeend", btnConcluirHtml);
    // } else {
    //   wrapperTraining.insertAdjacentHTML(
    //     "beforeend",
    //     `<div style="text-align:center; margin-top:20px;">${btnConcluirHtml}</div>`,
    //   );
    // }

    // --- NOVO BOTÃO DE ESTATÍSTICAS NO HEADER ---
    const divConteudoHeader = document.querySelector(".header-content");
    const btnAntigo = document.getElementById("btn-open-stats");
    if (btnAntigo) btnAntigo.remove();

    const btnEstatisticasHtml = `
      <button id="btn-open-stats" class="btn-icon-dynamic-header-transparent">
         <span class="material-symbols-rounded">more_vert</span> 
         <!--<span class="btn-text-header">Infos</span>-->
      </button>
    `;

    if (divConteudoHeader) {
      divConteudoHeader.insertAdjacentHTML("beforeend", btnEstatisticasHtml);
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

    // NOVO: Restaurar estado de exercícios desconsiderados
    const desconsideradosCache = JSON.parse(
      localStorage.getItem("treino_cache_desconsiderados") || "[]",
    );
    desconsideradosCache.forEach((id) => {
      const container = wrapperTraining.querySelector(
        `.container-exercicio[data-exercicio-id="${id}"]`,
      );
      if (container) {
        container.dataset.desconsiderado = "true";
        container.style.opacity = "0.5";
        const h4 = container.querySelector("h4");
        if (h4 && !h4.querySelector(".icon-h4-desconsiderado")) {
          h4.insertAdjacentHTML(
            "afterbegin",
            `<span class="material-symbols-rounded icon-h4-desconsiderado" style="font-size: 1.2rem; margin-right: 4px; vertical-align: middle;">do_not_disturb_on</span>`,
          );
        }
      }
    });

    const btnReiniciar = document.getElementById("reiniciar-treino-btn");
    if (btnReiniciar) {
      const novoReiniciar = btnReiniciar.cloneNode(true);
      btnReiniciar.parentNode.replaceChild(novoReiniciar, btnReiniciar);

      novoReiniciar.onclick = () => {
        if (confirm("Limpar dados e reiniciar?")) {
          WorkoutDraftService.limparRascunho();
          localStorage.removeItem("treino_cache_desconsiderados"); // Limpa cache de desconsiderados
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

    // --- CONTROLES DO MODAL DE ESTATÍSTICAS ---
    const btnOpenStats = document.getElementById("btn-open-stats");
    const btnCloseStats = document.getElementById("btn-close-stats");
    const modalStats = document.getElementById("modal-estatisticas");

    if (btnOpenStats && modalStats) {
      btnOpenStats.onclick = () => {
        atualizarEstatisticas();
        modalStats.classList.remove("hidden");
      };
    }
    if (btnCloseStats && modalStats) {
      btnCloseStats.onclick = () => modalStats.classList.add("hidden");
    }
    if (modalStats) {
      modalStats.addEventListener("click", (e) => {
        if (e.target === modalStats) modalStats.classList.add("hidden");
      });
    }
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
    localStorage.removeItem("treino_cache_desconsiderados");

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

    // Ignora exercícios desconsiderados
    if (container.dataset.desconsiderado === "true") return;

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
