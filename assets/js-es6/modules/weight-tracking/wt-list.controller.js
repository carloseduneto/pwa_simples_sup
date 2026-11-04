import { GlobalLoader } from "../../ui/global-loader.js";
import { WeightTrackingService } from "./wt.service.js";
import { gerarListItem } from "../../components/list-item.js";

// Estado local do módulo e referência da instância do Chart.js
let allRecords = [];
let weightChartInstance = null;

export async function initWeightTrackingList(onNavigate) {
  const container = document.getElementById("weight-tracking-container");
  const filterSelect = document.getElementById("wt-period-filter");

  if (!container) return;

  container.innerHTML = GlobalLoader.getSimple();

  try {
    allRecords = await WeightTrackingService.getAll();

    if (!allRecords || allRecords.length === 0) {
      container.innerHTML =
        '<p class="wt-empty-state">Nenhum registro de peso encontrado.</p>';
      renderChart([]);
      return;
    }

    renderView(allRecords, container);
    setupEventListeners(container, filterSelect, onNavigate);
  } catch (error) {
    console.error("Falha ao buscar registros de peso:", error);
    container.innerHTML =
      '<p class="wt-error-state">Erro ao carregar histórico de pesagens.</p>';
  }
}

/**
 * Renderiza a lista e atualiza a visualização do gráfico combinado (EWMA + Scatter)
 */
function renderView(records, container) {
  renderChart(records);

  if (records.length === 0) {
    container.innerHTML =
      '<p class="wt-empty-state">Nenhum registro neste período.</p>';
    return;
  }

  const htmlLista = records
    .map((item) => {
      const { dateFormatted, timeFormatted } = formatDateTime(
        item.data_registro,
      );
      const pesoFormatado = formatWeight(item.peso);

      return gerarListItem({
        id: item.id,
        titulo: `${pesoFormatado}kg`,
        subtitulo: `${dateFormatted} &nbsp;&nbsp; ${timeFormatted}`,
        titleComplement: "",
        data: "",
        mostrarAcoes: true,
      });
    })
    .join("");

  container.innerHTML = htmlLista;
}

/**
 * Calcula a Média Móvel Exponencialmente Ponderada (EWMA)
 * @param {number[]} values - Array de pesos em ordem cronológica
 * @param {number} alpha - Fator de suavização (0.25 equilibra resposta e filtro de ruído)
 */
function calculateEWMA(values, alpha = 0.25) {
  if (!values.length) return [];
  const ewma = [values[0]];
  for (let i = 1; i < values.length; i++) {
    const prev = ewma[i - 1];
    const current = alpha * values[i] + (1 - alpha) * prev;
    ewma.push(Number(current.toFixed(2)));
  }
  return ewma;
}

/**
 * Renderiza o gráfico combinado utilizando Chart.js com separação visual de anos:
 * Dataset 1: Dispersão (Peso Bruto) em #ff6314
 * Dataset 2: Linha Suavizada (EWMA) em #4a89f3
 */
function renderChart(records) {
  const canvas = document.getElementById("wt-evolution-chart");
  if (!canvas) return;

  if (weightChartInstance) {
    weightChartInstance.destroy();
    weightChartInstance = null;
  }

  if (!records || records.length === 0) return;

  const ctx = canvas.getContext("2d");

  // Ordena do mais antigo para o mais recente
  const chronological = [...records].sort(
    (a, b) => new Date(a.data_registro) - new Date(b.data_registro),
  );

  // Verifica se os registros filtrados abrangem mais de um ano (ex: 2023 a 2026)
  const yearsSet = new Set(
    chronological.map((r) => new Date(r.data_registro).getFullYear()),
  );
  const hasMultipleYears = yearsSet.size > 1;

  // Se houver múltiplos anos, exibe DD/MM/AA no eixo X; caso contrário, DD/MM
  const labels = chronological.map((r) => {
    const d = new Date(r.data_registro);
    return d.toLocaleDateString(
      "pt-BR",
      hasMultipleYears
        ? { month: "2-digit", year: "numeric" }
        : { day: "2-digit", month: "2-digit" },
    );
  });

  // Identifica os índices exatos onde ocorre mudança de ano para desenhar divisórias
  const yearBoundaries = [];
  for (let i = 1; i < chronological.length; i++) {
    const prevYear = new Date(chronological[i - 1].data_registro).getFullYear();
    const currYear = new Date(chronological[i].data_registro).getFullYear();
    if (currYear !== prevYear) {
      yearBoundaries.push({ index: i, year: currYear });
    }
  }

  // Plugin customizado do Chart.js para desenhar uma linha vertical a cada novo ano
  const yearSeparatorPlugin = {
    id: "yearSeparator",
    afterDraw(chart) {
      if (!yearBoundaries.length) return;
      const {
        ctx,
        chartArea: { top, bottom },
        scales: { x },
      } = chart;

      ctx.save();
      yearBoundaries.forEach(({ index, year }) => {
        const xPos = x.getPixelForValue(index);

        // Linha vertical tracejada separando os anos
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(xPos, top);
        ctx.lineTo(xPos, bottom);
        ctx.stroke();

        // Rótulo do novo ano no topo da divisória
        ctx.fillStyle = "#555555";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(year.toString(), xPos + 4, top + 10);
      });
      ctx.restore();
    },
  };

  const rawWeights = chronological.map((r) => Number(r.peso));
  const ewmaWeights = calculateEWMA(rawWeights, 0.25);

  const allValues = [...rawWeights, ...ewmaWeights];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const yMinSuggested = Math.floor(minVal * 0.985);
  const yMaxSuggested = Math.ceil(maxVal * 1.01);

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, "rgba(74, 137, 243, 0.35)");
  gradient.addColorStop(1, "rgba(74, 137, 243, 0.0)");

  weightChartInstance = new Chart(ctx, {
    type: "line",
    // plugins: [yearSeparatorPlugin],
    data: {
      labels,
      datasets: [
        {
          label: "Peso Real",
          data: rawWeights,
          showLine: false,
          backgroundColor: "#ff6314",
          borderColor: "#ffffff",
          borderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHitRadius: 12,
          order: 1,
        },
        {
          label: "Tendência (EWMA)",
          data: ewmaWeights,
          fill: true,
          backgroundColor: gradient,
          borderColor: "#4a89f3",
          borderWidth: 2.5,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHitRadius: 20,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#4a89f3",
          pointBorderWidth: 2,
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "center",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            boxWidth: 8,
            boxHeight: 8,
            padding: 16,
            font: {
              size: 12,
              weight: "500",
            },
            color: "#333333",
          },
        },
        tooltip: {
          callbacks: {
            // Mostra a data completa com o ano (DD/MM/AAAA) ao tocar no ponto
            title: (tooltipItems) => {
              const idx = tooltipItems[0].dataIndex;
              const record = chronological[idx];
              return new Date(record.data_registro).toLocaleDateString(
                "pt-BR",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                },
              );
            },
            label: (context) => {
              const val = context.parsed.y.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });
              return `${context.dataset.label}: ${val} kg`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "#e0e0e0",
            borderDash: [2, 2],
          },
          ticks: {
            autoSkip: true,
            maxTicksLimit: 10, // Evita poluição de datas quando há muitos registros (2023-2026)
            maxRotation: 45,
            minRotation: 45,
            font: { size: 10 },
            color: "#555555",
          },
        },
        y: {
          suggestedMin: yMinSuggested,
          suggestedMax: yMaxSuggested,
          title: {
            display: true,
            text: "kg",
            align: "end",
            font: { size: 11 },
            color: "#666666",
          },
          grid: {
            color: "#e0e0e0",
            borderDash: [2, 2],
          },
          ticks: {
            font: { size: 11 },
            color: "#666666",
          },
        },
      },
    },
  });
}



/**
 * Formata o número para o padrão brasileiro (ex: 88.9 -> 88,90)
 */
function formatWeight(peso) {
  return Number(peso).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extrai data ("29 de out. de 2026") e hora ("14:51") separadamente
 */
function formatDateTime(isoString) {
  const dateObj = new Date(isoString);

  const dateFormatted = dateObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeFormatted = dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { dateFormatted, timeFormatted };
}

/**
 * Navegação segura: usa a callback onNavigate ou aciona o roteador global via data-route
 */
function navigateTo(route, onNavigate) {
  if (typeof onNavigate === "function") {
    onNavigate(route);
    return;
  }

  // Fallback para o listener global de [data-route] do sistema
  const existingTrigger = document.querySelector(`[data-route="${route}"]`);
  if (existingTrigger) {
    existingTrigger.click();
  } else {
    const tempBtn = document.createElement("button");
    tempBtn.dataset.route = route;
    tempBtn.style.display = "none";
    document.body.appendChild(tempBtn);
    tempBtn.click();
    tempBtn.remove();
  }
}

/**
 * Centraliza a delegação de eventos de clique e filtro de período
 */
function setupEventListeners(container, filterSelect, onNavigate) {
  // 1. Filtro de Período (30 dias, 3 meses, 6 meses, 12 meses)
  if (filterSelect) {
    filterSelect.onchange = (e) => {
      const period = e.target.value;
      if (period === "all") {
        renderView(allRecords, container);
        return;
      }

      const cutoffDate = new Date();

      switch (period) {
        case "30d":
          cutoffDate.setDate(cutoffDate.getDate() - 30);
          break;
        case "3m":
          cutoffDate.setMonth(cutoffDate.getMonth() - 3);
          break;
        case "6m":
          cutoffDate.setMonth(cutoffDate.getMonth() - 6);
          break;
        case "12m":
          cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          break;
      }

      const filtered = allRecords.filter(
        (r) => new Date(r.data_registro) >= cutoffDate,
      );
      renderView(filtered, container);
    };
  }

  // 2. Delegação de Eventos da Lista (Editar / Excluir)
  container.onclick = async (e) => {
    const btnEdit = e.target.closest(".list-item__btn--edit");
    const btnDelete = e.target.closest(".list-item__btn--delete");

    if (btnEdit) {
      const id = btnEdit.dataset.id;
      localStorage.setItem("editWeightTrackingId", id);
      navigateTo("weightTrackingForm", onNavigate);
      return;
    }

    if (btnDelete) {
      const id = btnDelete.dataset.id;
      await handleDelete(id, onNavigate);
    }
  };
}

/**
 * Isola a regra de exclusão com confirmação visual do título do card
 */
async function handleDelete(id, onNavigate) {
  const cartao = document.querySelector(`.list-item[data-id="${id}"]`);
  let pesoLabel = "este registro";

  if (cartao) {
    const tituloElement = cartao.querySelector(".list-item__title");
    if (tituloElement) {
      pesoLabel = `o registro de ${tituloElement.innerText.split("•")[0].trim()}`;
    }
  }

  if (confirm(`Deseja realmente excluir ${pesoLabel}?`)) {
    try {
      await WeightTrackingService.delete(id);
      initWeightTrackingList(onNavigate);
    } catch (err) {
      alert("Erro ao excluir pesagem: " + err.message);
    }
  }
}
