import "./config/config.js"; // Config carrega primeiro (Client Supabase)
import "./router.js"; // Router carrega depois

// UI/UX Imports
import { initHeaderScroll } from "./ui/dynamic-visibility-header.js";
import { initUserMenu } from "./ui/menu-flutuante-header.js";
import { initWorkoutUIHelper } from "./ui/workout-ui-helper.js";

// Controllers Imports
import { initTemplateOptions } from "./controllers/options-templates.js";
import { initUserContextController } from "./controllers/user-context.js";
import { initGlobalNavigation } from "./controllers/global-navigation.js";

// Services Imports
import { AuthService } from "./services/auth.service.js";
import { roteador } from "./router.js"; // Importe o roteador para usar no callback

// --- 1. INICIALIZAÇÃO DE UI ---
initUserMenu(); // Menu flutuante
initHeaderScroll(); // Scroll do header
initTemplateOptions(); // Menu de opções (3 pontinhos)
initWorkoutUIHelper(); // <--- Inicia os listeners de input e check do treino
initGlobalNavigation();

// --- 2. SISTEMA DE AUTENTICAÇÃO E ROTA ---

// --- SISTEMA DE AUTENTICAÇÃO E ROTA ---

// Variável para evitar loop de redirecionamento
let primeiraCarga = true;

AuthService.onAuthStateChange((event, session) => {
  console.log("Evento de autenticação:", event); // Debug para ver o evento no F12
  // Remove Loader Inicial
  const loader = document.getElementById("initial-loader");
  if (loader) loader.style.display = "none";

  if (session) {
    console.log("✅ Usuário logado:", session.user.email);

    // Atualiza UI Global
    const emailDisplay = document.getElementById("user-email");
    if (emailDisplay) emailDisplay.innerText = session.user.email;

    // --- LÓGICA DE REDIRECIONAMENTO INTELIGENTE ---
    if (primeiraCarga) {
      primeiraCarga = false; // Trava para não rodar de novo
      // initUserContextController();

      // 1. Verifica se tem algo na URL (Link compartilhado)
      const params = new URLSearchParams(window.location.search);
      const pageUrl = params.get("page");
      const idUrl = params.get("id");

      // 2. Verifica memória (F5)
      const rotaSalva = localStorage.getItem("app_ultima_rota");
      const idSalvo = localStorage.getItem("app_ultimo_id");

      // DECISÃO:
      if (pageUrl) {
        // Prioridade 1: URL
        roteador(pageUrl, idUrl);
      } else if (rotaSalva && rotaSalva !== "login") {
        // Prioridade 2: Memória (mas ignora se for 'login', pq ele já tá logado)
        roteador(rotaSalva, idSalvo);
      } else {
        // Prioridade 3: Home
        roteador("templates");
      }
    }
    // Se não for primeira carga (ex: login manual), manda pra home se estiver na tela de login
    else {
      const authSection = document.getElementById("auth-section");
      if (authSection && !authSection.classList.contains("hidden")) {
        roteador("templates");
      }
    }
  } else {
    console.log("🔒 Usuário deslogado");
    primeiraCarga = false; // Destrava
    roteador("login");
  }
});

import { BodySchemaService } from "./services/body-schema.sevice.js";
//Teste body-schema
(async () => {
  try {
    const schemas = await BodySchemaService.getAll();
    console.log("Esquemas corporais:", schemas);
  } catch (error) {
    console.error("Erro ao buscar esquemas corporais:", error);
  }
})();

import { BodyAvaliacoesService } from "./services/body-avaliacoes.service.js";

//Teste body-avaliacoes
(async () => {
  try {
    const avaliacoes = await BodyAvaliacoesService.getLastRegistered();
    console.log("Avaliações corporais:", avaliacoes);
  } catch (error) {
    console.error("Erro ao buscar avaliações corporais:", error);
  }
})();
