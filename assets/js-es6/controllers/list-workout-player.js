import { GlobalLoader } from "../ui-ux/global-loader.js";
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
    // Injeta o Smart Header (Voltar/Menu) dentro do wrapper
    if (templateSmartHeader) {
      wrapperTraining.insertAdjacentHTML(
        "beforeend",
        templateSmartHeader.innerHTML,
      );
    }

    // Injeta o Título do Treino e Botão Reiniciar
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
        h => h.exercicio_id === item.exercicios.id,
      );

      // Título
      let titleHtml = `<h4>${item.exercicios.nome}`;
      if (item.tecnica_intensificacao) {
        titleHtml += ` - <em>${item.tecnica_intensificacao}</em>`;
      }
      titleHtml += `</h4>`;
      wrapperExercises.insertAdjacentHTML("beforeend", titleHtml);

      // Recomendações
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

      // Header Tabela (Kg/Reps)
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
        // Aquecimento
        for (let i = 0; i < item.treino_recomendacoes.valor; i++) {
          gerarLinha(item.treino_recomendacoes.detalhes[i].label, i);
        }
        // Séries Reais
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
        // Séries Fixas
        const qtdSeries = item.series_alvo || 3;
        for (let i = 0; i < qtdSeries; i++) {
          gerarLinha(i + 1, i);
        }
      }

      wrapperTraining.appendChild(wrapperExercises);
    }

    // Adiciona o wrapper com os exercícios ao DOM
    contentDiv.appendChild(wrapperTraining);

    // --- RESTAURAÇÃO: BOTÃO CONCLUIR NO HEADER ---
    // Busca o header GLOBAL da aplicação onde o botão deve morar
    const divConteudoHeader = document.querySelector(".header-content");

    // Remove botão antigo se existir (para evitar duplicação ao recarregar a tela)
    const btnAntigo = document.getElementById("concluir-treino-btn");
    if (btnAntigo) btnAntigo.remove();

    const btnConcluirHtml = `
      <button id="concluir-treino-btn" class="btn-icon-dynamic-header">
         <span class="material-symbols-rounded">done_all</span> 
         <span class="btn-text-header">Concluir</span>
      </button>
    `;

    if (divConteudoHeader) {
      // Insere no header global (Topo direito)
      divConteudoHeader.insertAdjacentHTML("beforeend", btnConcluirHtml);
    } else {
      // Fallback de segurança: Se não achar o header, põe no final do treino
      wrapperTraining.insertAdjacentHTML(
        "beforeend",
        `<div style="text-align:center; margin-top:20px;">${btnConcluirHtml}</div>`,
      );
    }

    // Modal (Sempre no final do documento para o CSS funcionar)
    // Usamos insertAdjacentHTML no contentDiv para ficar fora do scroll se possível, ou no wrapper
    contentDiv.insertAdjacentHTML(
      "beforeend",
      `
        <div id="modal-conclusao" class="modal-overlay hidden">
            <div class="modal-content">
                <h3>Treino Incompleto</h3>
                <p>Existem séries preenchidas que não foram marcadas como concluídas.</p>
                <div class="modal-actions">
                    <button id="btn-modal-descartar" class="secondary-button">Salvar Apenas Realizados</button>
                    <button id="btn-modal-cancelar" class="text-button">Voltar</button>
                </div>
            </div>
        </div>
    `,
    );

    // --- EVENTOS E LOGICA ---

    // 1. Restaura rascunho dos inputs
    WorkoutDraftService.restaurarDados();

    // 2. Botão Reiniciar (Fica dentro do título do treino)
    const btnReiniciar = document.getElementById("reiniciar-treino-btn");
    if (btnReiniciar) {
      // Remove listeners antigos clonando
      const novoReiniciar = btnReiniciar.cloneNode(true);
      btnReiniciar.parentNode.replaceChild(novoReiniciar, btnReiniciar);

      novoReiniciar.onclick = () => {
        if (confirm("Limpar dados e reiniciar?")) {
          WorkoutDraftService.limparRascunho();
          initWorkoutPlayer(onNavigate, templateId);
        }
      };
    }

    // 3. Botão Concluir (Pode estar no Header ou no Body)
    const btnConcluir = document.getElementById("concluir-treino-btn");
    if (btnConcluir) {
      // Remove listeners antigos
      const novoConcluir = btnConcluir.cloneNode(true);
      btnConcluir.parentNode.replaceChild(novoConcluir, btnConcluir);

      novoConcluir.onclick = async () => {
        await processarConclusao(templateId, onNavigate);
      };
    }

    // 4. Listener de Input para salvar rascunho
    // Verifica se a função global ainda existe ou usa o Service
    if (typeof window.salvarInputLocalmente === "function") {
      wrapperTraining.addEventListener("input", event => {
        if (
          event.target.matches(".kgExercise, .repsExercise, .seriesExercise")
        ) {
          window.salvarInputLocalmente(event.target);
        }
      });
    }

    // 5. Configura Modal
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

  containers.forEach(container => {
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
    const modal = document.getElementById("modal-conclusao");
    if (modal) modal.classList.remove("hidden");
  } else {
    const seriesFiltradas = seriesParaSalvar.filter(s => s.realizado);
    await enviarTreino(seriesFiltradas, onNavigate);
  }
}

async function enviarTreino(series, onNavigate) {
  if (!series || series.length === 0) {
    alert("Nenhuma série marcada como realizada.");
    return;
  }
  dadosParaEnvio.series = series;

  try {
    const btn = document.getElementById("concluir-treino-btn");
    if (btn) {
      btn.dataset.originalText = btn.innerHTML; // Salva ícone e texto
      btn.innerHTML =
        "<span class='material-symbols-rounded'>hourglass_empty</span> Salvando...";
      btn.disabled = true;
    }

    await WorkoutService.saveSession(dadosParaEnvio);

    alert("Treino concluído com sucesso!");
    WorkoutDraftService.limparRascunho();

    // Remove botão do header para limpar a interface antes de sair
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

function setupModalEvents(templateId, onNavigate) {
  const btnDescartar = document.getElementById("btn-modal-descartar");
  const btnCancelar = document.getElementById("btn-modal-cancelar");
  const modal = document.getElementById("modal-conclusao");

  if (btnDescartar) {
    // Clona para limpar eventos anteriores
    const novoBtn = btnDescartar.cloneNode(true);
    btnDescartar.parentNode.replaceChild(novoBtn, btnDescartar);

    novoBtn.onclick = async () => {
      modal.classList.add("hidden");
      const seriesFiltradas = dadosParaEnvio.series.filter(s => s.realizado);
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
