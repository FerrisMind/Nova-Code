# Nova Code

[![English](https://img.shields.io/badge/lang-English-lightgrey.svg)](README.md) [![Русский](https://img.shields.io/badge/lang-Русский-lightgrey.svg)](README.ru.md) [![Português (Brasil)](https://img.shields.io/badge/lang-Português_(Brasil)-blue.svg)](README.pt-br.md)

Nova Code é um editor de código moderno, leve e de alto desempenho, construído usando tecnologias web de ponta e o poderoso ecossistema Rust.

## Sobre o Projeto

O projeto combina a flexibilidade das interfaces web com o desempenho de aplicativos nativos. Usamos **Tauri v2** para criar um aplicativo de desktop multiplataforma com consumo mínimo de recursos, **Svelte 5** para uma interface reativa e rápida, e **Tailwind CSS v4** para estilização. O **Monaco Editor** é usado como núcleo do editor — o mesmo mecanismo do VS Code.

![Nova Code Demo](.github/assets/nova-code-demo.png)

## Stack Tecnológico

*   **[Tauri v2](https://v2.tauri.app/)**: Framework para criar aplicativos multiplataforma usando tecnologias web e Rust.
*   **[Svelte 5](https://svelte.dev/)**: Compilador e framework para criar interfaces de usuário.
*   **[Tailwind CSS v4](https://tailwindcss.com/)**: Framework CSS utilitário para estilização rápida.
*   **[Monaco Editor](https://microsoft.github.io/monaco-editor/)**: Poderoso editor de código com suporte a realce de sintaxe, autocompletar e muito mais.
*   **[Vite](https://vitejs.dev/)**: Ferramenta de frontend de próxima geração.
*   **TypeScript**: JavaScript tipado para desenvolvimento robusto.

## Requisitos

Para trabalhar com o projeto, você precisará de:

*   [Node.js](https://nodejs.org/) (versão LTS recomendada)
*   [Rust](https://www.rust-lang.org/tools/install) (incluindo `cargo`, necessário para o build do Tauri)
*   Ferramentas de build para seu SO (veja a [documentação do Tauri](https://v2.tauri.app/start/prerequisites/))

## Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/your-username/nova-code.git
    cd nova-code
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

## Desenvolvimento

Para rodar o aplicativo em modo de desenvolvimento (com hot reload):

```bash
npm run tauri dev
```

Este comando iniciará o servidor frontend Vite e abrirá a janela do aplicativo Tauri.

## Build

Para criar um executável otimizado para o seu sistema operacional:

```bash
npm run tauri build
```

O arquivo compilado estará localizado no diretório `src-tauri/target/release/bundle`.

## Licença

Este projeto está licenciado sob a Licença Apache 2.0. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
