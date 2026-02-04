# 📁 Guia Git: Sincronizando Máquinas após um Force Push

Este guia serve para quando você reescreveu o histórico na **Máquina A** (usando `amend`, `rebase` e `push --force`) e precisa atualizar a **Máquina B** sem causar conflitos ou duplicar commits.

---

## ⛔ A Regra de Ouro
**NUNCA faça um `git pull` simples na Máquina B nessa situação.**

Se você fizer um `pull` normal, o Git tentará misturar o histórico antigo (local) com o novo (servidor), criando uma bagunça de commits duplicados.

---

## Cenário 1: Máquina B NÃO tem trabalho novo
*Você não escreveu nenhum código novo na Máquina B. Só quer atualizar.*

### Pelo Git Graph (Visual)
1.  **Fetch (Buscar):** Clique no ícone de nuvem/download na barra superior do Git Graph para baixar as atualizações do servidor (sem mesclar).
2.  **Identificar:** Note que o seu branch local (ex: `main`) e o remoto (`origin/main`) estarão em lugares diferentes.
3.  **Reset:**
    * Clique com o **botão direito** na etiqueta do remoto (`origin/main`).
    * Escolha **"Reset current branch to here..."**.
    * Selecione o modo **Hard**.
    * Confirme.

### Pelo Terminal
```bash
git fetch origin
git reset --hard origin/main
```


## 🚧 Cenário 2: Máquina B TEM trabalho novo (Código não salvo)

*Situação: Você escreveu código novo na Máquina B que ainda não enviou (commit), mas precisa baixar a nova versão "forçada" da Máquina A.*

> ⚠️ **Atenção:** Se você der um *Reset Hard* direto, **você perderá seu código novo para sempre**. Siga os passos abaixo com calma.

---

### Passo 1: Guardar suas mudanças (Stash)
Antes de tudo, vamos guardar seu trabalho numa "gaveta" temporária do Git para que ele não seja apagado.

1.  Abra o painel **Source Control** do VS Code (ícone de árvore/git na barra lateral esquerda).
2.  Clique nos **`...` (três pontos)** no topo do painel, ao lado do nome "Source Control".
3.  Vá no menu **Stash** -> **Stash (Include Untracked)**.
4.  Digite um nome para lembrar (ex: `meu trabalho pendente`).
5.  Pressione `Enter`.
    * *O que acontece:* Seu código sumirá do editor e voltará ao estado "limpo" (último commit). **Não se assuste, ele está salvo na memória do Git.**

---

### Passo 2: Sincronizar (Fetch + Reset)
Agora que a máquina está "limpa" e seu trabalho está seguro, vamos atualizar o histórico.

1.  Abra o **Git Graph**.
2.  Clique no botão **Fetch** (nuvem na barra superior).
3.  Localize a etiqueta do branch remoto (ex: `origin/main` ou `origin/HEAD`).
4.  Clique com o **botão direito** nessa etiqueta.
5.  Selecione **"Reset current branch to here..."**.
6.  Em "Reset Mode", escolha **Hard** e confirme.
    * *Agora sua máquina B está idêntica à máquina A, mas sem o seu trabalho novo ainda.*

---

### Passo 3: Recuperar seu trabalho (Pop Stash)
Agora vamos pegar seu código da "gaveta" e aplicar em cima da versão nova.

1.  Volte ao painel **Source Control** do VS Code.
2.  Clique nos **`...` (três pontos)** -> **Stash**.
3.  Selecione **Pop Latest Stash** (Isso pega o último item guardado e aplica).
    * *O Git tentará "colar" suas modificações em cima do código atualizado.*

> **🔴 Nota sobre Conflitos:** Se as linhas que você alterou na Máquina B também foram alteradas na Máquina A de forma diferente, o Git avisará que houve **Conflito**. Você verá marcações no código e precisará escolher qual versão manter (a sua ou a que veio do servidor).