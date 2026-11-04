import { WeightTrackingService } from "./wt.service.js";
import { aplicarMascaraDecimal } from "../body-assessment/body-assests-ui.component.js";

export async function initWeightTrackingForm(onNavigate) {
  const form = document.getElementById("form-weight-tracking-container");
  const headerTitle = document.getElementById("header-title-alt");
  const inputDate = document.getElementById("wt-input-date");
  const inputTime = document.getElementById("wt-input-time");
  const inputPeso = document.getElementById("wt-input-peso");

  if (!form) return;

  const btnSave = form.querySelector(".default-form-button--save");
  const btnCancel = form.querySelector(".default-form-button--cancel");

  // Função auxiliar que garante a navegação mesmo se onNavigate não for passado pelo router
  function voltarParaLista() {
    localStorage.removeItem("editWeightTrackingId");
    if (typeof onNavigate === "function") {
      onNavigate("weightTrackingList");
    } else if (btnCancel) {
      // Dispara o clique no botão cancelar que já possui data-route="weightTrackingList"
      btnCancel.click();
    }
  }

  // ============================================================
  // 1. FAXINA GERAL
  // ============================================================
  form.reset();

  if (btnSave) {
    btnSave.disabled = false;
    btnSave.innerText = "Salvar";
    btnSave.classList.add("skeleton-button");
  }

  // ============================================================
  // 2. MÁSCARA DECIMAL NO INPUT DE PESO
  // ============================================================
  if (inputPeso) {
    inputPeso.oninput = (event) => {
      if (typeof aplicarMascaraDecimal === "function") {
        aplicarMascaraDecimal(event.target);
      } else {
        event.target.value = event.target.value
          .replace(/[^0-9.,]/g, "")
          .replace(".", ",");
      }
    };
  }

  // ============================================================
  // 3. LÓGICA DE EDIÇÃO VS CRIAÇÃO
  // ============================================================
  const editId = localStorage.getItem("editWeightTrackingId");

  if (editId) {
    await iniciarModoEdicao(editId);
  } else {
    iniciarModoCriacao();
  }

  function iniciarModoCriacao() {
    if (headerTitle) headerTitle.innerText = "Novo peso";

    if (btnSave) {
      btnSave.classList.remove("skeleton-button");
      btnSave.innerText = "Salvar";
    }

    const { dateStr, timeStr } = extractLocalDateTime(new Date());
    if (inputDate) inputDate.value = dateStr;
    if (inputTime) inputTime.value = timeStr;
  }

  async function iniciarModoEdicao(id) {
    if (headerTitle) headerTitle.innerText = "Editar peso";

    try {
      const registro = await WeightTrackingService.getById(id);

      if (!registro) {
        throw new Error("Registro de peso não encontrado.");
      }

      if (registro.data_registro) {
        const { dateStr, timeStr } = extractLocalDateTime(
          new Date(registro.data_registro),
        );
        if (inputDate) inputDate.value = dateStr;
        if (inputTime) inputTime.value = timeStr;
      }

      if (registro.peso !== null && registro.peso !== undefined && inputPeso) {
        inputPeso.value = Number(registro.peso).toFixed(2).replace(".", ",");
      }
    } catch (err) {
      console.error("Erro ao carregar pesagem para edição:", err);
      alert("Erro ao buscar dados para edição.");
      voltarParaLista();
    } finally {
      if (btnSave) {
        btnSave.classList.remove("skeleton-button");
        btnSave.innerText = "Atualizar";
      }
    }
  }

  // ============================================================
  // 4. ENVIO DO FORMULÁRIO (SUBMIT)
  // ============================================================
  form.onsubmit = async (e) => {
    e.preventDefault();

    const dateVal = inputDate ? inputDate.value.trim() : "";
    const timeVal = inputTime ? inputTime.value.trim() : "00:00";
    const pesoRaw = inputPeso ? inputPeso.value.trim() : "";

    const pesoNumerico = parseFloat(pesoRaw.replace(",", "."));

    if (!dateVal || !timeVal || isNaN(pesoNumerico) || pesoNumerico <= 0) {
      alert("Preencha uma data, hora e um peso válido.");
      return;
    }

    const dataRegistroIso = new Date(`${dateVal}T${timeVal}:00`).toISOString();

    const payload = {
      peso: pesoNumerico,
      data_registro: dataRegistroIso,
    };

    try {
      if (btnSave) {
        btnSave.innerText = "Salvando...";
        btnSave.disabled = true;
      }

      if (editId) {
        await WeightTrackingService.update(editId, payload);
        alert("Peso atualizado com sucesso!");
      } else {
        await WeightTrackingService.create(payload);
        alert("Peso registrado com sucesso!");
      }

      voltarParaLista();
    } catch (err) {
      console.error("Erro ao salvar pesagem:", err);
      alert("Erro ao salvar: " + err.message);
    } finally {
      // Garante que o botão sempre destrave mesmo se a rota demorar ou falhar
      if (btnSave) {
        btnSave.innerText = editId ? "Atualizar" : "Salvar";
        btnSave.disabled = false;
      }
    }
  };

  // ============================================================
  // 5. BOTÃO CANCELAR
  // ============================================================
  if (btnCancel) {
    btnCancel.onclick = () => {
      localStorage.removeItem("editWeightTrackingId");
      if (typeof onNavigate === "function") {
        onNavigate("weightTrackingList");
      }
    };
  }
}

function extractLocalDateTime(dateObj) {
  const ano = dateObj.getFullYear();
  const mes = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dia = String(dateObj.getDate()).padStart(2, "0");
  const hora = String(dateObj.getHours()).padStart(2, "0");
  const min = String(dateObj.getMinutes()).padStart(2, "0");

  return {
    dateStr: `${ano}-${mes}-${dia}`,
    timeStr: `${hora}:${min}`,
  };
}
