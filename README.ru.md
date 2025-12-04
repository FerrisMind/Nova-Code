# Nova Code

[![English](https://img.shields.io/badge/lang-English-lightgrey.svg)](README.md) [![Русский](https://img.shields.io/badge/lang-Русский-blue.svg)](README.ru.md) [![Português (Brasil)](<https://img.shields.io/badge/lang-Português_(Brasil)-lightgrey.svg>)](README.pt-br.md)

Nova Code — это современный, легковесный и производительный редактор кода, созданный с использованием передовых веб-технологий и мощной экосистемы Rust.

## О проекте

Проект объединяет гибкость веб-интерфейсов и производительность нативных приложений. Мы используем **Tauri v2** для создания кроссплатформенного десктопного приложения с минимальным потреблением ресурсов, **Svelte 5** для реактивного и быстрого интерфейса, и **Tailwind CSS v4** для стилизации. В качестве ядра редактора используется **Monaco Editor** — тот же движок, что и в VS Code.

![Nova Code Demo](.github/assets/nova-code-demo.png)

## Стек технологий

- **[Tauri v2](https://v2.tauri.app/)**: Фреймворк для создания кроссплатформенных приложений с использованием веб-технологий и Rust.
- **[Svelte 5](https://svelte.dev/)**: Компилятор и фреймворк для создания пользовательских интерфейсов.
- **[Tailwind CSS v4](https://tailwindcss.com/)**: Утилитарный CSS-фреймворк для быстрой стилизации.
- **[Monaco Editor](https://microsoft.github.io/monaco-editor/)**: Мощный редактор кода, поддерживающий подсветку синтаксиса, автодополнение и многое другое.
- **[Vite](https://vitejs.dev/)**: Сборщик проектов нового поколения.
- **TypeScript**: Типизированный JavaScript для надежной разработки.

## Требования

Для работы с проектом вам понадобятся:

- [Node.js](https://nodejs.org/) (рекомендуется LTS версия)
- [Rust](https://www.rust-lang.org/tools/install) (включая `cargo`, требуется для сборки Tauri)
- Инструменты сборки для вашей ОС (см. [документацию Tauri](https://v2.tauri.app/start/prerequisites/))

## Установка

1.  Клонируйте репозиторий:

    ```bash
    git clone https://github.com/FerrisMind/Nova-Code.git
    cd nova-code
    ```

2.  Установите зависимости:
    ```bash
    npm install
    ```

## Разработка

Для запуска приложения в режиме разработки (с горячей перезагрузкой):

```bash
npm run tauri dev
```

Эта команда запустит фронтенд-сервер Vite и откроет окно приложения Tauri.

## Сборка

Для создания оптимизированного исполняемого файла для вашей операционной системы:

```bash
npm run tauri build
```

Собранный файл будет находиться в директории `src-tauri/target/release/bundle`.

## Лицензия

Этот проект распространяется под лицензией Apache License 2.0. Подробности см. в файле [LICENSE](LICENSE).
