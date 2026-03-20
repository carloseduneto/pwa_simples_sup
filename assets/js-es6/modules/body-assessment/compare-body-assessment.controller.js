// assets\js-es6\modules\body-assessment\compare-body-assessment.controller.js

import { GlobalLoader } from "../../ui/global-loader.js";
import { initInputGroupedForms } from "./body-assests-ui.component.js";
import { BodyAvaliacoesService } from "./body-avaliacoes.service.js";
import { BodySchemaService } from "./body-schema.service.js";
import { gerarGrupoInputs } from "./body-input-group.component.js";
import { gerarGrupoComparacao } from "./body-input-group.component.js";

export async function initBodyAssessmentCompare(
  onNavigate,
  avaliacao1Html = null,
  avaliacao2Html = null,
) {
  if (!avaliacao1Html && !avaliacao2Html) {
    globalValueBodyAssessment1 = null;
    globalValueBodyAssessment2 = null;
  } else {
    globalValueBodyAssessment1 = avaliacao1Html ? Number(avaliacao1Html) : null;
    globalValueBodyAssessment2 = avaliacao2Html ? Number(avaliacao2Html) : null;
  }

  const container = document.getElementById(
    "compare-body-assessment-container",
  );
  // O HTML aponta para uma div interna onde os itens vão entrar
  const containerItens = container
    ? container.querySelector(".compare-body-assessment-itens")
    : null;

  if (!container || !containerItens) return;

  containerItens.innerHTML = GlobalLoader.getSimple();

  // 1. Captura a intenção de navegação
  const avaliacaoId1 = Number(
    avaliacao1Html ?? localStorage.getItem("detailBodyAssessmentId"),
  );
  const avaliacaoId2 = Number(
    avaliacao2Html ?? localStorage.getItem("compareBodyAssessmentId2"),
  );
  // let avaliacaoId1 = !avaliacao1Html
  //   ? localStorage.getItem("detailBodyAssessmentId")
  //   : avaliacao1Html;

  // avaliacaoId1 = !avaliacaoId1 ? 11 : avaliacaoId1;
  // const avaliacaoId2 = !avaliacao2Html ? 13 : avaliacao2Html;

  if (!avaliacaoId1 && !avaliacaoId2) {
    containerItens.innerHTML = "<p>ID da avaliação não encontrado.</p>";
    return;
  }

  try {
    // 2. Busca o conteúdo (A avaliação do paciente)
    const avaliacao1 = await BodyAvaliacoesService.getById(avaliacaoId1);
    const avaliacao2 = await BodyAvaliacoesService.getById(avaliacaoId2);

    // 3. Busca a planta (O modelo usado naquela avaliação específica)
    const esquemas = await BodySchemaService.getAll();
    const esquemaUsado1 = esquemas.find((e) => e.id === avaliacao1.schema_id);
    const esquemaUsado2 = esquemas.find((e) => e.id === avaliacao2.schema_id);

    if (!esquemaUsado1 && !esquemaUsado2) {
      throw new Error("Modelo de avaliação não encontrado para este registro.");
    }

    containerItens.innerHTML = "Carregado";

    const avaliacaoNova =
      avaliacao1.data_registro > avaliacao2.data_registro
        ? avaliacao1
        : avaliacao2;
    const avaliacaoAntiga =
      avaliacao1.data_registro > avaliacao2.data_registro
        ? avaliacao2
        : avaliacao1;

    // 4. Cruzamento e Renderização
    const htmlCompleto = esquemaUsado1.schema
      .map((secaoDb) => {
        const camposAgrupados = agruparCamposComparacao(
          secaoDb.campos,
          avaliacaoAntiga,
          avaliacaoNova,
        );

        console.log("camposAgrupados", camposAgrupados);

        return gerarGrupoComparacao({
          titulo: secaoDb.secao,
          retratil: secaoDb.retratil,
          parametros: camposAgrupados,
        });
        // return camposAgrupados;
      })
      .join("");

    // // 5. Injeta na tela e ativa as sanfonas
    containerItens.innerHTML = htmlCompleto;

    // initInputGroupedForms();
    console.log("avaliacao antiga:", avaliacaoAntiga);
    console.log("avaliacao nova", avaliacaoNova);

    // console.log("htmlCompleto", htmlCompleto);
  } catch (error) {
    console.error("Erro ao carregar detalhes da avaliação:", error);
    containerItens.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar os dados desta avaliação.</p>';
  }

  const btnPerc = document.getElementById("id-perc");
  const btnUnit = document.getElementById("id-unit");

  const spansPerc = document.querySelectorAll(".compare_assesment_perc");
  const spansUnit = document.querySelectorAll(".compare_assesment_unit");

  btnUnit.addEventListener("click", () => {
    spansPerc.forEach((span) => span.classList.add("hidden"));
    spansUnit.forEach((span) => span.classList.remove("hidden"));

    //Troca estilo dos botões
    btnPerc.classList.remove("button-short-icon-label--active");
    btnUnit.classList.remove("button-short-icon-label--inactive");
    btnPerc.classList.add("button-short-icon-label--inactive");
    btnUnit.classList.add("button-short-icon-label--active");
  });

  btnPerc.addEventListener("click", () => {
    spansPerc.forEach((span) => span.classList.remove("hidden"));
    spansUnit.forEach((span) => span.classList.add("hidden"));

    //Troca estilo dos botões
    btnPerc.classList.remove("button-short-icon-label--inactive");
    btnUnit.classList.remove("button-short-icon-label--active");
    btnPerc.classList.add("button-short-icon-label--active");
    btnUnit.classList.add("button-short-icon-label--inactive");
  });

  // Modal período area
  const modal = document.getElementById("modal-body-assessment-compare");
  if (!modal) return;
  const btnSelectInterval = document.getElementById(
    "button-select-interval-body-assessment-compare",
  );

  const btnCancelar = document.getElementById(
    "modal-body-assessment-compare-cancel",
  );

  const btnComparar = document.getElementById(
    "modal-body-assessment-compare--action",
  );

  btnSelectInterval.addEventListener("click", () => {
    modal.classList.remove("hidden");
    populateBodyAssessmentSelect();
  });

  btnComparar.addEventListener("click", () => {
    modal.classList.add("hidden");
    avaliacao1Html = document.getElementById(
      "modal-body-assessment-compare-item-1",
    ).value;
    avaliacao2Html = document.getElementById(
      "modal-body-assessment-compare-item-2",
    ).value;
    globalValueBodyAssessment1 = Number(avaliacao1Html);
    globalValueBodyAssessment2 = Number(avaliacao2Html);
    initBodyAssessmentCompare(
      "bodyAssessmentCompare",
      avaliacao1Html,
      avaliacao2Html,
    );
  });

  if (btnCancelar) {
    // const novoBtn = btnCancelar.cloneNode(true);
    // btnCancelar.parentNode.replaceChild(novoBtn, btnCancelar);
    btnCancelar.addEventListener("click", () => {
      modal.classList.add("hidden");
    });

    // novoBtn.onclick = () => {
    //   modal.classList.add("hidden");
    // };
  }
}

let globalValueBodyAssessment1, globalValueBodyAssessment2;

export async function populateBodyAssessmentSelect(
  containerId = "modal-body-assessment-compare-selects",
  resetarSegundo = false,
  resetarPrimeiro = false, // 1. Novo parâmetro adicionado
) {
  const containerBodyAssessment = document.getElementById(containerId);

  if (!containerBodyAssessment) {
    return;
  }
  containerBodyAssessment.innerHTML =
    '<span style="font-size:12px; color:var(--color-black);">Carregando avaliações...</span>';

  try {
    const todasAvaliacoes = await BodyAvaliacoesService.getAll();

    // 2. Lógica ajustada para priorizar o reset quando solicitado
    const bodyAssessmentSelected1 = resetarPrimeiro
      ? Number(localStorage.getItem("detailBodyAssessmentId"))
      : !globalValueBodyAssessment1
        ? Number(localStorage.getItem("detailBodyAssessmentId"))
        : globalValueBodyAssessment1;

    const bodyAssessmentSelected2 = resetarSegundo
      ? null
      : !globalValueBodyAssessment2
        ? Number(localStorage.getItem("compareBodyAssessmentId2"))
        : globalValueBodyAssessment2;

    const baseId = containerId.replace("-selects", "");

    /* html */
    let html1 = `
    <select id="${baseId}-item-1" style="padding: 8px; width: 100%; border-radius: 8px; border: 1px solid #ccc;" class="input-select-context-recomendacoes">
    <option value="" disabled ${!bodyAssessmentSelected1 ? "selected" : ""}>Selecione avaliação 1</option>
    `;

    todasAvaliacoes.forEach((umaAvaliacao) => {
      const isSelected =
        umaAvaliacao.id === bodyAssessmentSelected1 ? "selected" : "";

      /* html */
      html1 += `<option value="${umaAvaliacao.id}" ${isSelected}>
     ${formatarValor("date", umaAvaliacao.data_registro)}
      </option>
      `;
    });
    html1 += `</select>`;

    /* html */
    let html2 = `
    <select id="${baseId}-item-2" style="padding: 8px; width: 100%; border-radius: 8px; border: 1px solid #ccc;" class="input-select-context-recomendacoes">
    <option value="" disabled selected>Selecione avaliação 2</option>
    `;

    todasAvaliacoes.forEach((umaAvaliacao) => {
      const isSelected =
        umaAvaliacao.id === bodyAssessmentSelected2 ? "selected" : "";
      /* html */
      html2 += `<option value="${umaAvaliacao.id}" ${isSelected}>
     ${formatarValor("date", umaAvaliacao.data_registro)}
      </option>
      `;
    });
    html2 += `</select>`;

    containerBodyAssessment.innerHTML = html1 + html2;
  } catch (error) {
    console.error("Erro ao carregar detalhes da avaliação:", error);
    // containerItens.innerHTML =
    //   '<p style="color:red; text-align:center;">Erro ao carregar os dados desta avaliação.</p>';
  }
}

function agruparCamposComparacao(campos, avaliacaoAntiga, avaliacaoNova) {
  // console.log(
  //   "campos:",
  //   campos,
  //   "avaliacaoAntiga",
  //   avaliacaoAntiga,
  //   "avaliacaoNova",
  //   avaliacaoNova,
  // );
  const resultado = [];

  for (let i = 0; i < campos.length; i++) {
    let valor_antigo, valor_novo;
    if (campos[i].destino === "json") {
      // Aqui define o valor que vem do JSONB
      valor_antigo = avaliacaoAntiga.value[campos[i].chave];
      valor_novo = avaliacaoNova.value[campos[i].chave];
    } else if (campos[i].destino === "tabela") {
      //Aqui define o valor que vem da tabela
      valor_antigo = avaliacaoAntiga[campos[i].chave];
      valor_novo = avaliacaoNova[campos[i].chave];
      if (campos[i].tipo_html == "date") {
        valor_antigo = formatarValor("date", valor_antigo);
        valor_novo = formatarValor("date", valor_novo);
      }
    }

    // console.log(valor_antigo, valor_novo);

    if (
      !campos[i].label_par &&
      (typeof valor_antigo == "number" || typeof valor_novo == "number")
    ) {
      let dif_perc =
        valor_antigo == null || valor_novo == null
          ? "-"
          : difPercentualAntigoNovo(valor_antigo, valor_novo);
      let dif_unit =
        valor_antigo == null || valor_novo == null
          ? "-"
          : difUnidadeAntigoNovo(valor_antigo, valor_novo);

      dif_perc = formatarValor("number", dif_perc);
      dif_unit = formatarValor("number", dif_unit);

      let objetoSimples = {
        label: campos[i].label,
        unidade: campos[i].unidade,
        tipo_html: campos[i].tipo_html,
        destino: campos[i].destino,
        valor_antigo: formatarValor(
          campos[i].tipo_html,
          avaliacaoAntiga.value[campos[i].chave],
        ),
        valor_novo: formatarValor(
          campos[i].tipo_html,
          avaliacaoNova.value[campos[i].chave],
        ),
        dif_perc: dif_perc,
        dif_unit: dif_unit,
      };

      resultado.push(objetoSimples);
    } else if (campos[i].label_par) {
      const sufixo = campos[i].chave.split("_").at(-1);

      let valor_antigo_esq, valor_novo_esq, dif_perc_esq, dif_unit_esq;
      let valor_antigo_dir, valor_novo_dir, dif_perc_dir, dif_unit_dir;

      if (sufixo === "esq") {
        //Busca valores para calcular a esquerda
        valor_antigo_esq = valor_antigo ?? "-";
        valor_novo_esq = valor_novo ?? "-";
        // Calcula esquerda
        dif_perc_esq =
          valor_antigo_esq == "-" || valor_novo_esq == "-"
            ? "-"
            : difPercentualAntigoNovo(valor_antigo_esq, valor_novo_esq);
        dif_unit_esq =
          valor_antigo_esq == "-" || valor_novo_esq == "-"
            ? "-"
            : difUnidadeAntigoNovo(valor_antigo_esq, valor_novo_esq);

        //Busca valores para já calcular direita
        const chaveDir = campos[i].chave.replace("_esq", "_dir");
        valor_antigo_dir = avaliacaoAntiga.value[chaveDir] ?? "-";
        valor_novo_dir = avaliacaoNova.value[chaveDir] ?? "-";

        //Calcula direita
        dif_perc_dir =
          valor_antigo_dir == "-" || valor_novo_dir == "-"
            ? "-"
            : difPercentualAntigoNovo(valor_antigo_dir, valor_novo_dir);
        dif_unit_dir =
          valor_antigo_dir == "-" || valor_novo_dir == "-"
            ? "-"
            : difUnidadeAntigoNovo(valor_antigo_dir, valor_novo_dir);
      }
      if (sufixo === "dir") {
        continue;
      }

      valor_antigo_esq = formatarValor("number", valor_antigo_esq);
      valor_novo_esq = formatarValor("number", valor_novo_esq);
      dif_perc_esq = formatarValor("number", dif_perc_esq);
      dif_unit_esq = formatarValor("number", dif_unit_esq);
      valor_antigo_dir = formatarValor("number", valor_antigo_dir);
      valor_novo_dir = formatarValor("number", valor_novo_dir);
      dif_perc_dir = formatarValor("number", dif_perc_dir);
      dif_unit_dir = formatarValor("number", dif_unit_dir);

      let objetoPares = {
        label: campos[i].label_par,
        label_par: campos[i].label_par,
        unidade: campos[i].unidade,
        tipo_html: campos[i].tipo_html,
        destino: campos[i].destino,
        valor_antigo: `${valor_antigo_esq}/${valor_antigo_dir}`,
        valor_novo: `${valor_novo_esq}/${valor_novo_dir}`,
        dif_perc:
          dif_perc_esq === dif_perc_dir
            ? dif_perc_esq
            : `${dif_perc_esq}/${dif_perc_dir}`,
        dif_unit:
          dif_unit_esq === dif_unit_dir
            ? dif_unit_esq
            : `${dif_unit_esq}/${dif_unit_dir}`,
        chaves: [],
        chave_par: campos[i].par,
      };
      resultado.push(objetoPares);
    } else {
      let objetoBase = {
        label: campos[i].label,
        tipo_html: campos[i].tipo_html,
        destino: campos[i].destino,
        valor_antigo: valor_antigo,
        valor_novo: valor_novo,
      };

      resultado.push(objetoBase);
    }
  }

  function difPercentualAntigoNovo(valor_antigo, valor_novo) {
    let resultado = ((valor_novo - valor_antigo) / valor_antigo) * 100;
    resultado = Number(resultado.toFixed(2));
    return resultado;
  }

  function difUnidadeAntigoNovo(valor_antigo, valor_novo) {
    let resultado = valor_novo - valor_antigo;
    resultado = Number(resultado.toFixed(2));
    return resultado;
  }

  resultado.sort((a, b) => {
    const textoA = a.label_par || a.label;
    const textoB = b.label_par || b.label;
    return textoA.localeCompare(textoB);
  });

  resultado.sort((a, b) => {
    const aPar = a.label_par ? 1 : 0;
    const bPar = b.label_par ? 1 : 0;
    return aPar - bPar; // simples primeiro, pares depois
  });

  return resultado;
}

function formatarValor(tipo, valor) {
  // console.log("Tipo e valor: ",tipo, valor);
  //Corrigir para pegar dados da fonte de dados tratada
  if (tipo === "date") {
    // Converte YYYY-MM-DD para DD/MM/YYYY
    valor = valor.split("T")[0].split("-").reverse().join("/");
  } else if (tipo === "number" && valor !== null) {
    // Troca ponto por vírgula na exibição
    valor = valor.toString().replace(".", ",");
  }

  return valor;
}
