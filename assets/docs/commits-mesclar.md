

# 📄 Cheat Sheet: Como Fazer o Merge (Mesclar)

> **👑 Regra de Ouro do Merge:** > Você sempre deve estar "pisando" no branch que vai **receber** as novidades (o destino). Geralmente, esse destino é a `main`.

---

### Cenário 1: Finalizando uma Feature (O seu caso agora)
**Situação:** Você terminou a `feat/crud-exercicios`, já limpou o histórico com Squash e agora quer jogar tudo na `main`.

1. **Vá para o destino (Checkout):**
    * No **Git Graph**, dê um **duplo clique** na linha/bolinha que tem a etiqueta `main`.
    * *Sinal visual:* A bolinha branca vazada ao lado do nome do branch vai passar para a `main`, e as cores dos arquivos na esquerda vão mudar. Isso confirma que você "voltou" para a versão estável.

2.  **Puxe a novidade (Merge):**
    * Localize o topo do seu branch novo (onde está o seu commit `feat: ...` ou `Aprendizado git squash`).
    * Clique com o **botão direito** nele.
    * Selecione: **`Merge into current branch...`** (Mesclar na ramificação atual).
    * *Na janela de confirmação:* Selecione **"Yes"**.
        * *Opção "Create a new commit":* Deixe desmarcada para um histórico linear (reto) ou marcada se quiser ver a curvinha de união no gráfico.

3.  **Atualize a Nuvem:**
    * Agora sua `main` local está atualizada, mas o GitHub não.
    * Abra o terminal (`Ctrl + '`) e rode:
    ```bash
    git push
    ```
    *(Aqui não precisa de `--force`, pois é um merge normal).*

---

### Cenário 2: Múltiplas Ramificações (O Caos Organizado)
**Situação:** Você tem `feat/login`, `feat/dashboard` e `feat/relatorios`. Quer juntar tudo na `main`.

> **O segredo:** Um de cada vez. Não tente misturar tudo junto.

1.  **Vá para a `main`** (Duplo clique nela).
2.  **Merge da 1ª Feature:**
    * Clique direito na `feat/login` -> **`Merge into current branch`**.
3.  **Merge da 2ª Feature:**
    * Clique direito na `feat/dashboard` -> **`Merge into current branch`**.
    * *(Nota: Se der conflito aqui, o VS Code vai avisar e você precisará resolver arquivo por arquivo).*
4.  **Merge da 3ª Feature:**
    * Clique direito na `feat/relatorios` -> **`Merge into current branch`**.
5.  **Final:**
    * Envie tudo para a nuvem:
    ```bash
    git push
    ```

---

### 💡 Dica de Ouro Pós-Merge (Limpeza)
Depois que você jogou tudo para a `main` e garantiu que está funcionando, aquele branch antigo (`feat/crud-exercicios`) vira "lixo visual".

**Pode apagar sem dó:**
1.  Garanta que você está na `main` (bolinha branca nela).
2.  Clique com o **botão direito** no nome/etiqueta `feat/crud-exercicios`.
3.  Selecione **`Delete Branch...`**.
4.  Marque a opção **"Delete Remote Branch"** (para apagar do GitHub também) e clique em **Yes**.

*Resultado: Seu gráfico ficará uma linha única, limpa e profissional.*