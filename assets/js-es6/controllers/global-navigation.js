import { AuthService } from "../services/auth.service.js";
import { roteador } from "../router.js";

export function initGlobalNavigation() {
  console.log("🌍 Navegação Global Iniciada (Modo Delegação)");

  // --- 1. OUVINTE GLOBAL (Event Delegation) ---
  // Captura cliques em QUALQUER lugar do documento
  document.addEventListener("click", e => {
    // A. Lógica para Botões de Navegação (data-route)
    // Verifica se o clique foi em um elemento (ou filho dele) que tem 'data-route'
    const btnRota = e.target.closest("[data-route]");

    if (btnRota) {
      // Impede comportamento padrão (ex: se fosse um link <a>)
      e.preventDefault();

      const rotaAlvo = btnRota.dataset.route;
      console.log(`🚀 Navegando via global para: ${rotaAlvo}`);

      // Fecha menu mobile se estiver aberto
      const menuCheck = document.getElementById("menu-toggle");
      if (menuCheck) menuCheck.checked = false;

      // Navega
      roteador(rotaAlvo);
      return; // Sai da função para não conflitar com outras lógicas
    }

    // B. Lógica para Botão de Logout (id="btn-logout")
    // Verifica se clicou no botão de logout ou ícone dentro dele
    const btnLogout = e.target.closest("#btn-logout");

    if (btnLogout) {
      e.preventDefault();
      handleLogout();
    }
  });
}

// Função auxiliar de logout
async function handleLogout() {
  try {
    if (confirm("Deseja realmente sair?")) {
      await AuthService.signOut();
      // O listener no main.js vai detectar o logout e redirecionar
    }
  } catch (error) {
    alert("Erro ao sair: " + error.message);
  }
}
