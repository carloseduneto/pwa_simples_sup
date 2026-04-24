import { GlobalLoader } from "../../ui/global-loader.js";

// Função auxiliar para calcular idade a partir da data de nascimento e data de registro
import { BodyAvaliacoesService } from "../body-assessment/body-avaliacoes.service.js";

// User data
import { AuthService } from "../../services/auth.service.js";
import { UserContextService } from "../../services/user-context.service.js";

// Função auxiliar para calcular idade a partir da data de nascimento e data de registro
import { gerarListItem } from "../../components/list-item.js"; // <-- Importa o componente
import { calcularFaulkner } from "../../utilities/calcularPercentualGordura.js";
import { calcularPollock7Dobras } from "../../utilities/calcularPercentualGordura.js";
import { calcularIdade } from "../../utilities/calcularIdade.js";

export async function initBodyAssessmentList(onNavigate) {
  const container = document.getElementById("body-assessment-container");
  if (!container) return;

  container.innerHTML = GlobalLoader.getSimple();

  try {
    const avaliacoes = await BodyAvaliacoesService.getAll();

    if (!avaliacoes || avaliacoes.length === 0) {
      container.innerHTML =
        '<p style="text-align:center; opacity: 0.6;">Nenhuma avaliação corporal encontrada.</p>';
      return;
    }

    const userId = await AuthService.getUserId();
    if (!userId) {
      container.innerHTML = "";
      return;
    }

    // Busca opções e seleção atual em paralelo (mais rápido)
    const userData = await Promise.all([
      UserContextService.getUserData(userId),
    ]);

    console.log("Dados do usuário para contexto:", userData);

    let htmlLista = "";

    // Adicionamos o "index" como segundo parâmetro
    avaliacoes.forEach((avaliacao, index) => {
      const localDate = new Date(avaliacao.data_registro);
      const dateItemValue = localDate.toLocaleDateString("pt-BR", {
        month: "2-digit",
        year: "numeric",
      });

      const dobras = {
        dobra_tricipital: avaliacao.value.dobra_tricipital,
        dobra_subescapular: avaliacao.value.dobra_subescapular,
        dobra_suprailiaca: avaliacao.value.dobra_suprailiaca,
        dobra_abdominal: avaliacao.value.dobra_abdominal,
      };

      const valor = calcularFaulkner(dobras);

      // Se valor existir, cria a string. Se for null/undefined, fica vazio "".
      const percentualGordura = valor ? ` - ${valor}` : "";

      // Para o cálculo do Pollock 7 Dobras, precisamos de mais dobras e informações
      const idadeDynamic = calcularIdade(
        userData[0].data_nascimento,
        avaliacao.data_registro,
      );
      console.log("Idade calculada:", idadeDynamic);

      const dobrasPollock = {
        dobra_tricipital: avaliacao.value.dobra_tricipital,
        dobra_subescapular: avaliacao.value.dobra_subescapular,
        dobra_suprailiaca: avaliacao.value.dobra_suprailiaca,
        dobra_abdominal: avaliacao.value.dobra_abdominal,
        dobra_peitoral: avaliacao.value.dobra_peitoral,
        dobra_axilar_media: avaliacao.value.dobra_axilar_media,
        dobra_coxa: avaliacao.value.dobra_coxa,
      };

      const idade = 25;
      const sexo = "masculino";

      const percentualPollock7Dobras = calcularPollock7Dobras(
        dobrasPollock,
        idade,
        sexo,
      );

      let percentualPollock7DobrasIdade = calcularPollock7Dobras(
        dobrasPollock,
        idadeDynamic,
        sexo,
      );

      console.log(
        "Percentual de Gordura (Pollock 7 Dobras):",
        percentualPollock7Dobras,
        "Idade dinâmica:",
        percentualPollock7DobrasIdade,
      );

      percentualPollock7DobrasIdade = avaliacao.value.gordura == percentualPollock7DobrasIdade || percentualPollock7DobrasIdade == null ? 
      avaliacao.value.gordura
      :
      percentualPollock7DobrasIdade;

      htmlLista += gerarListItem({
        id: avaliacao.id,
        // Aqui usamos o index + 1 para começar a contagem do 1
        titulo: `Avaliação #${avaliacoes.length - index}`,
        subtitulo: `${avaliacao.value.peso} kg, ${percentualPollock7DobrasIdade}${percentualGordura}%`,
        titleComplement: `${avaliacao.avaliador}`,
        data: dateItemValue,
        mostrarAcoes: true,
      });
    });

    container.innerHTML = htmlLista;

    // Monitorar os cliques nos botões recém-criados
    container.onclick = async (e) => {
      // 1. Encontra o elemento pai que contém os dados, não importa onde foi o clique
      const itemContainer = e.target.closest(".list-item");

      // Se clicou fora de um item (no espaço vazio do container), encerra
      if (!itemContainer) return;

      // 2. Extrai o ID uma única vez
      const id = itemContainer.dataset.id;

      if (id) {
        console.log("Ir para detalhes da avaliação:", id);
        localStorage.setItem("detailBodyAssessmentId", id);
        if (onNavigate) onNavigate("bodyAssessmentDetail");
      }

      const btnEdit = e.target.closest(".list-item__btn--edit");
      const btnDelete = e.target.closest(".list-item__btn--delete");

      if (btnEdit) {
        const id = btnEdit.dataset.id;
        console.log("Editar avaliação:", id);

        // onNavigate("rotaEdicao", id);
        localStorage.setItem("editBodyAssessmentId", id);
        // roteador("exercisesAddEdit");
        if (onNavigate) onNavigate("bodyAssessmentForm");
      }

      if (btnDelete) {
        const id = btnDelete.dataset.id;
        console.log("Excluir avaliação:", id);
        // Lógica de exclusão
        // --- Botão Excluir ---

        // 1. Sobe a árvore até encontrar o cartão inteiro da lista
        const cartao = btnDelete.closest(".list-item");

        // 2. Desce na árvore a partir do cartão para achar o título
        // Usamos querySelector porque estamos buscando para baixo
        let avaliacaoNome = "esta avaliação"; // Texto de fallback de segurança

        if (cartao) {
          const tituloElement = cartao.querySelector(".list-item__title");
          if (tituloElement) {
            // Pegamos apenas o texto antes do ponto (•), usando split
            avaliacaoNome = tituloElement.innerText.split("•")[0].trim();
          }
          // avaliacaoNome = tituloElement ? tituloElement.innerText : avaliacaoNome;
        }

        const confirmacao = confirm(
          `Deseja realmente excluir ${avaliacaoNome}?`,
        );
        if (confirmacao) {
          try {
            await BodyAvaliacoesService.delete(id);
            initBodyAssessmentList(onNavigate);
          } catch (err) {
            alert("Erro ao excluir: " + err.message);
          }
        }
      }
    };
  } catch (error) {
    console.error("Falha ao buscar avaliações:", error);
    container.innerHTML =
      '<p style="color:red;">Erro ao carregar avaliações.</p>';
  }
}
