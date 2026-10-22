import { SharedViews } from "./stimulus-analysis-utils.js";

export const StimulusDayController = {
  render(ctx, renderToken) {
    const { dom, state } = ctx;

    dom.miniCalendarContainer.style.display = "none";
    dom.monthHistorySection.style.display = "none";
    dom.annualFiltersBar.style.display = "none";

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
};
