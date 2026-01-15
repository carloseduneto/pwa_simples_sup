// 1. Pegamos os elementos
const btnUser = document.getElementById("btnUser");
const menuData = document.getElementById("menuData");
const userContainer = document.getElementById("userContainer");

// --- NOVO: Pegamos o botão X ---
const btnClose = document.getElementById("btnClose");

// 2. Clique na Imagem: Abre ou Fecha (Alternar)
btnUser.addEventListener("click", function (event) {
  // Impede que o clique no botão feche o menu imediatamente (propagação)
  event.stopPropagation();
  menuData.classList.toggle("mostrar");
});

// --- NOVO: Se clicar no X, apenas remove a classe ---
btnClose.addEventListener("click", function () {
  menuData.classList.remove("mostrar");
});

// 3. Clique em QUALQUER lugar da página
document.addEventListener("click", function (event) {
  // Verificamos: O clique foi DENTRO do container do usuário?
  const clicouDentro = userContainer.contains(event.target);

  // Se o clique NÃO foi dentro (foi fora), nós removemos a classe 'mostrar'
  if (!clicouDentro) {
    menuData.classList.remove("mostrar");
  }
});
