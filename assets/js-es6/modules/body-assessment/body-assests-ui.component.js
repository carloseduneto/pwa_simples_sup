let isInitialized = false;

export function initInputGroupedForms() {
  if (isInitialized) return;

  document.addEventListener("click", (event) => {
    const retractableArea = event.target.closest(
      ".input-grouped-form__retractable-area",
    );

    if (!retractableArea) return;

    const container = retractableArea.closest(".input-grouped-form");
    if (container) {
      container.classList.toggle("is-open");
    }
  });

  isInitialized = true;
}

export function aplicarMascaraDecimal(input) {
  let valor = input.value.replace(/\D/g, ""); // Remove tudo o que não é dígito

  // Transforma em decimal (ex: 183 -> 1.83)
  valor = (parseInt(valor) / 100).toFixed(2);

  if (isNaN(valor)) {
    input.value = "";
    return;
  }

  // Converte para o formato brasileiro (vírgula)
  input.value = valor.replace(".", ",");
}