import { AuthService } from "../services/auth.service.js";

export function initLoginController() {
  console.log("🔓 Controller de Login: INICIADO");

  const btnLogin = document.getElementById("btn-signin");
  const inputEmail = document.getElementById("email");
  const inputPass = document.getElementById("password");

  // Debug para ver se achou os elementos
  if (btnLogin) console.log("✅ Botão de Login encontrado");
  else
    console.error("❌ Botão de Login NÃO encontrado (Verifique o ID no HTML)");

  if (btnLogin) {
    // Removemos onclicks antigos por segurança
    btnLogin.onclick = null;

    btnLogin.onclick = async e => {
      e.preventDefault(); // Impede recarregar a página
      console.log("👆 Botão Clicado!");

      const email = inputEmail.value;
      const password = inputPass.value;

      if (!email || !password) {
        alert("Por favor, preencha email e senha.");
        return;
      }

      try {
        // Feedback visual
        btnLogin.innerText = "Entrando...";
        btnLogin.disabled = true;

        console.log("Tentando logar com:", email);

        // Chama o serviço
        await AuthService.signIn(email, password);

        console.log("Login OK! O main.js deve redirecionar agora.");
        // Não precisa fazer nada aqui, o listener no main.js vai te levar pra home
      } catch (error) {
        console.error("Erro no login:", error);
        alert("Erro: " + error.message);

        // Restaura botão
        btnLogin.innerText = "Entrar";
        btnLogin.disabled = false;

        // Ícone de volta
        const icon = document.createElement("span");
        icon.className = "material-symbols-rounded";
        icon.innerText = "arrow_forward";
        btnLogin.appendChild(icon);
      }
    };
  }
}
