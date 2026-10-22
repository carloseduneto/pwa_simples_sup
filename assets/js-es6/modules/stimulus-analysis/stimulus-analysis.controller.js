import { StimulusService } from "../../services/stimulus.service.js";
import { AuthService } from "../../services/auth.service.js";
import { Formatters, SharedViews } from "./stimulus-analysis-utils.js";
import { StimulusDayController } from "./stimulus-analysis-day.controller.js";
import { StimulusWeekController } from "./stimulus-analysis-week.controller.js";
import { StimulusMonthController } from "./stimulus-analysis-month.controller.js";
import { StimulusYearController } from "./stimulus-analysis-year.controller.js";

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
    yearRangeFilter: "all",
    yearGroupFilter: "all",
    yearMuscleFilter: [],
    chartInstance: null,
    navigateCallback: null,
    currentRenderId: null,
    tableSort: { key: "musculo", asc: true },
  },

  dom: {},

  async init(navigateCallback) {
    this.state.navigateCallback = navigateCallback;
    this.state.cache = {};
    this.state.period = "day";
    this.state.currentDate = new Date();

    this.cacheDOM();
    this.bindEvents();

    await this.ensureValidDayDate();
    await this.updateDataAndRender();
  },

  // Garante que na visão "Dia", se a data atual não tiver treino, recua para o registro mais recente
  async ensureValidDayDate() {
    if (this.state.period !== "day") return;

    try {
      const ownerId = await AuthService.getUserId();
      if (!ownerId) return;

      const { start, end } = Formatters.getDateRange(
        "day",
        this.state.currentDate,
      );
      const dayHistory = await StimulusService.getSessionHistory(
        ownerId,
        start,
        end,
      );

      if (!dayHistory || dayHistory.length === 0) {
        const recentDate = await StimulusService.getAdjacentSessionDate(
          ownerId,
          end,
          -1,
        );
        if (recentDate) {
          this.state.currentDate = this.parseSafeDate(recentDate);
        }
      }
    } catch (error) {
      console.error("Erro ao verificar sessão recente:", error);
    }
  },

  parseSafeDate(dateInput) {
    if (!dateInput) return new Date();
    if (dateInput instanceof Date) return new Date(dateInput.getTime());

    const str = String(dateInput).trim();

    // 1. Se vier exatamente no formato YYYY-MM-DD (ex: clique no calendário ou card de sessão)
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      return new Date(y, m - 1, d);
    }

    // 2. Se vier como timestamp ISO do banco (ex: 2026-10-12T22:00:00Z ou com espaço),
    // converte para Date respeitando o fuso horário local do usuário
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return new Date(
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
      );
    }

    // 3. Fallback caso venha algum formato inesperado começando com YYYY-MM-DD
    const datePart = str.split(/[T\s]/)[0];
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, m - 1, d);
  },

  cacheDOM() {
    this.dom = {
      tabs: document.querySelectorAll(".tab-btn"),
      dateDisplay: document.getElementById("currentDateDisplay"),
      btnPrevDate: document.getElementById("btnPrevDate"),
      btnNextDate: document.getElementById("btnNextDate"),
      miniCalendarContainer: document.getElementById("miniCalendarContainer"),
      monthHistorySection: document.getElementById("monthHistorySection"),

      chartContainer: document.getElementById("chartContainer"),
      chartCanvas: document.getElementById("stimulusRadarChart"),
      annualFiltersBar: document.getElementById("annualFiltersBar"),
      rangeFilterWrapper: document.getElementById("rangeFilterWrapper"),
      rangeFilter: document.getElementById("rangeFilter"),
      groupFilter: document.getElementById("groupFilter"),
      btnDropdownMuscles: document.getElementById("btnDropdownMuscles"),
      dropdownMusclesLabel: document.getElementById("dropdownMusclesLabel"),
      menuDropdownMuscles: document.getElementById("menuDropdownMuscles"),
      btnClearFilters: document.getElementById("btnClearFilters"),

      summaryContainer: document.getElementById("summaryContainer"),

      tableSection: document.getElementById("tableSection"),
      tableHead: document.getElementById("muscleTableHeadRow"),
      tableBody: document.getElementById("muscleTableBody"),

      exerciseBreakdownSection: document.getElementById(
        "exerciseBreakdownSection",
      ),
      breakdownHeaderTitle: document.getElementById("breakdownHeaderTitle"),
      btnToggleBreakdown: document.getElementById("btnToggleBreakdown"),
      exerciseList: document.getElementById("exerciseListContainer"),
    };
  },

  bindEvents() {
    this.dom.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => this.handleTabChange(e));
    });

    this.dom.btnPrevDate.addEventListener("click", () => this.navigateDate(-1));
    this.dom.btnNextDate.addEventListener("click", () => this.navigateDate(1));

    if (this.dom.btnToggleBreakdown) {
      this.dom.btnToggleBreakdown.addEventListener("click", () => {
        this.state.breakdownMode =
          this.state.breakdownMode === "muscle" ? "exercise" : "muscle";
        SharedViews.renderExerciseList(this);
      });
    }
  },

  recreateCanvas() {
    if (this.state.chartInstance) {
      this.state.chartInstance.destroy();
      this.state.chartInstance = null;
    }
    if (this.dom.chartCanvas) this.dom.chartCanvas.remove();

    const newCanvas = document.createElement("canvas");
    newCanvas.id = "stimulusRadarChart";
    this.dom.chartContainer.appendChild(newCanvas);
    this.dom.chartCanvas = newCanvas;
  },

  async handleTabChange(e) {
    const btn = e.currentTarget;
    this.dom.tabs.forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");

    this.state.period = btn.dataset.period;
    this.state.yearRangeFilter = "all";

    if (this.state.period === "day") {
      await this.ensureValidDayDate();
    }

    await this.updateDataAndRender();
  },

  async navigateDate(direction) {
    if (this.state.period === "day") {
      const ownerId = await AuthService.getUserId();
      if (!ownerId) return;

      const { start, end } = Formatters.getDateRange(
        "day",
        this.state.currentDate,
      );
      const referenceDate = direction > 0 ? end : start;
      const adjacentDate = await StimulusService.getAdjacentSessionDate(
        ownerId,
        referenceDate,
        direction,
      );

      if (adjacentDate) {
        this.state.currentDate = this.parseSafeDate(adjacentDate);
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

  goToDayView(dateString) {
    this.state.period = "day";
    this.state.currentDate = this.parseSafeDate(dateString);
    this.dom.tabs.forEach((t) =>
      t.classList.toggle("active", t.dataset.period === "day"),
    );
    this.updateDataAndRender();
  },

  goToWeekView(dateString) {
    this.state.period = "week";
    this.state.currentDate = this.parseSafeDate(dateString);
    this.dom.tabs.forEach((t) =>
      t.classList.toggle("active", t.dataset.period === "week"),
    );
    this.updateDataAndRender();
  },

  getAgrupamentoSQL(period) {
    if (period === "day") return "day";
    if (period === "week" || period === "month") return "week";
    if (period === "year") return "month";
    return "day";
  },

  async checkNextButtonState(ownerId, currentPeriodEnd) {
    const nextDate = await StimulusService.getAdjacentSessionDate(
      ownerId,
      currentPeriodEnd,
      1,
    );
    this.dom.btnNextDate.disabled = !nextDate;
    this.dom.btnNextDate.style.opacity = nextDate ? "1" : "0.3";
  },

  async updateDataAndRender() {
    const renderToken = Symbol();
    this.state.currentRenderId = renderToken;

    if (this.state.chartInstance) {
      this.state.chartInstance.destroy();
      this.state.chartInstance = null;
    }
    this.dom.chartContainer.classList.add("is-loading");

    const { start, end } = Formatters.getDateRange(
      this.state.period,
      this.state.currentDate,
    );
    this.dom.dateDisplay.textContent = Formatters.formatDateDisplay(
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

      switch (this.state.period) {
        case "day":
          StimulusDayController.render(this, renderToken);
          break;
        case "week":
          StimulusWeekController.render(this, renderToken);
          break;
        case "month":
          StimulusMonthController.render(this);
          break;
        case "year":
          StimulusYearController.render(this);
          break;
      }
    } catch (error) {
      console.error("Erro ao carregar dados de estímulo:", error);
      this.dom.chartContainer.classList.remove("is-loading");
    }
  },
};

export function initStimulusAnalysis(navigateCallback) {
  StimulusAnalysisController.init(navigateCallback);
}
