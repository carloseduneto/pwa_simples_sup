import { client } from "../../config/config.js";

// --- ESTADO DA APLICAÇÃO ---
const State = {
  exercicioId: null,
  nomeExercicio: "",
  seriesHoje: [],
  historico: [],
  viewTarget: "carga", // 'carga' ou 'tonelagem'
  cargaDisplayMode: "both", // 'both' (Série x Carga), 'reps' (Séries) ou 'carga' (Carga)
  historyLimit: 4, // Qtd de treinos para buscar
  compareIndex: -1,
};

let chartInstance = null;
let chartInstanceBar = null;
let chartInstanceTranspose = null;

export async function initExerciseIntensityVolume(onNavigate) {
  const container = document.getElementById(
    "exercise-intensity-volume-container",
  );
  if (!container) return;

  const cached = sessionStorage.getItem("treino_atual_avaliacao");
  if (!cached) {
    container.innerHTML = "<p>Erro: Dados do treino atual não encontrados.</p>";
    return;
  }

  const dadosHoje = JSON.parse(cached);
  State.exercicioId = dadosHoje.exercicioId;
  State.nomeExercicio = dadosHoje.nome;
  State.seriesHoje = dadosHoje.series;

  document.getElementById("eiv-title").textContent = State.nomeExercicio;

  setupToggles();
  setupFilters();

  await fetchHistorico();
}

// --- INTEGRAÇÃO COM O BANCO ---
async function fetchHistorico() {
  try {
    const { data, error } = await client.rpc(
      "get_historico_sessoes_exercicio",
      {
        e_id: State.exercicioId,
        limit_sessoes: parseInt(State.historyLimit),
      },
    );

    if (error) throw error;

    State.historico = processarDadosBanco(data);
    State.compareIndex =
      State.historico.length > 0 ? State.historico.length - 1 : -1;

    renderizarTabela();
  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
  }
}

function processarDadosBanco(dataFlat) {
  const sessoesMap = new Map();
  dataFlat.forEach((row) => {
    if (!sessoesMap.has(row.sessao_id)) {
      sessoesMap.set(row.sessao_id, {
        data: new Date(row.data_sessao).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
        }),
        seriesOriginal: [],
      });
    }
    sessoesMap.get(row.sessao_id).seriesOriginal.push(row);
  });
  return Array.from(sessoesMap.values());
}

function aplicarRegraDeTransposicao(seriesAntigas, qtdHoje) {
  const qtdAntiga = seriesAntigas.length;
  if (qtdAntiga === 0) return Array(qtdHoje).fill(null);

  let resultado = [];
  for (let i = 0; i < qtdHoje; i++) {
    if (i < qtdAntiga - 1) {
      resultado.push({ ...seriesAntigas[i], autoFilled: false });
    } else if (i === qtdHoje - 1) {
      resultado.push({ ...seriesAntigas[qtdAntiga - 1], autoFilled: false });
    } else {
      const penultimoAntigo = seriesAntigas[qtdAntiga - 2] || seriesAntigas[0];
      resultado.push({ ...penultimoAntigo, autoFilled: true });
    }
  }
  return resultado;
}

// --- RENDERIZAÇÃO DA INTERFACE ---
function renderizarTabela() {
  const thead = document.getElementById("eiv-thead");
  const tbody = document.getElementById("eiv-tbody");
  const tfoot = document.getElementById("eiv-tfoot");

  const sessoesAlinhadas = State.historico.map((sessao) => ({
    data: sessao.data,
    series: aplicarRegraDeTransposicao(
      sessao.seriesOriginal,
      State.seriesHoje.length,
    ),
  }));

  // HEADER
  let trHead = `<tr><th>#</th>`;
  sessoesAlinhadas.forEach((sessao, index) => {
    const bg =
      index === State.compareIndex ? "background: rgba(255, 107, 0, 0.1);" : "";
    trHead += `<th style="${bg} cursor: pointer;" onclick="selecionarComparacao(${index})">${sessao.data}</th>`;
  });
  //   trHead += `<th>Hoje <span class="material-symbols-rounded" style="font-size: 1rem; vertical-align: middle;">anchor</span></th></tr>`;
  trHead += `<th>Hoje </th></tr>`;
  thead.innerHTML = trHead;

  window.selecionarComparacao = (idx) => {
    State.compareIndex = idx;
    renderizarTabela();
  };

  // BODY
  let htmlBody = "";
  let totaisTonelagem = Array(sessoesAlinhadas.length).fill(0);
  let totalHoje = 0;

  State.seriesHoje.forEach((serieHoje, i) => {
    htmlBody += `<tr><td>${i + 1}</td>`;

    // Células Históricas
    sessoesAlinhadas.forEach((sessao, sIdx) => {
      const bg =
        sIdx === State.compareIndex
          ? "background: rgba(255, 107, 0, 0.1);"
          : "";
      const sHistorica = sessao.series[i];

      if (!sHistorica) {
        htmlBody += `<td style="${bg}">-</td>`;
        return;
      }

      const tonelagem = sHistorica.repeticoes * sHistorica.carga;
      totaisTonelagem[sIdx] += tonelagem;

      let texto = "";
      if (State.viewTarget === "tonelagem") {
        texto = tonelagem.toFixed(0);
      } else {
        if (State.cargaDisplayMode === "both")
          texto = `${sHistorica.repeticoes}&times;${sHistorica.carga}`;
        else if (State.cargaDisplayMode === "reps")
          texto = `${sHistorica.repeticoes}`;
        else if (State.cargaDisplayMode === "carga")
          texto = `${sHistorica.carga}`;
      }

      if (sHistorica.autoFilled) texto += "*";
      htmlBody += `<td style="${bg}">${texto}</td>`;
    });

    // Célula HOJE
    const tonelagemHoje = serieHoje.repeticoes * serieHoje.carga;
    totalHoje += tonelagemHoje;

    let textoHoje = "";
    if (State.viewTarget === "tonelagem") {
      textoHoje = tonelagemHoje.toFixed(0);
    } else {
      if (State.cargaDisplayMode === "both")
        textoHoje = `${serieHoje.repeticoes}&times;${serieHoje.carga}`;
      else if (State.cargaDisplayMode === "reps")
        textoHoje = `${serieHoje.repeticoes}`;
      else if (State.cargaDisplayMode === "carga")
        textoHoje = `${serieHoje.carga}`;
    }

    // Cálculo Variação
    let htmlVariacao =
      '<span style="opacity:0.3; margin-left:8px; font-size:0.8rem;">•</span>';
    if (State.compareIndex !== -1) {
      const sCompare = sessoesAlinhadas[State.compareIndex].series[i];
      if (sCompare) {
        let valHoje, valCompare;

        if (State.viewTarget === "tonelagem") {
          valHoje = tonelagemHoje;
          valCompare = sCompare.repeticoes * sCompare.carga;
        } else {
          // Na aba carga, a variação segue o subfiltro atual
          if (State.cargaDisplayMode === "reps") {
            valHoje = serieHoje.repeticoes;
            valCompare = sCompare.repeticoes;
          } else {
            valHoje = serieHoje.carga;
            valCompare = sCompare.carga;
          }
        }

        if (valCompare > 0) {
          const variacao = ((valHoje - valCompare) / valCompare) * 100;
          if (Math.round(variacao) === 0) {
            // Se for 0% exato, mantém o ponto neutro
            htmlVariacao =
              '<span style="opacity:0.3; margin-left:8px; font-size:0.8rem;">•</span>';
          } else {
            const cor = variacao > 0 ? "#00b862" : "#ff4444";
            const icon =
              variacao > 0
                ? "keyboard_double_arrow_up"
                : "keyboard_double_arrow_down";
            htmlVariacao = `<span style="color:${cor}; font-size:0.75rem; font-weight:bold; margin-left:6px;"><span class="material-symbols-rounded" style="font-size: 0.9rem; vertical-align: bottom;">${icon}</span>${Math.abs(variacao).toFixed(0)}%</span>`;
          }
        }
      }
    }
    htmlBody += `<td>${textoHoje} ${htmlVariacao}</td></tr>`;
  });

  tbody.innerHTML = htmlBody;

  // FOOTER (Tonelagem Total)
  if (State.viewTarget === "tonelagem") {
    let trFoot = `<tr><td>&Sigma;</td>`;
    totaisTonelagem.forEach((total, index) => {
      const bg =
        index === State.compareIndex
          ? "background: rgba(255, 107, 0, 0.1);"
          : "";
      trFoot += `<td style="${bg}">${total.toFixed(0)}</td>`;
    });

    let htmlVariacaoTotal =
      '<span style="opacity:0.3; margin-left:8px; font-size:0.8rem;">•</span>';
    if (State.compareIndex !== -1 && totaisTonelagem[State.compareIndex] > 0) {
      const varTotal =
        ((totalHoje - totaisTonelagem[State.compareIndex]) /
          totaisTonelagem[State.compareIndex]) *
        100;
      if (Math.round(varTotal) === 0) {
        htmlVariacaoTotal = `<span style="opacity:0.5; font-size:0.75rem; font-weight:bold; margin-left:6px;">0%</span>`;
      } else {
        const cor = varTotal > 0 ? "#00b862" : "#ff4444";
        const icon =
          varTotal > 0
            ? "keyboard_double_arrow_up"
            : "keyboard_double_arrow_down";
        htmlVariacaoTotal = `<span style="color:${cor}; font-size:0.75rem; font-weight:bold; margin-left:6px;"><span class="material-symbols-rounded" style="font-size: 0.9rem; vertical-align: bottom;">${icon}</span>${Math.abs(varTotal).toFixed(0)}%</span>`;
      }
    }

    trFoot += `<td>${totalHoje.toFixed(0)} ${htmlVariacaoTotal}</td></tr>`;
    tfoot.innerHTML = trFoot;
  } else {
    tfoot.innerHTML = "";
  }

  renderizarGrafico(sessoesAlinhadas);
}

// --- EVENTOS DOS FILTROS ---
function setupToggles() {
  const btnCarga = document.getElementById("eiv-btn-carga");
  const btnTon = document.getElementById("eiv-btn-tonelagem");
  const subControlsCarga = document.getElementById("eiv-subcontrols-carga");

  const setAtivo = (btnOn, btnOff) => {
    btnOn.style.background = "var(--primary-color, #ff6b00)";
    btnOn.style.color = "white";
    btnOff.style.background = "transparent";
    btnOff.style.color = "var(--primary-color, #ff6b00)";
  };

  btnCarga.onclick = () => {
    State.viewTarget = "carga";
    setAtivo(btnCarga, btnTon);
    subControlsCarga.style.display = "flex"; // Mostra subfiltros
    renderizarTabela();
  };

  btnTon.onclick = () => {
    State.viewTarget = "tonelagem";
    setAtivo(btnTon, btnCarga);
    subControlsCarga.style.display = "none"; // Oculta subfiltros
    renderizarTabela();
  };
}

function setupFilters() {
  // Limite de Histórico (4, 8, 12, Todos)
  document.getElementById("eiv-select-limit").onchange = async (e) => {
    State.historyLimit = e.target.value;
    await fetchHistorico(); // Refaz a busca
  };

  // Subfiltros da Carga (Série x Carga, Séries, Carga)
  document.querySelectorAll(".eiv-sub-btn").forEach((btn) => {
    btn.onclick = (e) => {
      // Reseta todos os botões
      document.querySelectorAll(".eiv-sub-btn").forEach((b) => {
        b.style.background = "transparent";
        b.style.color = "inherit";
        b.style.borderColor = "#ddd";
      });
      // Ativa o clicado
      const target = e.target;
      target.style.background = "var(--primary-color, #ff6b00)";
      target.style.color = "white";
      target.style.borderColor = "var(--primary-color, #ff6b00)";

      State.cargaDisplayMode = target.dataset.mode;
      renderizarTabela();
    };
  });
}

function renderizarGrafico(sessoesAlinhadas) {
  const ctx = document.getElementById("eiv-chart");
  if (!ctx) return;

  // Destrói a instância anterior para evitar sobreposição ao atualizar os filtros
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Eixo X: Datas históricas + "Hoje"
  const labels = sessoesAlinhadas.map((s) => s.data);
  labels.push("Hoje");

  const numSeries = State.seriesHoje.length;
  const datasets = [];

  // Paleta de cores nítida para diferenciar cada série
  const cores = [
    "#ff6b00", // Laranja (Primária)
    "#0088cc", // Azul
    "#00b862", // Verde
    "#8833ff", // Roxo
    "#e63946", // Vermelho
    "#f4a261", // Amarelo
    "#2a9d8f", // Turquesa
    "#264653", // Azul Escuro
  ];

  const extrairValor = (serie) => {
    if (!serie) return null;
    if (State.viewTarget === "tonelagem") return serie.repeticoes * serie.carga;
    return State.cargaDisplayMode === "reps" ? serie.repeticoes : serie.carga;
  };

  for (let i = 0; i < numSeries; i++) {
    const dataPoints = [];

    // Busca os dados passados para a série atual
    sessoesAlinhadas.forEach((sessao) => {
      dataPoints.push(extrairValor(sessao.series[i]));
    });

    // Adiciona o dado de Hoje
    dataPoints.push(extrairValor(State.seriesHoje[i]));

    const corAtual = cores[i % cores.length];

    datasets.push({
      label: `Série ${i + 1}`,
      data: dataPoints,
      borderColor: corAtual,
      // backgroundColor: corAtual + "1A", // Transparência de ~10% para o preenchimento
      backgroundColor: corAtual, // Transparência de ~10% para o preenchimento
      pointBackgroundColor: corAtual, // <-- Adicionado: Deixa o ponto e a legenda sólidos
      pointBorderColor: corAtual, // <-- Adicionado: Garante que a borda do ponto também seja sólida
      // stepped: "middle", // Formato em escada
      tension: 0.4, // Curvatura da linha
      cubicInterpolationMode: "monotone",
      fill: false,
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  }

  const tituloGrafico =
    State.viewTarget === "tonelagem"
      ? "Evolução de Tonelagem"
      : State.cargaDisplayMode === "reps"
        ? "Evolução de Repetições"
        : "Evolução de Carga (kg)";

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: "easeOutQuart" },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, padding: 16 },
      },
      tooltip: { position: "nearest" },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(128,128,128,0.1)" } },
    },
  };

  // Instanciação Gráfico 1 (Linha)
  const ctxLine = document.getElementById("eiv-chart");
  if (ctxLine) {
    if (chartInstance) chartInstance.destroy();
    chartInstance = new window.Chart(ctxLine, {
      type: "line",
      data: { labels, datasets },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: { display: true, text: tituloGrafico, font: { size: 14 } },
        },
        scales: {
          ...baseOptions.scales,
          y: { ...baseOptions.scales.y, beginAtZero: false },
        },
      },
    });
  }

  // Instanciação Gráfico 2 (Barras)
  const ctxBar = document.getElementById("eiv-chart-bar");
  if (ctxBar) {
    if (chartInstanceBar) chartInstanceBar.destroy();
    const datasetsBar = JSON.parse(JSON.stringify(datasets));

    // Gráfico de barras precisa que a propriedade 'stepped' seja removida dos datasets clonados
    datasetsBar.forEach((ds) => delete ds.stepped);

    chartInstanceBar = new window.Chart(ctxBar, {
      type: "bar",
      data: { labels, datasets: datasetsBar },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: tituloGrafico + " (Barras)",
            font: { size: 14 },
          },
        },
        scales: {
          ...baseOptions.scales,
          y: { ...baseOptions.scales.y, beginAtZero: true },
        },
      },
    });
  }

  // --- INÍCIO: TERCEIRO GRÁFICO (BARRAS TRANSPOSTAS) ---
  const ctxTranspose = document.getElementById("eiv-chart-transpose");
  if (ctxTranspose) {
    if (chartInstanceTranspose) chartInstanceTranspose.destroy();

    // 1. Inversão do Eixo X: Agora as labels são as séries (ex: "Série 1", "Série 2")
    const labelsTranspostas = State.seriesHoje.map((_, i) => `Série ${i + 1}`);
    const datasetsTranspostos = [];

    // Limita o histórico para evitar estourar a paleta de cores (máximo 7 datas antigas + Hoje)
    const sessoesLimitadas = sessoesAlinhadas.slice(-7);

    // 2. Inversão dos Datasets: Agora cada dataset representa uma Data do histórico
    sessoesLimitadas.forEach((sessao, idxData) => {
      const dataPoints = [];
      for (let i = 0; i < State.seriesHoje.length; i++) {
        dataPoints.push(extrairValor(sessao.series[i]));
      }

      datasetsTranspostos.push({
        label: sessao.data,
        data: dataPoints,
        // Reaproveita o seu array de cores já existente no escopo da função
        backgroundColor: cores[idxData % cores.length],
      });
    });

    // 3. Adiciona a data de "Hoje" como o último conjunto no gráfico
    const dataPointsHoje = [];
    for (let i = 0; i < State.seriesHoje.length; i++) {
      dataPointsHoje.push(extrairValor(State.seriesHoje[i]));
    }

    datasetsTranspostos.push({
      label: "Hoje",
      data: dataPointsHoje,
      backgroundColor: cores[sessoesLimitadas.length % cores.length],
    });

    // 4. Instancia utilizando o padrão DRY com baseOptions
    chartInstanceTranspose = new window.Chart(ctxTranspose, {
      type: "bar",
      data: {
        labels: labelsTranspostas,
        datasets: datasetsTranspostos,
      },
      options: {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: tituloGrafico + " (Por Série)",
            font: { size: 14 },
          },
        },
        scales: {
          ...baseOptions.scales,
          y: { ...baseOptions.scales.y, beginAtZero: true },
        },
      },
    });
  }
  // --- FIM: TERCEIRO GRÁFICO ---
}

