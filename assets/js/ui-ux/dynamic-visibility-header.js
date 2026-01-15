// Variável global para guardar a posição do último scroll
let lastScrollY = window.scrollY;

window.addEventListener("scroll", () => {
  // O SEGREDO ESTÁ AQUI:
  // Em vez de salvar o header no início do arquivo, nós buscamos ele
  // DENTRO do evento de scroll. Assim garantimos que pegamos o elemento vivo.
  const header = document.getElementById("main-header");

  // TRAVA DE SEGURANÇA:
  // Se por acaso o header não estiver na tela (usuário mudou de página, etc),
  // o comando "return" faz o código parar aqui para não dar erro.
  if (!header) return;

  // Eu: Entendi que isso pega a altura que eu rolei a página
  const currentScrollY = window.scrollY;

  // Lógica da animação
  // Eu: Se o número atual for maior que o anterior, quer dizer que desci
  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    // Se rolar para baixo e já passou de 100px: ESCONDE
    header.classList.add("header-hidden");
  } else {
    // Se rolar para cima: MOSTRA
    header.classList.remove("header-hidden");
  }

  // Atualiza a posição
  lastScrollY = currentScrollY;
});
