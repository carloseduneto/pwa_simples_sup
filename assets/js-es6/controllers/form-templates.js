// assets\js-es6\controllers\form-templates.js

import { TemplateService } from "../services/template.service.js";

export async function initTemplateForm(onNavigate) {
  const form = document.getElementById("form-template");
  const inputName = document.getElementById("input-name-template");
  const inputDesc = document.getElementById("input-description-template");
  const inputDate = document.getElementById("input-date-template");
  const inputCategory = document.getElementById("input-category-template");
  const btnCancel = document.getElementById("btn-cancel-template");
  const headerTitle = document.getElementById("header-title-alt");

  const btnSave = form
    ? form.querySelector(".default-form-button--save")
    : null;

  // Formata a data de hoje no padrão exigido pelo input date (YYYY-MM-DD)
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const ano = agora.getFullYear();
  const hojeIso = `${ano}-${mes}-${dia}`;
  const dataAbreviada = `${dia}/${mes}`;

  const editId = localStorage.getItem("editTemplateId");

  if (form) form.reset();

  // Ativa Skeletons
  if (inputName) inputName.classList.add("skeleton");
  if (inputDesc) inputDesc.classList.add("skeleton");
  if (inputDate) inputDate.classList.add("skeleton");
  if (inputCategory) inputCategory.classList.add("skeleton");

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
      if (inputDate) inputDate.value = template.data_registro || hojeIso;
      if (inputCategory) inputCategory.value = template.categoria || "fixo";
    } catch (err) {
      console.error("Erro na edição", err);
      alert("Erro ao buscar dados do template.");
    } finally {
      inputName?.classList.remove("skeleton");
      inputDesc?.classList.remove("skeleton");
      inputDate?.classList.remove("skeleton");
      inputCategory?.classList.remove("skeleton");
      btnSave?.classList.remove("skeleton-button");
    }
  } else {
    // Modo Criação
    if (headerTitle) headerTitle.innerText = "Criar Template";
    if (inputDate) inputDate.value = hojeIso;

    inputName?.classList.remove("skeleton");
    inputDesc?.classList.remove("skeleton");
    inputDate?.classList.remove("skeleton");
    inputCategory?.classList.remove("skeleton");
    btnSave?.classList.remove("skeleton-button");
  }

  // Envio (Submit)
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();

      let nomeFinal = inputName.value.trim();
      const categoriaValue = inputCategory ? inputCategory.value : "fixo";

      // Preenchimento automático para treinos avulsos sem nome
      if (!nomeFinal) {
        if (categoriaValue === "avulso") {
          nomeFinal = `Treino Avulso - ${dataAbreviada}`;
        } else {
          alert("Por favor, defina um nome para o seu Treino Fixo.");
          inputName.focus();
          return;
        }
      }

      const templateData = {
        nome: nomeFinal,
        descricao: inputDesc.value,
        data_registro: inputDate.value,
        categoria: categoriaValue,
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
