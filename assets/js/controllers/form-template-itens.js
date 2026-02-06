async function initTemplateItensForm() {
  // --- 1. REFERÊNCIAS ---
  const form = document.getElementById("form-template-itens");
  const selectGroup = document.getElementById("select-muscle-group");
  const selectExercise = document.getElementById("select-exercise");
  const switchDynamic = document.getElementById("switch-dynamic");

  // Containers e Inputs
  const containerStatic = document.getElementById("container-static");
  const containerDynamic = document.getElementById("container-dynamic");
  const inputSeries = document.getElementById("input-series");
  const inputReps = document.getElementById("input-reps");
  const selectRec = document.getElementById("select-recommendation");
  const inputTech = document.getElementById("input-technique");

  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;
  const headerTitle = document.getElementById("header-title-alt"); // Título do header

  // IDs de Controle
  const editItemId = localStorage.getItem("editTemplateItem"); // ID do ITEM (Tabela template_itens)

  // ADICIONE ISSO PARA DEBUGAR:
  // console.log("🛠️ DEBUG EDIÇÃO:", {
  //   editItemId: editItemId,
  //   tipo: typeof editItemId,
  //   payloadEsperado: {
  //     id: Number(editItemId),
  //   },
  // });

  const parentTemplateId = localStorage.getItem("currentTemplateId");

  // --- 2. PREPARAÇÃO VISUAL ---
  if (btnSave) {
    btnSave.disabled = false;
    btnSave.innerText = editItemId ? "Atualizar Item" : "Salvar Item";
  }

  // Lógica do Switch (Dinâmico vs Estático)
  const toggleDynamicMode = () => {
    const isDynamic = switchDynamic.checked;
    if (isDynamic) {
      containerStatic.classList.add("hidden");
      containerDynamic.classList.remove("hidden");
    } else {
      containerStatic.classList.remove("hidden");
      containerDynamic.classList.add("hidden");
    }
  };

  // Carrega exercícios ao mudar o grupo
  const loadExercises = async (groupId, selectedExerciseId = null) => {
    selectExercise.innerHTML = "<option>Carregando...</option>";
    selectExercise.disabled = true;
    try {
      const exercicios = await ExerciseService.getByMuscleGroup(groupId);
      selectExercise.innerHTML =
        '<option value="" selected>Selecione o exercício</option>';

      exercicios.forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.id;
        opt.innerText = ex.nome;
        selectExercise.appendChild(opt);
      });

      selectExercise.disabled = false;

      // Se estiver editando, seleciona o exercício correto
      if (selectedExerciseId) {
        selectExercise.value = selectedExerciseId;
      }
    } catch (error) {
      console.error(error);
      selectExercise.innerHTML = "<option>Erro ao carregar</option>";
    }
  };

  // --- 3. CARREGAMENTO INICIAL DOS DADOS ---

  // A) Carrega Grupos Musculares
  try {
    const grupos = await MuscleGroupService.getAll();
    selectGroup.innerHTML =
      '<option value="" disabled selected>Selecione o grupo</option>';
    grupos.forEach(g => {
      selectGroup.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
    });
  } catch (err) {
    console.error("Erro grupos", err);
  }

  // B) Carrega Recomendações (CORREÇÃO DO ERRO 7)
  try {
    if (typeof TreinoRecomendacoesService !== "undefined") {
      const recs = await TreinoRecomendacoesService.getAll();
      selectRec.innerHTML =
        '<option value="" selected>Selecione o tipo...</option>';
      selectRec.innerHTML += `<option value="auto">Automático</option>`;

      recs.forEach(r => {
        selectRec.innerHTML += `<option value="${r.id}">${r.name}</option>`;
      });
    }
  } catch (err) {
    console.error("Erro recomendações", err);
  }

  // C) MODO EDIÇÃO (CORREÇÃO DO ERRO 9)
  if (editItemId) {
    if (headerTitle) headerTitle.innerText = "Editar Item do Treino";

    try {
      // Busca o item específico pelo ID
      const itemData = await TemplateItensService.getByIdSingle(editItemId);

      if (itemData) {
        // 1. Preenche dados do exercício
        if (itemData.exercicios && itemData.exercicios.grupo_muscular) {
          selectGroup.value = itemData.exercicios.grupo_muscular;
          // Carrega a lista de exercícios e seleciona o correto
          await loadExercises(
            itemData.exercicios.grupo_muscular,
            itemData.exercicio_id,
          );
        }

        // 2. Preenche Técnica
        inputTech.value = itemData.tecnica_intensificacao || "";

        // 3. Preenche Estático ou Dinâmico
        if (itemData.treino_recomendacoes) {
          // É dinâmico
          switchDynamic.checked = true;
          toggleDynamicMode();
          selectRec.value = itemData.treino_recomendacoes;
        } else {
          // É estático
          switchDynamic.checked = false;
          toggleDynamicMode();
          inputSeries.value = itemData.series_alvo || "";
          inputReps.value = itemData.repeticoes_alvo || "";
        }
      }
    } catch (err) {
      console.error("Erro ao carregar item para edição:", err);
      alert("Erro ao carregar dados.");
    }
  } else {
    if (headerTitle) headerTitle.innerText = "Adicionar Exercício";
  }

  // --- 4. LISTENERS ---
  selectGroup.onchange = () => {
    if (selectGroup.value) loadExercises(selectGroup.value);
  };
  switchDynamic.onchange = toggleDynamicMode;

  window.voltarParaItens = () => {
    localStorage.removeItem("editTemplateItem");
    roteador("templateItens", parentTemplateId);
  };

  // --- 5. SALVAR (CORREÇÃO DO ERRO 8) ---
  form.onsubmit = async e => {
    e.preventDefault();

    if (!selectExercise.value) {
      alert("Selecione um exercício!");
      return;
    }

    // 1. MONTAGEM DO PAYLOAD (Dados limpos)
    // Nota: Não incluímos template_id no objeto base para evitar conflitos no update
    const payload = {
      exercicio_id: Number(selectExercise.value),
      tecnica_intensificacao: inputTech.value || null,
    };

    // 2. LÓGICA DE LIMPEZA (Séries/Reps vs Recomendação)
    if (switchDynamic.checked) {
      // Modo Dinâmico: Salva recomendação e anula o resto
      payload.treino_recomendacoes = selectRec.value
        ? Number(selectRec.value)
        : null;
      payload.series_alvo = null;
      payload.repeticoes_alvo = null;
    }else if (switchDynamic.checked && selectRec.value === "auto")   {
      // Modo Dinâmico Automático: Salva recomendação automática e anula o resto
      payload.treino_recomendacoes = null;
      payload.series_alvo = null;
      payload.repeticoes_alvo = null;
    } else {
      // Modo Fixo: Salva séries/reps e anula recomendação
      payload.series_alvo = inputSeries.value
        ? Number(inputSeries.value)
        : null;
      payload.repeticoes_alvo = inputReps.value || null;
      payload.treino_recomendacoes = null;
    }

    // Debug rápido: Veja no F12 se o payload está saindo com os dados certos
    console.log("Payload para salvar:", payload);

    try {
      btnSave.disabled = true;
      btnSave.innerText = "Salvando...";

      if (editItemId) {
        // --- ATUALIZAÇÃO ---
        await TemplateItensService.update(editItemId, payload);
      } else {
        // --- CRIAÇÃO ---
        // Na criação, precisamos incluir o template_id
        payload.template_id = Number(parentTemplateId);

        const itensAtuais =
          await TemplateItensService.getByid(parentTemplateId);
        const maiorOrdem = itensAtuais.reduce(
          (max, i) => (i.ordem > max ? i.ordem : max),
          0,
        );
        payload.ordem = maiorOrdem + 1;

        await TemplateItensService.create(payload);
      }

      alert("Salvo com sucesso!");
      voltarParaItens();
    } catch (error) {
      console.error("Erro no salvamento:", error);
      alert("Erro ao salvar: " + error.message);
      btnSave.disabled = false;
      btnSave.innerText = editItemId ? "Atualizar Item" : "Salvar Item";
    }
  };
}
window.initTemplateItensForm = initTemplateItensForm;
