export function buttonLargeIconText(id, icon, label) {
  let button = `
    <button id="${id}" type="button" class="primary-button primary-button--add-center">
    <span class="material-symbols-rounded">${icon}</span>${label}
  </button>
    `;

  return button;
}

export function buttonShortIconLabel(id, icon, label, status = "active") {
  /*html*/
  let button = `
  <button
  id="${id}"
  class="button-short-icon-label button-short-icon-label--${status}"
  >
  <span class="material-symbols-rounded"> ${icon} </span>
  <span>${label}</span>
  </button>
  `;
  return button;
}
