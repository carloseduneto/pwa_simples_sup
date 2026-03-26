import { TemplateService } from "../services/template.service.js";
import { GlobalLoader } from "../ui/global-loader.js";
// REMOVIDO: import { abrirTemplate } ... (Não existe mais)

// --- ESTADO LOCAL (Privado do arquivo) ---
let allTemplatesCache = [];
let showInactives = false;

// --- FUNÇÃO DE RENDERIZAÇÃO E FILTRO ---
// Agora aceita 'onNavigate' como segundo parâmetro para poder navegar ao clicar
// --- FUNÇÃO DE RENDERIZAÇÃO E FILTRO ---
function renderizarListaFiltrada(container, onNavigate) {
  container.innerHTML = "";

  // 1. Filtra
  const listaExibida = allTemplatesCache.filter((t) => {
    return showInactives ? t.status === "inactive" : t.status !== "inactive";
  });

  // 2. Feedback Vazio
  if (listaExibida.length === 0) {
    const msg = showInactives
      ? "Nenhum template inativo."
      : "Nenhum template ativo.";
    container.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px">${msg}</p>`;
    return;
  }

  if (showInactives) {
    // 1. Agrupa os inativos por mm/aaaa
    const grupos = {};

    listaExibida.forEach((item) => {
      // Usa data_registro se existir, senão faz fallback pro created_at
      const rawDate = item.data_registro || item.created_at;
      const dataObj = new Date(rawDate);

      const mes = String(dataObj.getMonth() + 1).padStart(2, "0");
      const ano = dataObj.getFullYear();
      const mesAno = `${mes}/${ano}`;

      if (!grupos[mesAno]) grupos[mesAno] = [];
      grupos[mesAno].push(item);
    });

    // 2. Renderiza os grupos
    Object.keys(grupos).forEach((mesAno) => {
      const headerMes = document.createElement("div");
      headerMes.className = "group-header";
      headerMes.innerHTML = `<h4 style="margin: 24px 0 8px 0; color: #888; font-size: 14px;">${mesAno}</h4>`;
      container.appendChild(headerMes);

      grupos[mesAno].forEach((item) => {
        container.appendChild(criarElementoCard(item, onNavigate));
      });
    });
    
  } else {
    // Separa os treinos ativos por categoria
    const fixos = listaExibida.filter(
      (t) => t.categoria === "fixo" || !t.categoria,
    );
    const avulsos = listaExibida.filter((t) => t.categoria === "avulso");

    if (avulsos.length > 0) {
      // Exibe cabeçalho "Rotina" apenas se houverem treinos fixos para separar
      if (fixos.length > 0) {
        const headerFixo = document.createElement("div");
        headerFixo.className = "group-header";
        headerFixo.innerHTML = `<h4 style="margin: 24px 0 8px 0; color: #888; font-size: 14px;">Rotina</h4>`;
        container.appendChild(headerFixo);

        fixos.forEach((item) =>
          container.appendChild(criarElementoCard(item, onNavigate)),
        );
      }

      // Exibe cabeçalho "Avulsos" e seus respectivos cards
      const headerAvulso = document.createElement("div");
      headerAvulso.className = "group-header";
      headerAvulso.innerHTML = `<h4 style="margin: 24px 0 8px 0; color: #888; font-size: 14px;">Treinos Avulsos</h4>`;
      container.appendChild(headerAvulso);

      avulsos.forEach((item) =>
        container.appendChild(criarElementoCard(item, onNavigate)),
      );
    } else {
      // Se não houver nenhum treino avulso, renderiza a lista limpa, sem cabeçalhos
      listaExibida.forEach((item) => {
        container.appendChild(criarElementoCard(item, onNavigate));
      });
    }
  }
}

// Extraído para evitar repetição de código
// function criarElementoCard(item, onNavigate) {
//   const article = document.createElement("article");
//   const classeInativo = item.status === "inactive" ? "template-inativo" : "";
//   article.className = `template-item ${classeInativo}`;

//   article.innerHTML = `
//     <div class="card-info">
//       <h3 class="card-title">${item.nome}</h3>
//       <p class="card-subtitle">${item.descricao || "Sem descrição"}</p>
//     </div>
//     <button class="card-dots" data-template-id="${item.id}">&#8942;</button>
//   `;

//   article.onclick = (e) => {
//     if (e.target.closest(".card-dots")) return;
//     if (onNavigate) {
//       onNavigate("detalhes", item.id);
//     } else {
//       console.error("Navegação não disponível.");
//     }
//   };

//   return article;
// }

// Extraído para evitar repetição de código
function criarElementoCard(item, onNavigate) {
  const article = document.createElement("article");
  const classeInativo = item.status === "inactive" ? "template-inativo" : "";
  article.className = `template-item ${classeInativo}`;

  let tempoExistenteHtml = "";

  // Calcula tempo apenas para os ativos
  if (item.status !== "inactive") {
    const rawDate = item.data_registro || item.created_at;
    if (rawDate) {
      // Isola YYYY-MM-DD e força o timezone local para não perder 1 dia no cálculo
      const apenasData = rawDate.split("T")[0];
      const [ano, mes, dia] = apenasData.split("-");
      const dataObj = new Date(ano, mes - 1, dia);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Ignora a hora atual para bater dias exatos

      const diffTempo = hoje.getTime() - dataObj.getTime();
      const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
      const semanas = Math.max(0, Math.floor(diffDias / 7)); // Math.max evita números negativos

      const txtSemana = semanas === 1 ? "1 semana" : `${semanas} semanas`;

      tempoExistenteHtml = `<p style="font-size: 0.85rem; opacity: 0.5; margin: 12px 0 0 0; font-weight: 500;">Há ${txtSemana}</p>`;
    }
  }

  article.innerHTML = `
    <div class="card-info">
      <h3 class="card-title">${item.nome}</h3>
      <p class="card-subtitle">${item.descricao || "Sem descrição"}</p>
      ${tempoExistenteHtml}
    </div>
    <button class="card-dots" data-template-id="${item.id}">&#8942;</button>
  `;

  article.onclick = (e) => {
    if (e.target.closest(".card-dots")) return;
    if (onNavigate) {
      onNavigate("detalhes", item.id);
    } else {
      console.error("Navegação não disponível.");
    }
  };

  return article;
}

// --- ATUALIZA O VISUAL DO BOTÃO DE FILTRO ---
function atualizarBotaoFiltro(btn) {
  const icon = btn.querySelector(".material-symbols-rounded");
  const text = btn.querySelector(".btn-text-header");

  // Salva estado globalmente para o menu de opções saber se exibe "Ativar" ou "Inativar"
  window.EXIBINDO_INATIVOS = showInactives;

  if (showInactives) {
    // Modo: Vendo Inativos
    if (icon) {
      icon.innerText = "check";
      icon.style.color = "#FF6B00";
    }
    if (text) {
      text.innerText = "Ativos";
      text.style.color = "#FF6B00";
    }
  } else {
    // Modo: Vendo Ativos (Padrão)
    if (icon) {
      icon.innerText = "block";
      icon.style.color = "";
    }
    if (text) {
      text.innerText = "Inativos";
      text.style.color = "";
    }
  }
}

// --- FUNÇÃO PRINCIPAL (INIT) ---
export async function renderizarTemplatesList(onNavigate) {
  const container = document.getElementById("lista-templates");
  const btnFilter = document.getElementById("template-button-inactived"); // Botão do Header

  if (!container) return;

  // 1. Configura Botão de Filtro (Se existir no header)
  if (btnFilter) {
    // Remove listener antigo
    const novoBtn = btnFilter.cloneNode(true);
    btnFilter.parentNode.replaceChild(novoBtn, btnFilter);

    // Sincroniza visual inicial
    atualizarBotaoFiltro(novoBtn);

    // Click: Alterna estado e re-renderiza
    novoBtn.onclick = () => {
      showInactives = !showInactives;
      atualizarBotaoFiltro(novoBtn);
      // Passamos o onNavigate novamente para manter o clique funcionando
      renderizarListaFiltrada(container, onNavigate);
    };
  }

  // 2. Loader
  container.innerHTML = GlobalLoader.getSimple();

  try {
    // 3. Busca Dados
    const dados = await TemplateService.getAll();

    allTemplatesCache = dados || [];

    // 4. Renderiza Inicial (Passando onNavigate)
    renderizarListaFiltrada(container, onNavigate);
  } catch (error) {
    console.error("Erro templates:", error);
    container.innerHTML = `<p style="color:red; text-align:center; padding:20px">Erro ao carregar treinos.</p>`;
  }
}
