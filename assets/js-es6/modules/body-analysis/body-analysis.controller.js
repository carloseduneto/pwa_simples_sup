import { BodyAvaliacoesService } from "../body-assessment/body-avaliacoes.service.js";
import { UserContextService } from "../../services/user-context.service.js";
import { BodyMetricsUtil } from "../body-assessment/body-metrics.util.js";
import { AuthService } from "../../services/auth.service.js";
import { BodyCompositionController } from "./body-analysis-body-composition.controller.js";
import { BodyMeasurementsController } from "./body-analysis-measurements.controller.js";
import { BodyMoreController } from "./body-analysis-more.controller.js";

export class BodyAnalysisController {
  constructor() {
    this.allProcessedAssessments = []; // Base inalterável com todo o histórico
    this.assessments = []; // Recorte filtrado que alimenta as telas
    this.userContext = null;
    this.chartInstance = null;
    this.ffmiChartInstance = null;

    this.CACHE_PREFIX = "body_analysis_";
    this.CACHE_TTL_MS = 1000 * 60 * 15;

    this.activeTab = "overview";

    this.compositionController = new BodyCompositionController();
    this.measurementsController = new BodyMeasurementsController();
    this.moreController = new BodyMoreController();
  }

  async init() {
    try {
      const userId = await AuthService.getUserId();

      if (!userId) {
        console.warn(
          "Usuário não autenticado. Abortando carregamento da análise.",
        );
        return;
      }

      const cacheKey = `${this.CACHE_PREFIX}${userId}`;
      const cachedDataString = localStorage.getItem(cacheKey);

      if (cachedDataString) {
        try {
          const cachedData = JSON.parse(cachedDataString);
          const isExpired =
            Date.now() - cachedData.timestamp > this.CACHE_TTL_MS;

          if (!isExpired) {
            console.log("Análise carregada via cache local.");
            this.userContext = cachedData.userContext;
            this.processAndRender(cachedData.rawAssessments);
            return;
          }
        } catch (e) {
          console.warn("Cache corrompido, buscando dados frescos...", e);
          localStorage.removeItem(cacheKey);
        }
      }

      console.log("Buscando dados frescos do banco...");
      this.userContext = await UserContextService.getUserData(userId);
      const rawAssessments = await BodyAvaliacoesService.getAll();

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          userContext: this.userContext,
          rawAssessments: rawAssessments,
          timestamp: Date.now(),
        }),
      );

      this.processAndRender(rawAssessments);
    } catch (error) {
      console.error("Falha ao inicializar análise", error);
    }
  }

  processAndRender(rawAssessments) {
    // 1. Processa, limpa e ordena o histórico completo (do mais antigo para o mais novo)
    this.allProcessedAssessments = rawAssessments
      .map((req) => BodyMetricsUtil.processAssessment(req, this.userContext))
      .filter((a) => a.metrics.origem_bf === "calculado")
      .sort((a, b) => new Date(a.data_registro) - new Date(b.data_registro));

    this.assessments = [...this.allProcessedAssessments]; // Começa exibindo tudo

    this.setupGlobalFilters(); // Inicia os filtros de data do header
    this.setupTabs();
    this.renderActiveTab();
  }

  // --- LÓGICA DO FILTRO GLOBAL NO HEADER ---
  setupGlobalFilters() {
    const filterSelect = document.getElementById("global-period-filter");
    const customContainer = document.getElementById("custom-date-selectors");
    const startSelect = document.getElementById("custom-start-date");
    const endSelect = document.getElementById("custom-end-date");

    if (!filterSelect || this.allProcessedAssessments.length === 0) return;

    // Popula as opções com as datas reais, ordenadas da mais nova para a mais antiga
    const datesDesc = [...this.allProcessedAssessments].reverse();
    const optionsHTML = datesDesc
      .map((a) => {
        const d = new Date(a.data_registro);
        const label = d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        return `<option value="${a.data_registro}">${label}</option>`;
      })
      .join("");

    startSelect.innerHTML = optionsHTML;
    endSelect.innerHTML = optionsHTML;

    // Default: Início (A mais antiga), Fim (A mais nova)
    startSelect.value = datesDesc[datesDesc.length - 1].data_registro;
    endSelect.value = datesDesc[0].data_registro;

    // Regra que bloqueia sobreposição/inconsistência nas datas
    const enforceDateLogic = () => {
      const startDate = new Date(startSelect.value);
      const endDate = new Date(endSelect.value);

      Array.from(endSelect.options).forEach((opt) => {
        opt.disabled = new Date(opt.value) < startDate;
      });
      Array.from(startSelect.options).forEach((opt) => {
        opt.disabled = new Date(opt.value) > endDate;
      });

      if (startDate > endDate) {
        endSelect.value = startSelect.value;
      }
    };

    // Aplica o filtro selecionado e re-renderiza o painel
    const applyFilter = () => {
      const val = filterSelect.value;

      if (val === "custom") {
        customContainer.classList.remove("hidden");
        const sDate = new Date(startSelect.value);
        const eDate = new Date(endSelect.value);

        this.assessments = this.allProcessedAssessments.filter((a) => {
          const d = new Date(a.data_registro);
          return d >= sDate && d <= eDate;
        });
      } else {
        customContainer.classList.add("hidden");
        if (val === "all") {
          this.assessments = [...this.allProcessedAssessments];
        } else {
          const count = parseInt(val, 10);
          this.assessments = this.allProcessedAssessments.slice(-count);
        }
      }

      // Proteção contra filtros vazios acidentais
      if (this.assessments.length === 0) {
        this.assessments = [...this.allProcessedAssessments];
      }

      this.updateGlobalHeaderDates();
      this.renderActiveTab(); // Atualiza apenas a aba que o usuário está olhando
    };

    filterSelect.addEventListener("change", applyFilter);
    startSelect.addEventListener("change", () => {
      enforceDateLogic();
      applyFilter();
    });
    endSelect.addEventListener("change", () => {
      enforceDateLogic();
      applyFilter();
    });

    enforceDateLogic();
    this.updateGlobalHeaderDates(); // Injeta o texto inicial no Header
  }

  // Atualiza as strings descritivas de data independentemente da aba ativa
  updateGlobalHeaderDates() {
    if (this.assessments.length === 0) return;

    const firstAssessment = this.assessments[0];
    const currentAssessment = this.assessments[this.assessments.length - 1];

    const d1 = new Date(firstAssessment.data_registro);
    const d2 = new Date(currentAssessment.data_registro);

    const formatDate = (date) => date.toLocaleDateString("pt-BR");
    const monthDiff =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    const weeksDiff = Math.round((d2 - d1) / msPerWeek);

    document.getElementById("header-date-range").innerText =
      `${formatDate(d1)} - ${formatDate(d2)}`;
    document.getElementById("header-date-duration").innerText =
      `${Math.max(monthDiff, 0)} meses • ${Math.max(weeksDiff, 0)} semanas`;
  }

  setupTabs() {
    const tabOverview = document.getElementById("tab-btn-overview");
    const tabComposition = document.getElementById("tab-btn-composition");
    const tabMeasurements = document.getElementById("tab-btn-measurements");
    const tabMore = document.getElementById("tab-btn-more");

    if (tabOverview) {
      tabOverview.addEventListener("click", () => {
        this.activeTab = "overview";
        this.updateTabUI();
        this.renderActiveTab();
      });
    }

    if (tabComposition) {
      tabComposition.addEventListener("click", () => {
        this.activeTab = "composition";
        this.updateTabUI();
        this.renderActiveTab();
      });
    }

    if (tabMeasurements) {
      tabMeasurements.addEventListener("click", () => {
        this.activeTab = "measurements";
        this.updateTabUI();
        this.renderActiveTab();
      });
    }

    if (tabMore) {
      tabMore.addEventListener("click", () => {
        this.activeTab = "more";
        this.updateTabUI();
        this.renderActiveTab();
      });
    }
  }

  updateTabUI() {
    document
      .getElementById("tab-btn-overview")
      .classList.toggle("active", this.activeTab === "overview");
    document
      .getElementById("tab-btn-composition")
      .classList.toggle("active", this.activeTab === "composition");
    document
      .getElementById("tab-btn-measurements")
      .classList.toggle("active", this.activeTab === "measurements");
    document
      .getElementById("tab-btn-more")
      .classList.toggle("active", this.activeTab === "more");

    // Alterna visibilidade
    document.getElementById("section-overview").style.display =
      this.activeTab === "overview" ? "block" : "none";
    document.getElementById("section-composition").style.display =
      this.activeTab === "composition" ? "block" : "none";
    document.getElementById("section-measurements").style.display =
      this.activeTab === "measurements" ? "block" : "none";
    document.getElementById("section-more").style.display =
      this.activeTab === "more" ? "block" : "none";
  }

  renderActiveTab() {
    // Renderiza apenas os gráficos da aba visível para evitar erro de dimensões do Canvas no Chart.js
    if (this.activeTab === "overview") {
      this.renderSummary();
      this.renderChart();
    } else if (this.activeTab === "composition") {
      this.compositionController.render(this.assessments);
    } else if (this.activeTab === "measurements") {
      // Injeta instâncias globais para o onclick do HTML acessar o método toggleSelection
      window.bodyMeasurementsCtrl = this.measurementsController;
      this.measurementsController.render(this.assessments);
    } else if (this.activeTab === "more") {
      this.moreController.render(this.assessments, this.userContext);
    }
  }

  renderSummary(retries = 5) {
    if (this.assessments.length === 0) return;

    const bfElement = document.getElementById("bf-value");

    // Aguarda a injeção do HTML no DOM pelo roteador
    if (!bfElement) {
      if (retries > 0) setTimeout(() => this.renderSummary(retries - 1), 50);
      return;
    }

    const firstAssessment = this.assessments[0];
    const currentAssessment = this.assessments[this.assessments.length - 1];
    const baseline = firstAssessment.metrics;
    const current = currentAssessment.metrics;

    // Datas base
    const d1 = new Date(firstAssessment.data_registro);
    const d2 = new Date(currentAssessment.data_registro);

    const getMonthYear = (date) =>
      `${date.toLocaleString("pt-BR", { month: "short" })}/${date.getFullYear()}`;
    const baselineMonthYear = getMonthYear(d1);

    // Cálculos de tempo (usado apenas no card do FFMI agora)
    const monthDiff =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());

    document.getElementById("summary-eval-count").innerText =
      `Composição corporal - ${this.assessments.length} avaliações`;

    document.getElementById("bf-method-name").innerText =
      "BF% (" + (current.metodo_bf || "Método desconhecido") + ")";
    bfElement.innerText = `${current.bf.toFixed(2)}%`;
    document.getElementById("lbm-value").innerText =
      `${current.lbm.toFixed(1)}kg`;
    document.getElementById("fm-value").innerText =
      `${current.fm.toFixed(1)}kg`;
    document.getElementById("weight-value").innerText =
      `${current.weight.toFixed(1)}kg`;
    document.getElementById("ffmi-value").innerText =
      `${current.ffmi.toFixed(1)} kg/m²`;

    // 3. Preencher Comparativos (Apenas se houver mais de 1 avaliação)
    if (this.assessments.length > 1) {
      document.getElementById("bf-comparison").innerText =
        `era ${baseline.bf.toFixed(2)}% em ${baselineMonthYear}`;

      const lbmDiff = current.lbm - baseline.lbm;
      const lbmSign = lbmDiff > 0 ? "+" : "";
      document.getElementById("lbm-comparison").innerText =
        `${lbmSign}${lbmDiff.toFixed(1)}kg desde ${baselineMonthYear}`;

      const fmDiff = current.fm - baseline.fm;
      const fmSign = fmDiff > 0 ? "+" : "";
      document.getElementById("fm-comparison").innerText =
        `${fmSign}${fmDiff.toFixed(1)}kg desde ${baselineMonthYear}`;

      const weightDiff = current.weight - baseline.weight;
      const weightSign = weightDiff > 0 ? "+" : "";
      document.getElementById("weight-comparison").innerText =
        `${weightSign}${weightDiff.toFixed(1)}kg desde ${baselineMonthYear}`;

      const ffmiDiff = current.ffmi - baseline.ffmi;
      const ffmiSign = ffmiDiff > 0 ? "▲" : ffmiDiff < 0 ? "▼" : "";
      document.getElementById("ffmi-comparison").innerText =
        `${ffmiSign} ${Math.abs(ffmiDiff).toFixed(1)} (${monthDiff} meses)`;
    } else {
      // Limpar textos de comparação se for a primeira e única avaliação
      document.getElementById("bf-comparison").innerText = "Primeira avaliação";
      document.getElementById("lbm-comparison").innerText = "-";
      document.getElementById("fm-comparison").innerText = "-";
      document.getElementById("weight-comparison").innerText = "-";
      document.getElementById("ffmi-comparison").innerText = "-";
    }
  }

  renderChart(retries = 5) {
    const barCanvas = document.getElementById("bodyCompChart");
    const ffmiCanvas = document.getElementById("ffmiChart");

    if (!barCanvas || !ffmiCanvas) {
      if (retries > 0) setTimeout(() => this.renderChart(retries - 1), 50);
      return;
    }

    const barCtx = barCanvas.getContext("2d");
    const ffmiCtx = ffmiCanvas.getContext("2d");

    const labels = this.assessments.map((a) => {
      const d = new Date(a.data_registro);
      return `${d.toLocaleString("pt-BR", { month: "short" })}/${d.getFullYear().toString().slice(-2)}`;
    });

    const lbmData = this.assessments.map((a) => a.metrics.lbm.toFixed(1));
    const fmData = this.assessments.map((a) => a.metrics.fm.toFixed(1));
    const ffmiData = this.assessments.map((a) => a.metrics.ffmi.toFixed(1));

    // Destrói instâncias anteriores para evitar sobreposição ao recarregar
    if (this.chartInstance) this.chartInstance.destroy();
    if (this.ffmiChartInstance) this.ffmiChartInstance.destroy();

    // 1. Gráfico de Barras: Composição Corporal
    this.chartInstance = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "LBM (kg)",
            data: lbmData,
            backgroundColor: "#4AA079",
            barPercentage: 0.6,
          },
          {
            label: "Massa gorda (kg)",
            data: fmData,
            backgroundColor: "#EE8888",
            barPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        // maintainAspectRatio: false,
        scales: {
          x: { stacked: false, grid: { display: false } },
          y: { stacked: false, beginAtZero: true },
        },
        plugins: { legend: { position: "top" } },
      },
    });

    // 2. Gráfico de Linhas: FFMI
    this.ffmiChartInstance = new Chart(ffmiCtx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "FFMI (kg/m²)",
            data: ffmiData,
            borderColor: "#3B7242",
            backgroundColor: "rgba(59, 114, 66, 0.1)",
            borderWidth: 2,
            pointBackgroundColor: "#3B7242",
            pointRadius: 4,
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        // maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: false },
        },
        plugins: { legend: { position: "top" } },
      },
    });
  }
}
