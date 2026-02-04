Problema que tive:
Tentei trocar de branch e o VS Code avisou que minhas alterações seriam substituídas.

Por que aconteceu:
Eu tinha mudanças não commitadas e o Git não deixa trocar de branch porque isso poderia sobrescrever arquivos.

Solução:
Usei “Stash & Checkout” no VS Code (equivale a git stash).

O que aprendi:
Stash é um cofre temporário para guardar alterações quando preciso trocar de contexto.