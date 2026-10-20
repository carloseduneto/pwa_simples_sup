export class BodyMeasurementsController {
  constructor() {
    this.assessments = [];
    this.mainChart = null;
    this.sparklines = {}; // Armazena instâncias para destruição

    // Estado do filtro
    this.selectedItems = []; // Array de chaves (ex: 'cintura', 'braço_esq')
    this.activeCategory = null; // 'perimeter', 'skinfold', ou null

    // Tolerância de Erro (MDC) - 0.5 cm para perímetros, 1.0 mm para dobras
    this.THRESHOLD_PERIMETER = 0.5;
    this.THRESHOLD_SKINFOLD = 1.0;
  }

  render(assessments) {
    if (!assessments || assessments.length === 0) return;
    this.assessments = assessments;

    this.setupFilters();
    this.renderMainChart();
    this.renderCards("perimeter", "cards-perimetros");
    this.renderCards("skinfold", "cards-dobras");
    this.setupAccordions();
  }

  // --- LÓGICA DE STATUS E ESTATÍSTICA CORRIGIDA ---
  calculateStatus(values, category) {
    const validValues = values.filter((v) => v !== null && !isNaN(v));
    const n = validValues.length;

    if (n < 3) {
      return {
        id: "poucos_dados",
        label: "- poucos dados",
        icon: "horizontal_rule",
        colorClass: "text-gray-500",
      };
    }

    const threshold =
      category === "perimeter"
        ? this.THRESHOLD_PERIMETER
        : this.THRESHOLD_SKINFOLD;

    // 1. Visão Macro: Variação total (Fim vs Início)
    const firstValue = validValues[0];
    const lastValue = validValues[n - 1];
    const overallDelta = lastValue - firstValue;

    // 2. Visão Micro: Avalia a volatilidade (Picos e Vales)
    let reversals = 0;
    let maxVolatility = 0;

    for (let i = 1; i < n; i++) {
      const diff = validValues[i] - validValues[i - 1];
      if (Math.abs(diff) > maxVolatility) {
        maxVolatility = Math.abs(diff);
      }

      // Conta quantas vezes a linha inverteu de direção (formou um "V" ou um "^")
      if (i > 1) {
        const prevDiff = validValues[i - 1] - validValues[i - 2];
        if (diff * prevDiff < 0) reversals++;
      }
    }

    // --- REGRAS DE CLASSIFICAÇÃO BASEADAS NA CURVA REAL ---

    // A. Se a variação total desde o início não superou a margem de erro técnico:
    if (Math.abs(overallDelta) <= threshold) {
      // Se estiver zigue-zagueando muito, é oscilante
      if (reversals >= n / 3 && maxVolatility > threshold) {
        return {
          id: "oscilando",
          label: "oscilando",
          icon: "show_chart",
          colorClass: "text-blue-500",
        };
      }
      // Caso contrário, é apenas uma linha plana/estável
      return {
        id: "estavel",
        label: "estável",
        icon: "horizontal_rule",
        colorClass: "text-blue-500",
      };
    }

    // B. Se a variação total indica crescimento real além do ruído:
    if (overallDelta > threshold) {
      return {
        id: "aumento",
        label: "aumento",
        icon: "arrow_drop_up",
        colorClass: "text-blue-500",
      };
    }

    // C. Se a variação total indica perda real além do ruído:
    if (overallDelta < -threshold) {
      return {
        id: "queda",
        label: "queda",
        icon: "arrow_drop_down",
        colorClass: "text-blue-500",
      };
    }

    // Fallback de segurança
    return {
      id: "atencao",
      label: "atenção",
      icon: "info",
      colorClass: "text-blue-500",
    };
  }

  // --- LÓGICA DE ESCALAS DINÂMICAS PARA OS SPARKLINES ---
  getScaleGroupKeys(category, fieldKey) {
    return Array.isArray(fieldKey) ? fieldKey : [fieldKey];
  }

  calculateScaleForGroup(category, fieldKey) {
    const keys = this.getScaleGroupKeys(category, fieldKey);
    let min = Infinity;
    let max = -Infinity;

    // Varre todas as avaliações buscando o mínimo e máximo global do grupo
    this.assessments.forEach((a) => {
      const v = typeof a.value === "string" ? JSON.parse(a.value) : a.value;
      keys.forEach((k) => {
        const val = parseFloat(v[k]);
        if (!isNaN(val) && val > 0) {
          if (val < min) min = val;
          if (val > max) max = val;
        }
      });
    });

    if (min === Infinity || max === -Infinity) return { min: 0, max: 100 };

    const diff = max - min;
    const minSpan =
      category === "perimeter"
        ? this.THRESHOLD_PERIMETER * 8
        : this.THRESHOLD_SKINFOLD * 8;
    const effectiveSpan = Math.max(diff, minSpan);
    const mid = (min + max) / 2;

    const bandMin = mid - effectiveSpan / 2;
    const bandMax = mid + effectiveSpan / 2;

    const bottomPadding = effectiveSpan * 0.25;
    const topPadding = effectiveSpan * 0.85;

    return {
      min: Math.max(0, bandMin - bottomPadding), // Garante que eixos de dobra/perímetro nunca fiquem negativos
      max: bandMax + topPadding,
    };
  }

  // --- INTERAÇÃO E FILTROS ---
  setupFilters() {
    document
      .getElementById("btn-clear-filters")
      .addEventListener("click", () => {
        this.selectedItems = [];
        this.activeCategory = null;
        this.updateFilterUI();
        this.renderMainChart();
      });
  }

  toggleSelection(itemKeys, category) {
    if (this.activeCategory && this.activeCategory !== category) {
      this.selectedItems = []; // Limpa se trocar de categoria
    }

    this.activeCategory = category;

    // Se for par, tentamos adicionar ambas as chaves (E e D)
    const keysToAdd = Array.isArray(itemKeys) ? itemKeys : [itemKeys];

    keysToAdd.forEach((key) => {
      const index = this.selectedItems.indexOf(key);
      if (index > -1) {
        this.selectedItems.splice(index, 1);
      } else if (this.selectedItems.length < 6) {
        this.selectedItems.push(key);
      }
    });

    if (this.selectedItems.length === 0) this.activeCategory = null;

    this.updateFilterUI();
    this.renderMainChart();
  }

  updateFilterUI() {
    const periCount =
      this.activeCategory === "perimeter" ? this.selectedItems.length : 0;
    const skinCount =
      this.activeCategory === "skinfold" ? this.selectedItems.length : 0;

    //Se for mais que zero exibe o badge, caso contrário, esconde o badge
    if (periCount > 0) {
      document.getElementById("badge-perimetros").innerText =
        `(${periCount}/6)`;
    } else {
      document.getElementById("badge-perimetros").innerText = "";
    }

    if (skinCount > 0) {
      document.getElementById("badge-dobras").innerText = `(${skinCount}/6)`;
    } else {
      document.getElementById("badge-dobras").innerText = "";
    }

    // document
    //   .getElementById("filter-perimetros")
    //   .classList.toggle("active-filter", periCount > 0);
    // document
    //   .getElementById("filter-dobras")
    //   .classList.toggle("active-filter", skinCount > 0);
  }

  // --- GRÁFICO PRINCIPAL ---
  renderMainChart() {
    const ctx = document
      .getElementById("measurementsMainChart")
      .getContext("2d");
    if (this.mainChart) this.mainChart.destroy();

    const labels = this.assessments.map((a) => {
      const d = new Date(a.data_registro);
      return `${d.toLocaleString("pt-BR", { month: "short" })}/${d.getFullYear().toString().slice(-2)}`;
    });

    let datasets = [];

    // Fallback: Somatório de Dobras se nada estiver selecionado
    if (this.selectedItems.length === 0) {
      const sumData = this.assessments.map((a) => {
        const v = typeof a.value === "string" ? JSON.parse(a.value) : a.value;
        return (
          (parseFloat(v.dobra_tricipital) || 0) +
          (parseFloat(v.dobra_subescapular) || 0) +
          (parseFloat(v.dobra_suprailiaca) || 0) +
          (parseFloat(v.dobra_abdominal) || 0) +
          (parseFloat(v.dobra_peitoral) || 0) +
          (parseFloat(v.dobra_axilar_media) || 0) +
          (parseFloat(v.dobra_coxa) || 0)
        );
      });

      const gradient = ctx.createLinearGradient(0, 0, 0, 300);
      gradient.addColorStop(0, "rgba(59, 130, 246, 0.4)"); // Azul
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      datasets.push({
        label: "Somatório de Dobras (mm)",
        data: sumData,
        borderColor: "#3B82F6",
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#3B82F6",
      });
    } else {
      // Plotar itens selecionados
      const colors = [
        "#3B82F6",
        "#10B981",
        "#F59E0B",
        "#8B5CF6",
        "#EC4899",
        "#14B8A6",
      ];

      this.selectedItems.forEach((key, i) => {
        const data = this.assessments.map((a) => {
          const v = typeof a.value === "string" ? JSON.parse(a.value) : a.value;
          return parseFloat(v[key]) || null;
        });

        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, colors[i % colors.length] + "66"); // 40% opacidade
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

        datasets.push({
          label: key.replace(/_/g, " ").toUpperCase(),
          data: data,
          borderColor: colors[i % colors.length],
          backgroundColor: gradient,
          fill: true,
          tension: 0.3,
        });
      });
    }

    this.mainChart = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: false },
        },
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12 } } },
      },
    });
  }

  // --- RENDERIZAÇÃO DE CARDS E SPARKLINES ---
  getFieldsDefinition(category) {
    if (category === "perimeter") {
      return [
        { key: "torax", label: "Tórax", unit: "cm", isPair: false },
        { key: "cintura", label: "Cintura", unit: "cm", isPair: false },
        { key: "abdomen", label: "Abdômen", unit: "cm", isPair: false },
        { key: "quadril", label: "Quadril", unit: "cm", isPair: false },
        { key: "ombro", label: "Ombro", unit: "cm", isPair: false },
        { key: "pescoco", label: "Pescoço", unit: "cm", isPair: false },
        {
          key: ["antebraco_esq", "antebraco_dir"],
          label: "Antebraço E/D",
          unit: "cm",
          isPair: true,
        },
        {
          key: ["braco_relaxado_esq", "braco_relaxado_dir"],
          label: "Braço Relax. E/D",
          unit: "cm",
          isPair: true,
        },
        {
          key: ["braco_contraido_esq", "braco_contraido_dir"],
          label: "Braço Cont. E/D",
          unit: "cm",
          isPair: true,
        },
        {
          key: ["coxa_esq", "coxa_dir"],
          label: "Coxa E/D",
          unit: "cm",
          isPair: true,
        },
        {
          key: ["panturrilha_esq", "panturrilha_dir"],
          label: "Panturrilha E/D",
          unit: "cm",
          isPair: true,
        },
      ];
    } else {
      return [
        { key: "dobra_peitoral", label: "Peitoral", unit: "mm", isPair: false },
        {
          key: "dobra_axilar_media",
          label: "Axilar-Média",
          unit: "mm",
          isPair: false,
        },
        {
          key: "dobra_tricipital",
          label: "Tricipital",
          unit: "mm",
          isPair: false,
        },
        {
          key: "dobra_bicipital",
          label: "Bicipital",
          unit: "mm",
          isPair: false,
        },
        {
          key: "dobra_subescapular",
          label: "Subescapular",
          unit: "mm",
          isPair: false,
        },
        {
          key: "dobra_abdominal",
          label: "Abdominal",
          unit: "mm",
          isPair: false,
        },
        {
          key: "dobra_suprailiaca",
          label: "Suprailíaca",
          unit: "mm",
          isPair: false,
        },
        { key: "dobra_coxa", label: "Coxa", unit: "mm", isPair: false },
        {
          key: "dobra_panturrilha",
          label: "Panturrilha",
          unit: "mm",
          isPair: false,
        },
      ];
    }
  }

  renderCards(category, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    const fields = this.getFieldsDefinition(category);

    fields.forEach((field, index) => {
      const cardId = `sparkline-${category}-${index}`;

      let currentValue = "--";
      let deltaText = "";
      let statusInfo = { icon: "horizontal_rule", label: "poucos dados" };

      const lastAsses = this.assessments[this.assessments.length - 1].value;
      const parsedLast =
        typeof lastAsses === "string" ? JSON.parse(lastAsses) : lastAsses;

      const primaryKey = field.isPair ? field.key[1] : field.key;

      if (parsedLast[primaryKey]) {
        currentValue = parseFloat(parsedLast[primaryKey]).toFixed(1);

        const historyValues = this.assessments.map((a) => {
          const v = typeof a.value === "string" ? JSON.parse(a.value) : a.value;
          return parseFloat(v[primaryKey]);
        });

        statusInfo = this.calculateStatus(historyValues, category);

        if (historyValues.length > 1) {
          const prev = historyValues[historyValues.length - 2];
          const curr = historyValues[historyValues.length - 1];
          if (prev && curr) {
            const diff = curr - prev;
            deltaText = diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
          }
        }
      }

      // Estrutura HTML idêntica ao seu snippet do analysis-deck
      // Renderização com código limpo e herança do CSS Global + Modificador Local
      // Renderização usando o componente específico da grade (100% classes CSS)

      //Caso tenha até 10 caracteres, adiciona reticências, caso contrário, mantém o texto completo
      const truncatedLabel =
        field.label.length > 10
          ? field.label.substring(0, 10) + "..."
          : field.label;
      const cardHTML = `
        <div class="measurements-card" onclick="window.bodyMeasurementsCtrl.toggleSelection(${field.isPair ? `['${field.key[0]}', '${field.key[1]}']` : `'${field.key}'`}, '${category}')">
          <div class="measurements-card-content">
            <div class="measurements-card-title">
              ${truncatedLabel} 
              ${deltaText ? `<span>(${deltaText})</span>` : ""}
            </div>
            <div class="measurements-card-value">${currentValue}</div>
            <div class="measurements-card-subtext">
              <span class="material-symbols-rounded">${statusInfo.icon}</span>
              ${statusInfo.label}
            </div>
          </div>
          <div class="measurements-card-sparkline">
            <canvas id="${cardId}"></canvas>
          </div>
        </div>
      `;
      container.insertAdjacentHTML("beforeend", cardHTML);

      // Aplica o cálculo da escala dinâmica para o grupo respectivo
      const scale = this.calculateScaleForGroup(category, field.key);
      this.renderSparkline(cardId, field, scale);
    });
  }

  renderSparkline(canvasId, field, scale) {
    setTimeout(() => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const datasets = [];
      const keys = field.isPair ? field.key : [field.key];

      // Degradê usando as cores exatas do seu SVG (#ccccc1)
      const gradient = ctx.createLinearGradient(
        0,
        0,
        0,
        canvas.parentElement.clientHeight || 50,
      );
      gradient.addColorStop(0, "rgba(204, 204, 193, 0.4)");
      gradient.addColorStop(1, "rgba(204, 204, 193, 0.0)");

      keys.forEach((key, index) => {
        const data = this.assessments.map((a) => {
          const v = typeof a.value === "string" ? JSON.parse(a.value) : a.value;
          return parseFloat(v[key]) || null;
        });

        datasets.push({
          data: data,
          borderColor:
            index === 0 && keys.length > 1
              ? "rgba(204, 204, 193, 0.5)"
              : "#ccccc1",
          borderDash: index === 0 && keys.length > 1 ? [3, 3] : [],
          borderWidth: 1.5,
          backgroundColor: index === keys.length - 1 ? gradient : "transparent",
          fill: index === keys.length - 1,
          pointRadius: 0,
          tension: 0.4,
        });
      });

      if (this.sparklines[canvasId]) this.sparklines[canvasId].destroy();

      this.sparklines[canvasId] = new Chart(ctx, {
        type: "line",
        data: { labels: this.assessments.map(() => ""), datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            // Implementação da escala estrita que resolve o achatamento dos gráficos:
            y: { display: false, min: scale.min, max: scale.max },
          },
          layout: { padding: 0 },
        },
      });
    }, 0);
  }

  setupAccordions() {
    document.querySelectorAll(".accordion-header").forEach((header) => {
      // Remove listeners antigos para evitar duplicação em re-renders
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);

      newHeader.addEventListener("click", () => {
        const content = newHeader.nextElementSibling;
        const icon = newHeader.querySelector(".accordion-icon");
        content.classList.toggle("hidden");
        icon.innerText = content.classList.contains("hidden")
          ? "expand_more"
          : "expand_less";
      });
    });
  }
}
