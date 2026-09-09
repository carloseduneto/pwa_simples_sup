import { AuthService } from "../services/auth.service.js";
import { UserContextService } from "../services/user-context.service.js";
import { GlobalLoader } from "../ui/global-loader.js";

export async function initConfigController() {
  const form = document.querySelector('form[action="user-preferences"]');
  const select = document.getElementById("week-register");

  if (!form || !select) return;

  try {
    const userId = await AuthService.getUserId();
    const userData =
      await UserContextService.getUserDataByIdPreferences(userId);

    // Preenche o valor salvo
    const currentMode = userData?.preferences?.["week-register"] || "manual";
    select.value = currentMode;

    // Submissão do formulário
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.innerText;

      try {
        btn.innerText = "Salvando...";
        btn.disabled = true;

        const newPreferences = {
          "week-register": select.value,
        };

        await UserContextService.updateUserPreferences(userId, newPreferences);
        alert("Preferências salvas com sucesso.");
        location.reload();
      } catch (error) {
        console.error(error);
        alert("Erro ao salvar preferências.");
      } finally {
        btn.innerText = originalText;
        btn.disabled = false;
      }
    });
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
  }
}
