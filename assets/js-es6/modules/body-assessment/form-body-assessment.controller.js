import { initInputGroupedForms } from "./body-assests-ui.component.js";
import { BodyAvaliacoesService } from "./body-avaliacoes.service.js";
import { BodySchemaService } from "./body-schema.service.js";
import { gerarGrupoInputs } from "./body-input-group.component.js"; // Faltava esta importação

export function initBodyAssessmentForm() {
  const selectElement = document.getElementById("body-schema-select");
  const containerItens = document.querySelector(".form-body-assessment-itens");

  selectElement.classList.add("form-body-assessment__select-option");
  async function carregarEsquemas() {
    try {
      const esquemas = await BodySchemaService.getAll();

      esquemas.forEach((esquema) => {
        const option = document.createElement("option");
        option.value = esquema.id;
        option.textContent = esquema.name;
        // Armazena o JSON original do banco no próprio elemento da opção
        option.dataset.schema = JSON.stringify(esquema.schema);
        selectElement.appendChild(option);
      });

      // Se houver esquemas, já renderiza o primeiro automaticamente
      if (esquemas.length > 0) {
        renderizarFormulario(esquemas[0].schema);
      }
    } catch (error) {
      console.error("Erro ao carregar esquemas corporais:", error);
    }
  }

  function renderizarFormulario(schemaJson) {
    // 1. Limpa o formulário caso o usuário troque de modelo no select
    containerItens.innerHTML = "";

    // 2. Mapeamento: converte a estrutura do Banco para a estrutura do Gerador
    // 2. Mapeamento: converte a estrutura do Banco para a estrutura do Gerador
    const htmlCompleto = schemaJson
      .map((secaoDb) => {
        const parametrosMapeados = secaoDb.campos.map((campoDb) => ({
          id: campoDb.chave,
          label: campoDb.label,
          tipo: campoDb.tipo_html || "text", // Corrigido para repassar o tipo corretamente
          layout: campoDb.layout || "input-short", // Novo
          // step: campoDb.step || null, // Novo
          unidade: campoDb.unidade || "",
          mascara: campoDb.unidade || "",
        }));

        // 3. Executa o gerador com os dados traduzidos
        return gerarGrupoInputs({
          titulo: secaoDb.secao,
          retratil: secaoDb.retratil,
          parametros: parametrosMapeados,
        });
      })
      .join("");

    // 4. Injeta tudo na tela
    containerItens.innerHTML = htmlCompleto;

    // 5. Aciona os scripts de comportamento (abrir/fechar abas) para o HTML que acabou de nascer
    initInputGroupedForms();
  }

  // Escuta as trocas no dropdown para renderizar um novo formulário se o usuário mudar a opção
  selectElement.addEventListener("change", (event) => {
    const selectedOption = event.target.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.schema) {
      const schemaJson = JSON.parse(selectedOption.dataset.schema);
      renderizarFormulario(schemaJson);
    }
  });

  carregarEsquemas();
  
}
