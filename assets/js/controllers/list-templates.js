// === VARIÁVEIS GLOBAIS DE CONTROLE ===
let TODOS_TEMPLATES = []; // Guarda a lista bruta que veio do Supabase
let EXIBINDO_INATIVOS = false; // Controla o estado do botão

//=== 5. CONSULTA TEMPLATES (SEM CACHE) ===
async function buscarTemplates() {
  const container = document.getElementById("lista-templates");
  // container.innerHTML = "Carregando templates...";
  container.innerHTML =
    '<div class="espaco-loader">' + '<div class="loader"></div>' + "</div>";

  // [CACHE - LEITURA]
  if (MEXENDO_NO_CSS) {
    const cache = localStorage.getItem("cache_templates");
    if (cache) {
      console.log("📦 Usando cache local (Templates)");
      renderizarTemplates(JSON.parse(cache));
      return;
    }
  }

const { data, error } = await client
    .from("templates")
    .select("id, nome, descricao, status")
    
    // 1º CRITÉRIO: Status (Prioridade máxima)
    // Isso joga tudo que é 'active' (ou null) para o topo da lista,
    // e empurra os 'inactive' para o final.
    .order("status", { ascending: true, nullsFirst: true }) 
    
    // 2º CRITÉRIO: Nome (Ordem alfabética dentro do grupo)
    .order("nome", { ascending: true })
    
    // Agora o corte de 500 vai pegar todos os ativos primeiro.
    // Só se houver mais de 500 ATIVOS é que algo ativo ficaria de fora.
    .limit(500);

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }

  // [CACHE - GRAVAÇÃO]
  if (MEXENDO_NO_CSS)
    localStorage.setItem("cache_templates", JSON.stringify(data));

  console.log("Templates encontrados:", data);
  TODOS_TEMPLATES = data;
//   renderizarTemplates(data);
aplicarFiltroERenderizar();
}


// === NOVA FUNÇÃO: FILTRO ===
function aplicarFiltroERenderizar() {
  // Se EXIBINDO_INATIVOS for true, filtra onde status == 'inactive'
  // Se for false, filtra onde status != 'inactive' (ou seja, null ou 'active')

  const listaFiltrada = TODOS_TEMPLATES.filter((item) => {
    const ehInativo = item.status === "inactive";
    return EXIBINDO_INATIVOS ? ehInativo : !ehInativo;
  });

  renderizarTemplates(listaFiltrada);
  atualizarBotaoVisual(); // Muda a cor do ícone
}

// === NOVA FUNÇÃO: AÇÃO DO BOTÃO ===
function alternarVisualizacaoInativos() {
  EXIBINDO_INATIVOS = !EXIBINDO_INATIVOS; // Inverte o valor
  aplicarFiltroERenderizar(); // Re-renderiza a lista
}

function atualizarBotaoVisual() {
    const btn = document.getElementById("template-button-inactived");
    const icon = btn.querySelector(".material-symbols-rounded");
    const text = btn.querySelector(".btn-text-header");

    if (EXIBINDO_INATIVOS) {
        // Estilo "Ativado" (Laranja)
        icon.style.color = "#FF6B00"; 
        text.style.color = "#FF6B00"; 
        icon.innerHTML = "check"
        text.innerText = "Ativos"; // Muda texto opcionalmente
    } else {
        // Estilo "Normal" (Cinza)
        icon.style.color = ""; // Volta ao CSS original
        text.style.color = "#000000"; 
        text.innerText = "Inativos";
        icon.innerHTML = "block"
    }
}

// === RENDERIZAÇÃO (Pequeno ajuste no CSS Class) ===
function renderizarTemplates(lista) {
  const container = document.getElementById("lista-templates");
  container.innerHTML = "";

  if (!lista || lista.length === 0) {
    // Mensagem personalizada dependendo do modo
    const msg = EXIBINDO_INATIVOS ? "Nenhum inativo." : "Nenhum template ativo.";
    container.innerHTML = `<p style="text-align:center; color:#999; margin-top:20px">${msg}</p>`;
    return;
  }

  lista.forEach(item => {
    const articleExercicio = document.createElement("article");

    // Adiciona classe extra se for inativo para mudar a cor de fundo
    const classeInativo = item.status === "inactive" ? "template-inativo" : "";
    articleExercicio.className = `template-item ${classeInativo}`;
    /*html*/
    articleExercicio.innerHTML = `
      <div class="card-info">
        <h3 class="card-title">${item.nome}</h3>
        <p class="card-subtitle">${item.descricao}</p>
      </div>
      <button class="card-dots" data-template-id="${item.id}">&#8942;</button>
    `;

    articleExercicio.onclick = (e) => {
      if (e.target.closest(".card-dots")) return;
      abrirTemplate(item.id);
    };

    container.appendChild(articleExercicio);
  });
}