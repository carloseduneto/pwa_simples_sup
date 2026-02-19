// Este objeto serve apenas para devolver o HTML do loader
// Assim, se você mudar o HTML aqui, muda no site todo.

export const GlobalLoader = {
  // Retorna o HTML em formato de string para você injetar onde quiser
  getSimple: () => {
    return `
      <div class="espaco-loader" style="height: 100%; min-height: 200px; display: flex; align-items: center; justify-content: center;">
        <div class="loader"></div>
      </div>
    `;
  },

  // Se quiser um loader menorzinho para botões futuramente
  getMini: () => {
    return `<div class="loader" style="width: 20px; height: 20px; border-width: 2px;"></div>`;
  },
};
