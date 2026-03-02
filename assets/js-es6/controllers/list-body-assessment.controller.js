import { GlobalLoader } from "../ui/global-loader.js";
import { BodyAvaliacoesService } from "../services/body-avaliacoes.service.js";

export async function initBodyAssessmentList(onNavigate) {
  const container = document.getElementById("body-assessment-container");
  const template = document.querySelector(".template-body-assessment-item");
  if (!container || !template) return;
    container.innerHTML = GlobalLoader.getSimple();
    try {
        const avaliacoes = await BodyAvaliacoesService.getAll();
        console.table(avaliacoes);

        if (!avaliacoes || avaliacoes.length === 0) {
            container.innerHTML =
                '<p style="text-align:center; opacity: 0.6;">Nenhuma avaliação corporal encontrada.</p>';
            return;
        }
        container.innerHTML = "";
        avaliacoes.forEach((avaliacao) => {
            const clone = template.content.cloneNode(true);
            const titleItem = clone.querySelector(".list-item__title");
            const subtitleItem = clone.querySelector(".list-item__subtitle");
            const dateItem = clone.querySelector(".list-item__date");
            let localDate = new Date(avaliacao.data_registro);
            let dateItemValue = localDate.toLocaleDateString("pt-BR", {
                // day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
            titleItem.innerText = `Avaliação #${avaliacao.id} - ${avaliacao.avaliador}, ${dateItemValue}`;
            subtitleItem.innerText = `Peso: ${avaliacao.value.peso} kg | Altura: ${avaliacao.value.altura} m`;
            container.appendChild(clone);
        }
        );
    } catch (error) {
        console.error("Falha ao buscar avaliações corporais:", error);
    }
}