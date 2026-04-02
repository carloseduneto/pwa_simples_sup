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

export function calcularPollock7Dobras(dobras, idade, sexo) {
  const {
    dobra_tricipital,
    dobra_subescapular,
    dobra_suprailiaca,
    dobra_abdominal,
    dobra_peitoral,
    dobra_axilar_media,
    dobra_coxa
  } = dobras;

  // Validação de dados obrigatórios
  const campos = [dobra_tricipital, dobra_subescapular, dobra_suprailiaca, dobra_abdominal, dobra_peitoral, dobra_axilar_media, dobra_coxa, idade];
  if (campos.some(valor => valor == null || isNaN(valor)) || !sexo) {
    console.warn("Dados insuficientes ou inválidos para calcular Pollock 7 Dobras.");
    return null;
  }

  const S = dobra_tricipital + dobra_subescapular + dobra_suprailiaca + dobra_abdominal + dobra_peitoral + dobra_axilar_media + dobra_coxa;
  let densidadeCorporal;

  if (sexo.toLowerCase() === 'masculino' || sexo.toLowerCase() === 'm') {
    // Equação de Pollock para homens (7 dobras)
    densidadeCorporal = 1.112 - (0.00043499 * S) + (0.00000055 * (S ** 2)) - (0.00028826 * idade);
  } else {
    // Equação de Pollock para mulheres (7 dobras)
    densidadeCorporal = 1.097 - (0.00046971 * S) + (0.00000056 * (S ** 2)) - (0.00012828 * idade);
  }

  // Equação de Siri para converter Densidade em Percentual de Gordura
  const percentualGordura = ((4.95 / densidadeCorporal) - 4.50) * 100;

  return parseFloat(percentualGordura.toFixed(2));
}