export function calcularIdade(
  dataNascimentoStr,
  dataRegistroStr = new Date(),
) {
  const nascimento = new Date(dataNascimentoStr);
  // Se dataRegistroStr for uma string, o new Date a converte.
  // Se já for o objeto Date padrão, ele apenas o reafirma.
  const registro = new Date(dataRegistroStr);

  let idade = registro.getFullYear() - nascimento.getFullYear();
  const mes = registro.getMonth() - nascimento.getMonth();

  if (mes < 0 || (mes === 0 && registro.getDate() < nascimento.getDate())) {
    idade--;
  }

  return idade;
}
