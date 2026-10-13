import { calcularPollock7Dobras } from "../../utilities/calcularPercentualGordura.js";

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

    let bf = 0;
    let origem_bf = "dados_ausentes";

    const bfPollock = calcularPollock7Dobras(dobras, age, gender);
    if (bfPollock !== null) {
      bf = bfPollock;
      origem_bf = "pollock_7";
    } else if (values.gordura) {
      bf = parseFloat(values.gordura);
      origem_bf = "registro_banco";
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
      },
    };
  },
};
