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
    chartInstance: null,
    navigateCallback: null,
    currentRenderId: null,
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
              this.renderDynamicTableAndChart();
            }
          });
        });
      } else {
        this.renderDynamicTableAndChart();
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

          // Injeta a hora de início e fim exclusivamente na visão "Dia"
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
    }

    html += `</div>`;
    this.summaryContainer.innerHTML = html;

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
  },

  renderDynamicTableAndChart() {
    const dadosPlano = this.state.data.volume.grafico_tabela;
    const periodosUnicos = [
      ...new Set(dadosPlano.map((d) => d.periodo)),
    ].sort();
    const musculosMap = {};

    dadosPlano.forEach((row) => {
      if (!musculosMap[row.musculo]) musculosMap[row.musculo] = {};
      musculosMap[row.musculo][row.periodo] = row.series;
    });

    if (this.tableHead && this.tableBody) {
      let thHtml = `<th>Músculo</th>`;
      periodosUnicos.forEach((p) => {
        thHtml += `<th>${this.formatShortDate(p)}</th>`;
      });
      this.tableHead.innerHTML = thHtml;

      let trHtml = "";
      Object.keys(musculosMap)
        .sort()
        .forEach((musculo) => {
          trHtml += `<tr><td>${musculo}</td>`;
          periodosUnicos.forEach((p) => {
            const series = musculosMap[musculo][p] || 0;
            trHtml += `<td>${series}</td>`;
          });
          trHtml += `</tr>`;
        });
      this.tableBody.innerHTML = trHtml;
    }

    if (this.chartCanvas) {
      const labelsRaw = Object.keys(musculosMap).sort();
      const labels = labelsRaw.map((nome) => this.formatChartLabel(nome));
      const periodosExibicao = periodosUnicos.slice(-4);

      const datasets = periodosExibicao.map((periodo, index) => {
        const colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981"];
        const cor = colors[index % colors.length];

        return {
          label: this.formatShortDate(periodo),
          data: labelsRaw.map((m) => musculosMap[m][periodo] || 0),
          borderColor: cor,
          backgroundColor: "transparent",
          pointBackgroundColor: cor,
        };
      });

      const isSystemDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const horaAtual = new Date().getHours();
      const isNoite = horaAtual >= 18 || horaAtual < 6;
      const isDarkMode = isSystemDark || isNoite;

      const corTexto = isDarkMode ? "#d4d4d4" : "#666666";
      const corGrid = isDarkMode
        ? "rgba(255, 255, 255, 0.15)"
        : "rgba(128, 128, 128, 0.1)";

      if (this.state.chartInstance) {
        this.state.chartInstance.destroy();
        this.state.chartInstance = null;
      }

      const parent = this.chartCanvas.parentNode;
      this.chartCanvas.remove();
      const newCanvas = document.createElement("canvas");
      newCanvas.id = "stimulusRadarChart";
      parent.appendChild(newCanvas);
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
          plugins: { legend: { display: periodosExibicao.length > 1 } },
        },
      });
    }
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
