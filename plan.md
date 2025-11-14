# plan.md

## Nova Explorer implementation plan

**Overall progress:** 100%

### Tasks

- ✅ **Step 1: Extend Tauri backend**
  - ✅ `delete_file` (trash + fs)
  - ✅ `create_file` and `create_directory`
  - ✅ `rename_file`
  - ✅ `start_file_watcher` with `notify`

- ✅ **Step 2: Expand `fileService` and `workspaceStore`**
  - ✅ Wire the new invoke commands
  - ✅ Refresh the tree after mutations via watcher events
  - ✅ Boot the watcher and respond to `file-changed`

- ✅ **Step 3: Implement `ExplorerView` and layout wiring**
  - ✅ Build the Explorer component with its states
  - ✅ Register the view in `sidebarRegistry`
  - ✅ Expose `workbench.view.explorer`

- ✅ **Step 4: Hook file tree context actions**
  - ✅ Call `createFile`, `createDirectory`, `renameFile`, `deleteFile`
  - ✅ Enable the context menu entries

- ✅ **Step 5: Sync selection and implement Reveal**
  - ✅ Track `activeEditor` and run `syncWithActiveTab`
  - ✅ Implement `revealInExplorer`

- ✅ **Step 6: Handle drag-and-drop from the OS**
  - ✅ Capture `drop`/`dragover` in `ExplorerView`
  - ✅ Open dropped files in the editor

- ✅ **Step 7: Tie watcher into initialization**
  - ✅ Invoke `start_file_watcher` during startup
  - ✅ Refresh the workspace on `file-changed` events
