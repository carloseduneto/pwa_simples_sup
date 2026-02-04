# 📝 Cheat Sheet: Como Unir Commits (Squash)

**Objetivo:** Juntar vários commits de trabalho ("wips") em um único commit organizado e limpo.

### 🛠️ Pré-requisitos
* Extensão **Git Graph** instalada no VS Code.

---

### 1. Encontre o "Chão" (A Base)
1.  Abra a visualização do **Git Graph**.
2.  Localize o commit que está **imediatamente abaixo** da lista de wips que você quer juntar.
    * *Dica: Não clique em um dos wips, clique no commit "pai" deles (o último commit seguro).*

### 2. Inicie o Processo
1.  Clique com o **botão direito** nesse commit base.
2.  Selecione a opção: **`Rebase current branch on this Commit...`**
3.  Na janela que abrir:
    * [x] Marque a caixa: **Launch Interactive Rebase...**
    * Clique em **Yes**.

### 3. Configure a União (Editor de Texto)
O VS Code abrirá um arquivo de texto listando seus commits.
1.  **1ª linha (mais antiga):** Deixe como `pick`.
2.  **Outras linhas (wips):** Mude a palavra `pick` para `s` (ou `squash`).
3.  Salve o arquivo e feche a aba.

> **🆘 Socorro, abriu uma tela preta (Vim)?**
> Se abrir um terminal preto em vez do editor normal:
> 1.  Aperte `i` para conseguir editar.
> 2.  Faça as alterações (mude para `s`).
> 3.  Aperte `Esc` para sair do modo de edição.
> 4.  Digite `:wq` e aperte `Enter` para salvar e sair.

### 4. Dê o Nome Final
Um novo arquivo abrirá pedindo a mensagem do commit.
1.  Apague as mensagens antigas de "wip".
2.  Escreva o **nome definitivo** da funcionalidade (ex: `feat: finaliza cadastro de usuários`).
3.  Salve e feche.

### 5. Atualize o Servidor (Obrigatório)
Como você reescreveu o histórico, é necessário forçar a atualização no GitHub.
1.  Abra o terminal (`Ctrl + '`).
2.  Rode o comando:
    ```bash
    git push origin HEAD --force
    ```



#Quer "descolar commit base e recolar"
Como fazer isso no Git Graph (Passo a Passo)
Vamos supor este cenário:

Você corrigiu um bug na ramificação feat/crud-exercicios e fez o commit lá.

Agora você quer levar essa correção para a feat/crud-templates sem criar nós.

Siga estes cliques:

Vá para a ramificação filha: Dê duplo clique na feat/crud-templates para fazer o checkout (ficar nela).

Escolha a nova base: No gráfico, encontre o commit mais recente da feat/crud-exercicios (onde está a correção).

O comando mágico: Clique com o botão direito nesse commit da exercicios e selecione: 👉 Rebase current branch on this Commit

Confirmação: Uma janela vai perguntar se tem certeza. Clique em Yes, rebase.

O que vai acontecer visualmente?
O Git vai pegar seus commits de templates, vai "descolá-los" temporariamente, atualizar a base com a correção, e "colar" seus commits de volta no topo. A linha ficará reta, azul e contínua, exatamente como está agora, mas contendo a correção lá na base.

⚠️ O "Pulo do Gato" (Importante)
Sempre que você faz Rebase, você mudou o passado da ramificação. O GitHub vai rejeitar se você tentar enviar normalmente. Por isso, após um Rebase, você sempre precisa usar o comando de força no terminal para atualizar o servidor:

Bash
git push origin feat/crud-templates --force
Isso garante que a linha reta bonita do seu computador substitua a linha antiga do servidor.