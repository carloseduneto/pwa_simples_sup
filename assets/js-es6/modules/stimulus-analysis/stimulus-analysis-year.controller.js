import {
  SharedMath,
  SharedViews,
  USAR_SEMAFORO,
} from "./stimulus-analysis-utils.js";

export const StimulusYearController = {
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

  getYearStats(arrayData, monthOffset = 0, currentMonthIdx = 11) {
    let max = -Infinity,
      min = Infinity,
      maxIdx = 0,
      minIdx = 0,
      sum = 0;

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
    const atual = arrayData[arrayData.length - 1] || 0;

    return {
      total: sum,
      media,
      atual,
      mesAtualNome: this.mesesNome[currentMonthIdx],
      pico: max,
      mesPico: this.mesesNome[maxIdx + monthOffset],
      minima: min,
      mesMinima: this.mesesNome[minIdx + monthOffset],
      variancia: SharedMath.calculateVariance(arrayData),
    };
  },

  render(ctx) {
    const { dom, state } = ctx;
    const dadosPlano = state.data.volume.grafico_tabela;

    dom.miniCalendarContainer.style.display = "none";
    dom.monthHistorySection.style.display = "none";
    dom.exerciseBreakdownSection.style.display = "none";
    dom.tableSection.style.display = "none";
    dom.chartContainer.classList.remove("is-loading");

    const yearView = state.currentDate.getFullYear();
    const currentYear = new Date().getFullYear();
    const limitMonth = yearView === currentYear ? new Date().getMonth() : 11;

    let startMonth = 0;
    if (state.yearRangeFilter !== "all") {
      const range = parseInt(state.yearRangeFilter, 10);
      startMonth = Math.max(0, limitMonth - range + 1);
    }
    const endMonth = limitMonth;

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

    SharedViews.setupFiltersBar(ctx, dictGrupos, "year", () =>
      this.render(ctx),
    );

    const mesesExibicao = this.mesesNome
      .slice(startMonth, endMonth + 1)
      .map((m) => `${m}./${String(yearView).slice(-2)}`);

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

    SharedViews.renderLineChart(
      ctx,
      mesesExibicao,
      chartLabels,
      chartMap,
      (rawArray) =>
        (rawArray.length ? rawArray : Array(12).fill(0)).slice(
          startMonth,
          endMonth + 1,
        ),
    );

    this.renderAnnualSummaries(
      ctx,
      isFiltered,
      chartLabels,
      microMap,
      startMonth,
      endMonth,
    );
  },

  renderAnnualSummaries(
    ctx,
    isFiltered,
    chartLabels,
    microMap,
    startMonth,
    endMonth,
  ) {
    const { dom } = ctx;
    dom.summaryContainer.innerHTML = "";
    const sparklinkColor = USAR_SEMAFORO ? "#fba87f" : "#ccccc1";

    if (isFiltered) {
      let html = `<div class="analysis-sections-container">`;
      const statsFiltrados = [];

      chartLabels.forEach((musculo) => {
        const dataArray = (microMap[musculo] || Array(12).fill(0)).slice(
          startMonth,
          endMonth + 1,
        );
        const stats = this.getYearStats(dataArray, startMonth, endMonth);
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

        const periodStr = `${this.mesesNome[startMonth]} - ${this.mesesNome[endMonth]}`;

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
      dom.summaryContainer.innerHTML = html + `</div>`;
    } else {
      let globalMaxVolume = 0;
      const statsList = Object.keys(microMap).map((musculo) => {
        const dataArray = microMap[musculo].slice(startMonth, endMonth + 1);
        const stats = this.getYearStats(dataArray, startMonth, endMonth);
        if (stats.pico > globalMaxVolume) globalMaxVolume = stats.pico;
        return { musculo, dataArray, ...stats };
      });

      const topMais = [...statsList]
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);
      const topMenos = [...statsList]
        .filter((m) => m.total > 0)
        .sort((a, b) => a.total - b.total)
        .slice(0, 6);
      const topVar = [...statsList]
        .filter((m) => m.total >= 15)
        .sort((a, b) => b.variancia - a.variancia)
        .slice(0, 6);

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

          const sparklineSvg = SharedMath.generateSparkline(
            item.dataArray,
            colorHex,
            `${valKey}-${i}`,
            globalMaxVolume,
          );
          h += `
            <div class="analysis-card">
              <div class="analysis-card-content">
                <div class="analysis-card-title">${item.musculo}</div>
                <div class="analysis-card-value">${displayVal}</div>
                <div class="analysis-card-subtext">${displaySub}</div>
              </div>
              <div class="analysis-card-sparkline">${sparklineSvg}</div>
            </div>`;
        });
        return h + `</div>`;
      };

      dom.summaryContainer.innerHTML = `
        <div class="analysis-sections-container">
          ${buildDeckHtml("Músculos mais ativos (top 5)", "arrow_upward", topMais, sparklinkColor, "pico", "pico em")}
          ${buildDeckHtml("Músculos menos ativos (top 5)", "arrow_downward", topMenos, sparklinkColor, "minima", "mínima em")}
          ${buildDeckHtml("Músculos maior variância (top 5)", "bar_chart", topVar, sparklinkColor, "variancia", "pico em")}
        </div>
      `;
    }
  },
};
