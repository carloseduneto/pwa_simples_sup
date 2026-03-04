import { initExerciseForm } from "./controllers/form-exercises.js";
import { initTemplateItensForm } from "./controllers/form-template-itens.js";
import { initTemplateForm } from "./controllers/form-templates.js";
import { renderizarListaExercicios } from "./controllers/list-exercises.js";
import { initLoginController } from "./controllers/auth-login.js";
import { renderizarTemplatesList } from "./controllers/list-templates.js";
import { renderizarListItensTemplate } from "./controllers/list-template-itens.js";
import { initWorkoutPlayer } from "./controllers/list-workout-player.js";
import { BottomNavComponent } from "./ui/bottom-nav.js";
import { initUserContextController } from "./controllers/user-context.js";
import { initWorkoutHistory } from "./controllers/list-workout-history.js";
import { initBodyAssessmentList } from "./modules/body-assessment/list-body-assessment.controller.js";
import { initBodyAssessmentForm } from "./modules/body-assessment/form-body-assessment.controller.js";
// ============================================================================
// 1. CONFIGURAÇÃO MESTRE (O "Cérebro" do App)
// ============================================================================

const rotasConfig = {
  // --- TELA DE LOGIN ---
  // Metadados de Rota (Route Meta Fields).
  login: {
    idDiv: "auth-section",
    html: "assets/screens/auth-login.html", // <-- NOVO
    tipoHeader: "nenhum",
    bottomNav: "none",
    titulo: "Login",
    onLoad: () => {
      initLoginController(); // <--- A chamada que faz a mágica
      console.log("Tela de Login carregada.");
    },
  },

  // --- TELAS ANTIGAS ---
  templates: {
    idDiv: "screen-templates-list",
    html: "assets/screens/list-templates.html", // <-- NOVO
    tipoHeader: "padrao",
    tema: "orange",
    // bottomNav: "workout", // <--- Exibe no contexto de Treino
    titulo: "Templates",
    onLoad: (id) => {
      // 1. CARREGA O SELETOR DE SEMANAS (Recomendações)
      initUserContextController();

      // CORREÇÃO: Usamos a nova função exportada
      renderizarTemplatesList((rota, param) => {
        roteador(rota, param);
      });
    },
  },
  config: {
    idDiv: "screen-config",
    html: "assets/screens/config.html",
    tipoHeader: "padrao",
    bottomNav: "none",
    titulo: "Configurações",
    onLoad: null,
  },

  // --- TELAS NOVAS ---
  workoutHistory: {
    idDiv: "screen-workout-history",
    html: "assets/screens/list-workout-history.html",
    tipoHeader: "alternativo",
    bottomNav: "none",
    titulo: "Histórico de Treinos",
    onLoad: (id) => {
      // AQUI É A MUDANÇA:
      initWorkoutHistory((rota, param) => {
        roteador(rota, param);
      });
    },
  },

  exercises: {
    idDiv: "screen-exercises",
    html: "assets/screens/list-exercises.html",
    tipoHeader: "alternativo", // <--- AQUI A MÁGICA: Usa o novo header!
    bottomNav: "none",
    titulo: "Exercícios",
    // SE voltar daqui, vai para o inicio (ou templates)
    voltarPara: "templates",
    onLoad: (id) => {
      // if (typeof renderizarListaExercicios === "function") {
      //   renderizarListaExercicios(id);
      // }
      renderizarListaExercicios((rotaDestino, paramId) => {
        roteador(rotaDestino, paramId);
      });
    },
  },
  exercisesAddEdit: {
    idDiv: "screen-exercises-add-edit",
    html: "assets/screens/form-exercises.html",
    tipoHeader: "alternativo", // Usa o novo header
    bottomNav: "none",
    // titulo: "Gerenciar Exercício",
    titulo: "",
    // SE voltar daqui, volta para a lista, não para o histórico
    voltarPara: "exercises",
    onLoad: (id) => {
      // AQUI É A MÁGICA:
      // Passamos a função 'roteador' para dentro do controller.
      // O controller vai usá-la como 'onNavigate'.
      initExerciseForm((rotaDestino, paramId) => {
        roteador(rotaDestino, paramId);
      });
    },
  },
  templateForm: {
    idDiv: "screen-template-add-edit",
    html: "assets/screens/form-templates.html",
    tipoHeader: "alternativo", // Usa o novo header
    bottomNav: "none",
    titulo: "Add/Edit Template",
    // titulo: "",
    // SE voltar daqui, volta para a lista, não para o histórico
    voltarPara: "templates",
    onLoad: (id) => {
      // if (typeof initTemplateForm === "function") {
      //   initTemplateForm();
      // }
      initTemplateForm((rotaDestino, paramId) => {
        roteador(rotaDestino, paramId);
      });
    },
  },
  templateItens: {
    idDiv: "screen-template-itens",
    html: "assets/screens/list-template-itens.html",
    tipoHeader: "drag-handle", // Usa o novo header
    bottomNav: "none",
    titulo: "Itens do Template", // Ajustei o título
    voltarPara: "templates",
    onLoad: (id) => {
      // SALVA O ID NO LOCALSTORAGE PARA GARANTIR
      if (id) localStorage.setItem("currentTemplateId", id);

      // Agora chama a função passando o callback de navegação
      renderizarListItensTemplate((rota, param) => {
        roteador(rota, param);
      });
    },
  },
  templateItensForm: {
    idDiv: "screen-template-itens-form",
    html: "assets/screens/form-template-itens.html",
    tipoHeader: "alternativo", // Usa o novo header
    bottomNav: "none",
    // titulo: "Gerenciar Exercício",
    titulo: "",
    // SE voltar daqui, volta para a lista, não para o histórico
    voltarPara: "templateItens",
    onLoad: (id) => {
      initTemplateItensForm((rotaDestino, paramId) => {
        roteador(rotaDestino, paramId);
      });
      // if (typeof initTemplateItensForm === "function") {
      //   initTemplateItensForm(id);
      // }
    },
  },
  detalhes: {
    idDiv: "screen-workout-details",
    html: "assets/screens/list-workout-player.html",
    tipoHeader: "nenhum",
    bottomNav: "none",
    titulo: "Treino em Andamento",
    onLoad: (id) => {
      // AQUI É A MUDANÇA:
      initWorkoutPlayer((rota, param) => {
        roteador(rota, param);
      }, id);
    },
  },
  bodyAssessmentList: {
    idDiv: "screen-body-assessment",
    html: "assets/js-es6/modules/body-assessment/list-body-assessment.html",
    tipoHeader: "alternativo",
    bottomNav: "none",
    tema: "havelock-blue",
    titulo: "Avaliações Físicas",
    onLoad: (id) => {
      // AQUI É A MUDANÇA:
      initBodyAssessmentList((rota, param) => {
        roteador(rota, param);
      }, id);
    },
  },
  bodyAssessmentForm: {
    idDiv: "screen-body-assessment-form",
    html: "assets/js-es6/modules/body-assessment/form-body-assessment.html",
    tipoHeader: "alternativo",
    voltarPara: "bodyAssessmentList",
    bottomNav: "none",
    tema: "havelock-blue",
    titulo: "Add/Editar Avaliação Corporal",
    onLoad: (id) => {
      // AQUI É A MUDANÇA:
      initBodyAssessmentForm((rota, param) => {
        roteador(rota, param);
      });
    },
  },
};

// function aplicarTemaPorHorario() {
//   const hora = new Date().getHours();
//   if (hora >= 18 || hora < 6) {
//     document.documentElement.setAttribute("data-mode", "dark");
//   } else {
//     document.documentElement.removeAttribute("data-mode");
//   }
// }

// // Executa no momento em que o app carrega
// aplicarTemaPorHorario();

// ============================================================================
// 2. FUNÇÕES AUXILIARES
// ============================================================================

async function carregarConteudoExterno(config, nomeRota) {
  if (!config.html) return;

  const elemento = document.getElementById(config.idDiv);
  if (!elemento) return;

  // Cache: Se já tem conteúdo, não baixa de novo
  if (elemento.innerHTML.trim().length > 0) return;

  try {
    const resposta = await fetch(config.html);
    if (resposta.ok) {
      const htmlTexto = await resposta.text();
      elemento.innerHTML = htmlTexto;
    }
  } catch (erro) {
    console.error(`Erro ao baixar a tela ${nomeRota}:`, erro);
  }
}

function gerenciarLayoutPrincipal(nomeRota) {
  const authSection = document.getElementById("auth-section");
  const appSection = document.getElementById("app-section");

  if (nomeRota === "login") {
    authSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    return false;
  } else {
    authSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    return true;
  }
}

/**
 * Atualiza o Cabeçalho (Agora manipulando as classes corretamente)
 */
function atualizarHeader(config) {
  // 1. Pegar os elementos dos Headers (Containers)
  const headerPadrao = document.getElementById("app-header");
  const headerAlt = document.getElementById("app-header-alt");
  const headerDrag = document.getElementById("app-header-drag");

  // 2. Pegar os elementos dos Títulos (CORREÇÃO AQUI)
  const tituloPadrao = document.getElementById("header-title");
  const tituloAlt = document.getElementById("header-title-alt");

  // O ID no HTML é "header-title-drag-handle", então o JS tem que buscar igualzinho
  const tituloDrag = document.getElementById("header-title-drag-handle");

  // 3. Reset: Esconde tudo primeiro
  if (headerPadrao) {
    headerPadrao.classList.add("hidden");
    headerPadrao.style.display = "none";
  }
  if (headerAlt) {
    headerAlt.classList.add("hidden");
    headerAlt.style.display = "none";
  }
  if (headerDrag) {
    headerDrag.classList.add("hidden");
    headerDrag.style.display = "none";
  }

  // 4. Mostra o escolhido e atualiza o texto
  const tipo = config.tipoHeader || "nenhum";

  if (tipo === "padrao" && headerPadrao) {
    headerPadrao.classList.remove("hidden");
    headerPadrao.style.display = "flex";
    if (tituloPadrao) tituloPadrao.innerText = config.titulo;
  } else if (tipo === "alternativo" && headerAlt) {
    headerAlt.classList.remove("hidden");
    headerAlt.style.display = "flex";
    if (tituloAlt) tituloAlt.innerText = config.titulo;
  } else if (tipo === "drag-handle" && headerDrag) {
    headerDrag.classList.remove("hidden");
    headerDrag.style.display = "flex";

    // Agora ele vai encontrar o elemento e trocar o texto!
    if (tituloDrag) tituloDrag.innerText = config.titulo;
  }
}

// ============================================================================
// 3. ROTEADOR CENTRAL
// ============================================================================

// ============================================================================
// 3. ROTEADOR CENTRAL (Versão à Prova de Falhas)
// ============================================================================

export async function roteador(
  nomeRota,
  paramId = null,
  adicionarAoHistorico = true,
) {
  console.log(`Tentando navegar para: ${nomeRota}, ID: ${paramId}`); // Debug para você ver no F12

  // 1. SALVAR ANTES DE TUDO (A CORREÇÃO PRINCIPAL) <<<<
  // Garantimos que a memória é gravada antes de qualquer erro potencial de renderização
  localStorage.setItem("app_ultima_rota", nomeRota);
  if (paramId) {
    localStorage.setItem("app_ultimo_id", paramId);
  } else {
    localStorage.removeItem("app_ultimo_id");
  }

  // 2. Validação básica
  const config = rotasConfig[nomeRota];
  if (!config) {
    console.warn(`Rota ${nomeRota} inexistente. Indo para home.`);
    // Se a rota não existe, aí sim voltamos pro template e limpamos a memória errada
    localStorage.removeItem("app_ultima_rota");
    roteador("templates", null, false);
    return;
  }

  // 2.1 Lógica Mágica do Botão Voltar (AGORA UNIVERSAL)

  // Lista de IDs de todos os headers que possuem botão de voltar
  const headersIds = ["app-header-alt", "app-header-drag"];

  headersIds.forEach((headerId) => {
    const headerEl = document.getElementById(headerId);

    // Só mexemos no botão se o header existir no HTML
    if (headerEl) {
      const btnVoltar = headerEl.querySelector("button.navigation-buttons");

      if (btnVoltar) {
        // Limpa eventos antigos (para não acumular cliques se trocar de tela rápido)
        // Clonar o nó é um truque rápido para limpar event listeners
        const novoBtn = btnVoltar.cloneNode(true);
        btnVoltar.parentNode.replaceChild(novoBtn, btnVoltar);

        // Define a ação baseada na rota atual
        if (config.voltarPara) {
          novoBtn.onclick = () => {
            console.log(`Voltando de ${nomeRota} para ${config.voltarPara}`);
            roteador(config.voltarPara);
          };
        } else {
          // Fallback seguro
          novoBtn.onclick = () => roteador("templates");
        }
      }
    }
  });

  // 3. Layout (Login vs App)
  // const ehTelaInterna = gerenciarLayoutPrincipal(nomeRota);
  // if (!ehTelaInterna) return;
  gerenciarLayoutPrincipal(nomeRota);

  // 4. Carregar HTML se necessário
  await carregarConteudoExterno(config, nomeRota);

  // 4.1 Garante que a nav existe e atualiza o estado visual dela
  await BottomNavComponent.renderizar();
  // PASSAMOS O CONTEXTO AQUI:
  BottomNavComponent.atualizarEstado(nomeRota, config.bottomNav);
  // APLICA O TEMA NA RAIZ DO DOCUMENTO
  document.documentElement.setAttribute("data-theme", config.tema || "orange");

  // 5. Oculta telas antigas
  Object.values(rotasConfig).forEach((rotaItem) => {
    if (rotaItem.idDiv !== "auth-section") {
      const el = document.getElementById(rotaItem.idDiv);
      if (el) el.classList.add("hidden");
    }
  });

  // 6. Mostra tela atual
  const telaAlvo = document.getElementById(config.idDiv);
  if (telaAlvo) telaAlvo.classList.remove("hidden");

  // 7. Atualiza Header
  atualizarHeader(config);

  // 8. Histórico URL (Visual do navegador)
  if (adicionarAoHistorico) {
    let url = `?page=${nomeRota}`;
    if (paramId) url += `&id=${paramId}`;
    window.history.pushState({ rota: nomeRota, id: paramId }, "", url);
  }

  // 9. Executa scripts da tela (Colocamos por último, pois é onde costuma dar erro)
  // Usamos um Try/Catch para que, se o script da tela falhar, o app não trave
  try {
    if (typeof config.onLoad === "function") {
      config.onLoad(paramId);
    }
  } catch (erro) {
    console.error(`Erro ao executar script da tela ${nomeRota}:`, erro);
  }
}
// ============================================================================
// 4. EVENTOS GLOBAIS & INICIALIZAÇÃO (Correção do F5)
// ============================================================================

// Botão Voltar do Navegador
window.addEventListener("popstate", (event) => {
  const estado = event.state;
  if (estado && estado.rota) {
    roteador(estado.rota, estado.id, false);
  } else {
    roteador("templates", null, false);
  }
});

// AQUI ESTÁ A CORREÇÃO DO "REFRESH" (F5)
// window.addEventListener("load", () => {
//   const params = new URLSearchParams(window.location.search);
//   const pageUrl = params.get("page");
//   const idUrl = params.get("id");

//   const pageSalva = localStorage.getItem("app_ultima_rota");
//   const idSalvo = localStorage.getItem("app_ultimo_id");

//   console.log("Memória ao abrir:", pageSalva, idSalvo); // Debug

//   if (pageUrl) {
//     roteador(pageUrl, idUrl, false);
//   } else if (pageSalva) {
//     roteador(pageSalva, idSalvo, false);
//   } else {
//     roteador("templates", null, false);
//   }
// });
