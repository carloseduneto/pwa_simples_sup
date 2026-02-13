// Dados de exemplo (Simulando seu banco de dados)
const meusExercicios = [
  { id: 1, nome: "Supino Reto", grupo: "Peito" },
  { id: 2, nome: "Agachamento Livre", grupo: "Pernas" },
  { id: 3, nome: "Rosca Direta", grupo: "Bíceps" },
];

function renderizarListaExercicios() {
  // 1. Pegar o container onde vamos soltar os itens
  const container = document.getElementById("lista-exercicios-container");

  // 2. Pegar o template (o carimbo)
  const template = document.querySelector(".template-exercices-item");

  // Segurança: Se não achou a tela ou o template, para tudo (evita erros)
  if (!container || !template) return;

  // 3. Limpar a lista antes de adicionar (para não duplicar se chamar 2x)
  container.innerHTML = "";

  // 4. O Loop Mágico
  meusExercicios.forEach(exercicio => {
    // A: Clona o conteúdo do template (true significa copiar tudo dentro dele)
    const clone = template.content.cloneNode(true);

    // B: Preenche os dados dentro do clone
    // Buscamos os elementos DENTRO do clone, não do documento inteiro
    const nomeEl = clone.querySelector(".exercise-item__name");
    const grupoEl = clone.querySelector(".exercise-item__group");

    nomeEl.innerText = exercicio.nome;
    grupoEl.innerText = exercicio.grupo;

    // C: Configurar botões (Exemplo do botão editar)
    const btnEdit = clone.querySelector(".exercise-item__btn--edit");
    btnEdit.onclick = () => {
      console.log("Editando exercício ID:", exercicio.id);
      roteador("exercisesAddEdit", exercicio.id);
    };

    // D: Adiciona o clone preenchido na tela final
    container.appendChild(clone);
  });
}
