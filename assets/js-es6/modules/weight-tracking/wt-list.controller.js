import { GlobalLoader } from "../../ui/global-loader.js";
import { WeightTrackingService } from "./wt.service.js";
import { gerarListItem } from "../../components/list-item.js";
import { AuthService } from "../../services/auth.service.js";
import { UserContextService } from "../../services/user-context.service.js";

// Estado local do módulo e referência da instância do Chart.js
let allRecords = [];
let weightChartInstance = null;
let currentSmoothingMode = "ewma"; // Armazena a preferência para uso global no módulo

export async function initWeightTrackingList(onNavigate) {
  const container = document.getElementById("weight-tracking-container");
  const filterSelect = document.getElementById("wt-period-filter");

  if (!container) return;

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const userId = await AuthService.getUserId();

    // Busca Todos registros de peso e Preferências em paralelo
    const [records, userPrefs] = await Promise.all([
      WeightTrackingService.getAll(),
      UserContextService.getUserDataByIdPreferences(userId),
    ]);

    allRecords = records;
    currentSmoothingMode =
      userPrefs?.preferences?.["weight_smoothing"] || "ewma";

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
 * Renderiza a lista e atualiza a visualização do gráfico combinado
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
 * Calcula a Média Móvel Exponencialmente Ponderada (Time-Aware)
 * @param {Array} records - Array de objetos { peso, data_registro } ordenado cronologicamente
 * @param {number} halfLifeDays - Quantos dias leva para o peso antigo perder metade da relevância (padrão: 7 dias)
 */
function calculateEWMA(records, halfLifeDays = 7) {
  if (!records.length) return [];

  const ewma = [Number(records[0].peso)];
  let prevDate = new Date(records[0].data_registro).getTime();

  for (let i = 1; i < records.length; i++) {
    const currentWeight = Number(records[i].peso);
    const currentDate = new Date(records[i].data_registro).getTime();

    // Calcula os dias passados desde a última medição
    const diffDays = (currentDate - prevDate) / (1000 * 60 * 60 * 24);

    // Se no mesmo dia (ou horas de diferença), mantém o peso
    if (diffDays <= 0) {
      ewma.push(ewma[i - 1]);
      continue;
    }

    // Calcula o decaimento: exp(-ln(2) * dias / meia-vida)
    // Se passaram 7 dias (meia-vida), weight_decay será 0.5
    // Se passaram 60 dias, weight_decay será próximo de 0 (peso antigo não importa)
    const weightDecay = Math.exp((-Math.LN2 * diffDays) / halfLifeDays);
    const alpha = 1 - weightDecay;

    const currentEwma = alpha * currentWeight + weightDecay * ewma[i - 1];

    ewma.push(Number(currentEwma.toFixed(2)));
    prevDate = currentDate;
  }

  return ewma;
}

/**
 * Calcula a suavização utilizando um Filtro de Kalman (1D) Sensível ao Tempo
 * @param {Array} records - Array de objetos { peso, data_registro } ordenado cronologicamente
 */
function calculateKalman(records) {
  if (!records.length) return [];

  const kalman = [];

  let estimate = Number(records[0].peso);
  let errorEstimate = 1.0;
  const errorMeasure = 1.5; // Ruído da balança (estático, ex: roupas, flutuação hídrica)
  const qPerDay = 0.1; // Ruído do processo por dia (o corpo muda cerca de 100g/dia de verdade)

  let prevDate = new Date(records[0].data_registro).getTime();

  for (let i = 0; i < records.length; i++) {
    const measurement = Number(records[i].peso);
    const currentDate = new Date(records[i].data_registro).getTime();

    // Se for o primeiro registro, apenas salva a estimativa inicial
    if (i === 0) {
      kalman.push(Number(estimate.toFixed(2)));
      continue;
    }

    const diffDays = Math.max(
      0,
      (currentDate - prevDate) / (1000 * 60 * 60 * 24),
    );

    // O ruído do processo escala com o tempo. Um buraco de 60 dias soma uma incerteza de 6kg (60 * 0.1)
    const q = diffDays * qPerDay;

    // 1. Predição
    let prediction = estimate;
    let errorPrediction = errorEstimate + q;

    // 2. Atualização
    let kalmanGain = errorPrediction / (errorPrediction + errorMeasure);

    estimate = prediction + kalmanGain * (measurement - prediction);
    errorEstimate = (1 - kalmanGain) * errorPrediction;

    kalman.push(Number(estimate.toFixed(2)));
    prevDate = currentDate;
  }

  return kalman;
}

/**
 * Renderiza o gráfico combinado utilizando Chart.js
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

  const rawWeights = chronological.map((r) => Number(r.peso));

  // Roteamento estruturado da suavização com base na preferência do usuário
  let smoothedWeights = [];
  let smoothingLabel = "";

if (currentSmoothingMode === "kalman") {
  // Passa o array completo para o Kalman ler o tempo
  smoothedWeights = calculateKalman(chronological);
  smoothingLabel = "Tendência (Kalman)";
} else {
  // Passa o array completo para o EWMA ler o tempo
  smoothedWeights = calculateEWMA(chronological);
  smoothingLabel = "Tendência (EWMA)";
}

  const allValues = [...rawWeights, ...smoothedWeights];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const yMinSuggested = Math.floor(minVal * 0.985);
  const yMaxSuggested = Math.ceil(maxVal * 1.01);

  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, "rgba(74, 137, 243, 0.35)");
  gradient.addColorStop(1, "rgba(74, 137, 243, 0.0)");

  weightChartInstance = new Chart(ctx, {
    type: "line",
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
          label: smoothingLabel, // A legenda agora reflete dinamicamente a matemática usada
          data: smoothedWeights,
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
            maxTicksLimit: 10,
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
