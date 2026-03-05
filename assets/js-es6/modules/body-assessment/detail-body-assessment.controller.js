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
