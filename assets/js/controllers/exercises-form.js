async function initExerciseForm() {
  const form = document.getElementById("form-exercise");
  const inputName = document.getElementById("input-name");
  const selectGroup = document.getElementById("input-group");
  const btnCancel = document.querySelector(".default-form-button--cancel");

  // --- NOVO: Captura o título do Header ---
  const headerTitle = document.getElementById("header-title-alt");

  // Limpa o select inicialmente
  selectGroup.innerHTML =
    '<option value="" disabled selected>Carregando...</option>';

  // 1. Carregar Grupos ... (Código igual ao anterior) ...
  try {
    const grupos = await MuscleGroupService.getAll();
    selectGroup.innerHTML =
      '<option value="" disabled selected>Grupo Muscular</option>';
    grupos.forEach((grupo) => {
      const option = document.createElement("option");
      option.value = grupo.id;
      option.textContent = grupo.nome;
      selectGroup.appendChild(option);
    });
  } catch (err) {
    console.error("Erro grupos", err);
  }

  // 2. Verificar se é Edição
  const editId = localStorage.getItem("editExerciseId");

  if (editId) {
    // --- NOVO: SE TEM ID, É EDIÇÃO ---
    if (headerTitle) headerTitle.innerText = "Editar Exercício";

    // Mudar também o texto do botão de salvar (Opcional, mas fica chique)
    const btnSave = form.querySelector(".default-form-button--save");
    if (btnSave) btnSave.innerText = "Atualizar";

    // ... Resto da lógica de buscar dados ...
    try {
      const exercicio = await ExerciseService.getById(editId);
      inputName.value = exercicio.nome;
      if (exercicio.grupo_muscular)
        selectGroup.value = exercicio.grupo_muscular;
    } catch (err) {
      console.error(err);
    }
  } else {
    // --- NOVO: SE NÃO TEM ID, É CRIAÇÃO ---
    // Garante que o texto volte ao normal (caso você venha de uma edição anterior)
    if (headerTitle) headerTitle.innerText = "Criar Exercício";

    const btnSave = form.querySelector(".default-form-button--save");
    if (btnSave) btnSave.innerText = "Salvar";
  }

  // ... Resto do código (Listeners de submit e cancel) ...
  form.onsubmit = async (e) => {
    // ... seu código de salvar ...
  };

  if (btnCancel) {
    btnCancel.onclick = () => {
      localStorage.removeItem("editExerciseId");
      roteador("exercises");
    };
  }
}
