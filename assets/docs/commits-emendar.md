# 📝 Cheat Sheet: Como Emendar Commits (Amend)

**Objetivo:** Adicionar arquivos esquecidos ou corrigir a mensagem do **último** commit sem criar um novo (sem "sujar" o histórico).

### 1. Preparar o Arquivo
1.  Faça a alteração necessária ou crie o arquivo que faltou.
2.  Na aba de **Controle de Código-Fonte** (menu esquerdo), clique no **`+`** ao lado do arquivo para movê-lo para **Alterações Armazenadas** (Staged).

### 2. Acessar o Amend
1.  Localize o botão azul grande **Confirmar** (Commit).
2.  Clique na **setinha `v`** localizada no lado direito desse botão.
3.  Selecione a opção **Confirmar (Corrigir)** (ou *Commit (Amend)*).

### 3. Confirmar
1.  A caixa de texto abrirá contendo a mensagem do seu último commit.
    * *Se quiser mudar o nome:* Apague e escreva o novo.
    * *Se for só adicionar arquivo:* Mantenha o nome como está.
2.  Aperte **Enter** ou clique no ícone de check (✔) para salvar.

---

### ⚠️ A Regra de Ouro (Sincronização)
Se você **JÁ** tinha enviado esse commit para o GitHub antes de emendar:
1.  O gráfico vai mostrar uma ramificação (bifurcação).
2.  **NÃO** clique no botão de sincronizar do VS Code.
3.  Abra o terminal (`Ctrl + '`) e force a atualização:
    ```bash
    git push origin HEAD --force
    ```