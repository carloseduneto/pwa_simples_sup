export class BodyCompositionController {
  constructor() {
    this.charts = {}; // Armazena instâncias para destruição segura
  }

  // É chamado pelo Controller Principal apenas quando a aba é ativada
  render(assessments) {
    if (!assessments || assessments.length === 0) return;

    const labels = assessments.map((a) => {
      const d = new Date(a.data_registro);
      return `${d.toLocaleDateString("pt-BR")}`;
    });

    this.renderAreaChart(assessments, labels);
    this.renderWeightVariationChart(assessments, labels);
    this.renderCompositionVariationChart(assessments, labels);
    this.renderAccumulatedWeightChart(assessments, labels);
    this.renderAccumulatedCompositionChart(assessments, labels);
  }

  // Função auxiliar para destruir gráfico existente
  destroyChart(chartId) {
    if (this.charts[chartId]) {
      this.charts[chartId].destroy();
    }
  }

  // 1. Evolução composição corporal (área)
  renderAreaChart(assessments, labels) {
    this.destroyChart("areaChart");
    const ctx = document
      .getElementById("compositionAreaChart")
      .getContext("2d");

    const lbmData = assessments.map((a) => a.metrics.lbm.toFixed(1));
    const fmData = assessments.map((a) => a.metrics.fm.toFixed(1));

    this.charts["areaChart"] = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Massa magra (kg)",
            data: lbmData,
            borderColor: "#60A5FA", // Azul claro
            backgroundColor: "#93C5FD",
            fill: true,
            tension: 0.1,
          },
          {
            label: "Massa gorda (kg)",
            data: fmData,
            borderColor: "#FDE047", // Amarelo
            backgroundColor: "#FEF08A",
            fill: true,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { display: true },
          y: {
            stacked: true,
            beginAtZero: true,
            //max: 100
          },
        },
        plugins: { legend: { position: "top" } },
      },
    });
  }

  // 2. Variação peso (Barras, Atual - Anterior)
  renderWeightVariationChart(assessments, labels) {
    this.destroyChart("weightVarChart");
    const ctx = document
      .getElementById("weightVariationChart")
      .getContext("2d");

    const varData = assessments.map((a, index) => {
      if (index === 0) return 0; // Primeira avaliação não tem variação
      return (a.metrics.weight - assessments[index - 1].metrics.weight).toFixed(
        2,
      );
    });

    this.charts["weightVarChart"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Variação de Peso (kg)",
            data: varData,
            backgroundColor: "#F59E0B", // Laranja
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  // 3. Variação peso magro e gordo (Barras Empilhadas)
  renderCompositionVariationChart(assessments, labels) {
    this.destroyChart("compVarChart");
    const ctx = document.getElementById("compVariationChart").getContext("2d");

    const lbmVar = assessments.map((a, i) =>
      i === 0 ? 0 : (a.metrics.lbm - assessments[i - 1].metrics.lbm).toFixed(2),
    );
    const fmVar = assessments.map((a, i) =>
      i === 0 ? 0 : (a.metrics.fm - assessments[i - 1].metrics.fm).toFixed(2),
    );

    this.charts["compVarChart"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Variação peso magro",
            data: lbmVar,
            backgroundColor: "#0284C7",
          }, // Azul Escuro
          {
            label: "Variação peso gordo",
            data: fmVar,
            backgroundColor: "#FDE047",
          }, // Amarelo
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } },
        plugins: { legend: { position: "top" } },
      },
    });
  }

  // 4. Acumulado peso (Desde o início)
  renderAccumulatedWeightChart(assessments, labels) {
    this.destroyChart("accWeightChart");
    const ctx = document
      .getElementById("accumulatedWeightChart")
      .getContext("2d");

    const baseline = assessments[0].metrics.weight;
    const accData = assessments.map((a) =>
      (a.metrics.weight - baseline).toFixed(2),
    );

    this.charts["accWeightChart"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Acumulado peso (kg)",
            data: accData,
            backgroundColor: "#EA580C",
          },
        ], // Laranja Escuro
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  // 5. Acumulado peso magro e gordo
  renderAccumulatedCompositionChart(assessments, labels) {
    this.destroyChart("accCompChart");
    const ctx = document
      .getElementById("accumulatedCompChart")
      .getContext("2d");

    const baselineLBM = assessments[0].metrics.lbm;
    const baselineFM = assessments[0].metrics.fm;

    const accLBM = assessments.map((a) =>
      (a.metrics.lbm - baselineLBM).toFixed(2),
    );
    const accFM = assessments.map((a) =>
      (a.metrics.fm - baselineFM).toFixed(2),
    );

    this.charts["accCompChart"] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Acumulado Magro",
            data: accLBM,
            backgroundColor: "#0369A1",
          }, // Azul profundo
          { label: "Acumulado Gordo", data: accFM, backgroundColor: "#BAE6FD" }, // Azul bem claro
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { x: { stacked: true }, y: { stacked: true } },
        plugins: { legend: { position: "top" } },
      },
    });
  }
}
