import { TemplateService } from "../services/template.service.js";

export async function initTemplateForm(onNavigate) {
  const form = document.getElementById("form-template");
  const inputName = document.getElementById("input-name-template");
  const inputDesc = document.getElementById("input-description-template");
  const inputDate = document.getElementById("input-date-template");
  const btnCancel = document.getElementById("btn-cancel-template");
  const headerTitle = document.getElementById("header-title-alt");

  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;

  // Formata a data de hoje no padrão exigido pelo input date (YYYY-MM-DD)
  const agora = new Date();
  const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

  const editId = localStorage.getItem("editTemplateId");

  if (form) form.reset();

  // Ativa Skeletons
  if (inputName) inputName.classList.add("skeleton");
  if (inputDesc) inputDesc.classList.add("skeleton");
  if (inputDate) inputDate.classList.add("skeleton");

  if (btnSave) {
    btnSave.classList.add("skeleton-button");
    btnSave.disabled = false;
    btnSave.innerText = editId ? "Atualizar" : "Salvar";
  }

  // Lógica de Edição vs Criação
  if (editId) {
    if (headerTitle) headerTitle.innerText = "Editar Template";

    try {
      const template = await TemplateService.getById(editId);
      if (inputName) inputName.value = template.nome;
      if (inputDesc) inputDesc.value = template.descricao;
      // Puxa do banco ou faz fallback para hoje
      if (inputDate) inputDate.value = template.data_registro || hoje;
    } catch (err) {
      console.error("Erro na edição", err);
      alert("Erro ao buscar dados do template.");
    } finally {
      inputName?.classList.remove("skeleton");
      inputDesc?.classList.remove("skeleton");
      inputDate?.classList.remove("skeleton");
      btnSave?.classList.remove("skeleton-button");
    }
  } else {
    // Modo Criação
    if (headerTitle) headerTitle.innerText = "Criar Template";
    if (inputDate) inputDate.value = hoje;

    inputName?.classList.remove("skeleton");
    inputDesc?.classList.remove("skeleton");
    inputDate?.classList.remove("skeleton");
    btnSave?.classList.remove("skeleton-button");
  }

  // Envio (Submit)
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      const templateData = {
        nome: inputName.value,
        descricao: inputDesc.value,
        data_registro: inputDate.value,
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
        if (onNavigate) onNavigate("templates");
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
      if (onNavigate) onNavigate("templates");
    };
  }
}
