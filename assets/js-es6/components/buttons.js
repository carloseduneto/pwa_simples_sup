
export function buttonLargeIconText (id, icon, label){
    let button = `
    <button id="${id}" type="button" class="primary-button primary-button--add-center">
    <span class="material-symbols-rounded">${icon}</span>${label}
  </button>
    `;
 
    return button
}