export const USAR_SEMAFORO = false;

export const Formatters = {
  formatDuration(minutes) {
    if (!minutes) return "00h00min";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h.toString().padStart(2, "0")}h${m.toString().padStart(2, "0")}min`;
  },

  formatShortDate(isoString, period) {
    const d = new Date(isoString);
    if (period === "year")
      return d.toLocaleDateString("pt-BR", { month: "short" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  },

  formatChartLabel(nome) {
    if (nome.includes(" ")) return nome.split(" ");
    if (nome.length > 10) {
      const half = Math.ceil(nome.length / 2);
      return [nome.slice(0, half) + "-", nome.slice(half)];
    }
    return nome;
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

      return sMonth === eMonth
        ? `${s.getDate()}-${e.getDate()} de ${sMonth}`
        : `${s.getDate()} de ${sMonth.substring(0, 3)}. - ${e.getDate()} de ${eMonth.substring(0, 3)}.`;
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

  extractActiveDates(historyArray) {
    if (!historyArray) return new Set();
    const dates = historyArray.map((session) => {
      const d = new Date(session.data);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
    return new Set(dates);
  },
};

export const SharedMath = {
  calculateVariance(values) {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    if (mean === 0) return 0;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  },

  generateSparkline(dataArray, colorHex, id, globalMax) {
    const width = 130;
    const height = 60;
    const max = globalMax > 0 ? globalMax : 1;
    const stepX = width / Math.max(dataArray.length - 1, 1);

    const points = dataArray.map((val, i) => ({
      x: i * stepX,
      y: height - (val / max) * (height - 5),
    }));

    const bezierCommand = (point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const prev = a[i - 1];
      const tension = 0.4;
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

export const SharedViews = {
  // Barra de Filtros (Compartilhada entre Mês e Ano)
  setupFiltersBar(ctx, dictGrupos, mode, onUpdateCallback) {
    const { dom, state } = ctx;
    dom.annualFiltersBar.style.display = "flex";
    dom.rangeFilterWrapper.style.display = mode === "month" ? "none" : "block";
    dom.rangeFilter.value = state.yearRangeFilter;

    dom.groupFilter.innerHTML =
      `<option value="all">Grupos...</option>` +
      Object.keys(dictGrupos)
        .sort()
        .map(
          (g) =>
            `<option value="${g}" ${state.yearGroupFilter === g ? "selected" : ""}>${g}</option>`,
        )
        .join("");

    let musculosDisponiveis = [];
    if (state.yearGroupFilter !== "all") {
      musculosDisponiveis = Array.from(dictGrupos[state.yearGroupFilter] || []);
    } else {
      const setM = Object.values(dictGrupos).reduce((acc, curr) => {
        curr.forEach((m) => acc.add(m));
        return acc;
      }, new Set());
      musculosDisponiveis = Array.from(setM).sort();
    }

    const maxAlcancado = state.yearMuscleFilter.length >= 6;
    dom.dropdownMusclesLabel.textContent = `Músculos (${state.yearMuscleFilter.length}/6)`;

    dom.menuDropdownMuscles.innerHTML = musculosDisponiveis
      .map((m) => {
        const isChecked = state.yearMuscleFilter.includes(m);
        const disabledStr =
          !isChecked && maxAlcancado
            ? 'disabled style="opacity: 0.4; pointer-events: none;"'
            : "";
        return `
        <label class="filter-checkbox-item" ${disabledStr}>
          <input type="checkbox" value="${m}" class="muscle-cb" ${isChecked ? "checked" : ""} ${disabledStr}>
          <span>${m}</span>
        </label>
      `;
      })
      .join("");

    dom.rangeFilter.onchange = (e) => {
      state.yearRangeFilter = e.target.value;
      onUpdateCallback();
    };

    dom.groupFilter.onchange = (e) => {
      state.yearGroupFilter = e.target.value;
      state.yearMuscleFilter = [];
      onUpdateCallback();
    };

    let filterChanged = false;
    const closeDropdown = (e) => {
      if (
        !dom.menuDropdownMuscles.contains(e.target) &&
        !dom.btnDropdownMuscles.contains(e.target)
      ) {
        dom.menuDropdownMuscles.classList.remove("is-open");
        document.removeEventListener("click", closeDropdown);
        if (filterChanged) onUpdateCallback();
      }
    };

    dom.btnDropdownMuscles.onclick = () => {
      if (dom.menuDropdownMuscles.classList.contains("is-open")) {
        dom.menuDropdownMuscles.classList.remove("is-open");
        document.removeEventListener("click", closeDropdown);
        if (filterChanged) onUpdateCallback();
      } else {
        dom.menuDropdownMuscles.classList.add("is-open");
        filterChanged = false;
        document.addEventListener("click", closeDropdown);
      }
    };

    dom.menuDropdownMuscles.querySelectorAll(".muscle-cb").forEach((cb) => {
      cb.onchange = (e) => {
        filterChanged = true;
        if (e.target.checked) {
          if (state.yearMuscleFilter.length < 6)
            state.yearMuscleFilter.push(e.target.value);
        } else {
          state.yearMuscleFilter = state.yearMuscleFilter.filter(
            (m) => m !== e.target.value,
          );
        }
        dom.dropdownMusclesLabel.textContent = `Músculos (${state.yearMuscleFilter.length}/6)`;

        const maxReached = state.yearMuscleFilter.length >= 6;
        dom.menuDropdownMuscles
          .querySelectorAll(".muscle-cb")
          .forEach((box) => {
            if (!box.checked) {
              box.disabled = maxReached;
              box.parentElement.style.opacity = maxReached ? "0.4" : "1";
              box.parentElement.style.pointerEvents = maxReached
                ? "none"
                : "auto";
            }
          });
      };
    });

    dom.btnClearFilters.onclick = () => {
      state.yearRangeFilter = "all";
      state.yearGroupFilter = "all";
      state.yearMuscleFilter = [];
      onUpdateCallback();
    };
  },

  // Gráfico de Linhas (Compartilhado entre Mês e Ano)
  renderLineChart(ctx, labelsExibicao, chartLabels, chartMap, sliceFn) {
    const { dom, state } = ctx;
    const colors = [
      "#4285F4",
      "#EA4335",
      "#FBBC04",
      "#34A853",
      "#FF6D00",
      "#46BDC6",
    ];

    const datasets = chartLabels.map((labelName, index) => {
      const cor = colors[index % colors.length];
      const rawArray = chartMap[labelName] || [];
      const dataArray = sliceFn ? sliceFn(rawArray) : rawArray;

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

    ctx.recreateCanvas();

    state.chartInstance = new Chart(dom.chartCanvas, {
      type: "line",
      data: { labels: labelsExibicao, datasets },
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
  },

  // Resumo e Logs de Sessão (Compartilhado entre Dia e Semana)
  renderSessionLogs(ctx) {
    const { dom, state } = ctx;
    const totalSessions = state.data.history.length;
    const totalMinutes = state.data.history.reduce(
      (acc, curr) => acc + (curr.duracao_minutos || 0),
      0,
    );
    const avgMinutes =
      totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const formattedAvg = Formatters.formatDuration(avgMinutes);

    let html = `
      <div class="history-summary-container" style="padding-left: 18px; padding-right: 16px; width: 100%; display: flex; flex-direction: column; gap: 16px;">
        <div class="history-summary" style="display: flex; justify-content: space-between; width: 100%; font-size: 14px; color: var(--text-secondary, #666);">
          <span>Média de tempo:</span>
          <span>${formattedAvg} (${totalSessions} sessões)</span>
        </div>
        <div class="history-logs-container" style="display: flex; flex-direction: column; gap: 8px;">
    `;

    html += state.data.history
      .map((session) => {
        const d = new Date(session.data);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        let timeInfoHtml = `<span>${Formatters.formatDuration(session.duracao_minutos)}</span>`;

        if (state.period === "day") {
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
            <span>${Formatters.formatDuration(session.duracao_minutos)}</span>
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

    html += `</div></div>`;
    dom.summaryContainer.innerHTML = html;

    dom.summaryContainer
      .querySelectorAll(".session-log-item.clickable")
      .forEach((card) => {
        card.addEventListener("click", () => {
          if (state.period !== "day") ctx.goToDayView(card.dataset.date);
        });
      });
  },

  // Gráfico Radar (Compartilhado entre Dia e Semana)
  renderRadarChart(ctx) {
    const { dom, state } = ctx;
    if (!dom.chartCanvas) return;

    const dadosPlano = state.data.volume.grafico_tabela;
    const periodosUnicos = [
      ...new Set(dadosPlano.map((d) => d.periodo)),
    ].sort();
    const musculosMap = {};

    dadosPlano.forEach((row) => {
      if (!musculosMap[row.musculo]) musculosMap[row.musculo] = {};
      musculosMap[row.musculo][row.periodo] = row.series;
    });

    const labelsRaw = Object.keys(musculosMap);
    const periodosExibicao = periodosUnicos.slice(-4);

    // Ordenação decrescente pelo volume total no período exibido
    labelsRaw.sort((a, b) => {
      const volA = periodosExibicao.reduce(
        (sum, p) => sum + (musculosMap[a][p] || 0),
        0,
      );
      const volB = periodosExibicao.reduce(
        (sum, p) => sum + (musculosMap[b][p] || 0),
        0,
      );
      return volB - volA;
    });

    const labels = labelsRaw.map((nome) => Formatters.formatChartLabel(nome));

    const datasets = periodosExibicao.map((periodo, index) => {
      const colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981"];
      const cor = colors[index % colors.length];

      return {
        label: Formatters.formatShortDate(periodo, state.period),
        data: labelsRaw.map((m) => musculosMap[m][periodo] || 0),
        borderColor: cor,
        backgroundColor: cor + "33",
        pointBackgroundColor: "transparent",
        pointRadius: 0,
        pointHitRadius: 15,
        borderWidth: 1.9,
        tension: 0.05,
        borderJoinStyle: "round",
      };
    });

    const isSystemDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const horaAtual = new Date().getHours();
    const isDarkMode = isSystemDark || horaAtual >= 18 || horaAtual < 6;
    const corTexto = isDarkMode ? "#d4d4d4" : "#666666";
    const corGrid = isDarkMode
      ? "rgba(255, 255, 255, 0.15)"
      : "rgba(128, 128, 128, 0.1)";

    ctx.recreateCanvas();

    state.chartInstance = new Chart(dom.chartCanvas, {
      type: "radar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: "easeOutQuart" },
        scales: {
          r: {
            beginAtZero: true,
            grid: { color: corGrid },
            angleLines: { color: corGrid },
            pointLabels: { color: corTexto, font: { size: 11 }, padding: 8 },
            ticks: {
              display: true,
              color: corTexto,
              backdropColor: "transparent",
            },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  },

  // Tabela Ordenável (Compartilhada entre Dia e Semana)
  renderTable(ctx) {
    const { dom, state } = ctx;
    dom.tableSection.style.display = "block";

    const dadosPlano = state.data.volume.grafico_tabela;
    const periodosUnicos = [
      ...new Set(dadosPlano.map((d) => d.periodo)),
    ].sort();

    const musculosMap = {};
    dadosPlano.forEach((row) => {
      if (!musculosMap[row.musculo])
        musculosMap[row.musculo] = { musculo: row.musculo };
      musculosMap[row.musculo][row.periodo] = row.series;
    });

    const tableData = Object.values(musculosMap);
    const { key: sortKey, asc: sortAsc } = state.tableSort;

    tableData.sort((a, b) => {
      let valA = a[sortKey] || 0;
      let valB = b[sortKey] || 0;
      if (sortKey === "musculo") {
        valA = a.musculo.toLowerCase();
        valB = b.musculo.toLowerCase();
        return valA < valB
          ? sortAsc
            ? -1
            : 1
          : valA > valB
            ? sortAsc
              ? 1
              : -1
            : 0;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    const getSortIcon = (key) => (sortKey !== key ? "" : sortAsc ? " ↑" : " ↓");

    let thHtml = `<th data-sort="musculo" style="cursor: pointer; user-select: none;">Músculo${getSortIcon("musculo")}</th>`;
    periodosUnicos.forEach((p) => {
      thHtml += `<th data-sort="${p}" style="cursor: pointer; user-select: none;">${Formatters.formatShortDate(p, state.period)}${getSortIcon(p)}</th>`;
    });
    dom.tableHead.innerHTML = thHtml;

    dom.tableBody.innerHTML = tableData
      .map((row) => {
        const cols = periodosUnicos
          .map((p) => `<td>${row[p] || 0}</td>`)
          .join("");
        return `<tr><td>${row.musculo}</td>${cols}</tr>`;
      })
      .join("");

    dom.tableHead.querySelectorAll("th").forEach((th) => {
      th.addEventListener("click", () => {
        const key = th.dataset.sort;
        if (state.tableSort.key === key) {
          state.tableSort.asc = !state.tableSort.asc;
        } else {
          state.tableSort.key = key;
          state.tableSort.asc = key === "musculo";
        }
        this.renderTable(ctx);
      });
    });
  },

  // Lista de Exercícios Detalhada (Compartilhada entre Dia e Semana)
  renderExerciseList(ctx) {
    const { dom, state } = ctx;
    dom.exerciseBreakdownSection.style.display = "block";

    const listaPlana = state.data.volume.lista_exercicios;

    if (state.breakdownMode === "muscle") {
      const grupos = {};
      listaPlana.forEach((item) => {
        if (!grupos[item.musculo])
          grupos[item.musculo] = { total: 0, principais: [], secundarios: [] };
        grupos[item.musculo].total += item.series;
        if (item.tipo === "principal")
          grupos[item.musculo].principais.push(item);
        else grupos[item.musculo].secundarios.push(item);
      });

      dom.breakdownHeaderTitle.textContent = "Músculos × Exercícios";
      const formatExName = (name) =>
        name.length > 26 ? name.substring(0, 26) + "..." : name;

      dom.exerciseList.innerHTML = Object.keys(grupos)
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
            </div>`
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
            </div>`
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

      dom.breakdownHeaderTitle.textContent = "Exercícios";

      dom.exerciseList.innerHTML = Object.keys(grupos)
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
};
