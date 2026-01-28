async function initExerciseForm() {
  const form = document.getElementById("form-exercise");
  const inputName = document.getElementById("input-name");
  const selectGroup = document.getElementById("input-group");
  const btnCancel = document.querySelector(".default-form-button--cancel");
  const headerTitle = document.getElementById("header-title-alt");

  // Captura o botão de salvar
  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;

  // Variável de edição
  const editId = localStorage.getItem("editExerciseId");

  // ============================================================
  // 1. FAXINA GERAL E RESSUSCITAÇÃO (Estado Inicial)
  // ============================================================
  if (form) {
    form.reset(); // Limpa textos antigos
  }

  // Ativa Skeleton Visualmente
  if (inputName) inputName.classList.add("skeleton");
  if (selectGroup) selectGroup.classList.add("skeleton");
  if (btnSave) btnSave.classList.add("skeleton-button");

  // --- CORREÇÃO CRÍTICA AQUI ---
  // Antes estava: if (btnSave && !editId).
  // Isso impedia que o botão fosse destravado no modo edição.
  // Agora: Destrava SEMPRE ao iniciar a tela.
  if (btnSave) {
    btnSave.disabled = false;
    btnSave.style.opacity = "1";
    // O texto será definido mais abaixo (Salvar ou Atualizar)
  }

  // ============================================================
  // 2. CARREGAR GRUPOS MUSCULARES
  // ============================================================
  try {
    const grupos = await MuscleGroupService.getAll();

    if (selectGroup) {
      selectGroup.innerHTML =
        '<option value="" disabled selected>Grupo Muscular</option>';

      grupos.forEach((grupo) => {
        const option = document.createElement("option");
        option.value = grupo.id;
        option.textContent = grupo.nome;
        selectGroup.appendChild(option);
      });

      // Remove skeleton do select após carregar
      setTimeout(() => {
        selectGroup.classList.remove("skeleton");
      }, 300);
    }
  } catch (err) {
    console.error("Erro ao carregar grupos", err);
    if (selectGroup) {
      selectGroup.classList.remove("skeleton");
      selectGroup.innerHTML = "<option disabled>Erro ao carregar</option>";
    }
  }

  // ============================================================
  // 3. LÓGICA DE EDIÇÃO VS CRIAÇÃO
  // ============================================================

  if (editId) {
    // --- MODO EDIÇÃO ---
    if (headerTitle) headerTitle.innerText = "Editar Exercício";

    // Configura botão para modo edição
    if (btnSave) {
      // Delay visual pequeno para o usuário não ver o texto piscando
      setTimeout(() => {
        btnSave.classList.remove("skeleton-button");
        btnSave.innerText = "Atualizar";
      }, 300);
    }

    try {
      const exercicio = await ExerciseService.getById(editId);

      if (inputName) inputName.value = exercicio.nome;

      if (exercicio.grupo_muscular && selectGroup) {
        selectGroup.value = exercicio.grupo_muscular;
      }
    } catch (err) {
      console.error("Erro na edição", err);
      alert("Erro ao buscar dados para edição.");
    } finally {
      if (inputName) inputName.classList.remove("skeleton");
    }
  } else {
    // --- MODO CRIAÇÃO ---
    if (headerTitle) headerTitle.innerText = "Criar Exercício";

    // Configura botão para modo criação imediatamente
    if (btnSave) {
      btnSave.classList.remove("skeleton-button");
      btnSave.innerText = "Salvar";
    }

    // Remove skeleton do nome imediatamente
    if (inputName) inputName.classList.remove("skeleton");
  }

  // ============================================================
  // 4. ENVIO DO FORMULÁRIO (SUBMIT)
  // ============================================================
  if (form) {
    // Garante que o evento anterior seja substituído
    form.onsubmit = async (e) => {
      e.preventDefault();

      if (!inputName.value) {
        alert("O nome é obrigatório");
        return;
      }

      const formData = {
        nome: inputName.value,
        grupo_muscular: selectGroup.value === "" ? null : selectGroup.value,
      };

      try {
        // Bloqueia o botão para evitar clique duplo
        if (btnSave) {
          btnSave.innerText = "Salvando...";
          btnSave.disabled = true;
        }

        if (editId) {
          await ExerciseService.update(editId, formData);
          alert("Exercício atualizado com sucesso!");
        } else {
          await ExerciseService.create(formData);
          alert("Exercício criado com sucesso!");
        }

        // Sucesso: Limpa ID e sai
        localStorage.removeItem("editExerciseId");
        roteador("exercises");
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar: " + err.message);

        // ERRO: Reativa o botão para o usuário tentar de novo
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
      localStorage.removeItem("editExerciseId");
      roteador("exercises");
    };
  }
}
