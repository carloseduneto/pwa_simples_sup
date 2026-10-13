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
    dobra_coxa,
  } = dobras;

  // Validação de dados obrigatórios
  const campos = [
    dobra_tricipital,
    dobra_subescapular,
    dobra_suprailiaca,
    dobra_abdominal,
    dobra_peitoral,
    dobra_axilar_media,
    dobra_coxa,
    idade,
  ];
  if (campos.some((valor) => valor == null || isNaN(valor)) || !sexo) {
    console.warn(
      "Dados insuficientes ou inválidos para calcular Pollock 7 Dobras.",
    );
    return null;
  }

  const S =
    dobra_tricipital +
    dobra_subescapular +
    dobra_suprailiaca +
    dobra_abdominal +
    dobra_peitoral +
    dobra_axilar_media +
    dobra_coxa;
  let densidadeCorporal;

  if (sexo.toLowerCase() === "masculino" || sexo.toLowerCase() === "m") {
    // Equação de Pollock para homens (7 dobras)
    densidadeCorporal =
      1.112 - 0.00043499 * S + 0.00000055 * S ** 2 - 0.00028826 * idade;
  } else {
    // Equação de Pollock para mulheres (7 dobras)
    densidadeCorporal =
      1.097 - 0.00046971 * S + 0.00000056 * S ** 2 - 0.00012828 * idade;
  }

  // Equação de Siri para converter Densidade em Percentual de Gordura
  const percentualGordura = (4.95 / densidadeCorporal - 4.5) * 100;

  return parseFloat(percentualGordura.toFixed(2));
}

export function calcularPollock3Dobras(dobras, idade, sexo) {
  const {
    dobra_peitoral,
    dobra_abdominal,
    dobra_coxa,
    dobra_tricipital,
    dobra_suprailiaca,
  } = dobras;

  let S;
  let densidadeCorporal;

  if (sexo.toLowerCase() === "masculino" || sexo.toLowerCase() === "m") {
    // Homens: Peitoral, Abdominal, Coxa
    if (
      dobra_peitoral == null ||
      dobra_abdominal == null ||
      dobra_coxa == null ||
      !idade
    ) {
      console.warn(
        "Dados insuficientes para calcular Pollock 3 Dobras (Masculino).",
      );
      return null;
    }
    S = dobra_peitoral + dobra_abdominal + dobra_coxa;
    densidadeCorporal =
      1.10938 - 0.0008267 * S + 0.0000016 * S ** 2 - 0.0002574 * idade;
  } else {
    // Mulheres: Tricipital, Suprailíaca, Coxa
    if (
      dobra_tricipital == null ||
      dobra_suprailiaca == null ||
      dobra_coxa == null ||
      !idade
    ) {
      console.warn(
        "Dados insuficientes para calcular Pollock 3 Dobras (Feminino).",
      );
      return null;
    }
    S = dobra_tricipital + dobra_suprailiaca + dobra_coxa;
    densidadeCorporal =
      1.0994921 - 0.0009929 * S + 0.0000023 * S ** 2 - 0.0001392 * idade;
  }

  const percentualGordura = (4.95 / densidadeCorporal - 4.5) * 100;
  return parseFloat(percentualGordura.toFixed(2));
}

export function calcularEvans3Dobras(dobras, idade, sexo) {
  const { dobra_tricipital, dobra_abdominal, dobra_coxa } = dobras;

  if (
    dobra_tricipital == null ||
    dobra_abdominal == null ||
    dobra_coxa == null ||
    !sexo
  ) {
    console.warn(
      "Dados insuficientes ou inválidos para calcular Evans 3 Dobras.",
    );
    return null;
  }

  const S = dobra_tricipital + dobra_abdominal + dobra_coxa;

  // Sexo na equação de Evans: 1 = Masculino, 0 = Feminino
  const isMasculino =
    sexo.toLowerCase() === "masculino" || sexo.toLowerCase() === "m" ? 1 : 0;

  // Raça na equação de Evans: 1 = Negro, 0 = Branco/Outro
  const raca = 0;

  // Fórmula de Evans (2000) para atletas (3 dobras)
  // %BF = 8,997 + (0,24658 * Soma3) - (6,343 * Sexo) - (1,998 * Raça)
  const percentualGordura =
    8.997 + 0.24658 * S - 6.343 * isMasculino - 1.998 * raca;

  return parseFloat(Math.max(percentualGordura, 2.0).toFixed(2));
}

export function calcularEvans7Dobras(dobras, idade, sexo) {
  const {
    dobra_tricipital,
    dobra_subescapular,
    dobra_suprailiaca,
    dobra_abdominal,
    dobra_peitoral,
    dobra_axilar_media,
    dobra_coxa,
  } = dobras;

  const campos = [
    dobra_tricipital,
    dobra_subescapular,
    dobra_suprailiaca,
    dobra_abdominal,
    dobra_peitoral,
    dobra_axilar_media,
    dobra_coxa,
  ];

  if (campos.some((valor) => valor == null || isNaN(valor)) || !sexo) {
    console.warn(
      "Dados insuficientes ou inválidos para calcular Evans 7 Dobras.",
    );
    return null;
  }

  const S =
    dobra_tricipital +
    dobra_subescapular +
    dobra_suprailiaca +
    dobra_abdominal +
    dobra_peitoral +
    dobra_axilar_media +
    dobra_coxa;

  // Sexo na equação de Evans: 1 = Masculino, 0 = Feminino
  const isMasculino =
    sexo.toLowerCase() === "masculino" || sexo.toLowerCase() === "m" ? 1 : 0;

  // Raça na equação de Evans: 1 = Negro, 0 = Branco/Outro
  const raca = 0;

  // Fórmula de Evans (2000) para atletas (7 dobras)
  // %BF = 10,566 + (0,12077 * Soma7) - (8,057 * Sexo) - (2,545 * Raça)
  const percentualGordura =
    10.566 + 0.12077 * S - 8.057 * isMasculino - 2.545 * raca;

  return parseFloat(Math.max(percentualGordura, 2.0).toFixed(2));
}
