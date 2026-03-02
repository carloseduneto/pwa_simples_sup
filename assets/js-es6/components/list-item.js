export function gerarListItem({
  id,
  titulo,
  titleComplement = "",
  subtitulo = "",
  badge = "",
  data = "",
  mostrarAcoes = true,
}) {
  const badgeHtml = badge
    ? `<span class="list-item__badge">${badge}</span>`
    : "";
  const dataHtml = data ? `<span class="list-item__date">${data}</span>` : "";
  const summaryHtml =
    badgeHtml || dataHtml
      ? `<div class="summary">${badgeHtml}${dataHtml}</div>`
      : "";

  const titleComplementHtml = titleComplement
    ? ` • <span class="list-item__title-complement">${titleComplement}</span>`
    : "";
  const acoesHtml = mostrarAcoes
    ? /*html*/
      `
      <div class="list-item__actions">
      <button class="list-item__btn list-item__btn--edit" data-id="${id}" aria-label="Editar">
      <span class="material-symbols-rounded">edit</span>
      </button>
      <button class="list-item__btn list-item__btn--delete" data-id="${id}" aria-label="Excluir">
      <span class="material-symbols-rounded">delete</span>
      </button>
      </div>
      `
    : "";

  /*html*/
  return `
    <div class="list-item" data-id="${id}">
      <div class="list-item__info">
        <div class="flex-row-space-between">
          <strong class="list-item__title">${titulo}${titleComplementHtml}</strong>
          ${summaryHtml}
        </div>
        <span class="list-item__subtitle">${subtitulo}</span>
      </div>
      ${acoesHtml}
    </div>
  `;
}
