let isInitialized = false;

export function initInputGroupedForms() {
  if (isInitialized) return;

  document.addEventListener("click", event => {
    const retractableArea = event.target.closest(
      ".input-grouped-form__retractable-area",
    );

    if (!retractableArea) return;

    const container = retractableArea.closest(".input-grouped-form");
    if (container) {
      container.classList.toggle("is-open");
    }
  });

  isInitialized = true;
}
