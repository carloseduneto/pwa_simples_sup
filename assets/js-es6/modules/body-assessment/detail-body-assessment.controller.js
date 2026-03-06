// assets\js-es6\modules\body-assessment\detail-body-assessment.controller.js

import { GlobalLoader } from "../../ui/global-loader.js";
import { initInputGroupedForms } from "./body-assests-ui.component.js";
import { BodyAvaliacoesService } from "./body-avaliacoes.service.js";
import { BodySchemaService } from "./body-schema.service.js";
import { gerarGrupoInputs } from "./body-input-group.component.js";

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

    // 4. Cruzamento e Renderização
    const htmlCompleto = esquemaUsado.schema
      .map((secaoDb) => {
        const parametrosMapeados = secaoDb.campos.map((campoDb) => {
          // Lógica de extração: Onde está o dado desta chave?
          let valorRecuperado = null;

          
          
          if (campoDb.destino === "tabela") {
            valorRecuperado = avaliacao[campoDb.chave];
          } else if (campoDb.destino === "json" && avaliacao.value) {
            valorRecuperado = avaliacao.value[campoDb.chave];
          }
          const camposAgrupados = agruparCampos(secaoDb.campos, valorRecuperado.value);
          console.log("Campos agrupados", camposAgrupados);

          // Formatação amigável para leitura
          if (valorRecuperado !== null && valorRecuperado !== undefined) {
            if (campoDb.tipo_html === "date") {
              // Converte YYYY-MM-DD para DD/MM/YYYY
              valorRecuperado = valorRecuperado
                .split("T")[0]
                .split("-")
                .reverse()
                .join("/");
            } else if (typeof valorRecuperado === "number") {
              // Troca ponto por vírgula na exibição
              valorRecuperado = valorRecuperado.toString().replace(".", ",");
            }
          }

          // Entrega o pacote pronto para o componente de leitura
          return {
            label: campoDb.label,
            valor: valorRecuperado,
            unidade: campoDb.unidade || "",
          };
        });

        return gerarGrupoInputs({
          titulo: secaoDb.secao,
          retratil: secaoDb.retratil,
          parametros: parametrosMapeados,
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
}

function agruparCampos(campos, valoresAvaliacao) {
  const jaProcessados = {};
  const resultado = [];
  
  for (let i = 0; i < campos.length; i++) {
    if (campos[i].par) {
      if (campos[i].par in jaProcessados) {
        // // o que fazer aqui?
        // mini_json={}
        // item_mini_json = * body_schema.schema.label_par será uma chave de id
        // item_mini_json = *  body_schema.schema.step
        // item_mini_json = * body_schema.schema.layout
        // item_mini_json = * body_schema.schema.destino
        // item_mini_json = * body_schema.schema.unidade
        // item_mini_json = * body_schema.schema.tipo_html
        // item_mini_json = * se body_avaliacoes.value = body_schema.schema.chave item_mini_json =  → Regista em uma chave nova chamada valor_dir ou valor_esq (extraído do último termo da chave de body_avaliacoes.value que pode ter sufixo _esq ou _dir)
        // append.jaProcessados(item_mini_json)

        // if ("esq" in campos[i].valor) {
          //   valor_esquerda = campos[i].valor;
        //   jaProcessados[campos[i].par].valor_esq(valor_esquerda)
        // } else {
          //   valor_direita = campos[i].valor;
          //   jaProcessados[campos[i].par].valor_esq(valor_direita)
          // }
          

        

        jaProcessados[campos[i].par].chaves.push(campos[i].chave);

      } else {

        const novoGrupo = {
          label_par: campos[i].label_par,
          unidade: campos[i].unidade,
          tipo: campos[i].tipo,
          valor_esq: sufixo === "esq" ? valor : null,
          valor_dir: sufixo === "dir" ? valor : null,
          chaves: [],
        };

        const sufixo = campos[i].chave.split("_").at(-1);

        if (campos[i].label = valoresAvaliacao.campos[i].label && sufixo === "esq"){
          valor_esq = valoresAvaliacao.campos[i].label;
        }else{
          valor_dir = valoresAvaliacao.campos[i].label;
        }
          // Aqui registra o nome do par de membros para futuras consultas em iterações do for
          jaProcessados[campos[i].par] = novoGrupo;

        // Adiciona as chaves do campos já processados
        jaProcessados[campos[i].par].chaves.push(campos[i].chave);

        resultado.push(novoGrupo);

        //deve ter um jeito certo de fazer isso, tô usando a lógica apenas


      }

      // append.jaProcessados(resultado)
    } else {
      // campo simples, sem par
      // o que fazer aqui?
      // Mantém os valores do jeito que tá mesmo, não faz nenhum tratamento
      // append.resultadot(mantidos)
      resultado.push(campos[i]);
    }
  }

  return resultado;
}
