import { GlobalLoader } from "../ui/global-loader.js";
import { TemplateItensService } from "../services/itens-template.service.js";

// 1. Variável Global para controlar o "Fiscal" e o Estado
let meuSortable = null;
let ESTA_REORDENANDO = false; // Nosso "interruptor"
let onNavigateGlobal = null; // Guarda a função de navegação para usar no botão cancelar
let meuGrafico = null; // Controle da instância do Chart.js

// --- EVENTOS GLOBAIS DE PROTEÇÃO DE ROTA ---
// Bloqueia F5 ou fechamento da aba
window.addEventListener("beforeunload", (e) => {
  if (ESTA_REORDENANDO) {
    e.preventDefault();
    e.returnValue = "";
  }
});

// Captura o botão "Voltar" nativo do navegador (ou gestos em mobile)
window.addEventListener("popstate", (e) => {
  if (ESTA_REORDENANDO) {
    const sair = confirm(
      "Deseja sair da tela? As alterações feitas não foram salvas e serão perdidas.",
    );
    if (!sair) {
      // Reinsere o estado atual no histórico para anular a ação de voltar
      history.pushState(null, "", document.URL);
    } else {
      // Confirma a saída, libera o estado
      ESTA_REORDENANDO = false;
      if (meuSortable) meuSortable.destroy();
    }
  }
});

// Sua função principal
export async function renderizarListItensTemplate(onNavigate) {
  const currentTemplateId = localStorage.getItem("currentTemplateId");
  onNavigateGlobal = onNavigate; // Salva para o recarregamento caso o usuário cancele

  if (!currentTemplateId || currentTemplateId === "null") {
    console.warn("Tentativa de carregar itens sem ID de template válido.");
    if (onNavigate) onNavigate("templates");
    return;
  }

  // --- VINCULAR O BOTÃO PLAY ---
  const btnStart = document.getElementById("btn-start-internal");
  if (btnStart) {
    btnStart.onclick = () => {
      if (typeof onNavigate === "function") {
        console.log("Iniciando treino:", currentTemplateId);
        onNavigate("detalhes", currentTemplateId);
      }
    };
  }

  // --- VINCULAR O BOTÃO ADICIONAR ---
  const btnAdd = document.getElementById("btn-add-item-template");
  if (btnAdd) {
    btnAdd.removeAttribute("onclick");
    btnAdd.onclick = () => {
      localStorage.removeItem("editTemplateItem");
      if (onNavigate) onNavigate("templateItensForm");
    };
  }

  // --- VINCULAR O BOTÃO CANCELAR ---
  const btnCancel = document.getElementById("btn-cancel-reorder");
  if (btnCancel) {
    // Clone para evitar múltiplos event listeners acumulados
    const novoBtnCancel = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(novoBtnCancel, btnCancel);
    novoBtnCancel.onclick = cancelarReordenacao;
  }

  const container = document.getElementById("itens-template-container");
  const template = document.getElementById("template-template-list-item");

  // RESET DO ESTADO: Sempre que entrar na tela, começa no modo normal
  ESTA_REORDENANDO = false;
  configurarBotaoReordenar(container);

  if (!container || !template) return;

  // Limpeza Imediata
  container.innerHTML = GlobalLoader.getSimple();

  try {
    const exercicios = await TemplateItensService.getByid(currentTemplateId);
    container.innerHTML = "";

    if (!exercicios || exercicios.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; opacity: 0.6; padding: 20px;">Nenhum exercício cadastrado.</p>';
      return;
    }

    exercicios.forEach((exercicio) => {
      const clone = template.content
        ? template.content.cloneNode(true)
        : template.cloneNode(true);

      // --- IDENTIFICAR O ITEM PARA O SORTABLE ---
      const cardPrincipal = clone.querySelector(".exercise-item");
      if (cardPrincipal) cardPrincipal.dataset.id = exercicio.id;

      const nomeEl = clone.querySelector(".exercise-item__name");
      const grupoEl = clone.querySelector(".exercise-item__group");

      if (nomeEl) nomeEl.innerText = exercicio.exercicios?.nome || "Exercício";
      if (grupoEl)
        grupoEl.innerText =
          exercicio.exercicios?.grupo_muscular?.nome || "Sem grupo";

      // --- Botão Editar ---
      const btnEdit = clone.querySelector(".exercise-item__btn--edit");
      if (btnEdit) {
        btnEdit.dataset.id = exercicio.id;
        btnEdit.onclick = () => {
          localStorage.setItem("editTemplateItem", exercicio.id);
          if (onNavigate) onNavigate("templateItensForm");
        };
      }

      // --- Botão Excluir ---
      const btnDelete = clone.querySelector(".exercise-item__btn--delete");
      if (btnDelete) {
        btnDelete.dataset.id = exercicio.id;
        btnDelete.onclick = async () => {
          const confirmacao = confirm(
            `Deseja realmente excluir "${exercicio.exercicios?.nome}"?`,
          );
          if (confirmacao) {
            try {
              await TemplateItensService.delete(exercicio.id);
              renderizarListItensTemplate(onNavigate);
            } catch (err) {
              alert("Erro ao excluir: " + err.message);
            }
          }
        };
      }

      container.appendChild(clone);
    });

    // Injeta os dados no gráfico após montar a lista
    const dadosGrafico = processarDadosGrafico(exercicios);
    renderizarGraficoRadar(dadosGrafico);
  } catch (error) {
    console.error(error);
    container.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar lista.</p>';
  }
}

// --- FUNÇÃO 1: CONFIGURAR O BOTÃO DO HEADER ---
function configurarBotaoReordenar(container) {
  const btnReorder = document.getElementById("template-itens-reorder");
  if (!btnReorder) return;

  const novoBtn = btnReorder.cloneNode(true);
  btnReorder.parentNode.replaceChild(novoBtn, btnReorder);

  atualizarVisualBotaoHeader(false, novoBtn);

  novoBtn.onclick = async () => {
    if (!ESTA_REORDENANDO) {
      // Injeta um estado no histórico para capturar o "Back" nativo
      history.pushState(null, "", document.URL);

      alternarModoVisual(true);
      ESTA_REORDENANDO = true;
      initSortable(container);
    } else {
      await salvarNovaOrdem(novoBtn);
    }
  };
}

// --- FUNÇÃO 2: A MÁGICA VISUAL (ESCONDE/MOSTRA) ---
function alternarModoVisual(ativo) {
  const container = document.getElementById("screen-template-itens");
  const listaContainer = document.getElementById("itens-template-container");
  const btnReorder = document.getElementById("template-itens-reorder");

  if (btnReorder) atualizarVisualBotaoHeader(ativo, btnReorder);
  if (!listaContainer) return;

  const editBtns = listaContainer.querySelectorAll(".exercise-item__btn--edit");
  const delBtns = listaContainer.querySelectorAll(
    ".exercise-item__btn--delete",
  );
  const dragBtns = listaContainer.querySelectorAll(".exercise-item__btn--drag");

  const addBtn = document.querySelectorAll(".primary-button--add-center");
  const startBtn = document.querySelectorAll("#btn-start-internal");

  const cancelBtn = document.querySelectorAll("#btn-cancel-reorder");
  const backBtn = document.querySelectorAll(".navigation-buttons");

  if (ativo) {
    // MODO REORDENAR
    if (container) container.classList.add("reordering-mode");

    editBtns.forEach((b) => b.classList.add("hidden"));
    delBtns.forEach((b) => b.classList.add("hidden"));
    dragBtns.forEach((b) => b.classList.remove("hidden"));

    addBtn.forEach((b) => b.classList.add("hidden"));
    startBtn.forEach((b) => b.classList.add("hidden"));

    cancelBtn.forEach((b) => b.classList.remove("hidden"));
    backBtn.forEach((b) => b.classList.add("hidden"));
  } else {
    // MODO NORMAL
    if (container) container.classList.remove("reordering-mode");

    editBtns.forEach((b) => b.classList.remove("hidden"));
    delBtns.forEach((b) => b.classList.remove("hidden"));
    dragBtns.forEach((b) => b.classList.add("hidden"));

    addBtn.forEach((b) => b.classList.remove("hidden"));
    startBtn.forEach((b) => b.classList.remove("hidden"));

    cancelBtn.forEach((b) => b.classList.add("hidden"));
    backBtn.forEach((b) => b.classList.remove("hidden"));
  }
}

// --- FUNÇÃO 3: ATUALIZA O CABEÇALHO ---
function atualizarVisualBotaoHeader(ativo, btnElement) {
  const btn = btnElement || document.getElementById("template-itens-reorder");
  if (!btn) return;

  const icon = btn.querySelector(".material-symbols-rounded");
  const text = btn.querySelector(".btn-text-header");

  if (ativo) {
    if (icon) {
      icon.innerText = "check";
      icon.classList.remove("rotate180");
      icon.style.color = "#FF6B00";
    }
    if (text) {
      text.innerText = "Salvar";
      text.style.color = "#FF6B00";
    }
  } else {
    if (icon) {
      icon.innerText = "low_priority";
      icon.classList.add("rotate180");
      icon.style.color = "";
    }
    if (text) {
      text.innerText = "Reordenar";
      text.style.color = "";
    }
  }
}

// --- FUNÇÃO 4: SALVAR NO BANCO ---
async function salvarNovaOrdem(btnContext) {
  if (!meuSortable) return;

  const btn = btnContext || document.getElementById("template-itens-reorder");
  const icon = btn ? btn.querySelector(".material-symbols-rounded") : null;

  try {
    if (icon) icon.innerText = "hourglass_empty";

    const novaOrdemIds = meuSortable.toArray();
    await TemplateItensService.updateOrderBatch(novaOrdemIds);

    alternarModoVisual(false);
    ESTA_REORDENANDO = false;

    if (meuSortable) {
      meuSortable.destroy();
      meuSortable = null;
    }
  } catch (err) {
    alert("Erro ao salvar ordem: " + err.message);
    if (icon) icon.innerText = "check";
  }
}

// --- FUNÇÃO 5: CANCELAR REORDENAÇÃO ---
function cancelarReordenacao() {
  if (!ESTA_REORDENANDO) return;

  // Apenas cancela direto, desfaz visualmente e limpa a memória
  alternarModoVisual(false);
  ESTA_REORDENANDO = false;

  if (meuSortable) {
    meuSortable.destroy();
    meuSortable = null;
  }

  // Recarrega a lista para desfazer a ordem visual manipulada no DOM
  renderizarListItensTemplate(onNavigateGlobal);
}

// --- FUNÇÃO 6: INICIALIZA O SORTABLE ---
function initSortable(elementoLista) {
  if (typeof Sortable === "undefined") return;

  if (meuSortable) meuSortable.destroy();

  meuSortable = new Sortable(elementoLista, {
    animation: 150,
    handle: ".drag-handle",
  });
}

// --- FUNÇÃO 7: PROCESSAR DADOS PARA O GRÁFICO ---
function processarDadosGrafico(itensTemplate) {
  const distribuicao = {};

  if (!Array.isArray(itensTemplate)) return { labels: [], data: [] };

  itensTemplate.forEach((item) => {
    const series = Number(item.series_alvo) || 0;
    const exercicio = item.exercicios;

    if (!exercicio || !exercicio.musculo_exercicio) return;

    // Supabase pode retornar um objeto único em vez de array dependendo da inferência da FK.
    // Forçamos a transformação em array para garantir o funcionamento do forEach.
    const relacoes = Array.isArray(exercicio.musculo_exercicio)
      ? exercicio.musculo_exercicio
      : [exercicio.musculo_exercicio];

    relacoes.forEach((relacao) => {
      // O mesmo tratamento de segurança para o nível de músculos granulares
      const granular = Array.isArray(relacao.musculos_granulares)
        ? relacao.musculos_granulares[0]
        : relacao.musculos_granulares;

      const nomeMusculo = granular?.nome;
      if (!nomeMusculo) return;

      let multiplicador = 0;
      if (relacao.tipo === "principal") multiplicador = 1.0;
      if (relacao.tipo === "secundario") multiplicador = 0.5;

      if (multiplicador > 0) {
        if (!distribuicao[nomeMusculo]) distribuicao[nomeMusculo] = 0;
        distribuicao[nomeMusculo] += series * multiplicador;
      }
    });
  });

  return {
    labels: Object.keys(distribuicao).map((nome) =>
      nome.includes(" ") ? nome.split(" ") : nome,
    ),
    data: Object.values(distribuicao),
  };
}

// // --- FUNÇÃO 8: RENDERIZAR O GRÁFICO RADAR ---
// function renderizarGraficoRadar(dados) {
//   const ctx = document.getElementById("radar-chart-musculos");
//   if (!ctx) return;

//   if (meuGrafico) {
//     meuGrafico.destroy();
//   }

//   if (typeof Chart === "undefined") return;

//   // Plugin para pintar os fundos dos intervalos com cores alternadas
//   const pluginFundoAlternado = {
//     id: "fundoAlternado",
//     beforeDraw: (chart) => {
//       const {
//         ctx,
//         scales: { r },
//       } = chart;
//       if (!r || !r.ticks) return;

//       const ticks = r.ticks;
//       const totalPontas = chart.data.labels.length;

//       // Desenha de fora para dentro para que as formas menores sobreponham as maiores
//       for (let i = ticks.length - 1; i >= 0; i--) {
//         ctx.beginPath();
//         for (let j = 0; j < totalPontas; j++) {
//           // Captura a exata coordenada (x, y) da intersecção do radar
//           const { x, y } = r.getPointPositionForValue(j, ticks[i].value);
//           if (j === 0) ctx.moveTo(x, y);
//           else ctx.lineTo(x, y);
//         }
//         ctx.closePath();

//         // Alterna a cor com base no índice (par ou ímpar)
//         // Ajuste os valores rgba() se desejar escurecer ou mudar os tons
//         ctx.fillStyle =
//           i % 2 === 0 ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0)";
//         ctx.fill();
//       }
//     },
//   };

//   meuGrafico = new Chart(ctx, {
//     type: "radar",
//     data: {
//       labels: dados.labels,
//       datasets: [
//         {
//           data: dados.data,
//           backgroundColor: "#ff62141e", // Preenchimento semi-transparente
//           borderColor: "#ff6314", // Cor da linha
//           borderWidth: 2,
//           pointBackgroundColor: "#ff6314",
//           pointBorderColor: "#fff",
//           pointHoverBackgroundColor: "#fff",
//           pointHoverBorderColor: "#ff6314",
//         },
//       ],
//     },
//     plugins: [pluginFundoAlternado], // <-- Registro do plugin no gráfico
//     options: {
//       responsive: true,
//       maintainAspectRatio: false, // Lembre-se do contêiner com position: relative e height fixo no HTML
//       scales: {
//         r: {
//           beginAtZero: true,
//           ticks: {
//             display: true,
//           },
//         },
//       },
//       plugins: {
//         legend: {
//           display: false,
//         },
//       },
//     },
//   });
// }

// // --- FUNÇÃO 8: RENDERIZAR O GRÁFICO RADAR ---
// function renderizarGraficoRadar(dados) {
//   const ctx = document.getElementById("radar-chart-musculos");
//   if (!ctx) return;

//   if (meuGrafico) {
//     meuGrafico.destroy();
//   }

//   // Verifica se há a biblioteca carregada no window
//   if (typeof Chart === "undefined") return;

//   meuGrafico = new Chart(ctx, {
//     type: "radar",
//     data: {
//       labels: dados.labels,
//       datasets: [
//         {
//           data: dados.data,
//           backgroundColor: "#ff62141e", // Preenchimento semi-transparente
//           borderColor: "#ff6314", // Cor da linha
//           borderWidth: 2,
//           pointBackgroundColor: "#ff6314",
//           pointBorderColor: "#fff",
//           pointHoverBackgroundColor: "#fff",
//           pointHoverBorderColor: "#ff6314",
//         },
//       ],
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: true,
//       scales: {
//         r: {
//           beginAtZero: true,
//           ticks: {
//             display: true,
//           },
//           pointLabels: {
//             font: {
//               size: 11,
//             },
//             padding: 8,
//           },
//         },
//       },
//       plugins: {
//         legend: {
//           display: false, // Remove a legenda
//         },
//       },
//     },
//   });
// }

// --- FUNÇÃO 8: RENDERIZAR O GRÁFICO RADAR ---
function renderizarGraficoRadar(dados) {
  const ctx = document.getElementById("radar-chart-musculos");
  if (!ctx) return;

  if (meuGrafico) {
    meuGrafico.destroy();
  }

  if (typeof Chart === "undefined") return;

  // 1. Detecção Híbrida: Sistema + Horário
  const isSystemDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const horaAtual = new Date().getHours();
  const isNoite = horaAtual >= 18 || horaAtual < 6;

  const isDarkMode = isSystemDark || isNoite;

  // 2. Cores dinâmicas com contraste reforçado
  const corTexto = isDarkMode ? "#d4d4d4" : "#666666";
  const corGrid = isDarkMode
    ? "rgba(255, 255, 255, 0.15)"
    : "rgba(128, 128, 128, 0.1)";
  const corFundoZebra = isDarkMode
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.04)";

  // // Plugin para pintar os fundos dos intervalos com cores alternadas
  // const pluginFundoAlternado = {
  //   id: 'fundoAlternado',
  //   beforeDraw: (chart) => {
  //     const { ctx, scales: { r } } = chart;
  //     if (!r || !r.ticks) return;

  //     const ticks = r.ticks;
  //     const totalPontas = chart.data.labels.length;

  //     for (let i = ticks.length - 1; i >= 0; i--) {
  //       ctx.beginPath();
  //       for (let j = 0; j < totalPontas; j++) {
  //         const { x, y } = r.getPointPositionForValue(j, ticks[i].value);
  //         if (j === 0) ctx.moveTo(x, y);
  //         else ctx.lineTo(x, y);
  //       }
  //       ctx.closePath();

  //       // Aplica o fundo zebra dinâmico
  //       ctx.fillStyle = i % 2 === 0 ? corFundoZebra : 'rgba(255, 255, 255, 0)';
  //       ctx.fill();
  //     }
  //   }
  // };

  meuGrafico = new Chart(ctx, {
    type: "radar",
    data: {
      labels: dados.labels,
      datasets: [
        {
          data: dados.data,
          backgroundColor: "#ff62141e", // Preenchimento semi-transparente
          borderColor: "#ff6314", // Cor da linha
          borderWidth: 2,
          pointBackgroundColor: "#ff6314",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "#ff6314",
        },
      ],
    },
    // plugins: [pluginFundoAlternado],
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          beginAtZero: true,
          grid: {
            color: corGrid, // Cor das linhas circulares
          },
          angleLines: {
            color: corGrid, // Cor das linhas retas do centro para as pontas
          },
          pointLabels: {
            color: corTexto, // Cor do texto dos músculos
            font: {
              size: 11,
            },
            padding: 8,
          },
          ticks: {
            display: true,
            color: corTexto, // Cor dos números
            backdropColor: "transparent", // Remove o bloco de fundo sólido dos números
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
      },
    },
  });
}
