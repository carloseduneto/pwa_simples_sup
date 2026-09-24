import { StimulusService } from "../services/stimulus.service.js";
import { AuthService } from "../services/auth.service.js";

// --- MÓDULO DE CALENDÁRIO (Fábrica Modular) ---
const CalendarFactory = {
  // Extrai uma lista de strings 'YYYY-MM-DD' em horário local a partir dos dados brutos
  extractActiveDates(historyArray) {
    if (!historyArray) return new Set();
    const dates = historyArray.map((session) => {
      const d = new Date(session.data);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    return new Set(dates);
  },

  buildWeek(currentDate, activeDatesSet, getRangeFn) {
    const { start } = getRangeFn("week", currentDate);
    const startDate = new Date(start);
    const days = ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."];

    // Captura a data de hoje para comparação (sem horas)
    const todayStr = new Date().toDateString();

    let html = `<div class="calendar-grid">`;
    days.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);

      const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;
      const isSession = activeDatesSet.has(dateStr);
      const isToday = currentDay.toDateString() === todayStr;

      let classes = `calendar-day ${isSession ? "has-session" : ""}`;
      if (isToday) {
        classes += " calendar-day-today";
      }

      html += `<div class="${classes}" ${isSession ? `data-date="${dateStr}"` : ""}>${currentDay.getDate()}</div>`;
    }
    html += `</div>`;
    return html;
  },

  buildMonth(currentDate, activeDatesSet) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Para a visão mensal, o padrão começa no Domingo
    const headers = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
    let html = `<div class="calendar-grid">`;
    headers.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

    const startPadding = firstDayOfMonth.getDay(); // 0 (Dom) a 6 (Sáb)
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // Dias do mês anterior (esmaecidos)
    for (let i = startPadding - 1; i >= 0; i--) {
      html += `<div class="calendar-day out-of-month">${prevMonthLastDay - i}</div>`;
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const isSession = activeDatesSet.has(dateStr);
      let classes = `calendar-day ${isSession ? "has-session" : ""}`;
      const localDateStr = dateStr.replace(/-/g, "/");
      const isToday =
        new Date().toDateString() === new Date(localDateStr).toDateString();
      if (isToday) {
        classes += " calendar-day-today";
      }

      html += `<div class="${classes}" ${isSession ? `data-date="${dateStr}"` : ""}>${i}</div>`;
    }

    // Dias do próximo mês (esmaecidos) para completar o grid
    const totalCellsRendered = startPadding + daysInMonth;
    const remainingCells =
      totalCellsRendered % 7 === 0 ? 0 : 7 - (totalCellsRendered % 7);
    for (let i = 1; i <= remainingCells; i++) {
      html += `<div class="calendar-day out-of-month">${i}</div>`;
    }

    html += `</div>`;
    return html;
  },
};

// --- MÓDULO DE ANÁLISE ANUAL (Fábrica Modular) ---
const AnnualAnalysisFactory = {
  mesesNome: [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ],

  calculateVariance(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    if (mean === 0) return 0;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    // Retorna o Desvio Padrão Absoluto (quantidade real de séries de oscilação)
    // return Math.sqrt(variance);
    // Retorna a Variância Relativa (percentual de oscilação em relação à média)
    return Math.sqrt(variance) / mean;
  },

  // 2. ATUALIZAÇÃO DA FÁBRICA (Ajuste no getStats para compensar o fatiamento do array)
  getStats(arrayData, monthOffset = 0, currentMonthIdx = 11) {
    let max = -Infinity;
    let min = Infinity;
    let maxIdx = 0;
    let minIdx = 0;
    let sum = 0;

    arrayData.forEach((val, idx) => {
      sum += val;
      if (val > max) {
        max = val;
        maxIdx = idx;
      }
      if (val < min && val > 0) {
        min = val;
        minIdx = idx;
      }
    });

    if (min === Infinity) {
      min = 0;
      minIdx = 0;
    }

    const countMeses = arrayData.length;
    const media = countMeses > 0 ? sum / countMeses : 0;
    const atual = arrayData[arrayData.length - 1] || 0; // Último valor do array fatiado

    return {
      total: sum,
      media: media,
      atual: atual,
      mesAtualNome: this.mesesNome[currentMonthIdx],
      pico: max,
      mesPico: this.mesesNome[maxIdx + monthOffset],
      minima: min,
      mesMinima: this.mesesNome[minIdx + monthOffset],
      variancia: this.calculateVariance(arrayData),
    };
  },

  // Recebe o globalMax para padronizar a escala (Eixo Y partindo do zero)
  generateSparkline(dataArray, colorHex, id, globalMax) {
    const width = 130;
    const height = 60;
    const max = globalMax > 0 ? globalMax : 1;
    const stepX = width / Math.max(dataArray.length - 1, 1);

    const points = dataArray.map((val, i) => {
      // Inverte o eixo Y pois no SVG o 0 é no topo
      return { x: i * stepX, y: height - (val / max) * (height - 5) };
    });

    const bezierCommand = (point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const prev = a[i - 1];
      const tension = 0.4;

      // Simulação matemática de Interpolação Monotônica:
      // Pontos de controle na exata altura do eixo Y, travando extrapolações.
      const cp1x = prev.x + (point.x - prev.x) * tension;
      const cp1y = prev.y;
      const cp2x = point.x - (point.x - prev.x) * tension;
      const cp2y = point.y;

      return `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`;
    };

    const pathString = points.reduce(
      (acc, point, i, a) => acc + bezierCommand(point, i, a),
      "",
    );
    const fillPath = `${pathString} L ${width},${height} L 0,${height} Z`;

    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width: 100%; height: 100%;">
        <defs>
          <linearGradient id="grad-${id}" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="${colorHex}" stop-opacity="0.4" />
            <stop offset="100%" stop-color="${colorHex}" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <path d="${fillPath}" fill="url(#grad-${id})" />
        <path d="${pathString}" fill="none" stroke="${colorHex}" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    `;
  },
};

// --- CONTROLLER PRINCIPAL ---
const StimulusAnalysisController = {
  state: {
    period: "day",
    currentDate: new Date(),
    data: {
      history: [],
      volume: { grafico_tabela: [], lista_exercicios: [] },
    },
    cache: {},
    breakdownMode: "muscle",
    monthChartMode: "overlap", // NOVO: Controle de sobreposição vs soma
    chartZoomLevel: 100, // NOVO: Controle do nível de zoom (100% = exibe todos)
    yearRangeFilter: "all", // NOVO: Controle de range da visão anual
    yearGroupFilter: "all",
    yearMuscleFilter: [], // array com max 6
    chartInstance: null,
    navigateCallback: null,
    currentRenderId: null,
    tableSort: { key: "musculo", asc: true },
  },

  async init(navigateCallback) {
    this.state.navigateCallback = navigateCallback;
    this.state.cache = {};

    this.cacheDOM();
    this.bindEvents();

    if (this.state.period === "day") {
      try {
        const ownerId = await AuthService.getUserId();
        if (ownerId) {
          const { start, end } = this.getDateRange(
            "day",
            this.state.currentDate,
          );
          const todayHistory = await StimulusService.getSessionHistory(
            ownerId,
            start,
            end,
          );

          if (!todayHistory || todayHistory.length === 0) {
            const recentDateStr = await StimulusService.getAdjacentSessionDate(
              ownerId,
              end,
              -1,
            );
            if (recentDateStr) {
              const datePart = recentDateStr.split("T")[0];
              const [y, m, d] = datePart.split("-").map(Number);
              this.state.currentDate = new Date(y, m - 1, d);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar sessão recente:", error);
      }
    }

    await this.updateDataAndRender();
  },

  cacheDOM() {
    this.tabs = document.querySelectorAll(".tab-btn");
    this.dateDisplay = document.getElementById("currentDateDisplay");
    this.tableBody = document.getElementById("muscleTableBody");
    this.exerciseList = document.getElementById("exerciseListContainer");
    this.summaryContainer = document.getElementById("summaryContainer");
    this.chartCanvas = document.getElementById("stimulusRadarChart");
    this.chartContainer = document.querySelector(".chart-container");
    this.tableHead = document.querySelector(".data-table thead tr");
    this.miniCalendarContainer = document.getElementById(
      "miniCalendarContainer",
    );

    this.btnPrevDate = document.getElementById("btnPrevDate");
    this.btnNextDate = document.getElementById("btnNextDate");
    this.btnToggleBreakdown = document.getElementById("btnToggleBreakdown");
  },

  bindEvents() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => this.handleTabChange(e));
    });

    this.btnPrevDate.addEventListener("click", () => this.navigateDate(-1));
    this.btnNextDate.addEventListener("click", () => this.navigateDate(1));

    if (this.btnToggleBreakdown) {
      this.btnToggleBreakdown.addEventListener("click", () => {
        this.state.breakdownMode =
          this.state.breakdownMode === "muscle" ? "exercise" : "muscle";
        this.renderExerciseList();
      });
    }
  },

  async handleTabChange(e) {
    this.tabs.forEach((t) => t.classList.remove("active"));
    e.target.classList.add("active");

    this.state.period = e.target.dataset.period;
    this.state.chartZoomLevel = 100;
    this.state.yearRangeFilter = "all"; // Reseta o filtro ao trocar de aba
    await this.updateDataAndRender();
  },

  async navigateDate(direction) {
    if (this.state.period === "day") {
      const ownerId = await AuthService.getUserId();
      if (!ownerId) return;

      const { start, end } = this.getDateRange("day", this.state.currentDate);
      const referenceDate = direction > 0 ? end : start;

      const adjacentDate = await StimulusService.getAdjacentSessionDate(
        ownerId,
        referenceDate,
        direction,
      );

      if (adjacentDate) {
        this.state.currentDate = new Date(adjacentDate);
      } else {
        return;
      }
    } else {
      const d = new Date(this.state.currentDate);
      if (this.state.period === "week") d.setDate(d.getDate() + direction * 7);
      if (this.state.period === "month") d.setMonth(d.getMonth() + direction);
      if (this.state.period === "year")
        d.setFullYear(d.getFullYear() + direction);
      this.state.currentDate = d;
    }

    await this.updateDataAndRender();
  },

  // 3. ATUALIZAÇÃO DO RENDER ANUAL (Aplicação matemática do fatiamento e injeção do select)
  renderAnnualView() {
    const dadosPlano = this.state.data.volume.grafico_tabela;

    if (this.miniCalendarContainer)
      this.miniCalendarContainer.style.display = "none";
    if (this.exerciseList)
      this.exerciseList.closest(".exercise-breakdown").style.display = "none";
    if (document.querySelector(".table-container"))
      document.querySelector(".table-container").style.display = "none";

    const yearView = this.state.currentDate.getFullYear();
    const currentYear = new Date().getFullYear();
    const limitMonth = yearView === currentYear ? new Date().getMonth() : 11;

    let startMonth = 0;
    if (this.state.yearRangeFilter !== "all") {
      const range = parseInt(this.state.yearRangeFilter, 10);
      startMonth = Math.max(0, limitMonth - range + 1);
    }
    const endMonth = limitMonth;

    // Estruturação do Dicionário (Grupo -> Músculos)
    const dictGrupos = {};
    const macroMap = {};
    const microMap = {};

    dadosPlano.forEach((row) => {
      const macro = row.grupo_muscular || "Geral";
      const micro = row.musculo;
      const mesString = row.periodo.split("-")[1];
      const monthIdx = parseInt(mesString, 10) - 1;

      if (!dictGrupos[macro]) dictGrupos[macro] = new Set();
      dictGrupos[macro].add(micro);

      if (!macroMap[macro]) macroMap[macro] = Array(12).fill(0);
      if (!microMap[micro]) microMap[micro] = Array(12).fill(0);

      macroMap[macro][monthIdx] += row.series;
      microMap[micro][monthIdx] += row.series;
    });

    this.renderAnnualFilters(dictGrupos);

    if (this.chartContainer) this.chartContainer.classList.remove("is-loading");
    const parent = this.chartCanvas.parentNode;
    if (parent.querySelector(".chart-header-toggle"))
      parent.querySelector(".chart-header-toggle").style.display = "none";
    if (parent.querySelector(".chart-zoom-slider"))
      parent.querySelector(".chart-zoom-slider").style.display = "none";

    const mesesExibicao = AnnualAnalysisFactory.mesesNome
      .slice(startMonth, endMonth + 1)
      .map((m) => `${m}./${String(yearView).slice(-2)}`);

    const isFiltered =
      this.state.yearGroupFilter !== "all" ||
      this.state.yearMuscleFilter.length > 0;

    // DEFINIÇÃO DO MODO (Macro x Micro)
    let chartLabels = [];
    let chartMap = {};

    if (isFiltered) {
      if (this.state.yearMuscleFilter.length > 0) {
        chartLabels = this.state.yearMuscleFilter;
      } else {
        chartLabels = Array.from(dictGrupos[this.state.yearGroupFilter]).slice(
          0,
          6,
        );
      }
      chartMap = microMap;
    } else {
      chartLabels = Object.keys(macroMap).sort();
      chartMap = macroMap;
    }

    const datasets = chartLabels.map((labelName, index) => {
      const colors = [
        "#4285F4",
        "#EA4335",
        "#FBBC04",
        "#34A853",
        "#FF6D00",
        "#46BDC6",
      ];
      const cor = colors[index % colors.length];
      const dataArray = (chartMap[labelName] || Array(12).fill(0)).slice(
        startMonth,
        endMonth + 1,
      );

      return {
        label: labelName,
        data: dataArray,
        borderColor: cor,
        backgroundColor: cor,
        tension: 0.4,
        cubicInterpolationMode: "monotone",
        borderWidth: 2,
        pointRadius: 0,
        pointHitRadius: 10,
        pointStyle: "circle",
      };
    });

    if (this.state.chartInstance) this.state.chartInstance.destroy();

    this.chartCanvas.remove();
    const newCanvas = document.createElement("canvas");
    newCanvas.id = "stimulusRadarChart";

    const filtersContainer = parent.querySelector(".annual-filters-bar");
    parent.insertBefore(newCanvas, filtersContainer.nextSibling);
    this.chartCanvas = newCanvas;

    this.state.chartInstance = new Chart(this.chartCanvas, {
      type: "line",
      data: { labels: mesesExibicao, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.2,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: "rgba(128,128,128,0.1)" } },
        },
        plugins: {
          legend: {
            position: "top",
            labels: { usePointStyle: true, boxWidth: 8, padding: 16 },
          },
        },
      },
    });

    this.summaryContainer.innerHTML = "";

    // RENDERIZAÇÃO DOS DADOS E SUMÁRIOS
    if (isFiltered) {
      // MODO MICRO (Detalhes por Músculo e Resumo Específico)
      let html = `<div class="analysis-sections-container">`;
      const statsFiltrados = [];

      chartLabels.forEach((musculo) => {
        const dataArray = (microMap[musculo] || Array(12).fill(0)).slice(
          startMonth,
          endMonth + 1,
        );
        const stats = AnnualAnalysisFactory.getStats(
          dataArray,
          startMonth,
          endMonth,
        );
        statsFiltrados.push({ musculo, ...stats });

        html += `
          <div class="muscle-detail-section" style="margin-bottom: 24px;">
            <div class="analysis-deck-header">${musculo}</div>
            <div class="analysis-deck">
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Atual</div>
                  <div class="analysis-card-value">${stats.atual}</div>
                  <div class="analysis-card-subtext">${stats.mesAtualNome}</div>
                </div>
              </div>
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Máximo</div>
                  <div class="analysis-card-value">${stats.pico}</div>
                  <div class="analysis-card-subtext">${stats.mesPico}</div>
                </div>
              </div>
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Mínimo</div>
                  <div class="analysis-card-value">${stats.minima}</div>
                  <div class="analysis-card-subtext">${stats.mesMinima}</div>
                </div>
              </div>
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Média</div>
                  <div class="analysis-card-value">${stats.media.toFixed(1)}</div>
                  <div class="analysis-card-subtext">período sel.</div>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      // Resumo Geral (Slider Bottom)
      if (statsFiltrados.length > 0) {
        const validosVar = statsFiltrados.filter((m) => m.total >= 1);

        let estavel = { musculo: "-", variancia: 0 };
        let instavel = { musculo: "-", variancia: 0 };
        let maximaAbs = { musculo: "-", pico: 0 };
        let minimaAbs = { musculo: "-", minima: Infinity };

        if (validosVar.length > 0) {
          validosVar.sort((a, b) => a.variancia - b.variancia);
          estavel = validosVar[0];
          instavel = validosVar[validosVar.length - 1];
        }

        statsFiltrados.forEach((s) => {
          if (s.pico > maximaAbs.pico) maximaAbs = s;
          if (s.minima < minimaAbs.minima) minimaAbs = s;
        });
        if (minimaAbs.minima === Infinity) minimaAbs.minima = 0;

        const periodStr = `${AnnualAnalysisFactory.mesesNome[startMonth]} - ${AnnualAnalysisFactory.mesesNome[endMonth]}`;

        html += `
          <div class="analysis-deck-header" style="margin-top: 16px;">
            <span class="material-symbols-rounded" style="font-size: 18px;">analytics</span>
            Resumo geral
          </div>
          <div class="analysis-deck">
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">Estável - ${estavel.musculo}</div>
                <div class="analysis-card-value">${(estavel.variancia * 100).toFixed(0)}%</div>
                <div class="analysis-card-subtext">Menor oscilação relativa</div>
              </div>
            </div>
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">Variável - ${instavel.musculo}</div>
                <div class="analysis-card-value">${(instavel.variancia * 100).toFixed(0)}%</div>
                <div class="analysis-card-subtext">Maior oscilação relativa</div>
              </div>
            </div>
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">Máx. - ${maximaAbs.musculo}</div>
                <div class="analysis-card-value">${maximaAbs.pico}</div>
                <div class="analysis-card-subtext">Maior volume bruto (${periodStr})</div>
              </div>
            </div>
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">Mín. - ${minimaAbs.musculo}</div>
                <div class="analysis-card-value">${minimaAbs.minima}</div>
                <div class="analysis-card-subtext">Menor volume bruto > 0 (${periodStr})</div>
              </div>
            </div>
          </div>
        `;
      }
      html += `</div>`;
      this.summaryContainer.innerHTML = html;
    } else {
      // MODO MACRO (Aquele que já estava pronto com Top 5 Global)
      let globalMaxVolume = 0;
      const statsList = Object.keys(microMap).map((musculo) => {
        const dataArray = microMap[musculo].slice(startMonth, endMonth + 1);
        const stats = AnnualAnalysisFactory.getStats(
          dataArray,
          startMonth,
          endMonth,
        );
        if (stats.pico > globalMaxVolume) globalMaxVolume = stats.pico;
        return { musculo, dataArray, ...stats };
      });

      const topMais = [...statsList]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      const topMenos = [...statsList]
        .filter((m) => m.total > 0)
        .sort((a, b) => a.total - b.total)
        .slice(0, 5);
      const topVar = [...statsList]
        .filter((m) => m.total >= 15)
        .sort((a, b) => b.variancia - a.variancia)
        .slice(0, 5);

      const buildDeckHtml = (
        title,
        icon,
        list,
        colorHex,
        valKey,
        subKeyPrefix,
      ) => {
        let h = `<div class="analysis-deck-header"><span class="material-symbols-rounded" style="font-size: 18px;">${icon}</span>${title}</div><div class="analysis-deck">`;
        list.forEach((item, i) => {
          const displayVal =
            valKey === "variancia"
              ? `${Math.round(item.minima)} - ${Math.round(item.pico)}`
              : item[valKey];
          let displaySub = "";
          if (valKey === "variancia")
            displaySub = `var. ${(item.variancia * 100).toFixed(0)}%`;
          else if (valKey === "pico")
            displaySub = `${subKeyPrefix} ${item.mesPico}`;
          else displaySub = `${subKeyPrefix} ${item.mesMinima}`;

          const sparklineSvg = AnnualAnalysisFactory.generateSparkline(
            item.dataArray,
            colorHex,
            `${valKey}-${i}`,
            globalMaxVolume,
          );
          h += `<div class="analysis-card"><div class="analysis-card-content"><div class="analysis-card-title">${item.musculo}</div><div class="analysis-card-value">${displayVal}</div><div class="analysis-card-subtext">${displaySub}</div></div><div class="analysis-card-sparkline">${sparklineSvg}</div></div>`;
        });
        return h + `</div>`;
      };

      this.summaryContainer.innerHTML = `
        <div class="analysis-sections-container">
          ${buildDeckHtml("Músculos mais ativos (top 5)", "arrow_upward", topMais, "#fba87f", "pico", "pico em")}
          ${buildDeckHtml("Músculos menos ativos (top 5)", "arrow_downward", topMenos, "#fba87f", "minima", "mínima em")}
          ${buildDeckHtml("Músculos maior variância (top 5)", "bar_chart", topVar, "#fba87f", "variancia", "pico em")}
        </div>
      `;
    }
  },

  renderAnnualFilters(dictGrupos) {
    const parent = this.chartCanvas.parentNode;
    let bar = parent.querySelector(".annual-filters-bar");

    if (!bar) {
      bar = document.createElement("div");
      bar.className = "annual-filters-bar";
      parent.insertBefore(bar, this.chartCanvas);
    }

    // Identifica quais músculos mostrar no dropdown baseado no Grupo selecionado
    let musculosDisponiveis = [];
    if (this.state.yearGroupFilter !== "all") {
      musculosDisponiveis = Array.from(
        dictGrupos[this.state.yearGroupFilter] || [],
      );
    } else {
      musculosDisponiveis = Object.values(dictGrupos).reduce((acc, curr) => {
        curr.forEach((m) => acc.add(m));
        return acc;
      }, new Set());
      musculosDisponiveis = Array.from(musculosDisponiveis).sort();
    }

    const maxAlcancado = this.state.yearMuscleFilter.length >= 6;

    let dropdownHTML = musculosDisponiveis
      .map((m) => {
        const isChecked = this.state.yearMuscleFilter.includes(m);
        const disabledStr =
          !isChecked && maxAlcancado ? 'disabled style="opacity: 0.5;"' : "";
        return `
        <label class="filter-checkbox-item" ${disabledStr}>
          <input type="checkbox" value="${m}" class="muscle-cb" ${isChecked ? "checked" : ""} ${disabledStr}>
          ${m}
        </label>
      `;
      })
      .join("");

    bar.innerHTML = `
      <div class="filter-select-wrapper" style="flex: 1 1 100%;">
        <select id="rangeFilter" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: none; background: var(--gray-100); font-size: 14px;">
          <option value="all" ${this.state.yearRangeFilter === "all" ? "selected" : ""}>Todos os meses</option>
          <option value="3" ${this.state.yearRangeFilter === "3" ? "selected" : ""}>3 últimos meses</option>
          <option value="6" ${this.state.yearRangeFilter === "6" ? "selected" : ""}>6 últimos meses</option>
          <option value="9" ${this.state.yearRangeFilter === "9" ? "selected" : ""}>9 últimos meses</option>
          <option value="12" ${this.state.yearRangeFilter === "12" ? "selected" : ""}>12 últimos meses</option>
        </select>
      </div>

      <div class="filter-select-wrapper">
        <select id="groupFilter" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: none; background: var(--gray-100); font-size: 14px;">
          <option value="all">Grupos...</option>
          ${Object.keys(dictGrupos)
            .sort()
            .map(
              (g) =>
                `<option value="${g}" ${this.state.yearGroupFilter === g ? "selected" : ""}>${g}</option>`,
            )
            .join("")}
        </select>
      </div>

      <div class="filter-select-wrapper">
        <button type="button" class="filter-select-btn" id="btnDropdownMuscles">
          Músculos (${this.state.yearMuscleFilter.length}/6)
          <span class="material-symbols-rounded" style="font-size: 16px;">arrow_drop_down</span>
        </button>
        <div class="filter-dropdown-menu" id="menuDropdownMuscles">
          ${dropdownHTML}
        </div>
      </div>

      <button type="button" class="btn-clear-filters" id="btnClearFilters">
        <span class="material-symbols-rounded" style="font-size: 16px;">filter_alt_off</span> Limpar
      </button>
    `;

    // Eventos
    bar.querySelector("#rangeFilter").addEventListener("change", (e) => {
      this.state.yearRangeFilter = e.target.value;
      this.renderAnnualView();
    });

    bar.querySelector("#groupFilter").addEventListener("change", (e) => {
      this.state.yearGroupFilter = e.target.value;
      this.state.yearMuscleFilter = []; // Reseta os músculos se mudar o grupo
      this.renderAnnualView();
    });

    const btnDrop = bar.querySelector("#btnDropdownMuscles");
    const menuDrop = bar.querySelector("#menuDropdownMuscles");
    let filterChanged = false;

    // Função que escuta o clique fora do menu para fechar e atualizar
    const closeDropdown = (e) => {
      if (!menuDrop.contains(e.target) && !btnDrop.contains(e.target)) {
        menuDrop.classList.remove("is-open");
        document.removeEventListener("click", closeDropdown); // Evita memory leak
        if (filterChanged) this.renderAnnualView();
      }
    };

    // Abre e fecha pelo próprio botão
    btnDrop.addEventListener("click", () => {
      if (menuDrop.classList.contains("is-open")) {
        menuDrop.classList.remove("is-open");
        document.removeEventListener("click", closeDropdown);
        if (filterChanged) this.renderAnnualView();
      } else {
        menuDrop.classList.add("is-open");
        filterChanged = false;
        document.addEventListener("click", closeDropdown);
      }
    });

    // Controle em tempo real dos checkboxes sem re-renderizar a tela inteira
    bar.querySelectorAll(".muscle-cb").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        filterChanged = true;

        if (e.target.checked) {
          if (this.state.yearMuscleFilter.length < 6)
            this.state.yearMuscleFilter.push(e.target.value);
        } else {
          this.state.yearMuscleFilter = this.state.yearMuscleFilter.filter(
            (m) => m !== e.target.value,
          );
        }

        // 1. Atualiza o contador no botão instantaneamente
        btnDrop.innerHTML = `
          Músculos (${this.state.yearMuscleFilter.length}/6)
          <span class="material-symbols-rounded" style="font-size: 16px;">arrow_drop_down</span>
        `;

        // 2. Trava/Destrava visualmente os checkboxes restantes se bater no limite de 6
        const maxReached = this.state.yearMuscleFilter.length >= 6;
        bar.querySelectorAll(".muscle-cb").forEach((box) => {
          if (!box.checked) {
            box.disabled = maxReached;
            // Opcional: Adicione transição no CSS do .filter-checkbox-item para ficar mais suave
            box.parentElement.style.opacity = maxReached ? "0.4" : "1";
            box.parentElement.style.pointerEvents = maxReached
              ? "none"
              : "auto";
          }
        });
      });
    });

    bar.querySelector("#btnClearFilters").addEventListener("click", () => {
      this.state.yearRangeFilter = "all";
      this.state.yearGroupFilter = "all";
      this.state.yearMuscleFilter = [];
      this.renderAnnualView();
    });
  },

  // FUNÇÃO DE NAVEGAÇÃO DE ATALHO (Drill-down)
  goToDayView(dateString) {
    // Atualiza o estado
    this.state.period = "day";
    // Força o fuso horário local quebrando a string YYYY-MM-DD
    const [y, m, d] = dateString.split("-").map(Number);
    this.state.currentDate = new Date(y, m - 1, d);

    // Atualiza a UI das abas
    this.tabs.forEach((t) => {
      t.classList.toggle("active", t.dataset.period === "day");
    });

    this.updateDataAndRender();
  },

  async updateDataAndRender() {
    const renderToken = Symbol();
    this.state.currentRenderId = renderToken;

    if (this.state.chartInstance) {
      this.state.chartInstance.destroy();
      this.state.chartInstance = null;
    }
    if (this.chartContainer) this.chartContainer.classList.add("is-loading");

    const { start, end } = this.getDateRange(
      this.state.period,
      this.state.currentDate,
    );
    this.dateDisplay.textContent = this.formatDateDisplay(
      this.state.currentDate,
      this.state.period,
    );

    try {
      const ownerId = await AuthService.getUserId();
      if (!ownerId) return;

      await this.checkNextButtonState(ownerId, end);

      const cacheKey = `${this.state.period}_${start}_${end}`;
      let finalHistory, finalVolume;

      if (this.state.cache[cacheKey]) {
        finalHistory = this.state.cache[cacheKey].history;
        finalVolume = this.state.cache[cacheKey].volume;
      } else {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const [historyData, volumeData] = await Promise.all([
          StimulusService.getSessionHistory(ownerId, start, end),
          StimulusService.getVolumeAnalysis(
            ownerId,
            start,
            end,
            this.getAgrupamentoSQL(this.state.period),
            userTimeZone,
          ),
        ]);

        finalHistory = historyData;
        finalVolume = volumeData;
        this.state.cache[cacheKey] = {
          history: historyData,
          volume: volumeData,
        };
      }

      if (this.state.currentRenderId !== renderToken) return;

      this.state.data.history = finalHistory;
      this.state.data.volume = finalVolume;

      // Desvio de arquitetura visual
      if (this.state.period === "year") {
        this.renderAnnualView();
      } else {
        this.renderMiniCalendar();
        this.renderHistoryLog();
        this.renderExerciseList();

        if (this.chartContainer) {
          this.chartContainer.classList.remove("is-loading");
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (this.state.currentRenderId === renderToken) {
                this.renderTable(); // Nova função modular
                this.renderChart(); // Nova função modular
              }
            });
          });
        } else {
          this.renderTable();
          this.renderChart();
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados de estímulo", error);
      if (this.chartContainer)
        this.chartContainer.classList.remove("is-loading");
    }
  },

  async checkNextButtonState(ownerId, currentPeriodEnd) {
    const nextDate = await StimulusService.getAdjacentSessionDate(
      ownerId,
      currentPeriodEnd,
      1,
    );
    this.btnNextDate.disabled = !nextDate;
    this.btnNextDate.style.opacity = nextDate ? "1" : "0.3";
  },

  renderMiniCalendar() {
    if (!this.miniCalendarContainer) return;

    // Só exibe o mini-calendário nas visões de semana e mês
    if (this.state.period !== "week" && this.state.period !== "month") {
      this.miniCalendarContainer.innerHTML = "";
      this.miniCalendarContainer.style.display = "none";
      return;
    }

    this.miniCalendarContainer.style.display = "block";
    const activeDatesSet = CalendarFactory.extractActiveDates(
      this.state.data.history,
    );

    if (this.state.period === "week") {
      this.miniCalendarContainer.innerHTML = CalendarFactory.buildWeek(
        this.state.currentDate,
        activeDatesSet,
        this.getDateRange.bind(this),
      );
    } else if (this.state.period === "month") {
      this.miniCalendarContainer.innerHTML = CalendarFactory.buildMonth(
        this.state.currentDate,
        activeDatesSet,
      );
    }

    // Atrela os eventos de clique aos dias que possuem sessão
    const interactiveDays = this.miniCalendarContainer.querySelectorAll(
      ".calendar-day.has-session",
    );
    interactiveDays.forEach((el) => {
      el.addEventListener("click", () => {
        this.goToDayView(el.dataset.date);
      });
    });
  },

  // Nova função de navegação para semanas
  goToWeekView(dateString) {
    this.state.period = "week";
    const [y, m, d] = dateString.split("-").map(Number);
    this.state.currentDate = new Date(y, m - 1, d);

    this.tabs.forEach((t) => {
      t.classList.toggle("active", t.dataset.period === "week");
    });

    this.updateDataAndRender();
  },

  renderHistoryLog() {
    if (!this.summaryContainer) return;

    const totalSessions = this.state.data.history.length;
    const totalMinutes = this.state.data.history.reduce(
      (acc, curr) => acc + (curr.duracao_minutos || 0),
      0,
    );
    const avgMinutes =
      totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const formattedAvg = this.formatDuration(avgMinutes);

    let html = `
      <div class="history-summary-container" style="padding-left: 18px; padding-right: 16px; width: 100%; display: flex; flex-direction: column; gap: 16px;">
        <div class="history-summary" style="display: flex; justify-content: space-between; width: 100%; font-size: 14px; color: var(--text-secondary, #666);">
          <span>Média de tempo:</span>
          <span>${formattedAvg} (${totalSessions} sessões)</span>
        </div>
    `;

    if (this.state.period === "day" || this.state.period === "week") {
      html += `<div class="history-logs-container" style="display: flex; flex-direction: column; gap: 8px;">`;
      html += this.state.data.history
        .map((session) => {
          const d = new Date(session.data);
          const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

          let timeInfoHtml = `<span>${this.formatDuration(session.duracao_minutos)}</span>`;

          if (this.state.period === "day") {
            const endDate = new Date(
              d.getTime() + (session.duracao_minutos || 0) * 60000,
            );
            const startTimeStr = d.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endTimeStr = endDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });

            timeInfoHtml = `
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                <span>${this.formatDuration(session.duracao_minutos)}</span>
                <span style="font-size: 12px; color: var(--text-secondary, #666);">${startTimeStr} - ${endTimeStr}</span>
              </div>
            `;
          }

          return `
            <div class="session-log-item clickable" data-date="${dateStr}" style="display: flex; justify-content: space-between; align-items: center; background: var(--gray-100, #f3f4f6); padding: 12px; border-radius: 8px; font-size: 14px; color: var(--text-primary, #111);">
              <strong>${session.nome}</strong>
              ${timeInfoHtml}
            </div>
          `;
        })
        .join("");
      html += `</div>`;
    } else if (this.state.period === "month") {
      const weeksMap = new Map();

      this.state.data.history.forEach((session) => {
        const d = new Date(session.data);
        const { start, end } = this.getDateRange("week", d);
        const key = `${start}|${end}`;
        if (!weeksMap.has(key)) {
          weeksMap.set(key, { sessions: 0, totalMinutes: 0, start, end });
        }
        const week = weeksMap.get(key);
        week.sessions++;
        week.totalMinutes += session.duracao_minutos || 0;
      });

      if (weeksMap.size > 0) {
        html += `<div class="month-weeks-deck" style="margin-top: 8px; display: flex; flex-direction: column;">
                   <h3 style="font-size: 16px; margin-bottom: 12px; font-weight: 600;">Semanas</h3>`;

        const sortedKeys = Array.from(weeksMap.keys()).sort();

        sortedKeys.forEach((key) => {
          const week = weeksMap.get(key);
          const avgTime =
            week.sessions > 0
              ? Math.round(week.totalMinutes / week.sessions)
              : 0;
          const s = new Date(week.start);
          const e = new Date(week.end);
          const sMonth = s.toLocaleDateString("pt-BR", { month: "long" });
          const eMonth = e.toLocaleDateString("pt-BR", { month: "long" });

          let dateRangeStr =
            sMonth === eMonth
              ? `${s.getDate()} - ${e.getDate()} de ${sMonth}`
              : `${s.getDate()} de ${sMonth.substring(0, 3)}. - ${e.getDate()} de ${eMonth.substring(0, 3)}.`;

          // Cria a string de data YYYY-MM-DD baseada no início da semana para guiar o drill-down
          const weekDateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;

          // Adiciona a classe 'week-clickable' e o 'data-date' no elemento
          html += `
            <div class="week-clickable" data-date="${weekDateStr}" style="cursor: pointer; border-bottom: 1px solid var(--gray-200, #ddd); padding: 12px 0; display: flex; justify-content: space-between; align-items: flex-start; transition: opacity 0.2s;" onmousedown="this.style.opacity=0.7" onmouseup="this.style.opacity=1" onmouseleave="this.style.opacity=1">
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <strong style="font-size: 14px; color: var(--text-primary, #111);">${dateRangeStr}</strong>
                <span style="font-size: 12px; color: var(--text-secondary, #666);">${week.sessions} sessões</span>
              </div>
              <div style="font-size: 14px; color: var(--text-primary, #111);">${this.formatDuration(avgTime)}</div>
            </div>
          `;
        });
        html += `</div>`;
      }
    }

    html += `</div>`;
    this.summaryContainer.innerHTML = html;

    // Atribui eventos aos cards de dias
    const sessionCards = this.summaryContainer.querySelectorAll(
      ".session-log-item.clickable",
    );
    sessionCards.forEach((card) => {
      card.addEventListener("click", () => {
        if (this.state.period !== "day") {
          this.goToDayView(card.dataset.date);
        }
      });
    });

    // Atribui eventos aos cards de semanas
    const weekCards = this.summaryContainer.querySelectorAll(".week-clickable");
    weekCards.forEach((card) => {
      card.addEventListener("click", () => {
        this.goToWeekView(card.dataset.date);
      });
    });
  },

  renderTable() {
    const dadosPlano = this.state.data.volume.grafico_tabela;
    const periodosUnicos = [
      ...new Set(dadosPlano.map((d) => d.periodo)),
    ].sort();

    // 1. Agrupar dados por músculo transformando em um array de objetos para ordenação
    const musculosMap = {};
    dadosPlano.forEach((row) => {
      if (!musculosMap[row.musculo])
        musculosMap[row.musculo] = { musculo: row.musculo };
      musculosMap[row.musculo][row.periodo] = row.series;
    });

    const tableData = Object.values(musculosMap);
    const { key: sortKey, asc: sortAsc } = this.state.tableSort;

    // 2. Lógica de Ordenação
    tableData.sort((a, b) => {
      let valA = a[sortKey] || 0;
      let valB = b[sortKey] || 0;

      if (sortKey === "musculo") {
        valA = a.musculo.toLowerCase();
        valB = b.musculo.toLowerCase();
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      } else {
        return sortAsc ? valA - valB : valB - valA;
      }
    });

    // 3. Renderização do HTML
    if (this.tableHead && this.tableBody) {
      const getSortIcon = (key) => {
        if (sortKey !== key) return "";
        return sortAsc ? " ↑" : " ↓";
      };

      let thHtml = `<th data-sort="musculo" style="cursor: pointer; user-select: none;">Músculo${getSortIcon("musculo")}</th>`;
      periodosUnicos.forEach((p) => {
        thHtml += `<th data-sort="${p}" style="cursor: pointer; user-select: none;">${this.formatShortDate(p)}${getSortIcon(p)}</th>`;
      });
      this.tableHead.innerHTML = thHtml;

      let trHtml = "";
      tableData.forEach((row) => {
        trHtml += `<tr><td>${row.musculo}</td>`;
        periodosUnicos.forEach((p) => {
          const series = row[p] || 0;
          trHtml += `<td>${series}</td>`;
        });
        trHtml += `</tr>`;
      });
      this.tableBody.innerHTML = trHtml;

      // 4. Delegação de Eventos para os Headers
      this.tableHead.querySelectorAll("th").forEach((th) => {
        th.addEventListener("click", () => {
          const key = th.dataset.sort;
          if (this.state.tableSort.key === key) {
            this.state.tableSort.asc = !this.state.tableSort.asc;
          } else {
            this.state.tableSort.key = key;
            // Se for coluna de texto (músculo), padrão asc. Se for data (números), padrão desc.
            this.state.tableSort.asc = key === "musculo";
          }
          // Apenas recria a tabela sem tocar no motor do Chart.js
          this.renderTable();
        });
      });
    }
  },

  renderChart(isZoomUpdate = false) {
    if (!this.chartCanvas) return;

    const dadosPlano = this.state.data.volume.grafico_tabela;
    const periodosUnicos = [
      ...new Set(dadosPlano.map((d) => d.periodo)),
    ].sort();
    const musculosMap = {};

    dadosPlano.forEach((row) => {
      if (!musculosMap[row.musculo]) musculosMap[row.musculo] = {};
      musculosMap[row.musculo][row.periodo] = row.series;
    });

    const labelsRaw = Object.keys(musculosMap).sort();

    // 1. Definição do Período (Todos para Ano, últimos 4 para os demais)
    const periodosExibicao =
      this.state.period === "year" ? periodosUnicos : periodosUnicos.slice(-4);

    // 2. Lógica do Slider de Zoom: Calcular limite de volume
    let globalMax = 0;
    const maxVolumePerMuscle = {};

    labelsRaw.forEach((m) => {
      const max = Math.max(
        ...periodosExibicao.map((p) => musculosMap[m][p] || 0),
      );
      maxVolumePerMuscle[m] = max;
      if (max > globalMax) globalMax = max;
    });

    const threshold = globalMax * (this.state.chartZoomLevel / 100);

    // Filtra os músculos baseados no slider
    const filteredLabelsRaw = labelsRaw.filter(
      (m) =>
        this.state.chartZoomLevel === 100 || maxVolumePerMuscle[m] <= threshold,
    );
    const labels = filteredLabelsRaw.map((nome) => this.formatChartLabel(nome));

    // 3. Geração dos Datasets
    let datasets = [];
    if (
      (this.state.period === "month" || this.state.period === "year") &&
      this.state.monthChartMode === "sum"
    ) {
      datasets = [
        {
          label: "Total Acumulado",
          data: filteredLabelsRaw.map((m) => {
            return periodosExibicao.reduce(
              (acc, p) => acc + (musculosMap[m][p] || 0),
              0,
            );
          }),
          borderColor: "#f59e0b",
          backgroundColor: "#f59e0b33",
          pointBackgroundColor: "transparent", // Mantém invisível, mas ainda responde a hover
          pointRadius: 0,
          pointHitRadius: 15, // Mantém a área invisível ao redor para o toque/hover funcionar
          borderWidth: 1.9,
          tension: 0.4, // Arredonda as linhas (efeito orgânico/bolha)
          borderJoinStyle: "round", // Tira a quina viva do traço
        },
      ];
    } else {
      datasets = periodosExibicao.map((periodo, index) => {
        // Paleta base cíclica
        const colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981"];
        const cor = colors[index % colors.length];

        // Na visão anual, oculta por padrão os meses anteriores aos 4 mais recentes
        const isHidden =
          this.state.period === "year" && index < periodosExibicao.length - 4;

        return {
          label: this.formatShortDate(periodo),
          data: filteredLabelsRaw.map((m) => musculosMap[m][periodo] || 0),
          borderColor: cor,
          backgroundColor: cor + "33", // Transparência de 20%
          pointBackgroundColor: "transparent", // Mantém invisível, mas ainda responde a hover
          pointRadius: 0,
          pointHitRadius: 15, // Mantém a área invisível ao redor para o toque/hover funcionar
          borderWidth: 1.9,
          hidden: isHidden, // Otimização para o Chart.js gerenciar a legenda
          tension: 0.05, // Arredonda as linhas (efeito orgânico/bolha)
          borderJoinStyle: "round", // Tira a quina viva do traço
        };
      });
    }

    // 4. Se for apenas um ajuste do Slider (Zoom), injeta os dados sem destruir o DOM
    if (isZoomUpdate && this.state.chartInstance) {
      this.state.chartInstance.data.labels = labels;
      this.state.chartInstance.data.datasets = datasets;
      this.state.chartInstance.update();
      return;
    }

    // 5. Configurações de Tema
    const isSystemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const horaAtual = new Date().getHours();
    const isDarkMode = isSystemDark || horaAtual >= 18 || horaAtual < 6;
    const corTexto = isDarkMode ? "#d4d4d4" : "#666666";
    const corGrid = isDarkMode
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(128, 128, 128, 0.1)";

    const parent = this.chartCanvas.parentNode;

    // 6. Injeção Dinâmica: Botão de Swap
    let chartHeader = parent.querySelector(".chart-header-toggle");
    if (!chartHeader) {
      chartHeader = document.createElement("div");
      chartHeader.className = "chart-header-toggle";
      // ADICIONADO: flex-shrink: 0 para blindar a altura
      chartHeader.style.cssText =
        "width: 100%; display: flex; justify-content: flex-end; margin-bottom: 8px; padding-right: 8px; z-index: 5; position: relative; flex-shrink: 0;";
      chartHeader.innerHTML = `<button class="btn-icon" style="background:none; border:none; cursor:pointer;"><span class="material-symbols-rounded">swap_horiz</span></button>`;
      parent.insertBefore(chartHeader, this.chartCanvas);

      chartHeader.querySelector("button").addEventListener("click", () => {
        this.state.monthChartMode =
          this.state.monthChartMode === "overlap" ? "sum" : "overlap";
        this.renderChart();
      });
    }
    chartHeader.style.display =
      this.state.period === "month" || this.state.period === "year"
        ? "flex"
        : "none";

    // 7. Injeção Dinâmica: Slider de Zoom
    let sliderContainer = parent.querySelector(".chart-zoom-slider");
    if (!sliderContainer) {
      sliderContainer = document.createElement("div");
      sliderContainer.className = "chart-zoom-slider";
      // ADICIONADO: flex-shrink: 0 para impedir o esmagamento
      sliderContainer.style.cssText =
        "width: 100%; display: flex; align-items: center; gap: 12px; margin-top: 16px; padding: 0 8px; flex-shrink: 0;";
      sliderContainer.innerHTML = `
        <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary, #666); white-space: nowrap;">Foco: Menores</span>
        <input type="range" min="5" max="100" value="100" style="flex: 1; cursor: pointer; accent-color: var(--primary-color, #ff6b00);">
        <span style="font-size: 11px; font-weight: 500; color: var(--text-secondary, #666);">Todos</span>
      `;
      parent.appendChild(sliderContainer);

      sliderContainer.querySelector("input").addEventListener("input", (e) => {
        this.state.chartZoomLevel = Number(e.target.value);
        this.renderChart(true);
      });
    }
    // Garante que o input visual espelhe o estado ao trocar de abas
    sliderContainer.querySelector("input").value = this.state.chartZoomLevel;
    sliderContainer.style.display =
      this.state.period === "month" || this.state.period === "year"
        ? "flex"
        : "none";

    // 8. Reconstrução Física do Gráfico (Apenas First Load da Aba)
    if (this.state.chartInstance) {
      this.state.chartInstance.destroy();
      this.state.chartInstance = null;
    }

    this.chartCanvas.remove();
    const newCanvas = document.createElement("canvas");
    newCanvas.id = "stimulusRadarChart";
    // Insere o canvas ANTES do slider para manter a ordem estrutural
    parent.insertBefore(newCanvas, sliderContainer);
    this.chartCanvas = newCanvas;

    this.state.chartInstance = new Chart(this.chartCanvas, {
      type: "radar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: "easeOutQuart",
        },
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: corGrid },
            angleLines: { color: corGrid },
            pointLabels: {
              color: corTexto,
              font: { size: 11 },
              padding: 8,
            },
            ticks: {
              display: true,
              color: corTexto,
              backdropColor: "transparent",
            },
          },
        },
        plugins: {
          // legend: {
          //   // Permite exibição forçada mesmo com muitos meses, o Chart.js quebra a linha automaticamente
          //   display: true,
          // },
          legend: {
            display:
              this.state.period === "month" || this.state.period === "year",
          },
        },
      },
    });
  },

  formatChartLabel(nome) {
    if (nome.includes(" ")) {
      return nome.split(" ");
    }
    if (nome.length > 10) {
      const half = Math.ceil(nome.length / 2);
      return [nome.slice(0, half) + "-", nome.slice(half)];
    }
    return nome;
  },

  renderExerciseList() {
    if (!this.exerciseList) return;

    const sectionBreakdown = this.exerciseList.closest(".exercise-breakdown");

    if (this.state.period === "month" || this.state.period === "year") {
      if (sectionBreakdown) sectionBreakdown.style.display = "none";
      return;
    }
    if (sectionBreakdown) sectionBreakdown.style.display = "block";

    const listaPlana = this.state.data.volume.lista_exercicios;

    if (this.state.breakdownMode === "muscle") {
      const grupos = {};
      listaPlana.forEach((item) => {
        if (!grupos[item.musculo])
          grupos[item.musculo] = { total: 0, principais: [], secundarios: [] };
        grupos[item.musculo].total += item.series;
        if (item.tipo === "principal")
          grupos[item.musculo].principais.push(item);
        else grupos[item.musculo].secundarios.push(item);
      });

      const headerTitle = sectionBreakdown.querySelector("h2");
      if (headerTitle) headerTitle.textContent = "Músculos × Exercícios";

      // Helper inline para truncar
      const formatExName = (name) =>
        name.length > 26 ? name.substring(0, 26) + "..." : name;

      this.exerciseList.innerHTML = Object.keys(grupos)
        .sort()
        .map(
          (musculo) => `
        <div class="breakdown-group">
          <h3 class="group-title-main">${musculo} (+${grupos[musculo].total})</h3>
          
          ${
            grupos[musculo].principais.length
              ? `
            <div class="sub-group">
              <span class="sub-group-label">Principais</span>
              <div class="tags-container">
                ${grupos[musculo].principais.map((ex) => `<span class="tag-pill" title="${ex.exercicio}">${formatExName(ex.exercicio)} <span class="--gray-200">(${ex.series})</span></span>`).join("")}
              </div>
            </div>
          `
              : ""
          }
          
          ${
            grupos[musculo].secundarios.length
              ? `
            <div class="sub-group">
              <span class="sub-group-label">Secundários</span>
              <div class="tags-container">
                ${grupos[musculo].secundarios.map((ex) => `<span class="tag-pill" title="${ex.exercicio}">${formatExName(ex.exercicio)} <span class="--gray-200">(${ex.series})</span></span>`).join("")}
              </div>
            </div>
          `
              : ""
          }
        </div>
      `,
        )
        .join("");
    } else {
      const grupos = {};
      listaPlana.forEach((item) => {
        if (!grupos[item.exercicio]) grupos[item.exercicio] = [];
        grupos[item.exercicio].push(item);
      });

      const headerTitle = sectionBreakdown.querySelector("h2");
      if (headerTitle) headerTitle.textContent = "Exercícios";

      this.exerciseList.innerHTML = Object.keys(grupos)
        .sort()
        .map((exercicio) => {
          const tags = grupos[exercicio];
          const maxSeries = Math.max(...tags.map((t) => t.series));

          return `
          <div class="breakdown-group">
            <div class="exercise-title-inline">
              <strong>${exercicio}</strong> • <span>${maxSeries} séries</span>
            </div>
            <div class="tags-container">
              ${tags.map((t) => `<span class="tag-pill">+${t.series} ${t.musculo.toLowerCase()}</span>`).join("")}
            </div>
          </div>
        `;
        })
        .join("");
    }
  },

  formatDuration(minutes) {
    if (!minutes) return "00h00min";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h.toString().padStart(2, "0")}h${m.toString().padStart(2, "0")}min`;
  },

  getDateRange(period, date) {
    const start = new Date(date);
    let end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === "week") {
      const day = start.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diffToMonday);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === "month") {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    } else if (period === "year") {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
    }

    return { start: start.toISOString(), end: end.toISOString() };
  },

  getAgrupamentoSQL(period) {
    if (period === "day") return "day";
    if (period === "week" || period === "month") return "week";
    if (period === "year") return "month";
    return "day";
  },

  formatDateDisplay(date, period) {
    if (period === "day") {
      return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }

    if (period === "week") {
      const { start, end } = this.getDateRange("week", date);
      const s = new Date(start);
      const e = new Date(end);
      const sMonth = s.toLocaleDateString("pt-BR", { month: "long" });
      const eMonth = e.toLocaleDateString("pt-BR", { month: "long" });

      if (sMonth === eMonth) {
        return `${s.getDate()}-${e.getDate()} de ${sMonth}`;
      } else {
        return `${s.getDate()} de ${sMonth.substring(0, 3)}. - ${e.getDate()} de ${eMonth.substring(0, 3)}.`;
      }
    }

    if (period === "month") {
      return date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
    }

    if (period === "year") return date.getFullYear().toString();
    return date.toLocaleDateString("pt-BR");
  },

  formatShortDate(isoString) {
    const d = new Date(isoString);
    if (this.state.period === "year")
      return d.toLocaleDateString("pt-BR", { month: "short" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  },
};

export function initStimulusAnalysis(navigateCallback) {
  StimulusAnalysisController.init(navigateCallback);
}
