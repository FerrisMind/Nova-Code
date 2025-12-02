# Editor Core

<cite>
**Referenced Files in This Document**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts)
- [themeManager.ts](file://src/lib/editor/themeManager.ts)
- [intellisense.ts](file://src/lib/editor/intellisense.ts)
- [languageSupport.ts](file://src/lib/editor/languageSupport.ts)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts)
- [monacoUnhandledRejection.ts](file://src/lib/editor/monacoUnhandledRejection.ts)
- [editorSettingsStore.ts](file://src/lib/stores/editorSettingsStore.ts)
- [editorBehaviorStore.ts](file://src/lib/stores/editorBehaviorStore.ts)
- [editorStore.ts](file://src/lib/stores/editorStore.ts)
- [editorMetaStore.ts](file://src/lib/stores/editorMetaStore.ts)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts)
- [THEME_PALETTES.ts](file://src/lib/stores/THEME_PALETTES.ts)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
EditorCore is the central component that encapsulates the Monaco Editor instance and provides a unified, typed API for all editor operations. It serves as the primary interface between the application and the Monaco Editor, handling initialization, configuration, lifecycle management, model management, diagnostics integration, and event subscriptions. Its design ensures clean separation of concerns, predictable behavior, and extensibility for features like IntelliSense, diff editors, and custom language providers.

Key responsibilities:
- Encapsulate Monaco Editor APIs and expose a minimal, typed surface.
- Manage editor lifecycle: attach, configure, and dispose.
- Manage multiple document models keyed by file identifiers.
- Provide event subscriptions for content changes and cursor position updates.
- Integrate with diagnostics and theme systems.
- Support diff sessions and language provider registration.

## Project Structure
The EditorCore module lives under src/lib/editor and collaborates with several stores and utilities across the codebase. The diagram below shows the main files involved in the EditorCore ecosystem.

```mermaid
graph TB
subgraph "Editor Core"
EC["EditorCore.ts"]
DA["diagnosticsAdapter.ts"]
TM["themeManager.ts"]
INT["intellisense.ts"]
LS["languageSupport.ts"]
ME["monacoEnvironment.ts"]
UR["monacoUnhandledRejection.ts"]
end
subgraph "Stores"
ESS["editorSettingsStore.ts"]
EBS["editorBehaviorStore.ts"]
ES["editorStore.ts"]
EMS["editorMetaStore.ts"]
DS["diagnosticsStore.ts"]
TP["THEME_PALETTES.ts"]
end
subgraph "Utilities"
FV["fileValidator.ts"]
end
EC --> ES
EC --> DS
EC --> ESS
EC --> EBS
EC --> EMS
EC --> DA
EC --> INT
EC --> LS
EC --> TM
EC --> ME
EC --> UR
TM --> TP
DA --> DS
ES --> EC
EMS --> EC
FV --> EC
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L1-L891)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
- [themeManager.ts](file://src/lib/editor/themeManager.ts#L1-L274)
- [intellisense.ts](file://src/lib/editor/intellisense.ts#L1-L327)
- [languageSupport.ts](file://src/lib/editor/languageSupport.ts#L1-L70)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)
- [monacoUnhandledRejection.ts](file://src/lib/editor/monacoUnhandledRejection.ts#L1-L30)
- [editorSettingsStore.ts](file://src/lib/stores/editorSettingsStore.ts#L1-L180)
- [editorBehaviorStore.ts](file://src/lib/stores/editorBehaviorStore.ts#L1-L56)
- [editorStore.ts](file://src/lib/stores/editorStore.ts#L1-L380)
- [editorMetaStore.ts](file://src/lib/stores/editorMetaStore.ts#L1-L40)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)
- [THEME_PALETTES.ts](file://src/lib/stores/THEME_PALETTES.ts#L1-L314)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L111)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L1-L120)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)

## Core Components
- EditorCoreApi: Public API surface exposing editor operations, model management, configuration, diagnostics, diff sessions, and event subscriptions.
- CoreState: Internal state holding Monaco instance, editor instance, models, active file identifier, options, and event subscriptions.
- EditorCapabilities: Flags indicating core capabilities such as multi-model support, preserved undo stack on switch, diff readiness, and extensible languages.
- EditorCoreOptions: Typed configuration options for editor display, editing, minimap, folding, and performance-related settings.
- EditorModelDescriptor: Descriptor for creating or switching models by file identifier.
- EditorDiagnostic: Minimal representation of diagnostic messages compatible with Monaco’s IMarkerData.

Key implementation highlights:
- Constructor-like factory function that initializes state and returns a typed API.
- attachTo(container, options?): Creates or recreates the editor with performance-oriented defaults and applies user options.
- dispose(): Safely disposes editor, models, and event subscriptions.
- setModel(descriptor): Creates or retrieves a model by file identifier, sets it as active, and subscribes to its content/cursor events.
- configure(options): Updates editor options and applies them to the active editor instance.
- setDiagnostics(fileId, diagnostics): Converts and applies diagnostic markers to a model.
- createDiffSession(params): Creates a diff editor session backed by existing or lazily created models.
- Event subscriptions: onDidChangeContent(listener) and onDidChangeCursorPosition(listener) with proper cleanup.

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L120-L200)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L340-L541)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L541-L891)

## Architecture Overview
The EditorCore orchestrates Monaco Editor integration and exposes a thin, typed API. It delegates language support and IntelliSense to dedicated modules, synchronizes diagnostics via a dedicated adapter, and coordinates theme application through ThemeManager. Stores manage application state and UI integration.

```mermaid
sequenceDiagram
participant App as "Application Layer"
participant Host as "MonacoHost"
participant Core as "EditorCore"
participant Monaco as "Monaco Editor"
participant Lang as "Language/IntelliSense"
participant Diag as "Diagnostics Adapter"
participant Store as "Editor/Diagnostics Stores"
App->>Host : Initialize host with Monaco
Host->>Core : createEditorCore(monaco)
Host->>Core : attachTo(container, options?)
Core->>Monaco : editor.create(...)
Core-->>Host : Ready
App->>Core : setModel({fileId, uri, value, language})
Core->>Monaco : createModel(...) or reuse
Core->>Monaco : setModel(model)
Core-->>App : Active model set
App->>Core : configure(options)
Core->>Monaco : updateOptions({...})
App->>Core : setDiagnostics(fileId, diagnostics)
Core->>Monaco : setModelMarkers(model, 'nova-code', markers)
Core-->>Diag : Triggers onDidChangeMarkers
Diag->>Store : updateDiagnosticsForFile(fileId, diagnostics)
App->>Core : onDidChangeContent(listener)
App->>Core : onDidChangeCursorPosition(listener)
Core-->>App : Events delivered to listeners
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L407-L891)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)

## Detailed Component Analysis

### EditorCore Class and API
EditorCore is implemented as a factory that returns a strongly typed API. Internally, it maintains a state object with Monaco instance, editor instance, models map, active file identifier, options, and event subscriptions. The API exposes methods for lifecycle, model management, configuration, diagnostics, diff sessions, and event subscriptions.

```mermaid
classDiagram
class EditorCoreApi {
+capabilities : EditorCapabilities
+attachTo(container, options?)
+dispose()
+setModel(descriptor)
+updateContent(fileId, newContent)
+getModelValue(fileId)
+getActiveModelValue()
+configure(options)
+registerLanguageSupport(config)
+registerCompletionProvider(languageId, provider)
+registerHoverProvider(languageId, provider)
+setDiagnostics(fileId, diagnostics)
+createDiffSession(params)
+triggerCommand(source, commandId, payload?)
+onDidChangeContent(listener)
+onDidChangeCursorPosition(listener)
+getModelMetadata(fileId)
+getFileIdByUri(uri)
}
class CoreState {
-monaco
-editor
-models : Map
-activeFileId
-options
-contentListeners
-contentSubscription
-cursorPositionListeners
-cursorPositionSubscription
}
class EditorCapabilities {
+multiModel : boolean
+preserveUndoStackOnSwitch : boolean
+preparedForDiff : boolean
+extensibleLanguages : boolean
}
class EditorCoreOptions {
+theme?
+tabSize?
+insertSpaces?
+wordWrap?
+wordWrapColumn?
+minimap?
+folding?
+bracketPairColorization?
+readOnly?
+fontSize?
+fontFamily?
+fontLigatures?
+renderWhitespace?
+lineNumbers?
+codeLens?
+links?
+largeFileOptimizations?
+autoClosingBrackets?
+autoClosingQuotes?
+autoClosingOvertype?
}
EditorCoreApi --> CoreState : "uses"
EditorCoreApi --> EditorCapabilities : "exposes"
EditorCoreApi --> EditorCoreOptions : "configures"
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L120-L200)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L316-L340)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L340-L541)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L120-L200)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L316-L340)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L340-L541)

### Initialization Sequence
The initialization sequence ensures that Monaco workers are configured, EditorCore is created, and the editor is attached to a container with optional configuration.

```mermaid
sequenceDiagram
participant Env as "MonacoEnvironment"
participant App as "Application"
participant Core as "EditorCore"
participant Monaco as "Monaco Editor"
App->>Env : Import monacoEnvironment (side effect)
Env-->>App : Workers configured (singleton)
App->>Core : createEditorCore(monaco)
Core-->>App : EditorCoreApi
App->>Core : attachTo(container, options?)
Core->>Monaco : editor.create({...})
Core-->>App : Editor ready
```

**Diagram sources**
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L407-L541)

**Section sources**
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L407-L541)

### Shutdown Procedures
Proper disposal is essential to prevent memory leaks. The dispose method cleans up content and cursor subscriptions, disposes the editor, and disposes all managed models.

```mermaid
flowchart TD
Start(["Dispose EditorCore"]) --> CheckSubs["Dispose content subscription if present"]
CheckSubs --> CheckCursor["Dispose cursor subscription if present"]
CheckCursor --> DisposeEditor["Dispose editor if present"]
DisposeEditor --> DisposeModels["Dispose all models in state.models"]
DisposeModels --> ClearState["Clear models map, activeFileId, listeners"]
ClearState --> End(["Disposed"])
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L517-L541)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L517-L541)

### Model Management System
EditorCore manages multiple models keyed by file identifiers. It creates models when needed, switches active models without losing undo/redo history, and provides utilities to update content and query metadata.

```mermaid
sequenceDiagram
participant Core as "EditorCore"
participant Monaco as "Monaco Editor"
participant Model as "ITextModel"
Core->>Core : setModel({fileId, uri, value, language})
alt Model exists
Core->>Monaco : setModel(existingModel)
else Model does not exist
Core->>Monaco : createModel(value, language, uri)
Core->>Core : models.set(fileId, model)
Core->>Monaco : setModel(model)
end
Core->>Model : onDidChangeContent(subscribe)
Core->>Monaco : onDidChangeCursorPosition(subscribe)
Core-->>Core : activeFileId = fileId
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L543-L601)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L543-L601)

### Diagnostics Integration
EditorCore integrates with Monaco markers and a diagnostics adapter to synchronize diagnostics with the diagnostics store for UI consumption.

```mermaid
sequenceDiagram
participant Core as "EditorCore"
participant Monaco as "Monaco Editor"
participant Adapter as "Diagnostics Adapter"
participant Store as "Diagnostics Store"
Core->>Core : setDiagnostics(fileId, diagnostics)
Core->>Monaco : setModelMarkers(model, 'nova-code', markers)
Adapter->>Monaco : onDidChangeMarkers(subscribe)
Monaco-->>Adapter : URIs with changed markers
Adapter->>Core : getFileIdByUri(uri)
Adapter->>Store : updateDiagnosticsForFile(fileId, diagnostics)
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L693-L725)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L693-L725)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)

### Theme Synchronization
Theme synchronization is handled by ThemeManager, which registers and applies themes. EditorCore reads editor settings and applies theme changes via ThemeManager and Monaco’s theme API.

```mermaid
sequenceDiagram
participant Core as "EditorCore"
participant Settings as "EditorSettingsStore"
participant ThemeMgr as "ThemeManager"
participant Monaco as "Monaco Editor"
Settings-->>Core : theme setting changes
Core->>ThemeMgr : getMonacoThemeId(themeState, editorTheme?)
ThemeMgr->>Monaco : setTheme(themeId)
Core->>Monaco : updateOptions({ theme })
```

**Diagram sources**
- [themeManager.ts](file://src/lib/editor/themeManager.ts#L256-L274)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L619-L650)
- [editorSettingsStore.ts](file://src/lib/stores/editorSettingsStore.ts#L1-L180)

**Section sources**
- [themeManager.ts](file://src/lib/editor/themeManager.ts#L1-L274)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L619-L650)
- [editorSettingsStore.ts](file://src/lib/stores/editorSettingsStore.ts#L1-L180)

### Language Support and IntelliSense
Language support and IntelliSense are integrated through dedicated modules. LanguageSupport maps internal IDs to Monaco language IDs and registers basic languages. IntelliSense sets up language services and providers with performance optimizations.

```mermaid
sequenceDiagram
participant Core as "EditorCore"
participant Lang as "LanguageSupport"
participant Intell as "IntelliSense"
participant Monaco as "Monaco Editor"
Core->>Lang : ensureLanguageRegistered(monaco, languageId)
Lang->>Monaco : register + monarch tokens provider (lazy)
Core->>Intell : setupBasicLanguageSupport(monaco)
Intell->>Monaco : configure TS/JS defaults
Core->>Intell : setupDefaultProviders(monaco)
Intell->>Monaco : register completion/hover providers
```

**Diagram sources**
- [languageSupport.ts](file://src/lib/editor/languageSupport.ts#L1-L70)
- [intellisense.ts](file://src/lib/editor/intellisense.ts#L1-L327)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L652-L691)

**Section sources**
- [languageSupport.ts](file://src/lib/editor/languageSupport.ts#L1-L70)
- [intellisense.ts](file://src/lib/editor/intellisense.ts#L1-L327)
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L652-L691)

### Diff Editor Session
EditorCore supports creating diff sessions backed by existing or lazily created models. The diff editor is mounted into a container and can be updated independently of the core editor.

```mermaid
sequenceDiagram
participant Core as "EditorCore"
participant Monaco as "Monaco Editor"
participant Diff as "IStandaloneDiffEditor"
Core->>Core : createDiffSession({originalFileId, modifiedFileId, options?})
alt Models exist
Core->>Monaco : reuse existing models
else Models missing
Core->>Monaco : createModel('plaintext', uri)
end
Core->>Monaco : editor.createDiffEditor(container, {...})
Core->>Diff : setModel({original, modified})
Diff-->>Core : mount(container) returns diffEditor
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L727-L891)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L727-L891)

## Dependency Analysis
EditorCore depends on Monaco Editor APIs and integrates with several modules and stores. The dependency graph below illustrates these relationships.

```mermaid
graph TB
EC["EditorCore.ts"] --> MON["monaco-editor"]
EC --> ES["editorStore.ts"]
EC --> DS["diagnosticsStore.ts"]
EC --> ESS["editorSettingsStore.ts"]
EC --> EBS["editorBehaviorStore.ts"]
EC --> EMS["editorMetaStore.ts"]
EC --> DA["diagnosticsAdapter.ts"]
EC --> INT["intellisense.ts"]
EC --> LS["languageSupport.ts"]
EC --> TM["themeManager.ts"]
EC --> ME["monacoEnvironment.ts"]
EC --> UR["monacoUnhandledRejection.ts"]
TM --> TP["THEME_PALETTES.ts"]
DA --> DS
ES --> EC
EMS --> EC
FV["fileValidator.ts"] --> EC
```

**Diagram sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L1-L891)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
- [themeManager.ts](file://src/lib/editor/themeManager.ts#L1-L274)
- [intellisense.ts](file://src/lib/editor/intellisense.ts#L1-L327)
- [languageSupport.ts](file://src/lib/editor/languageSupport.ts#L1-L70)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)
- [monacoUnhandledRejection.ts](file://src/lib/editor/monacoUnhandledRejection.ts#L1-L30)
- [editorSettingsStore.ts](file://src/lib/stores/editorSettingsStore.ts#L1-L180)
- [editorBehaviorStore.ts](file://src/lib/stores/editorBehaviorStore.ts#L1-L56)
- [editorStore.ts](file://src/lib/stores/editorStore.ts#L1-L380)
- [editorMetaStore.ts](file://src/lib/stores/editorMetaStore.ts#L1-L40)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)
- [THEME_PALETTES.ts](file://src/lib/stores/THEME_PALETTES.ts#L1-L314)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L111)

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L1-L891)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
- [themeManager.ts](file://src/lib/editor/themeManager.ts#L1-L274)
- [intellisense.ts](file://src/lib/editor/intellisense.ts#L1-L327)
- [languageSupport.ts](file://src/lib/editor/languageSupport.ts#L1-L70)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)
- [monacoUnhandledRejection.ts](file://src/lib/editor/monacoUnhandledRejection.ts#L1-L30)
- [editorSettingsStore.ts](file://src/lib/stores/editorSettingsStore.ts#L1-L180)
- [editorBehaviorStore.ts](file://src/lib/stores/editorBehaviorStore.ts#L1-L56)
- [editorStore.ts](file://src/lib/stores/editorStore.ts#L1-L380)
- [editorMetaStore.ts](file://src/lib/stores/editorMetaStore.ts#L1-L40)
- [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)
- [THEME_PALETTES.ts](file://src/lib/stores/THEME_PALETTES.ts#L1-L314)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L111)

## Performance Considerations
- Automatic layout and reduced animations: The editor is configured with automatic layout and disabled smooth scrolling and cursor animation to improve responsiveness.
- Quick suggestions delay: A short delay reduces UI responsiveness overhead while maintaining IntelliSense feedback.
- Minimap optimizations: Minimap rendering can be tuned to reduce CPU/GPU load.
- Large file optimizations: The file validator suggests disabling certain features for large files and enables large file optimizations.
- Worker configuration: MonacoEnvironment configures ESM workers for Monaco, enabling efficient language services and diagnostics.

Practical tips:
- Disable minimap, code lens, and links for very large files.
- Prefer lightweight fonts and disable heavy decorations when editing large files.
- Use largeFileOptimizations to reduce rendering overhead.

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L407-L541)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L111)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)

## Troubleshooting Guide
Common issues and resolutions:
- Memory leaks during disposal: Ensure dispose() is called to release editor, models, and subscriptions. Verify that content and cursor subscriptions are disposed.
- Unhandled rejections during disposal: Use silenceMonacoCancellationErrors() to ignore cancellation-related rejections that are expected during disposal.
- Worker initialization: Import monacoEnvironment before using Monaco to ensure workers are configured.
- Diagnostics not updating: Confirm diagnostics adapter is attached and markers are applied to the correct model.

**Section sources**
- [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L517-L541)
- [monacoUnhandledRejection.ts](file://src/lib/editor/monacoUnhandledRejection.ts#L1-L30)
- [monacoEnvironment.ts](file://src/lib/editor/monacoEnvironment.ts#L1-L131)
- [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)

## Conclusion
EditorCore provides a robust, extensible foundation for integrating Monaco Editor into the application. It encapsulates lifecycle management, model orchestration, configuration, diagnostics, and event handling while delegating specialized concerns to dedicated modules. By following the patterns outlined here—proper initialization, configuration, disposal, and integration with stores and adapters—you can build a performant and maintainable editor experience.

## Appendices

### Practical Usage Examples
- Instantiate and configure EditorCore:
  - Create the core with the Monaco instance.
  - Attach to a DOM container and pass initial options.
  - Configure editor options dynamically.
  - Example paths:
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L407-L541)
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L619-L650)

- Handle editor events:
  - Subscribe to content changes and cursor position updates.
  - Example paths:
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L543-L601)
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L276-L314)

- Interact with Monaco Editor API:
  - Trigger commands, register language providers, and manage models.
  - Example paths:
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L263-L314)
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L652-L691)

- Diagnostics integration:
  - Apply markers and track changes via diagnostics adapter.
  - Example paths:
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L693-L725)
    - [diagnosticsAdapter.ts](file://src/lib/editor/diagnosticsAdapter.ts#L1-L61)
    - [diagnosticsStore.ts](file://src/lib/stores/diagnosticsStore.ts#L1-L142)

- Theme synchronization:
  - Derive theme ID from theme store and apply via ThemeManager.
  - Example paths:
    - [themeManager.ts](file://src/lib/editor/themeManager.ts#L256-L274)
    - [THEME_PALETTES.ts](file://src/lib/stores/THEME_PALETTES.ts#L1-L314)

- Language support and IntelliSense:
  - Register languages and providers.
  - Example paths:
    - [languageSupport.ts](file://src/lib/editor/languageSupport.ts#L1-L70)
    - [intellisense.ts](file://src/lib/editor/intellisense.ts#L1-L327)

- Diff editor session:
  - Create and mount a diff editor for two models.
  - Example paths:
    - [EditorCore.ts](file://src/lib/editor/EditorCore.ts#L727-L891)

- Large file handling:
  - Validate file size and apply optimizations.
  - Example paths:
    - [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L111)