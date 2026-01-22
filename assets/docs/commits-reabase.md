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