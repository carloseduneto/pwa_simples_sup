import { StimulusService } from "../services/stimulus.service.js";
import { AuthService } from "../services/auth.service.js";

const StimulusAnalysisController = {
  state: {
    period: "day", // day, week, month, year
    currentDate: new Date(),
    data: {
      history: [],
      volume: { grafico_tabela: [], lista_exercicios: [] },
    },
    chartInstance: null,
    navigateCallback: null,
  },

  async init(navigateCallback) {
    this.state.navigateCallback = navigateCallback;
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
    this.tableHead = document.querySelector(".data-table thead tr");
  },

  bindEvents() {
    this.tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => this.handleTabChange(e));
    });

    document
      .getElementById("btnPrevDate")
      .addEventListener("click", () => this.navigateDate(-1));
    document
      .getElementById("btnNextDate")
      .addEventListener("click", () => this.navigateDate(1));
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

      const adjacentDate = await StimulusService.getAdjacentSessionDate(
        ownerId,
        this.state.currentDate,
        direction,
      );

      if (adjacentDate) {
        this.state.currentDate = new Date(adjacentDate);
      } else {
        // Se não houver mais treinos na direção clicada, interrompe a navegação
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

  async updateDataAndRender() {
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

      if (!ownerId) {
        console.error("Usuário não autenticado.");
        return;
      }

      const [historyData, volumeData] = await Promise.all([
        StimulusService.getSessionHistory(ownerId, start, end),
        StimulusService.getVolumeAnalysis(
          ownerId,
          start,
          end,
          this.getAgrupamentoSQL(this.state.period),
        ),
      ]);

      this.state.data.history = historyData;
      this.state.data.volume = volumeData;

      this.renderHistoryLog();
      this.renderDynamicTableAndChart();
      this.renderExerciseList();
    } catch (error) {
      console.error("Erro ao carregar dados de estímulo", error);
    }
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

    let html = `<div class="history-summary">Média de tempo: ${formattedAvg} (${totalSessions} sessões)</div>`;
    html += this.state.data.history
      .map(
        (session) => `
      <div class="session-log-item">
        <strong>${session.nome}</strong>
        <span>${this.formatDuration(session.duracao_minutos)}</span>
      </div>
    `,
      )
      .join("");

    this.summaryContainer.innerHTML = html;
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
      const labels = Object.keys(musculosMap).sort();
      const periodosExibicao = periodosUnicos.slice(-4);

      const datasets = periodosExibicao.map((periodo, index) => {
        const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];
        const cor = colors[index % colors.length];

        return {
          label: this.formatShortDate(periodo),
          data: labels.map((m) => musculosMap[m][periodo] || 0),
          borderColor: cor,
          backgroundColor: "transparent",
          pointBackgroundColor: cor,
        };
      });

      if (this.state.chartInstance) {
        this.state.chartInstance.destroy();
      }

      this.state.chartInstance = new Chart(this.chartCanvas, {
        type: "radar",
        data: { labels, datasets },
        options: {
          scales: { r: { beginAtZero: true } },
          plugins: { legend: { display: periodosExibicao.length > 1 } },
        },
      });
    }
  },

  renderExerciseList() {
    if (!this.exerciseList) return;

    const sectionBreakdown = this.exerciseList.closest(".exercise-breakdown");

    // Oculta a listagem detalhada nas visões de Mês e Ano
    if (this.state.period === "month" || this.state.period === "year") {
      if (sectionBreakdown) sectionBreakdown.style.display = "none";
      return;
    }

    // Garante que a listagem esteja visível em Dia e Semana
    if (sectionBreakdown) sectionBreakdown.style.display = "block";

    const listaPlana = this.state.data.volume.lista_exercicios;
    const grupos = {};

    listaPlana.forEach((item) => {
      if (!grupos[item.musculo])
        grupos[item.musculo] = { total: 0, exercicios: [] };
      grupos[item.musculo].total += item.series;
      grupos[item.musculo].exercicios.push(item);
    });

    this.exerciseList.innerHTML = Object.keys(grupos)
      .sort()
      .map(
        (musculo) => `
      <div class="exercise-group">
        <h3 class="group-title">
          ${musculo} (+${grupos[musculo].total}) 
          <span class="material-symbols-rounded">expand_more</span>
        </h3>
        <div class="group-content">
          ${grupos[musculo].exercicios
            .map(
              (ex) => `
            <div class="exercise-item">
              <span class="ex-tipo">${ex.tipo === "principal" ? "Principais" : "Secundários"}</span>
              <span class="tag">${ex.exercicio} (${ex.series}s)</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `,
      )
      .join("");
  },

  formatDuration(minutes) {
    if (!minutes) return "00h00min";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h.toString().padStart(2, "0")}h${m.toString().padStart(2, "0")}min`;
  },

  getDateRange(period, date) {
    const start = new Date(date);
    const end = new Date(date);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (period === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      end.setDate(end.getDate() + (6 - day));
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
    if (period === "day" || period === "week") return "day";
    if (period === "month") return "week";
    if (period === "year") return "month";
    return "day";
  },

  formatDateDisplay(date, period) {
    if (period === "day")
      return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    if (period === "month")
      return date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });
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
