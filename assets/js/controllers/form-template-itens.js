async function initTemplateItensForm() {
  // --- 1. REFERÊNCIAS ---
  const form = document.getElementById("form-template-itens");
  const selectGroup = document.getElementById("select-muscle-group");

  // NOVAS REFERÊNCIAS
  const inputSearch = document.getElementById("input-exercise-search");
  const inputHiddenId = document.getElementById("input-exercise-id");
  const resultsList = document.getElementById("list-exercise-results");

  let allExercisesCache = []; // Memória dos exercícios

  // Referências UI padrão
  const switchDynamic = document.getElementById("switch-dynamic");
  const containerStatic = document.getElementById("container-static");
  const containerDynamic = document.getElementById("container-dynamic");
  const inputSeries = document.getElementById("input-series");
  const inputReps = document.getElementById("input-reps");
  const selectRec = document.getElementById("select-recommendation");
  const inputTech = document.getElementById("input-technique");
  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;
  const headerTitle = document.getElementById("header-title-alt");
  const editItemId = localStorage.getItem("editTemplateItem");
  const parentTemplateId = localStorage.getItem("currentTemplateId");

  if (btnSave) {
    btnSave.disabled = false;
    btnSave.innerText = editItemId ? "Atualizar Item" : "Salvar Item";
  }

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

  // --- [NOVO] FUNÇÃO MÁGICA: Cria exercício instantaneamente ---
  const createQuickExercise = async (nomeExercicio) => {
    const groupId = selectGroup.value;
    if (!groupId) return alert("Selecione um grupo muscular primeiro.");

    // 1. UI OTIMISTA (Snappy): Finge que já deu certo antes da API responder
    inputSearch.value = nomeExercicio;
    resultsList.classList.add("hidden");
    inputSearch.classList.add("loading-pulse"); // (Opcional) Classe CSS pra dar feedback

    try {
      // 2. Chama API em background
      const result = await ExerciseService.create({
        nome: nomeExercicio,
        grupo_muscular: Number(groupId),
      });

      // Supabase retorna array no insert
      const novoExercicio = result[0] || result.data[0];

      // 3. Consolida os dados reais
      allExercisesCache.push(novoExercicio); // Adiciona ao cache local
      inputHiddenId.value = novoExercicio.id; // Vincula o ID real

      // Feedback sutil de sucesso (opcional: piscar borda verde)
      inputSearch.style.borderColor = "#4CAF50";
      setTimeout(() => (inputSearch.style.borderColor = ""), 1000);
    } catch (error) {
      console.error(error);
      alert("Erro ao criar exercício rápido. Tente novamente.");
      inputHiddenId.value = ""; // Reverte em caso de erro
      inputSearch.value = "";
    } finally {
      inputSearch.classList.remove("loading-pulse");
    }
  };

  // --- [NOVO] Renderiza a lista com a opção "Criar" ---
  const renderList = (list) => {
    resultsList.innerHTML = "";
    const termo = inputSearch.value.trim();

    // Cenário 1: Lista Vazia + Termo digitado = Oferecer Cadastro
    if (list.length === 0 && termo.length > 2) {
      resultsList.classList.remove("hidden");

      const li = document.createElement("li");
      // Estilização inline pra garantir o destaque laranja
      li.innerHTML = `Não encontrado. <span style="color: var(--highlight-text); font-weight: bold;">Adicionar "${termo}"?</span>`;
      li.style.cursor = "pointer";
      li.style.padding = "10px";

      li.onclick = (e) => {
        e.stopPropagation(); // Evita fechar a lista antes da hora
        createQuickExercise(termo); // Chama a função mágica
      };

      resultsList.appendChild(li);
      return;
    }

    // Cenário 2: Nada encontrado e texto curto
    if (list.length === 0) {
      resultsList.classList.add("hidden");
      return;
    }

    // Cenário 3: Lista normal
    list.forEach((ex) => {
      const li = document.createElement("li");
      li.innerText = ex.nome;
      li.onclick = () => selectItem(ex);
      resultsList.appendChild(li);
    });

    resultsList.classList.remove("hidden");
  };

  const selectItem = (exercise) => {
    inputSearch.value = exercise.nome;
    inputHiddenId.value = exercise.id;
    resultsList.classList.add("hidden");
  };

  const loadExercises = async (groupId, selectedId = null) => {
    inputSearch.value = "Carregando...";
    inputSearch.disabled = true;
    inputHiddenId.value = "";
    resultsList.classList.add("hidden");

    try {
      const exercicios = await ExerciseService.getByMuscleGroup(groupId);
      allExercisesCache = exercicios;

      inputSearch.value = "";
      inputSearch.disabled = false;
      inputSearch.placeholder = "Digite para buscar ou adicionar..."; // Placeholder atualizado

      if (selectedId) {
        const found = exercicios.find((ex) => ex.id == selectedId);
        if (found) selectItem(found);
      }
    } catch (error) {
      console.error(error);
      inputSearch.value = "Erro ao carregar";
    }
  };

  // --- EVENTOS DO INPUT ---
  inputSearch.addEventListener("input", (e) => {
    const termo = e.target.value.toLowerCase();
    inputHiddenId.value = "";

    // Filtra
    const filtrados = allExercisesCache.filter((ex) =>
      ex.nome.toLowerCase().includes(termo),
    );
    renderList(filtrados);
  });

  inputSearch.addEventListener("focus", () => {
    if (inputSearch.value === "") {
      renderList(allExercisesCache);
    } else {
      inputSearch.dispatchEvent(new Event("input"));
    }
  });

  document.addEventListener("click", (e) => {
    if (!inputSearch.contains(e.target) && !resultsList.contains(e.target)) {
      resultsList.classList.add("hidden");
    }
  });

  // --- CARREGAMENTO INICIAL ---
  try {
    const grupos = await MuscleGroupService.getAll();
    selectGroup.innerHTML =
      '<option value="" disabled selected>Selecione o grupo</option>';
    grupos.forEach((g) => {
      selectGroup.innerHTML += `<option value="${g.id}">${g.nome}</option>`;
    });
  } catch (err) {
    console.error("Erro grupos", err);
  }

  try {
    if (typeof TreinoRecomendacoesService !== "undefined") {
      const recs = await TreinoRecomendacoesService.getAll();
      selectRec.innerHTML =
        '<option value="" selected>Selecione o tipo...</option><option value="auto">Automático</option>';
      recs.forEach(
        (r) =>
          (selectRec.innerHTML += `<option value="${r.id}">${r.name}</option>`),
      );
    }
  } catch (err) {
    console.error("Erro recs", err);
  }
  
  if (editItemId) {
    form.reset();
    inputSearch.classList.remove("disable-input");
    if (headerTitle) headerTitle.innerText = "Editar Item do Treino";
    try {
      const itemData = await TemplateItensService.getByIdSingle(editItemId);
      if (itemData) {
        if (itemData.exercicios && itemData.exercicios.grupo_muscular) {
          selectGroup.value = itemData.exercicios.grupo_muscular;
          await loadExercises(
            itemData.exercicios.grupo_muscular,
            itemData.exercicio_id,
          );
        }
        inputTech.value = itemData.tecnica_intensificacao || "";
        if (itemData.treino_recomendacoes) {
          switchDynamic.checked = true;
          toggleDynamicMode();
          selectRec.value = itemData.treino_recomendacoes;
        } else {
          switchDynamic.checked = false;
          toggleDynamicMode();
          inputSeries.value = itemData.series_alvo || "";
          inputReps.value = itemData.repeticoes_alvo || "";
        }
      }
    } catch (err) {
      console.error("Erro edição", err);
    }
  } else {
    if (headerTitle) headerTitle.innerText = "Adicionar Exercício";
    inputSearch.classList.add("disable-input");
    inputSearch.placeholder = "Selecione um grupo muscular";
    form.reset();
  }

  // LISTENERS
  selectGroup.onchange = () => {
    inputSearch.classList.remove("disable-input");
    if (selectGroup.value) loadExercises(selectGroup.value);
  };
  switchDynamic.onchange = toggleDynamicMode;

  window.voltarParaItens = () => {
    localStorage.removeItem("editTemplateItem");
    roteador("templateItens", parentTemplateId);
  };

  form.onsubmit = async (e) => {
    e.preventDefault();

    if (!inputHiddenId.value) {
      alert("Por favor, selecione um exercício da lista ou crie um novo.");
      return;
    }

    const payload = {
      exercicio_id: Number(inputHiddenId.value),
      tecnica_intensificacao: inputTech.value || null,
    };

    if (switchDynamic.checked) {
      payload.treino_recomendacoes =
        selectRec.value && selectRec.value !== "auto"
          ? Number(selectRec.value)
          : null;
      payload.series_alvo = null;
      payload.repeticoes_alvo = null;
    } else {
      payload.series_alvo = inputSeries.value
        ? Number(inputSeries.value)
        : null;
      payload.repeticoes_alvo = inputReps.value || null;
      payload.treino_recomendacoes = null;
    }

    try {
      btnSave.disabled = true;
      btnSave.innerText = "Salvando...";

      if (editItemId) {
        await TemplateItensService.update(editItemId, payload);
      } else {
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
      console.error(error);
      alert("Erro ao salvar: " + error.message);
      btnSave.disabled = false;
      btnSave.innerText = editItemId ? "Atualizar Item" : "Salvar Item";
    }
  };
}

window.initTemplateItensForm = initTemplateItensForm;
