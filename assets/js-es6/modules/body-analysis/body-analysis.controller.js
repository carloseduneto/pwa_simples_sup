import { BodyAvaliacoesService } from "../body-assessment/body-avaliacoes.service.js";
import { UserContextService } from "../../services/user-context.service.js";
import { BodyMetricsUtil } from "../body-assessment/body-metrics.util.js";
import { AuthService } from "../../services/auth.service.js";

export class BodyAnalysisController {
  constructor() {
    this.assessments = [];
    this.userContext = null;
    this.chartInstance = null;
    this.ffmiChartInstance = null;
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

      // Busca os dados do usuário usando o ID dinâmico da sessão
      this.userContext = await UserContextService.getUserData(userId);

      // O Supabase filtra automaticamente os registros do usuário via RLS
      const rawAssessments = await BodyAvaliacoesService.getAll();

      this.assessments = rawAssessments
        .map((req) => BodyMetricsUtil.processAssessment(req, this.userContext))
        // Filtro de normalização: descarta dados incompletos ou imputados manualmente
        .filter((a) => a.metrics.origem_bf === "pollock_7")
        .sort((a, b) => new Date(a.data_registro) - new Date(b.data_registro));

      

      this.renderSummary();
      this.renderChart();
    } catch (error) {
      console.error("Falha ao inicializar análise", error);
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

    // Formatação de datas
    const formatDate = (date) => date.toLocaleDateString("pt-BR");
    const getMonthYear = (date) =>
      `${date.toLocaleString("pt-BR", { month: "short" })}/${date.getFullYear()}`;
    const baselineMonthYear = getMonthYear(d1);

    // Cálculos de tempo
    const monthDiff =
      (d2.getFullYear() - d1.getFullYear()) * 12 +
      (d2.getMonth() - d1.getMonth());
    const msPerWeek = 1000 * 60 * 60 * 24 * 7;
    const weeksDiff = Math.round((d2 - d1) / msPerWeek);

    // 1. Atualizar Header e Título
    document.getElementById("header-date-range").innerText =
      `${formatDate(d1)} - ${formatDate(d2)}`;
    document.getElementById("header-date-duration").innerText =
      `${Math.max(monthDiff, 0)} meses • ${Math.max(weeksDiff, 0)} semanas`;
    document.getElementById("summary-eval-count").innerText =
      `Composição corporal - ${this.assessments.length} avaliações`;

    // 2. Preencher Valores Atuais
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
    const barCanvas = document.getElementById('bodyCompChart');
    const ffmiCanvas = document.getElementById('ffmiChart');
    
    // Aguarda ambos os elementos existirem no DOM
    if (!barCanvas || !ffmiCanvas) {
      if (retries > 0) setTimeout(() => this.renderChart(retries - 1), 50);
      return;
    }

    const barCtx = barCanvas.getContext('2d');
    const ffmiCtx = ffmiCanvas.getContext('2d');
    
    const labels = this.assessments.map(a => {
      const d = new Date(a.data_registro);
      return `${d.toLocaleString('pt-BR', { month: 'short' })}/${d.getFullYear().toString().slice(-2)}`;
    });

    const lbmData = this.assessments.map(a => a.metrics.lbm.toFixed(1));
    const fmData = this.assessments.map(a => a.metrics.fm.toFixed(1));
    const ffmiData = this.assessments.map(a => a.metrics.ffmi.toFixed(1));

    // Destrói instâncias anteriores para evitar sobreposição ao recarregar
    if (this.chartInstance) this.chartInstance.destroy();
    if (this.ffmiChartInstance) this.ffmiChartInstance.destroy();

    // 1. Gráfico de Barras: Composição Corporal
    this.chartInstance = new Chart(barCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'LBM (kg)',
            data: lbmData,
            backgroundColor: '#4AA079',
            barPercentage: 0.6,
          },
          {
            label: 'Massa gorda (kg)',
            data: fmData,
            backgroundColor: '#EE8888',
            barPercentage: 0.6,
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: false, grid: { display: false } },
          y: { stacked: false, beginAtZero: true } // Removido o max: 90 fixo para se adaptar aos dados reais
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });

    // 2. Gráfico de Linhas: FFMI
    this.ffmiChartInstance = new Chart(ffmiCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'FFMI (kg/m²)',
            data: ffmiData,
            borderColor: '#3B7242', // Verde escuro seguindo a identidade
            backgroundColor: 'rgba(59, 114, 66, 0.1)', // Fundo translúcido abaixo da linha
            borderWidth: 2,
            pointBackgroundColor: '#3B7242',
            pointRadius: 4,
            fill: true,
            tension: 0.3 // Deixa a linha suavemente curvada
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          x: { grid: { display: false } },
          y: { 
            // Não iniciamos no zero para que pequenas variações no FFMI fiquem mais visíveis
            beginAtZero: false 
          }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  }
}

