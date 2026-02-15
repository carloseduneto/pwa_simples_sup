import { TreinoRecomendacoesService } from "../services/treino-recomendacoes.service.js";
import { AuthService } from "../services/auth.service.js";

export async function initUserContextController() {
  const container = document.getElementById("container-recomendacoes");

  // Se não existir o container na tela atual (ex: tela de login), sai sem erro.
  if (!container) return;

  container.innerHTML =
    '<span style="font-size:12px; color:#666;">Carregando semanas...</span>';

  try {
    const userId = await AuthService.getUserId();
    if (!userId) {
      container.innerHTML = "";
      return;
    }

    // Busca opções e seleção atual em paralelo (mais rápido)
    const [opcoes, contexto] = await Promise.all([
      TreinoRecomendacoesService.getSemanasOptions(),
      TreinoRecomendacoesService.getUserContext(userId),
    ]);

    const idSelecionado = contexto ? contexto.current_modifier_id_series : null;

    // Renderiza o Select
    let html = `
      <select id="select-semana" style="padding: 8px; width: 100%; border-radius: 8px; border: 1px solid #ccc;" class="input-select-context-recomendacoes">
        <option value="" disabled ${!idSelecionado ? "selected" : ""}>Selecione a fase do treino...</option>
    `;

    opcoes.forEach(opcao => {
      const isSelected = opcao.id === idSelecionado ? "selected" : "";
      html += `
        <option value="${opcao.id}" ${isSelected}>
           Semana ${opcao.week} - ${opcao.nome}
        </option>
      `;
    });

    html += `</select>`;
    container.innerHTML = html;

    // Adiciona o Evento de Mudança (Change)
    const selectEl = document.getElementById("select-semana");

    selectEl.addEventListener("change", async e => {
      const novoId = e.target.value;
      try {
        // Feedback visual (desabilita enquanto salva)
        selectEl.disabled = true;
        selectEl.style.opacity = "0.7";

        await TreinoRecomendacoesService.updateUserContext(userId, novoId);

        // Opcional: Feedback de sucesso rápido
        // alert("Semana atualizada!");
      } catch (err) {
        alert("Erro ao salvar semana: " + err.message);
      } finally {
        selectEl.disabled = false;
        selectEl.style.opacity = "1";
      }
    });
  } catch (error) {
    console.error("Erro controller contexto:", error);
    container.innerHTML =
      '<p style="color:red; font-size:12px">Erro ao carregar opções.</p>';
  }
}
