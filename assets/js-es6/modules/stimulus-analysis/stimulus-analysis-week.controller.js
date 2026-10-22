import { Formatters, SharedViews } from "./stimulus-analysis-utils.js";

export const StimulusWeekController = {
  render(ctx, renderToken) {
    const { dom, state } = ctx;

    dom.annualFiltersBar.style.display = "none";
    dom.monthHistorySection.style.display = "none";

    // Mini-Calendário Semanal
    dom.miniCalendarContainer.style.display = "block";
    const activeDatesSet = Formatters.extractActiveDates(state.data.history);
    dom.miniCalendarContainer.innerHTML = this.buildWeekCalendar(
      state.currentDate,
      activeDatesSet,
    );

    dom.miniCalendarContainer
      .querySelectorAll(".calendar-day.has-session")
      .forEach((el) => {
        el.addEventListener("click", () => ctx.goToDayView(el.dataset.date));
      });

    SharedViews.renderSessionLogs(ctx);
    SharedViews.renderExerciseList(ctx);

    dom.chartContainer.classList.remove("is-loading");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (state.currentRenderId === renderToken) {
          SharedViews.renderTable(ctx);
          SharedViews.renderRadarChart(ctx);
        }
      });
    });
  },

  buildWeekCalendar(currentDate, activeDatesSet) {
    const { start } = Formatters.getDateRange("week", currentDate);
    const startDate = new Date(start);
    const days = ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."];
    const todayStr = new Date().toDateString();

    let html = `<div class="calendar-grid">`;
    days.forEach((d) => (html += `<div class="calendar-header">${d}</div>`));

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startDate);
      currentDay.setDate(startDate.getDate() + i);

      const dateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, "0")}-${String(currentDay.getDate()).padStart(2, "0")}`;
      const isSession = activeDatesSet.has(dateStr);
      const isToday = currentDay.toDateString() === todayStr;

      let classes = `calendar-day ${isSession ? "has-session" : ""} ${isToday ? "calendar-day-today" : ""}`;
      html += `<div class="${classes.trim()}" ${isSession ? `data-date="${dateStr}"` : ""}>${currentDay.getDate()}</div>`;
    }
    html += `</div>`;
    return html;
  },
};
