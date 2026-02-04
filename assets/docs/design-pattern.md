# Arquitetura de software - Boilerplate

- Data Binding?

## Service
Camada de Dados. Responsável por chamadas de API (fetch) e regras de negócio pesadas.

## Screen
View. Onde reside o HTML dinâmico e a estrutura visual.

## Router
Gerenciador de Estado de Navegação. Essencial para SPAs (Single Page Applications) feitas no braço.

## Index
O início na qual onde ficam os dados manipulados e gerenciados

## Controller
o Cérebro. Ele escuta os eventos da tela, pede dados ao Service e manda a Screen atualizar.