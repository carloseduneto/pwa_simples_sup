import { TemplateService } from "../services/template.service.js";
import { GlobalLoader } from "../ui-ux/global-loader.js";
// REMOVIDO: import { abrirTemplate } ... (Não existe mais)

// --- ESTADO LOCAL (Privado do arquivo) ---
let allTemplatesCache = [];
let showInactives = false;

// --- FUNÇÃO DE RENDERIZAÇÃO E FILTRO ---
// Agora aceita 'onNavigate' como segundo parâmetro para poder navegar ao clicar
function renderizarListaFiltrada(container, onNavigate) {
  container.innerHTML = "";

  // 1. Filtra
  const listaExibida = allTemplatesCache.filter(t => {
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

  // 3. Renderiza Cards
  listaExibida.forEach(item => {
    const article = document.createElement("article");
    const classeInativo = item.status === "inactive" ? "template-inativo" : "";
    article.className = `template-item ${classeInativo}`;

    // HTML Interno
    article.innerHTML = `
      <div class="card-info">
        <h3 class="card-title">${item.nome}</h3>
        <p class="card-subtitle">${item.descricao || "Sem descrição"}</p>
      </div>
      <button class="card-dots" data-template-id="${item.id}">&#8942;</button>
    `;

    // Evento de Clique no Card (Iniciar Treino)
    article.onclick = e => {
      // Se clicou nos 3 pontinhos, para a propagação (o options-templates.js cuida disso)
      if (e.target.closest(".card-dots")) return;

      // CORREÇÃO: Usa o onNavigate injetado pelo Router
      if (onNavigate) {
        onNavigate("detalhes", item.id);
      } else {
        console.error("Navegação não disponível.");
      }
    };

    container.appendChild(article);
  });
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
