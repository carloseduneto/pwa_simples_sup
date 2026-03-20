// assets\js-es6\components\modal.js

export function modalBodyAssessmentCompare(id = "modal-body-assessment-compare") {
 '' /*html*/
  return `
        <div id="${id}" class="modal-overlay hidden">
      <div class="modal-content">
        <h3>Selecione o período</h3>
        <p>Selecione avaliações para comparar.</p>
        <div class="modal-actions">

          <div id="${id}-selects" class="body-assessment-compare-selects"></div>
          <button
            id="${id}--action"
            class="button-short-icon-label button-short-icon-label--active"
          >
            <span class="material-symbols-rounded"> compare_arrows </span>
            <span>Comparar</span>
          </button>

          <button
            type="button"
            class="default-form-button default-form-button--cancel"
            id="${id}-cancel"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
    `;
}