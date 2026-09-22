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

    let html = `<div class="calendar-grid">`;
    // Cabeçalho
    days.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

    // Dias da semana (começando sempre na segunda-feira)
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);

      const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;
      const isSession = activeDatesSet.has(dateStr);
      const classes = `calendar-day ${isSession ? "has-session" : ""}`;

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
      <div class="history-summary-container" style="padding-left: 16px; padding-right: 16px; width: 100%; display: flex; flex-direction: column; gap: 16px;">
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
          backgroundColor: "transparent",
          pointBackgroundColor: "#f59e0b",
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
          backgroundColor: "transparent",
          pointBackgroundColor: cor,
          hidden: isHidden, // Otimização para o Chart.js gerenciar a legenda
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
      chartHeader.style.cssText = "width: 100%; display: flex; justify-content: flex-end; margin-bottom: 8px; padding-right: 8px; z-index: 5; position: relative; flex-shrink: 0;";
      chartHeader.innerHTML = `<button class="btn-icon" style="background:none; border:none; cursor:pointer;"><span class="material-symbols-rounded">swap_horiz</span></button>`;
      parent.insertBefore(chartHeader, this.chartCanvas);

      chartHeader.querySelector("button").addEventListener("click", () => {
        this.state.monthChartMode = this.state.monthChartMode === "overlap" ? "sum" : "overlap";
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
      sliderContainer.style.cssText = "width: 100%; display: flex; align-items: center; gap: 12px; margin-top: 16px; padding: 0 8px; flex-shrink: 0;";
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
                ${grupos[musculo].principais.map((ex) => `<span class="tag-pill">${ex.exercicio} <span class="--gray-200">(${ex.series})</span></span>`).join("")}
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
                ${grupos[musculo].secundarios.map((ex) => `<span class="tag-pill">${ex.exercicio} <span class="--gray-200">(${ex.series})</span></span>`).join("")}
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
