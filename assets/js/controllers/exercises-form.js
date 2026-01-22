async function initExerciseForm() {
  const form = document.getElementById("form-exercise");
  const inputName = document.getElementById("input-name");
  const selectGroup = document.getElementById("input-group");
  const btnCancel = document.querySelector(".default-form-button--cancel");
  const headerTitle = document.getElementById("header-title-alt");
  // Captura o botão de salvar logo no início
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
  // Ativa Skeleton
  if (inputName) inputName.classList.add("skeleton");
  if (selectGroup) selectGroup.classList.add("skeleton");
  if (btnSave) btnSave.classList.add("skeleton-button");

  // --- CORREÇÃO CRÍTICA: RESSUSCITA O BOTÃO ---
  // Se o botão ficou travado como "Salvando..." da vez anterior, destrava agora.
  if (btnSave && !editId) {
    btnSave.classList.remove("skeleton-button");
    btnSave.disabled = false;
    btnSave.innerText = "Salvar"; // Texto padrão
    btnSave.style.opacity = "1"; // Garante visualmente
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
    if (headerTitle) 
      inputName.innerHTML = ""
      headerTitle.innerText = "";
    headerTitle.innerText = "Editar Exercício";
    setTimeout(() => {
            btnSave.classList.remove("skeleton-button");
            if (btnSave) btnSave.innerText = "Atualizar";
          }, 300);

    try {
      const exercicio = await ExerciseService.getById(editId);

      if (inputName) inputName.value = exercicio.nome;

      if (exercicio.grupo_muscular && selectGroup) {
        selectGroup.value = exercicio.grupo_muscular;
      }
    } catch (err) {
      console.error("Erro na edição", err);
      alert("Erro ao buscar dados.");
    } finally {
      if (inputName) inputName.classList.remove("skeleton");
    }
  } else {
    // --- MODO CRIAÇÃO ---
    if (headerTitle) headerTitle.innerText = "Criar Exercício";
    if (btnSave) btnSave.innerText = "Salvar";

    // Remove skeleton do nome imediatamente (não estamos esperando dados)
    if (inputName) inputName.classList.remove("skeleton");
  }

  // ============================================================
  // 4. ENVIO DO FORMULÁRIO (SUBMIT)
  // ============================================================
  if (form) {
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
          alert("Salvo com sucesso!");
        } else {
          await ExerciseService.create(formData);
          alert("Criado com sucesso!");
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
