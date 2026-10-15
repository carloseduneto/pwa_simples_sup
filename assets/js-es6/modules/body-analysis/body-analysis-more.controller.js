import {
  calcularPollock7Dobras,
  calcularFaulkner,
  calcularEvans7Dobras,
} from "../../utilities/calcularPercentualGordura.js";
import { BodyMetricsUtil } from "../body-assessment/body-metrics.util.js";

export class BodyMoreController {
  constructor() {
    this.radarChart = null;
    this.THRESHOLD_PERIMETER = 0.5;
    this.THRESHOLD_SKINFOLD = 1.0;
    this.MAX_ACCEPTABLE_IAD = 4.0; // 3% de assimetria máxima aceitável
  }

  render(assessments, userContext) {
    if (!assessments || assessments.length === 0) return;

    this.renderFormulaCards(assessments, userContext);
    this.renderSymmetryRadar(assessments);
    this.renderRegionalRollup(assessments);
  }

  extractSkinfolds(values) {
    return {
      dobra_tricipital: parseFloat(values.dobra_tricipital),
      dobra_subescapular: parseFloat(values.dobra_subescapular),
      dobra_suprailiaca: parseFloat(values.dobra_suprailiaca),
      dobra_abdominal: parseFloat(values.dobra_abdominal),
      dobra_peitoral: parseFloat(values.dobra_peitoral),
      dobra_axilar_media: parseFloat(values.dobra_axilar_media),
      dobra_coxa: parseFloat(values.dobra_coxa),
    };
  }

  calcSum7(dobras) {
    const vals = Object.values(dobras);
    if (vals.some((v) => v == null || isNaN(v))) return null;
    return vals.reduce((acc, curr) => acc + curr, 0);
  }

  formatDurationYearsMonths(d1, d2) {
    const totalMonths = Math.max(
      (d2.getFullYear() - d1.getFullYear()) * 12 +
        (d2.getMonth() - d1.getMonth()),
      0,
    );
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? "ano" : "anos"}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? "mês" : "meses"}`);

    return parts.length > 0 ? parts.join(" ") : "Menos de 1 mês";
  }

  // --- 1. CARDS DE FÓRMULAS E SOMATÓRIO DE DOBRAS ---
  renderFormulaCards(assessments, userContext) {
    const firstAsses = assessments[0];
    const lastAsses = assessments[assessments.length - 1];

    const firstValues =
      typeof firstAsses.value === "string"
        ? JSON.parse(firstAsses.value)
        : firstAsses.value;
    const lastValues =
      typeof lastAsses.value === "string"
        ? JSON.parse(lastAsses.value)
        : lastAsses.value;

    const gender = userContext?.sexo || "M";
    const firstAge = BodyMetricsUtil.getAge(
      userContext?.data_nascimento,
      firstAsses.data_registro,
    );
    const lastAge = BodyMetricsUtil.getAge(
      userContext?.data_nascimento,
      lastAsses.data_registro,
    );

    const firstDobras = this.extractSkinfolds(firstValues);
    const lastDobras = this.extractSkinfolds(lastValues);

    const pollockCurr = calcularPollock7Dobras(lastDobras, lastAge, gender);
    const pollockBase = calcularPollock7Dobras(firstDobras, firstAge, gender);

    const faulknerCurr = calcularFaulkner(lastDobras);
    const faulknerBase = calcularFaulkner(firstDobras);

    const evansCurr = calcularEvans7Dobras(lastDobras, lastAge, gender);
    const evansBase = calcularEvans7Dobras(firstDobras, firstAge, gender);

    const sum7Curr = this.calcSum7(lastDobras);
    const sum7Base = this.calcSum7(firstDobras);

    const d1 = new Date(firstAsses.data_registro);
    const baselineMonthYear = `${d1.toLocaleString("pt-BR", { month: "short" })}/${d1.getFullYear()}`;

    document.getElementById("more-bf-pollock").innerText =
      pollockCurr !== null ? `${pollockCurr.toFixed(2)}%` : "--%";
    document.getElementById("more-bf-faulkner").innerText =
      faulknerCurr !== null ? `${faulknerCurr.toFixed(2)}%` : "--%";
    document.getElementById("more-bf-evans").innerText =
      evansCurr !== null ? `${evansCurr.toFixed(2)}%` : "--%";
    document.getElementById("more-sum-dobras").innerText =
      sum7Curr !== null ? `${sum7Curr.toFixed(1)} mm` : "-- mm";

    if (assessments.length > 1) {
      document.getElementById("more-bf-pollock-comp").innerText =
        pollockBase !== null
          ? `era ${pollockBase.toFixed(2)}% em ${baselineMonthYear}`
          : "-";

      document.getElementById("more-bf-faulkner-comp").innerText =
        faulknerBase !== null
          ? `era ${faulknerBase.toFixed(2)}% em ${baselineMonthYear}`
          : "-";

      document.getElementById("more-bf-evans-comp").innerText =
        evansBase !== null
          ? `era ${evansBase.toFixed(2)}% em ${baselineMonthYear}`
          : "-";

      if (sum7Curr !== null && sum7Base !== null) {
        const diff = sum7Curr - sum7Base;
        const sign = diff > 0 ? "+" : "";
        document.getElementById("more-sum-dobras-comp").innerText =
          `${sign}${diff.toFixed(1)} mm desde ${baselineMonthYear}`;
      } else {
        document.getElementById("more-sum-dobras-comp").innerText = "-";
      }
    } else {
      document.getElementById("more-bf-pollock-comp").innerText =
        "Primeira avaliação";
      document.getElementById("more-bf-faulkner-comp").innerText =
        "Primeira avaliação";
      document.getElementById("more-bf-evans-comp").innerText =
        "Primeira avaliação";
      document.getElementById("more-sum-dobras-comp").innerText =
        "Primeira avaliação";
    }
  }

  // --- 2. GRÁFICO DE SIMETRIA BILATERAL (IAD %) ---
  // IAD = (|Direito - Esquerdo| / Média(D, E)) * 100
  calcIAD(leftVal, rightVal) {
    const l = parseFloat(leftVal);
    const r = parseFloat(rightVal);
    if (isNaN(l) || isNaN(r) || l <= 0 || r <= 0) return 0;
    const mean = (l + r) / 2;
    return parseFloat(((Math.abs(r - l) / mean) * 100).toFixed(2));
  }

  renderSymmetryRadar(assessments) {
    const canvas = document.getElementById("symmetryRadarChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (this.radarChart) this.radarChart.destroy();

    const lastAsses = assessments[assessments.length - 1];
    const v =
      typeof lastAsses.value === "string"
        ? JSON.parse(lastAsses.value)
        : lastAsses.value;

    const pairs = [
      {
        label: "Braço Cont.",
        esq: v.braco_contraido_esq,
        dir: v.braco_contraido_dir,
      },
      { label: "Antebraço", esq: v.antebraco_esq, dir: v.antebraco_dir },
      { label: "Coxa", esq: v.coxa_esq, dir: v.coxa_dir },
      { label: "Panturrilha", esq: v.panturrilha_esq, dir: v.panturrilha_dir },
      {
        label: "Braço Relax.",
        esq: v.braco_relaxado_esq,
        dir: v.braco_relaxado_dir,
      },
    ];

    const labels = pairs.map((p) => p.label);
    const iadData = pairs.map((p) => this.calcIAD(p.esq, p.dir));

    const thresholdLine = pairs.map(() => this.MAX_ACCEPTABLE_IAD);

    const maxDataVal = Math.max(...iadData, this.MAX_ACCEPTABLE_IAD);
    const scaleMax = Math.ceil(maxDataVal + 1);

    //Ordenar as labels e iadData com base nos valores de iadData em ordem decrescente
    const sortedPairs = pairs
      .map((p, index) => ({ label: p.label, iad: iadData[index] }))
      .sort((a, b) => b.iad - a.iad);

    this.radarChart = new Chart(ctx, {
      type: "radar",
      data: {
        labels: sortedPairs.map((p) => p.label),
        datasets: [
          {
            label: "Assimetria Atual (IAD %)",
            data: sortedPairs.map((p) => p.iad),
            borderColor: "#3B82F6",
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            borderWidth: 2,
            pointBackgroundColor: "#3B82F6",
            pointRadius: 3,
          },
          {
            label: "Limite Aceitável (4%)",
            data: thresholdLine,
            borderColor: "#EF4444",
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12 } },
        },
        scales: {
          r: {
            min: 0,
            max: scaleMax,
            angleLines: { color: "#E5E7EB" },
            grid: { color: "#E5E7EB" },
            pointLabels: {
              color: "#4B5563",
              font: { size: 11, weight: "500" },
            },
            ticks: {
              stepSize: 1,
              backdropColor: "transparent",
              color: "#9CA3AF",
              font: { size: 9 },
              callback: (val) => `${val}%`,
            },
          },
        },
      },
    });
  }

  // --- 3. ROLLUP DE VARIAÇÃO REGIONAL ---
  formatSingleDiff(diff, unit, threshold) {
    if (diff === null || isNaN(diff)) {
      return { text: `-- ${unit}`, cssClass: "rollup-val--neutral" };
    }

    const absDiff = Math.abs(diff);
    const signStr = diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;

    if (absDiff <= threshold) {
      return {
        text: `${diff === 0 ? "0.0" : signStr} ${unit}`,
        cssClass: "rollup-val--neutral",
      };
    }

    const arrow = diff > 0 ? "▲" : "▼";
    const colorClass = diff > 0 ? "rollup-val--blue" : "rollup-val--red";

    return {
      text: `${arrow} ${signStr} ${unit}`,
      cssClass: colorClass,
    };
  }

  formatPairDiff(diffEsq, diffDir, unit, threshold) {
    if (
      diffEsq === null ||
      isNaN(diffEsq) ||
      diffDir === null ||
      isNaN(diffDir)
    ) {
      return { text: `-- / -- ${unit}`, cssClass: "rollup-val--neutral" };
    }

    const strEsq =
      diffEsq > 0 ? `+${diffEsq.toFixed(1)}` : `${diffEsq.toFixed(1)}`;
    const strDir =
      diffDir > 0 ? `+${diffDir.toFixed(1)}` : `${diffDir.toFixed(1)}`;
    const meanDiff = (diffEsq + diffDir) / 2;
    const maxAbs = Math.max(Math.abs(diffEsq), Math.abs(diffDir));

    if (maxAbs <= threshold) {
      return {
        text: `${strEsq}/${strDir} ${unit}`,
        cssClass: "rollup-val--neutral",
      };
    }

    const arrow = meanDiff > 0 ? "▲" : meanDiff < 0 ? "▼" : "";
    const colorClass = meanDiff > 0 ? "rollup-val--blue" : "rollup-val--red";

    return {
      text: `${arrow} ${strEsq}/${strDir} ${unit}`,
      cssClass: colorClass,
    };
  }

  renderRegionalRollup(assessments) {
    const tbody = document.getElementById("regional-rollup-body");
    if (!tbody || assessments.length === 0) return;
    tbody.innerHTML = "";

    // O subtítulo geral continua usando o período total do histórico
    const subtitleEl = document.getElementById("rollup-period-subtitle");
    if (subtitleEl) {
      const d1 = new Date(assessments[0].data_registro);
      const d2 = new Date(assessments[assessments.length - 1].data_registro);
      subtitleEl.innerText = `${this.formatDurationYearsMonths(d1, d2)} vs. Baseline`;
    }

    // HELPER 1: Busca o PRIMEIRO valor válido (> 0) da chave no histórico
    const getFirstValid = (key) => {
      for (let i = 0; i < assessments.length; i++) {
        const v =
          typeof assessments[i].value === "string"
            ? JSON.parse(assessments[i].value)
            : assessments[i].value;
        const val = parseFloat(v[key]);
        if (!isNaN(val) && val > 0) return val;
      }
      return null;
    };

    // HELPER 2: Busca o ÚLTIMO valor válido (> 0) da chave no histórico
    const getLastValid = (key) => {
      for (let i = assessments.length - 1; i >= 0; i--) {
        const v =
          typeof assessments[i].value === "string"
            ? JSON.parse(assessments[i].value)
            : assessments[i].value;
        const val = parseFloat(v[key]);
        if (!isNaN(val) && val > 0) return val;
      }
      return null;
    };

    let regions = [
      {
        label: "Abdominal",
        isPair: false,
        periKey: "abdomen",
        skinKey: "dobra_abdominal",
      },
      {
        label: "Braço Cont. E/D (Tríceps)",
        isPair: true,
        periKey: ["braco_contraido_esq", "braco_contraido_dir"],
        skinKey: "dobra_tricipital",
      },
      {
        label: "Braço Relax. E/D (Bíceps)",
        isPair: true,
        periKey: ["braco_relaxado_esq", "braco_relaxado_dir"],
        skinKey: "dobra_bicipital",
      },
      {
        label: "Cintura / Suprailíaca",
        isPair: false,
        periKey: "cintura",
        skinKey: "dobra_suprailiaca",
      },
      {
        label: "Coxa E/D",
        isPair: true,
        periKey: ["coxa_esq", "coxa_dir"],
        skinKey: "dobra_coxa",
      },
      {
        label: "Ombro",
        isPair: false,
        periKey: "ombro",
        skinKey: null,
      },
      {
        label: "Panturrilha E/D",
        isPair: true,
        periKey: ["panturrilha_esq", "panturrilha_dir"],
        skinKey: "dobra_panturrilha",
      },
      {
        label: "Pescoço",
        isPair: false,
        periKey: "pescoco",
        skinKey: null,
      },
      {
        label: "Tórax / Peitoral",
        isPair: false,
        periKey: "torax",
        skinKey: "dobra_peitoral",
      },
    ];

    regions.sort((a, b) => a.label.localeCompare(b.label));

    regions.forEach((reg) => {
      let periFormatted;

      if (reg.isPair) {
        // Usa os helpers para encontrar as baselines e os valores atuais dinamicamente
        const e1 = getFirstValid(reg.periKey[0]);
        const e2 = getLastValid(reg.periKey[0]);
        const d1 = getFirstValid(reg.periKey[1]);
        const d2 = getLastValid(reg.periKey[1]);

        const diffEsq = e1 !== null && e2 !== null ? e2 - e1 : null;
        const diffDir = d1 !== null && d2 !== null ? d2 - d1 : null;

        periFormatted = this.formatPairDiff(
          diffEsq,
          diffDir,
          "cm",
          this.THRESHOLD_PERIMETER,
        );
      } else {
        const p1 = getFirstValid(reg.periKey);
        const p2 = getLastValid(reg.periKey);
        const periDiff = p1 !== null && p2 !== null ? p2 - p1 : null;

        periFormatted = this.formatSingleDiff(
          periDiff,
          "cm",
          this.THRESHOLD_PERIMETER,
        );
      }

      let skinFormatted;
      if (reg.skinKey) {
        const s1 = getFirstValid(reg.skinKey);
        const s2 = getLastValid(reg.skinKey);
        const skinDiff = s1 !== null && s2 !== null ? s2 - s1 : null;

        skinFormatted = this.formatSingleDiff(
          skinDiff,
          "mm",
          this.THRESHOLD_SKINFOLD,
        );
      } else {
        skinFormatted = { text: "--", cssClass: "rollup-val--neutral" };
      }

      const rowHTML = `
        <tr>
          <td class="rollup-region">${reg.label}</td>
          <td class="${periFormatted.cssClass}">${periFormatted.text}</td>
          <td class="${skinFormatted.cssClass}">${skinFormatted.text}</td>
        </tr>
      `;
      tbody.insertAdjacentHTML("beforeend", rowHTML);
    });
  }
}
