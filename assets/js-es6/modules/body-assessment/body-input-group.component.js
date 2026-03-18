// assets/js-es6/components/input-group.js
import { buttonLargeIconText } from "../../components/buttons.js";
import { buttonShortIconLabel } from "../../components/buttons.js";

export function gerarGrupoInputs({
  titulo,
  retratil = false,
  parametros = [],
  modoLeitura = false,
}) {
  console.log("Parametros: ", parametros);
  // 1. Monta o cabeçalho do grupo (Estático vs Retrátil)

  let cabecalhoHtml = "";
  if (retratil) {
    /*html*/
    cabecalhoHtml = `
      <div class="input-grouped-form__retractable-area">
        <span class="input-grouped-form__titulo dont-select">${titulo}</span>
        <span class="material-symbols-rounded input-grouped-form__retractable-icon">arrow_back_ios_new</span>
      </div>
    `;
  } else {
    /*html*/
    cabecalhoHtml = `
      <div class="input-grouped-form__static">
        <span class="input-grouped-form__titulo">${titulo}</span>
      </div>
    `;
  }

  let miniHeaderParHtml = "";
  let headerJaMostrado = false;

  // 2. Monta a lista de inputs ou spans (O laço de repetição lida com o aninhamento)
  const itensHtml = parametros
    .map((param) => {
      if (modoLeitura) {
        if (param.label !== undefined && param.valor !== undefined) {
          // Visualização de detalhes simples
          /*html*/
          return `
          <div class="input-grouped-form__input-group">
          <span class="input-grouped-form__text">${param.label}</span>
          <span class="input-grouped-form__value">${param.valor || "-"} ${param.unidade || ""}</span>
          </div>
          `;
        } else if (
          param.label_par !== undefined &&
          param.valor_esq !== undefined &&
          param.valor_dir !== undefined
        ) {
          if (param.label_par && !headerJaMostrado) {
            /*html*/
            miniHeaderParHtml = `
            <div class="input-grouped-form__left-right-header">
            <div></div>
            <div>Esquerdo</div>
            <div>Direito</div>
            </div>
            `;
          }
          // Visualização de detalhes duplos
          /*html*/
          let dadosPares = `
          
          
          <div class="input-grouped-form__input-group input-grouped-form__left-right-data">
          <span class="input-grouped-form__text">${param.label_par}</span>
          <span class="input-grouped-form__value">
          ${param.valor_esq || "-"} ${param.unidade || ""} 
          </span>
          <span class="input-grouped-form__value">
          ${param.valor_dir || "-"}  ${param.unidade || ""}
          </span>
          </div>
          `;
          const detalhesDuplos = !headerJaMostrado
            ? miniHeaderParHtml + dadosPares
            : dadosPares;
          headerJaMostrado = true;

          return detalhesDuplos;
        }
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
              <label for="body-assessment-${param.id}" class="input-grouped-form__input-static-text">${param.label}</label>
              <input 
                type="${param.tipo}" 
                id="body-assessment-${param.id}" 
                name="${param.id}"
                placeholder="${param.placeholder || "-"}" 
                data-destino="${param.destino || ""}"
                value="${param.valor || ""}"
                class="input-grouped-form__input-static-input" 
                ${atributoStep}
                ${atributoMascara}
              />
            </div>
          `;
          // No bloco do "else" (formulário de edição) dentro do .map:
        } else {
          const atributoStep = param.step ? `step="${param.step}"` : "";
          const unidade = param.unidade || ""; // Pega a unidade do JSON
          // No bloco do formulário de edição (input-short):
          /*html*/
          return `
  <div class="input-grouped-form__input-group">
    <label for="body-assessment-${param.id}" class="input-grouped-form__text">${param.label}</label>
    <div class="input-grouped-form__input-wrapper">
      <input 
        type="text" 
        inputmode="decimal"
        id="body-assessment-${param.id}" 
        name="${param.id}"
        placeholder="0,00" 
        data-destino="${param.destino || ""}"
        value="${param.valor || ""}"
        class="input-grouped-form__input mask-decimal" 
        data-unidade="${unidade}"
      />
      ${unidade ? `<span class="input-grouped-form__unit">${unidade}</span>` : ""}
    </div>
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

let unitPercToggleAreaShowed = false;
let intervalDateAreaShowed = false;

export function gerarGrupoComparacao({
  titulo,
  retratil = false,
  parametros = [],
}) {

  if (!retratil) {
    unitPercToggleAreaShowed = false;
    intervalDateAreaShowed = false;
  }
  let selectIntervalDate = `
  <div class="flex-row-justify-end">
  ${buttonShortIconLabel(
    "interval-body-assessment",
    "edit_calendar",
    "Período",
  )}
  </div>
`;

  let percToggleButton = buttonShortIconLabel(
    "id-perc",
    "percent",
    "Percentual",
  );
  let unitToggleButton = buttonShortIconLabel(
    "id-unit",
    "straighten",
    "Unidades",
    "inactive",
  );

  let unitPercToggleArea = `
      <div class="flex-row-space-evenly sticky-area">
      ${percToggleButton}
      ${unitToggleButton}
      </div>
  `;

  let selectDatebutton = buttonLargeIconText(
    "btn-assesment-date",
    "edit_calendar",
    "Período",
  );
  console.log("Parametros: ", parametros);
  // 1. Monta o cabeçalho do grupo (Estático vs Retrátil)
  let cabecalhoHtml = "";
  if (retratil) {
    /*html*/
    cabecalhoHtml = `
      <div class="input-grouped-form__retractable-area">
        <span class="input-grouped-form__titulo dont-select">${titulo}</span>
        <span class="material-symbols-rounded input-grouped-form__retractable-icon">arrow_back_ios_new</span>
      </div>
    `;
  } else {
    /*html*/
    cabecalhoHtml = `
      <div class="input-grouped-form__static">
        <span class="input-grouped-form__titulo">${titulo}</span>
      </div>
    `;
  }

  let miniHeaderParHtml = "";
  let headerJaMostrado = false;

  // 2. Monta a lista de inputs ou spans (O laço de repetição lida com o aninhamento)
  const itensHtml = parametros
    .map((param) => {
      if (
        param.label !== undefined &&
        param.valor_antigo !== undefined &&
        param.valor_novo !== undefined &&
        !param.label_par
      ) {
        if (param.destino == "tabela") {
          let data = `
          <div class="input-grouped-form__input-group input-grouped-form__comparacao-row--basic-data">
          <span class="input-grouped-form__text">${param.label}</span>
          <span class="input-grouped-form__value">${param.valor_antigo || "-"}${param.unidade || ""}</span>
          <span class="input-grouped-form__value">${param.valor_novo || "-"}${param.unidade || ""}</span>
          </div>
          `;

          return data;
        }
        // Visualização de detalhes simples
        /*html*/
        return `
          <div class="input-grouped-form__input-group input-grouped-form__comparacao-row">
          <span class="input-grouped-form__text">${param.label}</span>
          <span class="input-grouped-form__value">${param.valor_antigo || "-"}${param.unidade || ""}</span>
          <span class="input-grouped-form__value">${param.valor_novo || "-"}${param.unidade || ""}</span>
          <span class="input-grouped-form__value compare_assesment_perc">${param.dif_perc || "-"}%</span>
          <span class="input-grouped-form__value compare_assesment_unit hidden">${param.dif_unit || "-"}${param.unidade || ""}</span>

          </div>
          `;
      } else if (
        param.label_par !== undefined &&
        param.valor_antigo !== undefined &&
        param.valor_novo !== undefined
      ) {
        if (param.label_par && !headerJaMostrado) {
          /*html*/
          miniHeaderParHtml = `
            <div class="input-grouped-form__left-right-header-comparacao">
            <div></div>
            <div class="input-grouped-form__left-right-header-comparacao--title">← Esq · Dir →</div>
            </div>
            `;
        }
        // Visualização de detalhes duplos
        /*html*/
        let dadosPares = `
          
          
          <div class="input-grouped-form__input-group input-grouped-form__comparacao-row">
          <span class="input-grouped-form__text">${param.label_par}</span>
          <span class="input-grouped-form__value">${param.valor_antigo || "-"}${param.unidade || ""}</span>
          <span class="input-grouped-form__value">${param.valor_novo || "-"}${param.unidade || ""}</span>
          <span class="input-grouped-form__value compare_assesment_perc">${param.dif_perc || "-"}%</span>
          <span class="input-grouped-form__value compare_assesment_unit hidden">${param.dif_unit || "-"}${param.unidade || ""}</span>
          </div>
          `;
        const detalhesDuplos = !headerJaMostrado
          ? miniHeaderParHtml + dadosPares
          : dadosPares;
        headerJaMostrado = true;

        return detalhesDuplos;
      }
    })
    .join("");

  // 3. Empacota tudo
  // Botão de seleção de data
  // ${selectDatebutton}

  /*html*/
  let data = `
  <div class="input-grouped-form">
  ${cabecalhoHtml}
  <div class="${retratil ? "input-grouped-form__input-hidden" : "input-grouped-form__inputs"}">
  ${itensHtml}
  </div>
  </div>
  `;

  console.log(
    "retratil:",
    retratil,
    "toggleMostrado:",
    unitPercToggleAreaShowed,
  );

  data =
    !intervalDateAreaShowed && !retratil ? selectIntervalDate + data : data;

  if (!retratil && intervalDateAreaShowed == false) {
    intervalDateAreaShowed = true;
  }

  data =
    !unitPercToggleAreaShowed && retratil ? unitPercToggleArea + data : data;

  if (retratil && unitPercToggleAreaShowed == false) {
    unitPercToggleAreaShowed = true;
  }

  return data;
}
