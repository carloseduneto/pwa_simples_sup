import { GlobalLoader } from "../ui/global-loader.js";
import { WorkoutHistoryService } from "../services/workout-history.service.js";

export async function initWorkoutHistory(onNavigate) {
  const container = document.getElementById("workout-history-container");
  const template = document.querySelector(".template-workout-history-item");
  if (!container || !template) return;

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const sessoesTreinos = await WorkoutHistoryService.getRecentSessions(50);
    console.table(sessoesTreinos);

    if (!sessoesTreinos || sessoesTreinos.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; opacity: 0.6;">Nenhuma sessão de treino encontrada.</p>';
      return;
    }

    container.innerHTML = "";

    sessoesTreinos.forEach((sessao) => {
      const clone = template.content.cloneNode(true);

      const titleItem = clone.querySelector(".list-item__title");
      const subtitleItem = clone.querySelector(".list-item__subtitle");
      const badgeItem = clone.querySelector(".list-item__badge");
      const dateItem = clone.querySelector(".list-item__date");

      const diaDaSemana = new Date(sessao.data_inicio).toLocaleDateString(
        "pt-BR",
        {
          weekday: "long",
        },
      );

      let localDate = new Date(sessao.data_inicio);

      titleItem.innerText =
        sessao.template_nome + " - " + capitalizar(diaDaSemana) || "Treino sem template";
      subtitleItem.innerText =
        sessao.grupos_musculares || "Sem grupos musculares";
      badgeItem.innerText = `S${sessao.semana_base}`;
      dateItem.innerText = localDate.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });

      container.appendChild(clone);
    });
  } catch (error) {
    console.error("Falha ao buscar histórico:", error);
  }
}

function capitalizar(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}