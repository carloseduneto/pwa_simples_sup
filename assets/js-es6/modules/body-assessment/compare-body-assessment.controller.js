// assets\js-es6\modules\body-assessment\detail-body-assessment.controller.js

import { GlobalLoader } from "../../ui/global-loader.js";
import { initInputGroupedForms } from "./body-assests-ui.component.js";
import { BodyAvaliacoesService } from "./body-avaliacoes.service.js";
import { BodySchemaService } from "./body-schema.service.js";
import { gerarGrupoInputs } from "./body-input-group.component.js";

export async function initBodyAssessmentCompare(onNavigate) {
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
  // const avaliacaoId = localStorage.getItem("detailBodyAssessmentId");
  const avaliacaoId1 = 11;
  const avaliacaoId2 = 13;

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

        // return gerarGrupoInputs({
        //   titulo: secaoDb.secao,
        //   retratil: secaoDb.retratil,
        //   parametros: camposAgrupados,
        //   modoLeitura: true,
        // });
      })
      .join("");

    // // 5. Injeta na tela e ativa as sanfonas
    // containerItens.innerHTML = htmlCompleto;
    // initInputGroupedForms();
    console.log("avaliacao antiga:", avaliacaoAntiga);
    console.log("avaliacao nova", avaliacaoNova);
  } catch (error) {
    console.error("Erro ao carregar detalhes da avaliação:", error);
    containerItens.innerHTML =
      '<p style="color:red; text-align:center;">Erro ao carregar os dados desta avaliação.</p>';
  }
}

function agruparCamposComparacao(campos, avaliacaoAntiga, avaliacaoNova) {
  console.log(
    "campos:",
    campos,
    "avaliacaoAntiga",
    avaliacaoAntiga,
    "avaliacaoNova",
    avaliacaoNova,
  );

  for (let i = 0; i < campos.length; i++) {}

  let objetoSimples = {};
  return "";
}

function objectGenerator() {
  let valor_antigo = avaliacaoAntiga.value[campos[i].chave];
  let valor_novo = avaliacaoNova.value[campos[i].chave];
  let dif_perc = ((valor_novo - valor_antigo) / valor_antigo) * 100;
  let dif_unit = valor_novo - valor_antigo;

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

  const sufixo = campos[i].chave.split("_").at(-1);

  let valor_antigo_esq, valor_novo_esq, dif_perc_esq, dif_unit_esq;
  let valor_antigo_dir, valor_novo_dir, dif_perc_dir, dif_unit_dir;

  if (sufixo === "esq") {
    valor_antigo_esq = valor_antigo;
    valor_novo_esq = valor_novo;
    dif_perc_esq =
      ((valor_novo_esq - valor_antigo_esq) / valor_antigo_esq) * 100;
    dif_unit_esq = valor_novo_esq - valor_antigo_esq;
  } else if (sufixo === "dir") {
    valor_antigo_dir = valor_antigo;
    valor_novo_dir = valor_novo;
    dif_perc_dir =
      ((valor_novo_dir - valor_antigo_dir) / valor_antigo_dir) * 100;
    dif_unit_dir = valor_novo_dir - valor_antigo_dir;
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
        campos[i].valor = valoresAvaliacao[campos[i].chave];
      } else if (campos[i].destino === "tabela") {
        // de onde viria o valor aqui?
        // campos[i][campos[i].chave] = avaliacao[campos[i].chave];
        campos[i].valor = avaliacao[campos[i].chave];
      }
      campos[i].valor = formatarValor(campos[i].tipo_html, campos[i].valor);

      resultado.push(campos[i]);
    }
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
