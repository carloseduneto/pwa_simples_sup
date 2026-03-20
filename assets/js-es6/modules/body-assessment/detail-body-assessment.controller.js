// assets\js-es6\modules\body-assessment\detail-body-assessment.controller.js

import { GlobalLoader } from "../../ui/global-loader.js";
import { initInputGroupedForms } from "./body-assests-ui.component.js";
import { BodyAvaliacoesService } from "./body-avaliacoes.service.js";
import { BodySchemaService } from "./body-schema.service.js";
import { gerarGrupoInputs } from "./body-input-group.component.js";
import { modalBodyAssessmentCompare } from "../../components/modal.js";
import { populateBodyAssessmentSelect } from "./compare-body-assessment.controller.js";
import { initBodyAssessmentCompare } from "./compare-body-assessment.controller.js";

export async function initBodyAssessmentDetail(onNavigate) {
  const container = document.getElementById("detail-body-assessment-container");
  // O HTML aponta para uma div interna onde os itens vão entrar
  const containerItens = container
    ? container.querySelector(".detail-body-assessment-itens")
    : null;

  if (!container || !containerItens) return;

  containerItens.innerHTML = GlobalLoader.getSimple();

  // 1. Captura a intenção de navegação
  const avaliacaoId = localStorage.getItem("detailBodyAssessmentId");

  if (!avaliacaoId) {
    containerItens.innerHTML = "<p>ID da avaliação não encontrado.</p>";
    return;
  }

  try {
    // 2. Busca o conteúdo (A avaliação do paciente)
    const avaliacao = await BodyAvaliacoesService.getById(avaliacaoId);

    // 3. Busca a planta (O modelo usado naquela avaliação específica)
    const esquemas = await BodySchemaService.getAll();
    const esquemaUsado = esquemas.find((e) => e.id === avaliacao.schema_id);

    if (!esquemaUsado) {
      throw new Error("Modelo de avaliação não encontrado para este registro.");
    }

    // const camposAgrupados2 = agruparCampos(
    //   esquemaUsado.schema.campo,
    //   avaliacao.value,
    //   avaliacao,
    // );

    // for (let i = 0; i < esquemaUsado.schema.length; i++) {
    //   console.log("esquema usado:", esquemaUsado.schema[i]);
    //   const camposAgrupados = agruparCampos(
    //     esquemaUsado.schema[i].campos,
    //     avaliacao.value,
    //     avaliacao,
    //   );
    //   // console.log("campos agrupaods", camposAgrupados);
    // }

    // 4. Cruzamento e Renderização
    const htmlCompleto = esquemaUsado.schema
      .map((secaoDb) => {
        // const parametrosMapeados = secaoDb.campos.map((campoDb) => {
        //   // console.log("Campos agrupados", camposAgrupados);

        //   // Lógica de extração: Onde está o dado desta chave?
        //   let valorRecuperado2 = null;

        //   if (campoDb.destino === "tabela") {
        //     valorRecuperado2 = avaliacao[campoDb.chave];
        //   } else if (campoDb.destino === "json" && avaliacao.value) {
        //     valorRecuperado2 = avaliacao.value[campoDb.chave];
        //   }

        //   // Formatação amigável para leitura
        //   if (valorRecuperado2 !== null && valorRecuperado2 !== undefined) {
        //     if (campoDb.tipo_html === "date") {
        //       // Converte YYYY-MM-DD para DD/MM/YYYY
        //       valorRecuperado2 = valorRecuperado2
        //         .split("T")[0]
        //         .split("-")
        //         .reverse()
        //         .join("/");
        //     } else if (typeof valorRecuperado2 === "number") {
        //       // Troca ponto por vírgula na exibição
        //       valorRecuperado2 = valorRecuperado2.toString().replace(".", ",");
        //     }
        //   }

        //   // Entrega o pacote pronto para o componente de leitura
        //   return {
        //     label: campoDb.label,
        //     valor: valorRecuperado2,
        //     unidade: campoDb.unidade || "",
        //   };
        // });

        const camposAgrupados = agruparCampos(
          secaoDb.campos,
          avaliacao.value,
          avaliacao,
        );

        return gerarGrupoInputs({
          titulo: secaoDb.secao,
          retratil: secaoDb.retratil,
          parametros: camposAgrupados,
          modoLeitura: true,
        });
      })
      .join("");

    // 5. Injeta na tela e ativa as sanfonas
    containerItens.innerHTML = htmlCompleto;
    initInputGroupedForms();
  } catch (error) {
    console.error("Erro ao carregar detalhes da avaliação:", error);
    containerItens.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar os dados desta avaliação.</p>';
  }

  //Modal
  const bodyAssessmentDetailsCompare = document.getElementById(
    "body-assessment-details-compare",
  );
  bodyAssessmentDetailsCompare.innerHTML = modalBodyAssessmentCompare(
    "modal-compare-detail",
  );
  // Captura o modal DEPOIS de injetar o HTML
  const modal = document.getElementById("modal-compare-detail");
  const btnDetalhesCompare = document.getElementById(
    "details-body-assessment-compare-button--action",
  );

  btnDetalhesCompare.addEventListener("click", () => {
    console.log("Clicou!");
    modal.classList.remove("hidden");
    populateBodyAssessmentSelect("modal-compare-detail-selects", true, true);
  });

  const btnComparar = document.getElementById("modal-compare-detail--action");

  btnComparar.addEventListener("click", () => {
    modal.classList.add("hidden");
    // const avaliacao1Html = localStorage.getItem("detailBodyAssessmentId");
    const avaliacao2Html = document.getElementById(
      "modal-compare-detail-item-2",
    ).value;
    localStorage.setItem("compareBodyAssessmentId2", avaliacao2Html);
    onNavigate("bodyAssessmentCompare");
  });

  const btnCancelar = document.getElementById("modal-compare-detail-cancel");

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

function agruparCampos(campos, valoresAvaliacao, avaliacao) {
  // console.log("Campos", campos);
  // console.log("Avaliação", valoresAvaliacao);
  const jaProcessados = {};
  const resultado = [];
  let valor_esq = 0;
  let valor_dir = 0;

  for (let i = 0; i < campos.length; i++) {
    if (campos[i].par) {
      const sufixo = campos[i].chave.split("_").at(-1);
      if (campos[i].par in jaProcessados) {
        jaProcessados[campos[i].par].chaves.push(campos[i].chave);
        sufixo === "esq"
          ? (jaProcessados[campos[i].par].valor_esq = formatarValor(
              "number",
              valoresAvaliacao[campos[i].chave],
            ))
          : (jaProcessados[campos[i].par].valor_dir = formatarValor(
              "number",
              valoresAvaliacao[campos[i].chave],
            ));
      } else {
        if (sufixo === "esq") {
          valor_esq = valoresAvaliacao[campos[i].chave];
        } else {
          valor_dir = valoresAvaliacao[campos[i].chave];
        }

        const novoGrupo = {
          label_par: campos[i].label_par,
          unidade: campos[i].unidade,
          tipo_html: campos[i].tipo_html,
          valor_esq: valor_esq,
          valor_dir: valor_dir,
          chaves: [],
          destino: campos[i].destino,
          chave_par: campos[i].par,
        };
        // Aqui registra o nome do par de membros para futuras consultas em iterações do for
        jaProcessados[campos[i].par] = novoGrupo;

        // Adiciona as chaves do campos já processados
        jaProcessados[campos[i].par].chaves.push(campos[i].chave);
        novoGrupo.valor_dir = formatarValor(
          novoGrupo.tipo_html,
          novoGrupo.valor_dir,
        );
        novoGrupo.valor_esq = formatarValor(
          novoGrupo.tipo_html,
          novoGrupo.valor_esq,
        );

        resultado.push(novoGrupo);
      }
    } else {
      // console.log("Aqui é o que tem em Campos[i]", avaliacao);
      // if (campos[i].destino !== "json"){
      //   campos[i].valor = valoresAvaliacao[campos[i].chave]
      // }
      // campos[i].chave.valor = valoresAvaliacao[campos[i].chave];
      if (campos[i].destino === "json") {
        // Aqui define o valor que vem do JSONB
        campos[i].valor = valoresAvaliacao[campos[i].chave];
      } else if (campos[i].destino === "tabela") {
        //Aqui define o valor que vem da tabela
        campos[i].valor = avaliacao[campos[i].chave];
      }
      campos[i].valor = formatarValor(campos[i].tipo_html, campos[i].valor);

      resultado.push(campos[i]);
    }
  }

  //Ordenar por ordem alfabética
  resultado.sort((a, b) => {
    const textoA = a.label_par || a.label;
    const textoB = b.label_par || b.label;
    return textoA.localeCompare(textoB);
  });

  //Ordenar simples primeiros pares depois
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
