import {
  calcularPollock7Dobras,
  calcularPollock3Dobras,
  calcularFaulkner,
  calcularEvans3Dobras,
  calcularEvans7Dobras,
} from "../../utilities/calcularPercentualGordura.js";

// Constante temporária de fallback enquanto a tela de preferências não é criada
const METODO_BF_PADRAO = "evans_7";

export const BodyMetricsUtil = {
  getAge(birthDateString, assessmentDateString) {
    if (!birthDateString) return 25;
    const birth = new Date(birthDateString);
    const assessment = new Date(assessmentDateString);
    let age = assessment.getFullYear() - birth.getFullYear();
    const m = assessment.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && assessment.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  processAssessment(assessment, userContext) {
    const values =
      typeof assessment.value === "string"
        ? JSON.parse(assessment.value)
        : assessment.value;
    const age = this.getAge(
      userContext.data_nascimento,
      assessment.data_registro,
    );
    const gender = userContext.sexo || "M";

    const peso = parseFloat(values.peso) || 0;
    const altura = parseFloat(values.altura) || 0;

    const dobras = {
      dobra_tricipital: parseFloat(values.dobra_tricipital),
      dobra_subescapular: parseFloat(values.dobra_subescapular),
      dobra_suprailiaca: parseFloat(values.dobra_suprailiaca),
      dobra_abdominal: parseFloat(values.dobra_abdominal),
      dobra_peitoral: parseFloat(values.dobra_peitoral),
      dobra_axilar_media: parseFloat(values.dobra_axilar_media),
      dobra_coxa: parseFloat(values.dobra_coxa),
    };

    let bf = null;
    let metodoBf = null;
    let origem_bf = "dados_ausentes";

    // Aqui interceptamos a preferência do usuário (se existir) ou usamos o padrão
    const metodoEscolhido =
      userContext?.preferences?.bf_method_calculate || METODO_BF_PADRAO;

    // Roteamento para a fórmula correta com base na configuração
    switch (metodoEscolhido) {
      case "pollock_7":
        bf = calcularPollock7Dobras(dobras, age, gender);
        metodoBf = "Pollock 7";
        break;
      case "pollock_3":
        bf = calcularPollock3Dobras(dobras, age, gender);
        metodoBf = "Pollock 3";
        break;
      case "faulkner":
        bf = calcularFaulkner(dobras);
        metodoBf = "Faulkner";
        break;
      case "evans_3":
        bf = calcularEvans3Dobras(dobras, age, gender);
        metodoBf = "Evans 3";
        break;
      case "evans_7":
        bf = calcularEvans7Dobras(dobras, age, gender);
        metodoBf = "Evans 7";
        break;
      default:
        console.warn(
          `Método de BF desconhecido: ${metodoEscolhido}. Usando Pollock 7 como fallback.`,
        );
        bf = calcularPollock7Dobras(dobras, age, gender);
    }

    // Se o método escolhido falhar (ex: dobras incompletas para Pollock 3), tentamos resgatar o valor salvo no banco
    if (bf !== null && !isNaN(bf)) {
      origem_bf = "calculado";
    } else if (values.gordura) {
      bf = parseFloat(values.gordura);
      origem_bf = "registro_banco";
    } else {
      bf = 0; // Prevenção contra NaN em caso de total ausência de dados
    }

    const fm = peso * (bf / 100);
    const lbm = peso - fm;
    const ffmi = altura > 0 ? lbm / (altura * altura) : 0;

    return {
      ...assessment,
      metrics: {
        weight: peso,
        height: altura,
        bf: bf,
        fm: fm,
        lbm: lbm,
        ffmi: ffmi,
        origem_bf: origem_bf,
        metodo_bf: metodoBf,
      },
    };
  },
};
