import {
  Formatters,
  SharedMath,
  SharedViews,
  USAR_SEMAFORO,
} from "./stimulus-analysis-utils.js";

export const StimulusMonthController = {
  render(ctx) {
    const { dom, state } = ctx;

    dom.exerciseBreakdownSection.style.display = "none";
    dom.tableSection.style.display = "none";
    dom.chartContainer.classList.remove("is-loading");

    // 1. Mini-Calendário Mensal
    dom.miniCalendarContainer.style.display = "block";
    const activeDatesSet = Formatters.extractActiveDates(state.data.history);
    dom.miniCalendarContainer.innerHTML = this.buildMonthCalendar(
      state.currentDate,
      activeDatesSet,
    );

    dom.miniCalendarContainer
      .querySelectorAll(".calendar-day.has-session")
      .forEach((el) => {
        el.addEventListener("click", () => ctx.goToDayView(el.dataset.date));
      });

    // 2. Histórico de Semanas (Acima do Gráfico)
    dom.monthHistorySection.style.display = "block";
    dom.monthHistorySection.innerHTML = this.buildWeeksHistoryHtml(ctx);
    dom.monthHistorySection
      .querySelectorAll(".week-clickable")
      .forEach((card) => {
        card.addEventListener("click", () =>
          ctx.goToWeekView(card.dataset.date),
        );
      });

    // 3. Gráfico e Cards Analíticos (Abaixo do Histórico de Semanas)
    this.renderMonthlyContent(ctx);
  },

  buildMonthCalendar(currentDate, activeDatesSet) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    const headers = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
    let html = `<div class="calendar-grid">`;
    headers.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

    const startPadding = firstDayOfMonth.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startPadding - 1; i >= 0; i--) {
      html += `<div class="calendar-day out-of-month">${prevMonthLastDay - i}</div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const isSession = activeDatesSet.has(dateStr);
      const localDateStr = dateStr.replace(/-/g, "/");
      const isToday =
        new Date().toDateString() === new Date(localDateStr).toDateString();

      let classes = `calendar-day ${isSession ? "has-session" : ""} ${isToday ? "calendar-day-today" : ""}`;
      html += `<div class="${classes.trim()}" ${isSession ? `data-date="${dateStr}"` : ""}>${i}</div>`;
    }

    const totalCellsRendered = startPadding + daysInMonth;
    const remainingCells =
      totalCellsRendered % 7 === 0 ? 0 : 7 - (totalCellsRendered % 7);
    for (let i = 1; i <= remainingCells; i++) {
      html += `<div class="calendar-day out-of-month">${i}</div>`;
    }

    html += `</div>`;
    return html;
  },

  getStabilityLevel(arrayData) {
    let validWeeks = [...arrayData];
    if (validWeeks.length > 0 && validWeeks[0] === 0) validWeeks.shift();
    if (validWeeks.length > 0 && validWeeks[validWeeks.length - 1] === 0)
      validWeeks.pop();

    if (validWeeks.length < 2) {
      return {
        text: "poucos dados",
        icon: "remove",
        color: "var(--text-secondary, #666)",
      };
    }

    const mean = validWeeks.reduce((a, b) => a + b, 0) / validWeeks.length;
    if (mean === 0) {
      return {
        text: "inativo",
        icon: "remove",
        color: "var(--text-secondary, #666)",
      };
    }

    const variance =
      validWeeks.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
      validWeeks.length;
    const cv = Math.sqrt(variance) / mean;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    const n = validWeeks.length;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += validWeeks[i];
      sumXY += i * validWeeks[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const relativeSlope = slope / mean;

    const colorNeutral = USAR_SEMAFORO
      ? "var(--warning-color, #f59e0b)"
      : "var(--primary-color, #ff6b00)";
    const colorUp = USAR_SEMAFORO
      ? "var(--success-color, #10b981)"
      : "var(--primary-color, #ff6b00)";
    const colorDown = USAR_SEMAFORO
      ? "var(--danger-color, #ef4444)"
      : "var(--primary-color, #ff6b00)";

    if (cv <= 0.25)
      return { text: "consistente", icon: "check_circle", color: colorUp };
    if (relativeSlope > 0.1)
      return { text: "em alta", icon: "arrow_drop_up", color: colorUp };
    if (relativeSlope < -0.1)
      return { text: "em queda", icon: "arrow_drop_down", color: colorDown };
    if (cv <= 0.55)
      return { text: "oscilante", icon: "vital_signs", color: colorNeutral };

    return { text: "irregular", icon: "error", color: colorDown };
  },

  renderMonthlyContent(ctx) {
    const { dom, state } = ctx;
    const dadosPlano = state.data.volume.grafico_tabela;

    const dictGrupos = {};
    const macroMap = {};
    const microMap = {};
    const periodosUnicos = [
      ...new Set(dadosPlano.map((d) => d.periodo)),
    ].sort();
    const labelsExibicao = periodosUnicos.map((_, i) => `${i + 1}ª sem`);

    dadosPlano.forEach((row) => {
      const macro = row.grupo_muscular || "Geral";
      const micro = row.musculo;
      const weekIdx = periodosUnicos.indexOf(row.periodo);

      if (!dictGrupos[macro]) dictGrupos[macro] = new Set();
      dictGrupos[macro].add(micro);

      if (!macroMap[macro])
        macroMap[macro] = Array(periodosUnicos.length).fill(0);
      if (!microMap[micro])
        microMap[micro] = Array(periodosUnicos.length).fill(0);

      macroMap[macro][weekIdx] += row.series;
      microMap[micro][weekIdx] += row.series;
    });

    SharedViews.setupFiltersBar(ctx, dictGrupos, "month", () =>
      this.renderMonthlyContent(ctx),
    );

    const isFiltered =
      state.yearGroupFilter !== "all" || state.yearMuscleFilter.length > 0;
    let chartLabels = [];
    let chartMap = {};

    if (isFiltered) {
      chartLabels =
        state.yearMuscleFilter.length > 0
          ? state.yearMuscleFilter
          : Array.from(dictGrupos[state.yearGroupFilter]).slice(0, 6);
      chartMap = microMap;
    } else {
      chartLabels = Object.keys(macroMap).sort();
      chartMap = macroMap;
    }

    SharedViews.renderLineChart(ctx, labelsExibicao, chartLabels, chartMap);

    // O summaryContainer abaixo do gráfico recebe apenas os cards analíticos
    dom.summaryContainer.innerHTML = this.buildAnalysisCardsHtml(
      isFiltered,
      chartLabels,
      chartMap,
      microMap,
      periodosUnicos,
      labelsExibicao,
    );
  },

  buildWeeksHistoryHtml(ctx) {
    const { state } = ctx;
    const totalSessions = state.data.history.length;
    const totalMinutes = state.data.history.reduce(
      (acc, curr) => acc + (curr.duracao_minutos || 0),
      0,
    );
    const avgMinutes =
      totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const formattedAvg = Formatters.formatDuration(avgMinutes);

    let html = `
      <div class="history-summary-container" style="padding-left: 18px; padding-right: 16px; margin-bottom: 24px; width: 100%; display: flex; flex-direction: column; gap: 16px;">
        <div class="history-summary" style="display: flex; justify-content: space-between; width: 100%; font-size: 14px; color: var(--text-secondary, #666);">
          <span>Média de tempo:</span>
          <span>${formattedAvg} (${totalSessions} sessões)</span>
        </div>
    `;

    const weeksMap = new Map();
    state.data.history.forEach((session) => {
      const d = new Date(session.data);
      const { start, end } = Formatters.getDateRange("week", d);
      const key = `${start}|${end}`;
      if (!weeksMap.has(key))
        weeksMap.set(key, { sessions: 0, totalMinutes: 0, start, end });
      const week = weeksMap.get(key);
      week.sessions++;
      week.totalMinutes += session.duracao_minutos || 0;
    });

    if (weeksMap.size > 0) {
      html += `<div class="month-weeks-deck" style="margin-top: 8px; display: flex; flex-direction: column;">
                 <h3 style="font-size: 16px; margin-bottom: 12px; font-weight: 600;">Semanas</h3>`;

      Array.from(weeksMap.keys())
        .sort()
        .forEach((key) => {
          const week = weeksMap.get(key);
          const avgTime =
            week.sessions > 0
              ? Math.round(week.totalMinutes / week.sessions)
              : 0;
          const s = new Date(week.start);
          const e = new Date(week.end);
          const sMonth = s.toLocaleDateString("pt-BR", { month: "long" });
          const eMonth = e.toLocaleDateString("pt-BR", { month: "long" });

          const dateRangeStr =
            sMonth === eMonth
              ? `${s.getDate()} - ${e.getDate()} de ${sMonth}`
              : `${s.getDate()} de ${sMonth.substring(0, 3)}. - ${e.getDate()} de ${eMonth.substring(0, 3)}.`;

          const weekDateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`;

          html += `
          <div class="week-clickable" data-date="${weekDateStr}" style="cursor: pointer; border-bottom: 1px solid var(--gray-200, #ddd); padding: 12px 0; display: flex; justify-content: space-between; align-items: flex-start; transition: opacity 0.2s;" onmousedown="this.style.opacity=0.7" onmouseup="this.style.opacity=1" onmouseleave="this.style.opacity=1">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 14px; color: var(--text-primary, #111);">${dateRangeStr}</strong>
              <span style="font-size: 12px; color: var(--text-secondary, #666);">${week.sessions} sessões</span>
            </div>
            <div style="font-size: 14px; color: var(--text-primary, #111);">${Formatters.formatDuration(avgTime)}</div>
          </div>
        `;
        });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  },

  buildAnalysisCardsHtml(
    isFiltered,
    chartLabels,
    chartMap,
    microMap,
    periodosUnicos,
    labelsExibicao,
  ) {
    const sparklinkColor = USAR_SEMAFORO ? "#fba87f" : "#ccccc1";

    if (isFiltered) {
      let html = `<div class="analysis-sections-container" style="width: 100%;">`;
      const statsFiltrados = [];

      chartLabels.forEach((musculo) => {
        const dataArray =
          chartMap[musculo] || Array(periodosUnicos.length).fill(0);
        let max = -Infinity,
          min = Infinity,
          maxIdx = 0,
          minIdx = 0,
          sum = 0;

        dataArray.forEach((val, idx) => {
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

        const atual = dataArray[dataArray.length - 1] || 0;
        const variancia = SharedMath.calculateVariance(dataArray);
        const stability = this.getStabilityLevel(dataArray);

        statsFiltrados.push({
          musculo,
          total: sum,
          variancia,
          pico: max,
          minima: min,
        });
        const materialIcon = `<span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">${stability.icon}</span>`;

        html += `
          <div class="muscle-detail-section" style="margin-bottom: 24px;">
            <div class="analysis-deck-header">${musculo}</div>
            <div class="analysis-deck">
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Atual</div>
                  <div class="analysis-card-value">${atual}</div>
                  <div class="analysis-card-subtext">${labelsExibicao[dataArray.length - 1] || ""}</div>
                </div>
              </div>
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Máximo</div>
                  <div class="analysis-card-value">${max}</div>
                  <div class="analysis-card-subtext">${labelsExibicao[maxIdx] || ""}</div>
                </div>
              </div>
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Mínimo</div>
                  <div class="analysis-card-value">${min}</div>
                  <div class="analysis-card-subtext">${labelsExibicao[minIdx] || ""}</div>
                </div>
              </div>
              <div class="analysis-card analysis-card--detail">
                <div class="analysis-card-content">
                  <div class="analysis-card-title">Estabilidade</div>
                  <div class="analysis-card-value" style="font-size: 15px; text-transform: capitalize; padding-top: 2px;">${stability.text}</div>
                  <div class="analysis-card-subtext" style="color: ${stability.color}; font-weight: 500; display: flex; align-items: center;">${materialIcon} Avaliação</div>
                </div>
              </div>
            </div>
          </div>
        `;
      });

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
                <div class="analysis-card-subtext">Maior volume do mês</div>
              </div>
            </div>
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">Mín. - ${minimaAbs.musculo}</div>
                <div class="analysis-card-value">${minimaAbs.minima}</div>
                <div class="analysis-card-subtext">Menor volume bruto > 0</div>
              </div>
            </div>
          </div>
        `;
      }
      return html + `</div>`;
    } else {
      let globalMaxVolume = 0;
      const statsList = Object.keys(microMap).map((musculo) => {
        const dataArray = microMap[musculo];
        let max = -Infinity,
          min = Infinity,
          sum = 0;
        dataArray.forEach((val) => {
          sum += val;
          if (val > max) max = val;
          if (val < min && val > 0) min = val;
        });
        if (min === Infinity) min = 0;
        if (max > globalMaxVolume) globalMaxVolume = max;

        const variancia = SharedMath.calculateVariance(dataArray);
        const stability = this.getStabilityLevel(dataArray);
        return {
          musculo,
          dataArray,
          total: sum,
          pico: max,
          minima: min,
          variancia,
          stability,
        };
      });

      const topMais = [...statsList]
        .sort((a, b) => b.total - a.total)
        .slice(0, 7);
      const topMenos = [...statsList]
        .filter((m) => m.total > 0)
        .sort((a, b) => a.total - b.total)
        .slice(0, 7);
      const topVar = [...statsList]
        .filter((m) => m.total >= 1)
        .sort((a, b) => b.variancia - a.variancia)
        .slice(0, 7);

      const buildDeckHtml = (title, icon, list, colorHex, isVar = false) => {
        let h = `<div class="analysis-deck-header"><span class="material-symbols-rounded" style="font-size: 18px;">${icon}</span>${title}</div><div class="analysis-deck">`;
        list.forEach((item, i) => {
          const displayVal = isVar
            ? `${Math.round(item.minima)} - ${Math.round(item.pico)}`
            : item.total;
          const displaySub = isVar
            ? `var. ${(item.variancia * 100).toFixed(0)}%`
            : item.stability.text;
          const trendColor = isVar
            ? "var(--text-secondary, #666)"
            : item.stability.color;
          const materialIcon = isVar
            ? ""
            : `<span class="material-symbols-rounded" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">${item.stability.icon}</span>`;
          const sparklineSvg = SharedMath.generateSparkline(
            item.dataArray,
            colorHex,
            `m-${isVar}-${i}`,
            globalMaxVolume,
          );

          h += `
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">${item.musculo}</div>
                <div class="analysis-card-value">${displayVal}</div>
                <div class="analysis-card-subtext" style="color: ${trendColor}; font-weight: 500; display: flex; align-items: center;">
                  ${materialIcon}${displaySub}
                </div>
              </div>
              <div class="analysis-card-sparkline">${sparklineSvg}</div>
            </div>`;
        });
        return h + `</div>`;
      };

      return `
        <div class="analysis-sections-container" style="width: 100%;">
          ${buildDeckHtml("Músculos mais ativos (top 7)", "arrow_upward", topMais, sparklinkColor, false)}
          ${buildDeckHtml("Músculos menos ativos (top 7)", "arrow_downward", topMenos, sparklinkColor, false)}
          ${buildDeckHtml("Músculos maior variância (top 7)", "bar_chart", topVar, sparklinkColor, true)}
        </div>
      `;
    }
  },
};
