async function initTemplateForm() {
  const form = document.getElementById("form-template");
  const inputName = document.getElementById("input-name-template");
  const inputDesc = document.getElementById("input-description-template");
  const btnCancel = document.getElementById("btn-cancel-template");
  const headerTitle = document.getElementById("header-title-alt");

  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;

  // 1. FAXINA E ESTADO INICIAL
  const editId = localStorage.getItem("editTemplateId");

  if (form) form.reset();

  // Ativa Skeletons
  if (inputName) inputName.classList.add("skeleton");
  if (inputDesc) inputDesc.classList.add("skeleton");
  if (btnSave) {
    btnSave.classList.add("skeleton-button");
    btnSave.disabled = false;
    btnSave.innerText = editId ? "Atualizar" : "Salvar";
  }

  // 2. LÓGICA DE EDIÇÃO VS CRIAÇÃO
  if (editId) {
    if (headerTitle) headerTitle.innerText = "Editar Template";

    try {
      const template = await TemplateService.getById(editId);
      if (inputName) inputName.value = template.nome;
      if (inputDesc) inputDesc.value = template.descricao;
    } catch (err) {
      console.error("Erro na edição", err);
      alert("Erro ao buscar dados do template.");
    } finally {
      // Remove skeletons após carregar
      inputName?.classList.remove("skeleton");
      inputDesc?.classList.remove("skeleton");
      btnSave?.classList.remove("skeleton-button");
    }
  } else {
    // Modo Criação
    if (headerTitle) headerTitle.innerText = "Criar Template";
    inputName?.classList.remove("skeleton");
    inputDesc?.classList.remove("skeleton");
    btnSave?.classList.remove("skeleton-button");
  }

  // 3. ENVIO (SUBMIT)
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const templateData = {
        nome: inputName.value,
        descricao: inputDesc.value,
      };

      try {
        if (btnSave) {
          btnSave.innerText = "Salvando...";
          btnSave.disabled = true;
        }

        if (editId) {
          await TemplateService.update(editId, templateData);
        } else {
          await TemplateService.create(templateData);
        }

        localStorage.removeItem("editTemplateId");
        roteador("templates");
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

  if (btnCancel) {
    btnCancel.onclick = () => {
      localStorage.removeItem("editTemplateId");
      roteador("templates");
    };
  }
}
