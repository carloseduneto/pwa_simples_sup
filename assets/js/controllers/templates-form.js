async function initTemplateForm() {
  const form = document.getElementById("form-template");
  const inputName = document.getElementById("input-name-template");
  const inputDesc = document.getElementById("input-description-template");
  const btnCancel = document.getElementById("btn-cancel-template");
  const headerTitle = document.getElementById("header-title-alt");

  // 1. Verificar se é Edição (usando uma chave específica para templates)
  const editId = localStorage.getItem("editTemplateId");

  if (editId) {
    if (headerTitle) headerTitle.innerText = "Editar Template";
    const btnSave = form.querySelector(".default-form-button--save");
    if (btnSave) btnSave.innerText = "Atualizar";

    try {
      // Corrigido: Chamando TemplateService em vez de ExerciseService
      const template = await TemplateService.getById(editId);
      inputName.value = template.nome;
      inputDesc.value = template.descricao;
    } catch (err) {
      console.error("Erro ao carregar template:", err);
    }
  }

  // 2. Lógica de Envio (Submit)
  form.onsubmit = async (e) => {
    e.preventDefault();

    const templateData = {
      nome: inputName.value,
      descricao: inputDesc.value,
    };

    try {
      if (editId) {
        await TemplateService.update(editId, templateData);
      } else {
        await TemplateService.create(templateData);
      }

      localStorage.removeItem("editTemplateId");
      roteador("templates"); // Volta para a listagem
    } catch (err) {
      alert("Erro ao salvar template");
      console.error(err);
    }
  };

  if (btnCancel) {
    btnCancel.onclick = () => {
      localStorage.removeItem("editTemplateId");
      roteador("templates");
    };
  }
}
