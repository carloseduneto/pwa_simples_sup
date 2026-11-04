import { GlobalLoader } from "../../ui/global-loader.js";
import { WeightTrackingService } from "./wt.service.js";
import { gerarListItem } from "../../components/list-item.js";

// Estado local do módulo para filtragem rápida sem novas requisições ao banco
let allRecords = [];

export async function initWeightTrackingList(onNavigate) {
  const container = document.getElementById("weight-tracking-container");
  const filterSelect = document.getElementById("wt-period-filter");

  if (!container) return;

  container.innerHTML = GlobalLoader.getSimple();

  try {
    allRecords = await WeightTrackingService.getAll();

    if (!allRecords || allRecords.length === 0) {
      container.innerHTML =
        '<p class="wt-empty-state">Nenhum registro de peso encontrado.</p>';
      return;
    }

    renderView(allRecords, container);
    setupEventListeners(container, filterSelect, onNavigate);
  } catch (error) {
    console.error("Falha ao buscar registros de peso:", error);
    container.innerHTML =
      '<p class="wt-error-state">Erro ao carregar histórico de pesagens.</p>';
  }
}

/**
 * Renderiza a lista e atualiza a visualização do gráfico
 */
function renderView(records, container) {
  if (records.length === 0) {
    container.innerHTML =
      '<p class="wt-empty-state">Nenhum registro neste período.</p>';
    return;
  }

  // Uso de .map().join("") é mais performático e limpo que concatenação com += em forEach
  const htmlLista = records
    .map((item) => {
      const { dateFormatted, timeFormatted } = formatDateTime(
        item.data_registro,
      );
      const pesoFormatado = formatWeight(item.peso);

      return gerarListItem({
        id: item.id,
        titulo: `${pesoFormatado}kg`,
        subtitulo: `${dateFormatted} &nbsp;&nbsp; ${timeFormatted}`,
        titleComplement: "",
        data: "",
        mostrarAcoes: true,
      });
    })
    .join("");

  container.innerHTML = htmlLista;
}

/**
 * Formata o número para o padrão brasileiro (ex: 88.9 -> 88,90)
 */
function formatWeight(peso) {
  return Number(peso).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extrai data ("29 de out. de 2026") e hora ("14:51") separadamente
 */
function formatDateTime(isoString) {
  const dateObj = new Date(isoString);

  const dateFormatted = dateObj.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const timeFormatted = dateObj.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { dateFormatted, timeFormatted };
}

/**
 * Centraliza a delegação de eventos de clique e filtro
 */
function setupEventListeners(container, filterSelect, onNavigate) {
  // 1. Filtro de Período
  if (filterSelect) {
    filterSelect.onchange = (e) => {
      const period = e.target.value;
      if (period === "all") {
        renderView(allRecords, container);
        return;
      }

      const days = parseInt(period, 10);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const filtered = allRecords.filter(
        (r) => new Date(r.data_registro) >= cutoffDate,
      );
      renderView(filtered, container);
    };
  }

  // 2. Delegação de Eventos da Lista (Editar / Excluir)
  container.onclick = async (e) => {
    const btnEdit = e.target.closest(".list-item__btn--edit");
    const btnDelete = e.target.closest(".list-item__btn--delete");

    if (btnEdit) {
      e.stopPropagation();
      const id = btnEdit.dataset.id;
      localStorage.setItem("editWeightTrackingId", id);
      if (onNavigate) onNavigate("weightTrackingForm");
      return;
    }

    if (btnDelete) {
      e.stopPropagation();
      const id = btnDelete.dataset.id;
      await handleDelete(id, onNavigate);
    }
  };
}

/**
 * Isola a regra de exclusão com confirmação visual do título do card
 */
async function handleDelete(id, onNavigate) {
  const cartao = document.querySelector(`.list-item[data-id="${id}"]`);
  let pesoLabel = "este registro";

  if (cartao) {
    const tituloElement = cartao.querySelector(".list-item__title");
    if (tituloElement) {
      pesoLabel = `o registro de ${tituloElement.innerText.split("•")[0].trim()}`;
    }
  }

  if (confirm(`Deseja realmente excluir ${pesoLabel}?`)) {
    try {
      await WeightTrackingService.delete(id);
      initWeightTrackingList(onNavigate);
    } catch (err) {
      alert("Erro ao excluir pesagem: " + err.message);
    }
  }
}
