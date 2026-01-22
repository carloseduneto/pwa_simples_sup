# 1. Quando usar o Amend (A "Borracha")

Use para corrigir o passado imediato (o último commit que você acabou de fazer).

* **Cenário:** Você fez o commit `Feat: Botão azul`.
* **O erro:** Dois segundos depois, viu que esqueceu um ponto e vírgula ou o tom de azul estava errado.
* **Ação:** Corrige o arquivo, dá stage e faz o Amend.
* **Resultado:** O commit original é substituído pelo corrigido. Ninguém viu o erro.

> **Regra:** Só use Amend no último commit. Se o erro foi há 5 commits atrás, não use Amend, use um commit novo de correção.

---

# 2. Quando usar WIP + Squash (Os "Checkpoints")

Use para construir o futuro (funcionalidades que levam tempo).

* **Cenário:** Criar o Pop-up.

**Ação:**
* Fez HTML? -> `Commit wip: html`
* Fez CSS? -> `Commit wip: css`
* Vai dormir ou trocar de máquina? -> `git push origin` (Push normal).
* Voltou, fez JS? -> `Commit wip: js`
* Corrigiu bug? -> `Commit fix: erro no loop`

**Finalização:** Tudo está pronto e lindo?

* **Ação:** Soft Reset (volte para antes do primeiro WIP).
* **Commit Final:** `Feat: Pop-up de promoções completo`.