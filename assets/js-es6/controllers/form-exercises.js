import { ExerciseService } from "../services/exercise.service.js";
import { MuscleGroupService } from "../services/muscle-group.service.js";

export async function initExerciseForm(onNavigate) {
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

  const selectMainMuscle = document.getElementById("input-main-muscle");
  const selectSecondaryMuscles = document.getElementById(
    "input-secondary-muscles",
  );

  if (selectMainMuscle) selectMainMuscle.classList.add("skeleton");
  if (selectSecondaryMuscles) selectSecondaryMuscles.classList.add("skeleton");

  // Regra de negócio: Ocultar/Desabilitar músculo principal nos secundários
  const updateSecondaryOptions = () => {
    if (!selectMainMuscle || !selectSecondaryMuscles) return;
    const mainVal = selectMainMuscle.value;

    const checkboxes = selectSecondaryMuscles.querySelectorAll(
      'input[type="checkbox"]',
    );
    checkboxes.forEach((cb) => {
      if (cb.value === mainVal && mainVal !== "") {
        cb.disabled = true;
        cb.checked = false;
        cb.parentElement.style.opacity = "0.4";
      } else {
        cb.disabled = false;
        cb.parentElement.style.opacity = "1";
      }
    });
  };

  if (selectMainMuscle) {
    selectMainMuscle.addEventListener("change", updateSecondaryOptions);
  }

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
    const [grupos, musculosGranulares] = await Promise.all([
      MuscleGroupService.getAll(),
      ExerciseService.getGranularMuscles(),
    ]);

    if (selectGroup) {
      selectGroup.innerHTML =
        '<option value="" disabled selected>Grupo Muscular</option>';
      grupos.forEach((grupo) => {
        const option = document.createElement("option");
        option.value = grupo.id;
        option.textContent = grupo.nome;
        selectGroup.appendChild(option);
      });
      setTimeout(() => selectGroup.classList.remove("skeleton"), 300);
    }

    if (selectMainMuscle && selectSecondaryMuscles) {
      selectMainMuscle.innerHTML =
        '<option value="" disabled selected>Músculo principal</option>';
      selectSecondaryMuscles.innerHTML = "";

      musculosGranulares.forEach((musculo) => {
        const optMain = document.createElement("option");
        optMain.value = musculo.id;
        optMain.textContent = musculo.nome;
        selectMainMuscle.appendChild(optMain);

        const label = document.createElement("label");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "8px";
        label.style.fontSize = "1rem";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = musculo.id;

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(musculo.nome));
        selectSecondaryMuscles.appendChild(label);
      });

      setTimeout(() => {
        selectMainMuscle.classList.remove("skeleton");
        selectSecondaryMuscles.classList.remove("skeleton");
      }, 300);
    }
  } catch (err) {
    console.error("Erro ao carregar dados", err);
    if (selectGroup) selectGroup.classList.remove("skeleton");
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

        if (exercicio.musculo_exercicio) {
          const principal = exercicio.musculo_exercicio.find(
            (m) => m.tipo === "principal",
          );
          const secundarios = exercicio.musculo_exercicio
            .filter((m) => m.tipo === "secundario")
            .map((m) => m.musculo_granular_id.toString());

          if (principal && selectMainMuscle) {
            selectMainMuscle.value = principal.musculo_granular_id;
            updateSecondaryOptions();
          }

          if (selectSecondaryMuscles) {
            const checkboxes = selectSecondaryMuscles.querySelectorAll(
              'input[type="checkbox"]',
            );
            checkboxes.forEach((cb) => {
              if (secundarios.includes(cb.value)) {
                cb.checked = true;
              }
            });
          }
        }
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

      if (!selectMainMuscle.value) {
        alert("A seleção de um músculo principal é obrigatória");
        return;
      }

      const formData = {
        nome: inputName.value,
        grupo_muscular: selectGroup.value === "" ? null : selectGroup.value,
      };

      const musculosRelations = [];
      musculosRelations.push({
        musculo_granular_id: parseInt(selectMainMuscle.value),
        tipo: "principal",
      });

      const checkedSecundarios = selectSecondaryMuscles.querySelectorAll(
        'input[type="checkbox"]:checked',
      );
      checkedSecundarios.forEach((cb) => {
        musculosRelations.push({
          musculo_granular_id: parseInt(cb.value),
          tipo: "secundario",
        });
      });

      try {
        if (btnSave) {
          btnSave.innerText = "Salvando...";
          btnSave.disabled = true;
        }

        if (editId) {
          await ExerciseService.update(editId, formData, musculosRelations);
          alert("Exercício atualizado com sucesso!");
        } else {
          await ExerciseService.create(formData, musculosRelations);
          alert("Exercício criado com sucesso!");
        }

        // Sucesso: Limpa ID e sai
        localStorage.removeItem("editExerciseId");
        if (onNavigate) onNavigate("exercises");
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
      if (onNavigate) onNavigate("exercises");
    };
  }
}

// window.initExerciseForm = initExerciseForm;
