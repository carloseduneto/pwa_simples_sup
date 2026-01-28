**Problema que tive:**
Eu estava trabalhando na branch `feat/crud-templates`, mas durante esse tempo surgiram commits de correção na branch `feat/crud-exercicios`. Como `templates` depende de `exercicios`, o histórico começou a ficar com várias ramificações cruzadas.

**Por que aconteceu:**
As duas branches evoluíram ao mesmo tempo. Quando isso acontece e usamos *merge*, o Git cria commits de junção e o gráfico fica com várias linhas paralelas e cruzamentos, dificultando a leitura do histórico.

**Solução:**
Usar **rebase** da `feat/crud-templates` em cima da `feat/crud-exercicios`, para manter um histórico linear.

### Pelo terminal

1. Ir para a branch de templates
   `git checkout feat/crud-templates`

2. Reaplicar os commits de templates por cima da branch de exercícios
   `git rebase feat/crud-exercicios`

Isso faz o Git:

* “guardar” temporariamente os commits de templates
* avançar a base para o ponto atual de `feat/crud-exercicios`
* reaplicar um por um os commits de templates por cima

O resultado é uma linha de histórico reta: primeiro os commits de exercícios, depois os de templates.

### Pelo Git Graph (VS Code)

Já que estou usando interface visual, posso fazer de forma segura vendo o resultado na hora:

1. Certificar que estou na branch certa
   Clicar duas vezes em `feat/crud-templates` para ativá-la

2. Iniciar o rebase
   Clicar com o botão direito na branch `feat/crud-exercicios`

3. Escolher a opção
   Selecionar **“Rebase current branch on…”**

4. O que vai acontecer
   O Git vai pegar meus commits de templates (ex: wip1 até wip5), guardar temporariamente, trazer os commits de correção de exercícios para a base, e depois reaplicar meus commits de templates por cima deles.

**O que aprendi:**
Quando uma branch depende de outra que continua recebendo commits, o mais organizado é usar **rebase** para manter o histórico linear e fácil de entender. Isso é seguro em projeto solo, porque não há risco de atrapalhar o trabalho de outras pessoas ao reescrever o histórico.
