export function calcularFaulkner(dobras) {
  const {
    dobra_tricipital,
    dobra_subescapular,
    dobra_suprailiaca,
    dobra_abdominal,
  } = dobras;

  // Validação para garantir que temos todos os números necessários
  if (
    dobra_tricipital == null ||
    dobra_subescapular == null ||
    dobra_suprailiaca == null ||
    dobra_abdominal == null
  ) {
    console.warn("Dados insuficientes para calcular Faulkner.");
    return null;
  }

  const somaDobras =
    dobra_tricipital + dobra_subescapular + dobra_suprailiaca + dobra_abdominal;

  // A fórmula: (Soma * 0.153) + 5.783
  const percentualGordura = somaDobras * 0.153 + 5.783;

  return parseFloat(percentualGordura.toFixed(2));
}
