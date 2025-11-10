# Application Flow: Nova Code

## 1. Запуск приложения

**Триггер:** Пользователь открывает Nova Code  
**Шаги:**
1. Tauri инициализирует WebView
2. Frontend загружает последние настройки из `get_settings()`
3. Если в конфиге есть `last_workspace`, вызывается `read_directory(last_workspace)`
4. Отображается дерево файлов в боковой панели
5. Если в настройках сохранены открытые файлы, они восстанавливаются через `open_file()` для каждого

**Success outcome:** Приложение открыто за <1 сек, последний workspace восстановлен  
**Error handling:** Если `last_workspace` не существует, показывается "Open Folder" prompt

---

## 2. Открытие файла

**Триггер:** Клик по файлу в дереве или Cmd+O  
**Шаги:**
1. Frontend вызывает `open_file(path)`
2. Backend читает содержимое файла (до 50 МБ)
3. Content передаётся в Monaco Editor
4. Определяется язык по расширению, загружается syntax highlighting
5. Если для языка настроен LSP, запускается `start_lsp(language)`
6. LSP отправляет `textDocument/didOpen` notification
7. Файл добавляется в `editorStore.openFiles`, создаётся вкладка

**Success outcome:** Файл отображается с подсветкой, автодополнение работает  
**Error handling:**
- Файл >50 МБ → показывается предупреждение "File too large, open as plain text?"
- Ошибка чтения → уведомление "Cannot read file: [reason]"

---

## 3. Редактирование и автосохранение

**Триггер:** Пользователь вводит текст в редакторе  
**Шаги:**
1. Monaco Editor генерирует `onChange` event
2. Frontend обновляет `editorStore.openFiles.get(path)` с новым содержимым
3. Запускается debounced автосохранение (300ms)
4. Вызывается `save_file(path, content)`
5. Backend записывает файл на диск
6. Если включён Git watch, backend эмитит событие об изменении файла
7. `gitStore` обновляет статус (файл помечается как modified)

**Success outcome:** Изменения сохранены, индикатор "unsaved" исчезает  
**Error handling:**
- Ошибка записи (permissions) → показывается modal "Save failed, save as?"
- Файл изменён внешне → prompt "File changed on disk, reload or keep local?"

---

## 4. Git commit

**Триггер:** Клик на "Commit" в Git-панели  
**Шаги:**
1. Frontend собирает список staged файлов из `gitStore.staged`
2. Пользователь вводит commit message в input
3. Валидация: message не пустое
4. Вызывается `git_commit(message, staged_files)`
5. Backend выполняет `git add` + `git commit` через git2
6. Возвращается результат (commit hash)
7. `gitStore` обновляется: staged очищается, modified пересчитывается

**Success outcome:** Коммит создан, Git-панель показывает новый HEAD  
**Error handling:**
- Merge conflict → отображается diff view с конфликтами
- No staged files → disabled кнопка "Commit"

---

## 5. Поиск по файлам

**Триggер:** Cmd+Shift+F, открывается Search Panel  
**Шаги:**
1. Пользователь вводит query в search input
2. После 300ms debounce вызывается `search_files(workspace_path, query, use_regex)`
3. Backend рекурсивно обходит файлы через `walkdir`, применяет regex
4. Результаты (массив `{file, line, column, match_text}`) возвращаются порциями (streaming)
5. Frontend отображает результаты в виртуализированном списке
6. Клик по результату → открывается файл, курсор перемещается на нужную строку

**Success outcome:** Найденные совпадения отображаются <2 сек для репозитория среднего размера  
**Error handling:**
- Invalid regex → highlight ошибки в input, показывается tooltip
- Поиск >10 сек → кнопка "Cancel search"
