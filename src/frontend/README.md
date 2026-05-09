# Frontend do Projeto

Este diretório contém a aplicação web do projeto, construída com React + TypeScript, empacotada com Vite e estilizada com Tailwind CSS.

## Pré-requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Como rodar em desenvolvimento

1. Abra o terminal na raiz do repositório.
2. Entre na pasta do frontend:

```bash
cd src/frontend
```

3. Instale as dependências:

```bash
npm install
```

4. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

5. Acesse no navegador o endereço exibido no terminal (normalmente http://localhost:5173).

## Scripts disponíveis

- `npm run dev`: inicia o servidor de desenvolvimento com recarregamento automático.
- `npm run build`: faz a checagem TypeScript e gera a versão de produção.
- `npm run preview`: serve localmente a build de produção para validação.
- `npm run lint`: executa a análise estática com ESLint.

## Organização da pasta frontend

- `index.html`: arquivo HTML base que carrega a aplicação.
- `src/main.tsx`: ponto de entrada do React.
- `src/App.tsx`: componente principal da interface.
- `src/index.css`: estilos globais e importação do Tailwind.
- `vite.config.ts`: configuração do Vite, incluindo plugins de React e Tailwind.
- `package.json`: scripts e dependências do frontend.

## Tecnologias principais

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- ESLint

## Observações importantes

- A pasta `node_modules` não deve ser versionada.
- A pasta de build (`dist`) é gerada automaticamente e também não deve ser versionada.
- Se houver necessidade de variáveis de ambiente no futuro, recomenda-se criar um arquivo `.env.example` documentando as chaves públicas necessárias.
