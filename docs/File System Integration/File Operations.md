# File Operations

<cite>
**Referenced Files in This Document**   
- [fileService.ts](file://src/lib/services/fileService.ts)
- [fileNode.ts](file://src/lib/types/fileNode.ts)
- [fileTreeStore.ts](file://src/lib/stores/fileTreeStore.ts)
- [workspaceStore.ts](file://src/lib/stores/workspaceStore.ts)
- [editorStore.ts](file://src/lib/stores/editorStore.ts)
- [fileTreeActions.ts](file://src/lib/sidebar/fileTreeActions.ts)
- [lib.rs](file://src-tauri/src/lib.rs)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Architecture Overview](#architecture-overview)
3. [Core Components](#core-components)
4. [File Service Implementation](#file-service-implementation)
5. [Domain Model](#domain-model)
6. [CRUD Operations Flow](#crud-operations-flow)
7. [File Reading and Writing](#file-reading-and-writing)
8. [Configuration Options](#configuration-options)
9. [Error Handling and Common Issues](#error-handling-and-common-issues)
10. [Integration with Svelte Components](#integration-with-svelte-components)

## Introduction

This document provides comprehensive documentation for the file operations sub-feature in the NC code editor. It details the implementation of create, read, update, and delete (CRUD) operations through the fileService.ts frontend wrapper for Tauri's file system commands. The documentation covers the invocation relationship between Svelte components, stores, and the Tauri backend through the invoke/listen pattern, explains the domain model including FileNode representation, and addresses configuration options and common issues. The content is designed to be accessible to beginners while providing sufficient technical depth for experienced developers regarding the Rust-Tauri-TypeScript integration.

## Architecture Overview

The file operations system in NC follows a layered architecture that separates concerns between the frontend UI, service layer, and backend implementation. The system uses Tauri's invoke/listen pattern to communicate between the frontend TypeScript code and the backend Rust implementation, ensuring type safety and efficient inter-process communication.

```mermaid
graph TB
subgraph "Frontend"
A[Svelte Components] --> B[Stores]
B --> C[FileService]
C --> D[Tauri API]
end
subgraph "Backend"
D --> E[Rust Commands]
E --> F[File System]
end
G[File System Events] --> D
D --> H[Svelte Components]
style A fill:#f9f,stroke:#333
style B fill:#bbf,stroke:#333
style C fill:#f96,stroke:#333
style D fill:#6f9,stroke:#333
style E fill:#69f,stroke:#333
style F fill:#9f9,stroke:#333
style G fill:#999,stroke:#333
style H fill:#f9f,stroke:#333
```

**Diagram sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L1-L84)
- [lib.rs](file://src-tauri/src/lib.rs#L248-L807)

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L1-L84)
- [lib.rs](file://src-tauri/src/lib.rs#L248-L807)

## Core Components

The file operations system consists of several core components that work together to provide a seamless file management experience. These components include the fileService.ts service layer, various Svelte stores for state management, and the Rust backend implementation. The architecture follows a clean separation of concerns, with each component having a well-defined responsibility.

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L1-L84)
- [fileTreeStore.ts](file://src/lib/stores/fileTreeStore.ts#L1-L290)
- [workspaceStore.ts](file://src/lib/stores/workspaceStore.ts#L1-L130)

## File Service Implementation

The fileService.ts implementation serves as a frontend wrapper for Tauri's file system commands, providing a unified asynchronous API that can be easily tested and potentially replaced with mock logic during development. The service exposes a comprehensive interface for all file operations, abstracting the underlying Tauri invoke mechanism.

```mermaid
classDiagram
class FileService {
+readFile(fileId : string) : Promise~string~
+writeFile(fileId : string, content : string) : Promise~void~
+listWorkspaceFiles(rootOverride? : string) : Promise~FileNode[]~
+onFileChange(cb : (fileId : string) => void) : Promise~() => void~
+createFile(path : string) : Promise~void~
+createDirectory(path : string) : Promise~void~
+renameFile(oldPath : string, newPath : string) : Promise~void~
+deleteFile(path : string, useTrash : boolean) : Promise~void~
+revealInExplorer(path : string) : Promise~void~
+setWorkspaceRoot(root : string) : void
+getWorkspaceRoot() : string
+startFileWatcher() : Promise~void~
}
FileService --> TauriAPI : "uses"
FileService --> FileNode : "returns"
TauriAPI --> RustBackend : "invokes"
```

**Diagram sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L15-L27)
- [lib.rs](file://src-tauri/src/lib.rs#L248-L807)

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L1-L84)

## Domain Model

The domain model for file operations centers around the FileNode interface, which represents files and directories in the workspace. This model is shared between the frontend and backend, ensuring consistency in how file system entities are represented across the application.

```mermaid
classDiagram
class FileNode {
+id : string
+name : string
+path : string
+type : FileNodeType
+size? : number
+modified? : number
+children? : FileNode[]
}
class FileNodeType {
<<enumeration>>
file
dir
}
FileNode --> FileNodeType : "has type"
FileNode --> FileNode : "contains children"
```

**Diagram sources**

- [fileNode.ts](file://src/lib/types/fileNode.ts#L8-L18)

**Section sources**

- [fileNode.ts](file://src/lib/types/fileNode.ts#L1-L19)

## CRUD Operations Flow

The CRUD operations in NC follow a consistent pattern of communication between the frontend and backend. When a user initiates a file operation through the UI, the request flows through Svelte components, stores, and the file service before being invoked on the Tauri backend. The backend processes the request and returns a response, which is then handled by the frontend to update the UI state.

```mermaid
sequenceDiagram
participant UI as Svelte Component
participant Store as Svelte Store
participant Service as FileService
participant Tauri as Tauri API
participant Backend as Rust Backend
participant FS as File System
UI->>Store : User action (e.g., create file)
Store->>Service : Call createFile(path)
Service->>Tauri : invoke('create_file', {path})
Tauri->>Backend : Execute create_file command
Backend->>FS : Create file on disk
FS-->>Backend : Success/Failure
Backend-->>Tauri : Return result
Tauri-->>Service : Resolve/Reject promise
Service-->>Store : Operation complete
Store-->>UI : Update UI state
```

**Diagram sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L53-L55)
- [lib.rs](file://src-tauri/src/lib.rs#L281-L290)
- [fileTreeActions.ts](file://src/lib/sidebar/fileTreeActions.ts#L84-L93)

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L1-L84)
- [lib.rs](file://src-tauri/src/lib.rs#L281-L290)
- [fileTreeActions.ts](file://src/lib/sidebar/fileTreeActions.ts#L84-L134)

## File Reading and Writing

File reading and writing operations in NC are implemented with careful consideration for performance and user experience. The system handles various edge cases such as large files and binary content, providing appropriate feedback and optimizations when necessary.

```mermaid
flowchart TD
Start([Read File Request]) --> ValidatePath["Validate file path exists"]
ValidatePath --> PathValid{"Path Valid?"}
PathValid --> |No| ReturnError["Return 'File not found' error"]
PathValid --> |Yes| ReadContent["Read file content from disk"]
ReadContent --> HandleEncoding["Handle encoding (UTF-8 with lossy conversion)"]
HandleEncoding --> CheckSize["Check file size"]
CheckSize --> LargeFile{"Size > 50MB?"}
LargeFile --> |Yes| ReturnError
LargeFile --> |No| CheckBinary["Check if binary content"]
CheckBinary --> IsBinary{"Is binary?"}
IsBinary --> |Yes| ReturnError["Return 'Binary files not supported'"]
IsBinary --> |No| ReturnContent["Return text content"]
WriteStart([Write File Request]) --> EnsureParent["Ensure parent directory exists"]
EnsureParent --> WriteToDisk["Write content to disk"]
WriteToDisk --> EmitEvent["Emit 'file-changed' event"]
EmitEvent --> UpdateUI["Update UI state"]
UpdateUI --> Complete["Operation complete"]
ReturnError --> End([Return])
ReturnContent --> End
Complete --> End
```

**Diagram sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L31-L37)
- [lib.rs](file://src-tauri/src/lib.rs#L267-L279)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L15-L87)

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L31-L37)
- [lib.rs](file://src-tauri/src/lib.rs#L267-L279)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L131)

## Configuration Options

The file operations system includes configuration options for handling file encoding and line endings. These options are managed through the application's settings system and can be customized by users to match their preferences and project requirements.

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L31-L37)
- [lib.rs](file://src-tauri/src/lib.rs#L276-L278)

## Error Handling and Common Issues

The file operations system implements comprehensive error handling for common issues such as file locking, permission errors, and disk space limitations. The system provides user-friendly error messages and recovery options to ensure a smooth user experience even when operations fail.

```mermaid
flowchart TD
OperationStart([File Operation]) --> CheckPermissions["Check file permissions"]
CheckPermissions --> HasPermission{"Has permission?"}
HasPermission --> |No| HandlePermissionError["Show permission error"]
HasPermission --> |Yes| CheckLock["Check if file is locked"]
CheckLock --> IsLocked{"File locked?"}
IsLocked --> |Yes| HandleLockError["Show lock error with retry option"]
IsLocked --> |No| CheckDiskSpace["Check available disk space"]
CheckDiskSpace --> HasSpace{"Sufficient space?"}
HasSpace --> |No| HandleSpaceError["Show disk space error"]
HasSpace --> |Yes| ExecuteOperation["Execute file operation"]
ExecuteOperation --> OperationSuccess{"Operation successful?"}
OperationSuccess --> |No| HandleGenericError["Show generic error with details"]
OperationSuccess --> |Yes| UpdateState["Update application state"]
UpdateState --> Complete["Operation complete"]
HandlePermissionError --> End([Error handled])
HandleLockError --> End
HandleSpaceError --> End
HandleGenericError --> End
Complete --> End
```

**Diagram sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L84-L134)
- [lib.rs](file://src-tauri/src/lib.rs#L281-L324)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L15-L87)

**Section sources**

- [fileService.ts](file://src/lib/services/fileService.ts#L84-L134)
- [lib.rs](file://src-tauri/src/lib.rs#L281-L324)
- [fileValidator.ts](file://src/lib/utils/fileValidator.ts#L1-L131)

## Integration with Svelte Components

The file operations system is tightly integrated with Svelte components through a combination of stores and actions. The fileTreeStore manages the state of the file explorer, while the workspaceStore handles workspace-level operations. The fileTreeActions module provides action handlers for user interactions with the file tree.

```mermaid
classDiagram
class FileTreeStore {
+expanded : Set~FileNodeId~
+selectedFileId : FileNodeId | null
+isExpanded(id : FileNodeId) : boolean
+expand(id : FileNodeId) : void
+collapse(id : FileNodeId) : void
+toggleDir(id : FileNodeId) : void
+selectFile(id : FileNodeId) : void
+syncWithActiveTab(tabId : string | null) : void
+revealNode(node : FileNode | null) : void
}
class WorkspaceStore {
+name : string
+files : FileNode[]
+loading : boolean
+error? : string
+root : string | null
+refresh() : void
+openFolder(root : string) : void
+closeFolder() : void
+getWorkspaceRoot() : string | null
+resolvePath(relativePath : string) : string | null
}
class FileTreeActions {
+open(node : FileNode) : void
+openToSide(node : FileNode) : void
+revealInExplorer(node : FileNode) : void
+newFile(node : FileNode | null) : Promise~void~
+newFolder(node : FileNode | null) : Promise~void~
+rename(node : FileNode) : Promise~void~
+deleteNode(node : FileNode) : Promise~void~
}
FileTreeActions --> FileService : "uses"
FileTreeActions --> WorkspaceStore : "uses"
FileTreeActions --> FileTreeStore : "uses"
FileTreeStore --> WorkspaceStore : "uses"
FileTreeStore --> EditorStore : "uses"
```

**Diagram sources**

- [fileTreeStore.ts](file://src/lib/stores/fileTreeStore.ts#L1-L290)
- [workspaceStore.ts](file://src/lib/stores/workspaceStore.ts#L1-L130)
- [fileTreeActions.ts](file://src/lib/sidebar/fileTreeActions.ts#L1-L135)
- [editorStore.ts](file://src/lib/stores/editorStore.ts#L1-L381)

**Section sources**

- [fileTreeStore.ts](file://src/lib/stores/fileTreeStore.ts#L1-L290)
- [workspaceStore.ts](file://src/lib/stores/workspaceStore.ts#L1-L130)
- [fileTreeActions.ts](file://src/lib/sidebar/fileTreeActions.ts#L1-L135)
