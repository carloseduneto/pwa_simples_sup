import { initInputGroupedForms } from "./body-assests-ui.component.js";
import { BodyAvaliacoesService } from "./body-avaliacoes.service.js";
import { BodySchemaService } from "./body-schema.service.js";
import { gerarGrupoInputs } from "./body-input-group.component.js"; // Faltava esta importação
import { aplicarMascaraDecimal } from "./body-assests-ui.component.js";

export async function initBodyAssessmentForm(onNavigate) {
  const form = document.getElementById("form-body-assessment-container");
  const selectElement = document.getElementById("body-schema-select");
  const containerItens = document.querySelector(".form-body-assessment-itens");
  const headerTitle = document.getElementById("header-title-alt");

  // Captura o botão de salvar e o de cancelar
  // Captura o botão de salvar
  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;

  const btnCancel = form
    ? form.querySelector(".default-form-button--cancel")
    : null;

  // ============================================================
  // 1. FAXINA GERAL (Ressuscita a tela)
  // ============================================================
  if (form) {
    form.reset(); // Limpa textos velhos que ficaram nos inputs
  }

  if (btnSave) {
    btnSave.disabled = false; // Destrava o botão caso tenha travado no último save
    btnSave.innerText = "Salvar"; // Garante o texto padrão
    btnSave.classList.add("skeleton-button"); // Opcional: Volta o skeleton até carregar
  }

  selectElement.classList.add("form-body-assessment__select-option");
  // async function carregarEsquemas() {
  //   try {
  //     const esquemas = await BodySchemaService.getAll();

  //     esquemas.forEach((esquema) => {
  //       const option = document.createElement("option");
  //       option.value = esquema.id;
  //       option.textContent = esquema.name;
  //       // Armazena o JSON original do banco no próprio elemento da opção
  //       option.dataset.schema = JSON.stringify(esquema.schema);
  //       selectElement.appendChild(option);
  //     });

  //     // Se houver esquemas, já renderiza o primeiro automaticamente
  //     if (esquemas.length > 0) {
  //       renderizarFormulario(esquemas[0].schema);
  //     }
  //   } catch (error) {
  //     console.error("Erro ao carregar esquemas corporais:", error);
  //   }
  // }

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
          destino: campoDb.destino, // Inserção necessária aqui
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

  // Listener colocado dentro do escopo correto
  containerItens.addEventListener("input", (event) => {
    if (event.target.classList.contains("mask-decimal")) {
      aplicarMascaraDecimal(event.target);
    }
  });

  // Escuta as trocas no dropdown para renderizar um novo formulário se o usuário mudar a opção
  selectElement.addEventListener("change", (event) => {
    const selectedOption = event.target.selectedOptions[0];
    if (selectedOption && selectedOption.dataset.schema) {
      const schemaJson = JSON.parse(selectedOption.dataset.schema);
      renderizarFormulario(schemaJson);
    }
  });

  // ============================================================
  // 3. LÓGICA DE EDIÇÃO VS CRIAÇÃO
  // ============================================================

  // O editId precisará ser capturado no início do controller, similar ao exercise

  const editId = localStorage.getItem("editBodyAssessmentId");

  async function carregarEsquemas() {
    try {
      // Limpa as opções velhas antes de desenhar as novas
      selectElement.innerHTML = "";
      
      const esquemas = await BodySchemaService.getAll();

      esquemas.forEach((esquema) => {
        const option = document.createElement("option");
        option.value = esquema.id;
        option.textContent = esquema.name;
        option.dataset.schema = JSON.stringify(esquema.schema);
        selectElement.appendChild(option);
      });

      // Passo 1: Desenhar a estrutura base
      // Se houver editId, usaremos o esquema dele. Por enquanto, assumimos o primeiro.
      // (Mais abaixo vamos ajustar caso a avaliação salva use outro esquema).
      if (esquemas.length > 0) {
        renderizarFormulario(esquemas[0].schema);
      }

      // Passo 2: Se for edição, buscar dados e preencher a tela desenhada
      if (editId) {
        await iniciarModoEdicao();
      } else {
        iniciarModoCriacao();
      }
    } catch (error) {
      console.error("Erro ao carregar esquemas corporais:", error);
    }
  }

  function iniciarModoCriacao() {
    if (headerTitle) headerTitle.innerText = "Nova Avaliação";
    if (btnSave) {
      btnSave.classList.remove("skeleton-button");
      btnSave.innerText = "Salvar";
    }

    // Preenchimento automático da data atual
    const inputData = document.getElementById("body-assessment-data_registro");

    if (inputData) {
      const hoje = new Date();
      const ano = hoje.getFullYear();

      // getMonth começa do zero (Janeiro é 0). Somamos 1.
      // padStart(2, "0") garante que o número terá 2 casas, preenchendo com zero à esquerda se precisar.
      const mes = String(hoje.getMonth() + 1).padStart(2, "0");
      const dia = String(hoje.getDate()).padStart(2, "0");

      // Monta a string exata que o HTML exige: "2026-03-05"
      inputData.value = `${ano}-${mes}-${dia}`;
    }
  }

  function configurarBotoesEdicao() {
    if (headerTitle) headerTitle.innerText = "Editar Avaliação";
    if (btnSave) {
      setTimeout(() => {
        btnSave.classList.remove("skeleton-button");
        btnSave.innerText = "Atualizar";
      }, 300);
    }
  }

  async function iniciarModoEdicao() {
    configurarBotoesEdicao();

    try {
      // 1. Busca os dados no banco
      const avaliacao = await BodyAvaliacoesService.getById(editId);

      if (!avaliacao) {
        throw new Error("Avaliação não encontrada");
      }

      // 2. Sincroniza o "Select" do modelo para exibir o correto
      if (selectElement.value !== avaliacao.schema_id.toString()) {
        selectElement.value = avaliacao.schema_id;

        // Dispara manualmente a troca de formulário para garantir
        // que os inputs certos estão na tela antes de preenchê-los.
        const optionSelecionada = selectElement.selectedOptions[0];
        if (optionSelecionada && optionSelecionada.dataset.schema) {
          const schemaJson = JSON.parse(optionSelecionada.dataset.schema);
          renderizarFormulario(schemaJson);
        }
      }

      // 3. O Preenchimento (Distribuição)
      // Captura todos os inputs renderizados na tela atual
      const inputs = containerItens.querySelectorAll("input, select");

      inputs.forEach((input) => {
        // const chave = input.id;
        if(!input.name) return;

        const chave = input.name; // Agora o "name" é a chave que liga ao banco de dados

        
        const destino = input.dataset.destino;

        if (!chave || !destino) return;

        let valorRecuperado = null;

        // Triagem reversa: onde buscar o valor no objeto recebido do banco?
        if (destino === "tabela") {
          valorRecuperado = avaliacao[chave];
        } else if (destino === "json" && avaliacao.value) {
          valorRecuperado = avaliacao.value[chave];
        }

        // Se encontrou um valor, formata (se necessário) e injeta no HTML
        if (valorRecuperado !== null && valorRecuperado !== undefined) {
          if (chave === "data_registro") {
            // O input type="date" exige o formato 'YYYY-MM-DD'.
            // Se o banco retornar com hora, quebra a string no 'T'.
            input.value = valorRecuperado.split("T")[0];
          } else if (input.classList.contains("mask-decimal")) {
            // O banco manda float (83.5). O Brasil lê com vírgula (83,5).
            input.value = valorRecuperado.toString().replace(".", ",");
          } else {
            // Para textos normais
            input.value = valorRecuperado;
          }
        }
      });
    } catch (err) {
      console.error("Erro na edição", err);
      alert("Erro ao buscar dados para edição.");
    }
    // Removi o 'finally' do skeleton do nome, pois aqui não há um 'inputName' único como no exercício.
  }

  // Configura botão para modo criação imediatamente
  if (btnSave) {
    btnSave.classList.remove("skeleton-button");
    btnSave.innerText = "Salvar";
  }

  // ============================================================
  // 4. ENVIO DO FORMULÁRIO (SUBMIT)
  // ============================================================
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      // Estrutura base esperada pelo banco de dados
      const payload = {
        schema_id: selectElement.value, // Fundamental para o relacionamento no banco
        value: {}, // Aqui entrarão os dados biométricos
      };

      // Captura todos os inputs e selects dentro da área de itens do formulário
      const inputs = containerItens.querySelectorAll("input, select");

      inputs.forEach((input) => {
        const chave = input.id;
        const destino = input.dataset.destino;
        let valorPreenchido = input.value.trim();

        // Ignora campos sem ID ou sem destino definido
        if (!chave || !destino) return;

        // Tratamento de dados: converte vazios para null e trata números decimais
        if (valorPreenchido === "") {
          valorPreenchido = null;
        } else if (input.classList.contains("mask-decimal")) {
          // O banco de dados em JSON exige float com ponto (83.5), e não vírgula (83,5)
          valorPreenchido = parseFloat(valorPreenchido.replace(",", "."));
        }

        // Triagem: direciona para o lugar correto no payload
        if (destino === "tabela") {
          payload[chave] = valorPreenchido;
        } else if (destino === "json") {
          payload.value[chave] = valorPreenchido;
        }
      });

      // Validação básica: garantir que a data e o avaliador foram preenchidos
      if (!payload.data_registro || !payload.avaliador) {
        alert("Preencha os dados básicos (Data e Avaliador).");
        return;
      }

      try {
        if (btnSave) {
          btnSave.innerText = "Salvando...";
          btnSave.disabled = true;
        }

        if (editId) {
          await BodyAvaliacoesService.update(editId, payload);
          alert("Avaliação Física atualizada com sucesso!");
        } else {
          await BodyAvaliacoesService.create(payload);
          alert("Avaliação Física criada com sucesso!");
        }

        localStorage.removeItem("editBodyAssessmentId");
        if (onNavigate) onNavigate("bodyAssessmentList");
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar: " + err.message);

        if (btnSave) {
          btnSave.innerText = editId ? "Atualizar" : "Salvar";
          btnSave.disabled = false;
        }
      }
    };
  }

  // ============================================================
  // 5. BOTÃO CANCELAR
  // ============================================================
  if (btnCancel) {
    btnCancel.onclick = () => {
      // É CRUCIAL limpar o ID aqui, senão a próxima "criação" vira "edição"
      localStorage.removeItem("editBodyAssessmentId");
      if (onNavigate) onNavigate("bodyAssessmentList");
    };
  }

  carregarEsquemas();
}
