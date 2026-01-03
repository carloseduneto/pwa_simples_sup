// script.js

// === 1. MONITORAMENTO DE SESSÃO ===
// Variável de controle fora do evento
let templatesJaCarregados = false;

client.auth.onAuthStateChange((event, session) => {
  // Console log para você ver o evento que está disparando (provavelmente TOKEN_REFRESHED)
  console.log("Evento de Auth:", event);

  if (session) {
    document.getElementById("auth-section").classList.add("hidden");
    document.getElementById("app-section").classList.remove("hidden");
    document.getElementById("user-email").innerText = session.user.email;

    // SÓ busca se ainda não tiver buscado
    if (!templatesJaCarregados) {
      buscarTemplates();
      templatesJaCarregados = true; // Marca como carregado
    }
  } else {
    document.getElementById("auth-section").classList.remove("hidden");
    document.getElementById("app-section").classList.add("hidden");

    // Reseta a flag quando deslogar, para que no próximo login busque de novo
    templatesJaCarregados = false;

    // Opcional: Limpar a lista visualmente também
    document.getElementById("lista-templates").innerHTML = "";
  }
});

// === 2. FUNÇÕES DE AUTENTICAÇÃO ===
async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await client.auth.signUp({ email, password });

  if (error) alert(error.message);
  else alert("Verifique seu email!");
}

async function signIn() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) alert(error.message);
}

async function signOut() {
  await client.auth.signOut();
}

// === 3. CONSULTA VIA EDGE FUNCTION (A parte robusta) ===
async function callEdgeFunction() {
  const output = document.getElementById("result");
  output.innerText = "Carregando Edge Function...";

  const { data, error } = await client.functions.invoke("get-examples", {
    method: "GET",
  });

  if (error) {
    output.innerText = "Erro: " + JSON.stringify(error, null, 2);
  } else {
    output.innerText = JSON.stringify(data, null, 2);
  }
}

// === 4. CONSULTA VIA FRONTEND (A parte simples - SEM CACHE) ===
async function buscarExercicios() {
  const container = document.getElementById("lista-exercicios");
  container.innerHTML = "Carregando exercícios...";

  // Vai direto no banco buscar os dados
  const { data, error } = await client
    .from("exercicios")
    .select("id, nome, grupo_muscular")
    .order("nome");

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }

  // Renderiza na tela
  renderizarExercicios(data);
}

function renderizarExercicios(lista) {
  const container = document.getElementById("lista-exercicios");
  container.innerHTML = ""; // Limpa a mensagem de "carregando"

  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum exercício encontrado.</p>";
    return;
  }

  lista.forEach(item => {
    const div = document.createElement("div");
    div.className = "exercicio-item";
    div.textContent = item.nome;
    container.appendChild(div);
  });
}

//=== 5. CONSULTA TEMPLATES (SEM CACHE) ===
async function buscarTemplates() {
  const container = document.getElementById("lista-templates");
  container.innerHTML = "Carregando templates...";

  // Vai direto no banco buscar os dados
  const { data, error } = await client
    .from("templates")
    .select("id, nome, descricao")
    .order("nome");

  if (error) {
    container.innerHTML = "Erro ao buscar: " + error.message;
    return;
  }
  // Renderiza na tela

  console.log("Templates encontrados:");
  console.log(data);
  renderizarTemplates(data);
}

function renderizarTemplates(lista) {
  const container = document.getElementById("lista-templates");
  container.innerHTML = ""; // Limpa a mensagem de "carregando"
  if (lista.length === 0) {
    container.innerHTML = "<p>Nenhum template encontrado.</p>";
    return;
  }
  lista.forEach(item => {
    const div = document.createElement("div");
    div.className = "template-item";
    div.textContent = item.nome + " - " + item.descricao;

    // ADICIONE AQUI
    // O "() =>" serve para a função não rodar sozinha, só no clique
    div.onclick = () => renderizarItensDeTemplate(item.id);

    container.appendChild(div);
  });
}

// === 6. CONSULTA ITENS DE TEMPLATE (SEM CACHE, POR ENQUANTO) ===
async function buscarItensDeTemplate(templateId) {
  const { data, error } = await client
    .from("template_itens")
    .select("id, exercicio_id, treino_recomendacoes")
    .eq("template_id", templateId)
    .order("ordem");
  if (error) {
    console.error("Erro ao buscar itens de template:", error);
    return;
  }
  console.log("Itens do template", templateId, data);
  return data;
}

async function renderizarItensDeTemplate(templateId) {
  const itens = await buscarItensDeTemplate(templateId);
  if (!itens) return;

  let detalhes = "Itens do Template:\n";
  for (const item of itens) {
    detalhes += `- Exercício ID: ${item.exercicio_id}, Recomendações: ${item.treino_recomendacoes}\n`;
  }
  alert(detalhes);
}