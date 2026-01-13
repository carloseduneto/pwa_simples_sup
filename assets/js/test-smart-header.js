let lastScrollY = window.scrollY;
const header = document.getElementById("main-header");

window.addEventListener("scroll", () => {
  const currentScrollY = window.scrollY;

  if (currentScrollY > lastScrollY && currentScrollY > 100) {
    // Se rolar para baixo e já passou de 100px: ESCONDE
    header.classList.add("header-hidden");
  } else {
    // Se rolar para cima: MOSTRA
    header.classList.remove("header-hidden");
  }

  lastScrollY = currentScrollY;
});
