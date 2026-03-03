// assets/js-es6/components/input-group.js

export function gerarGrupoInputs({
  titulo,
  retratil = false,
  parametros = [],
  modoLeitura = false,
}) {
  // 1. Monta o cabeçalho do grupo (Estático vs Retrátil)
  let cabecalhoHtml = "";
  if (retratil) {
    cabecalhoHtml = `
      <div class="input-grouped-form__retractable-area">
        <span class="input-grouped-form__titulo dont-select">${titulo}</span>
        <span class="material-symbols-rounded input-grouped-form__retractable-icon">arrow_back_ios_new</span>
      </div>
    `;
  } else {
    cabecalhoHtml = `
      <div class="input-grouped-form__static">
        <span class="input-grouped-form__titulo">${titulo}</span>
      </div>
    `;
  }

  // 2. Monta a lista de inputs ou spans (O laço de repetição lida com o aninhamento)
  const itensHtml = parametros
    .map((param) => {
      if (modoLeitura) {
        // Visualização de detalhes
        return `
        <div class="input-grouped-form__input-group">
          <span class="input-grouped-form__text">${param.label}</span>
          <span class="input-grouped-form__value" style="font-weight: bold;">${param.valor || "-"} ${param.unidade || ""}</span>
        </div>
      `;
      } else {
        // Formulário de edição
        const atributoStep = param.step ? `step="${param.step}"` : "";
        const atributoMascara = param.mascara
          ? `data-mask="${param.mascara}"`
          : "";

        if (param.layout === "input-large") {
          /*html*/ 
          return `
            <div class="input-grouped-form__input-static">
              <label for="${param.id}" class="input-grouped-form__input-static-text">${param.label}</label>
              <input 
                type="${param.tipo}" 
                id="${param.id}" 
                placeholder="${param.placeholder || "-"}" 
                value="${param.valor || ""}"
                class="input-grouped-form__input-static-input" 
                ${atributoStep}
                ${atributoMascara}
              />
            </div>
          `;
        } else {
          /*html*/
          return `
            <div class="input-grouped-form__input-group">
              <label for="${param.id}" class="input-grouped-form__text">${param.label}</label>
              <input 
                type="${param.tipo}" 
                id="${param.id}" 
                placeholder="${param.placeholder || "-"}" 
                value="${param.valor || ""}"
                class="input-grouped-form__input" 
                ${atributoStep}
                ${atributoMascara}
              />
            </div>
          `;
        }
      }
    })
    .join("");

  // 3. Empacota tudo
  return `
    <div class="input-grouped-form">
      ${cabecalhoHtml}
      <div class="${retratil ? "input-grouped-form__input-hidden" : "input-grouped-form__inputs"}">
        ${itensHtml}
      </div>
    </div>
  `;
}
