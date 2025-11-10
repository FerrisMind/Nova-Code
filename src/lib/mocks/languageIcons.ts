/**
 * Маппинг расширений файлов на devicon классы
 * Основано на официальном репозитории devicons/devicon
 * https://github.com/devicons/devicon
 */

export function getLanguageIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  // TypeScript - blue #007acc
  if (ext === 'ts' || ext === 'tsx') {
    return 'devicon:typescript-plain colored';
  }
  
  // JavaScript - yellow #f0db4f
  if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs') {
    return 'devicon:javascript-plain colored';
  }
  
  // Svelte - orange/red #ff3e00
  if (ext === 'svelte') {
    return 'devicon:svelte-plain colored';
  }
  
  // Rust - orange/brown
  if (ext === 'rs') {
    return 'devicon:rust-plain colored';
  }
  
  // Python - yellow/blue #ffd845
  if (ext === 'py' || ext === 'pyw' || ext === 'pyx') {
    return 'devicon:python-plain colored';
  }
  
  // HTML - orange #e54d26
  if (ext === 'html' || ext === 'htm') {
    return 'devicon:html5-plain colored';
  }
  
  // CSS - blue #3d8fc6
  if (ext === 'css') {
    return 'devicon:css3-plain colored';
  }
  
  // SASS/SCSS - pink #c69
  if (ext === 'sass' || ext === 'scss') {
    return 'devicon:sass-original colored';
  }
  
  // JSON
  if (ext === 'json' || ext === 'jsonc') {
    return 'devicon:json-plain colored';
  }
  
  // Markdown
  if (ext === 'md' || ext === 'mdx') {
    return 'devicon:markdown-original colored';
  }
  
  // Go - cyan #00acd7
  if (ext === 'go') {
    return 'devicon:go-plain colored';
  }
  
  // C/C++ - blue tones
  if (ext === 'c' || ext === 'h') {
    return 'devicon:c-plain colored';
  }
  if (ext === 'cpp' || ext === 'cc' || ext === 'cxx' || ext === 'hpp' || ext === 'hxx') {
    return 'devicon:cplusplus-plain colored';
  }
  
  // C# - purple #68217a
  if (ext === 'cs') {
    return 'devicon:csharp-plain colored';
  }
  
  // Java - red #ea2d2e
  if (ext === 'java') {
    return 'devicon:java-plain colored';
  }
  
  // PHP - purple/blue #777bb3
  if (ext === 'php') {
    return 'devicon:php-plain colored';
  }
  
  // Ruby - red #d91404
  if (ext === 'rb') {
    return 'devicon:ruby-plain colored';
  }
  
  // Swift - orange #f05138
  if (ext === 'swift') {
    return 'devicon:swift-plain colored';
  }
  
  // Kotlin - purple #c711e1
  if (ext === 'kt' || ext === 'kts') {
    return 'devicon:kotlin-plain colored';
  }
  
  // Vue - green #41b883
  if (ext === 'vue') {
    return 'devicon:vuejs-plain colored';
  }
  
  // React (уже обработано через tsx/jsx, но для явности)
  
  // Docker - blue #019bc6
  if (filename === 'Dockerfile' || filename.startsWith('Dockerfile.')) {
    return 'devicon:docker-plain colored';
  }
  
  // YAML - red #cb171e
  if (ext === 'yml' || ext === 'yaml') {
    return 'devicon:yaml-plain colored';
  }
  
  // TOML
  if (ext === 'toml') {
    return 'devicon:toml-plain colored';
  }
  
  // XML - blue #005fad
  if (ext === 'xml') {
    return 'devicon:xml-plain colored';
  }
  
  // SQL - blue tones #00618a
  if (ext === 'sql') {
    return 'devicon:mysql-plain colored';
  }
  
  // Shell scripts - dark gray
  if (ext === 'sh' || ext === 'bash' || ext === 'zsh') {
    return 'devicon:bash-plain colored';
  }
  
  // PowerShell - dark blue #1e2a3a
  if (ext === 'ps1' || ext === 'psm1') {
    return 'devicon:powershell-plain colored';
  }
  
  // Git - orange #f34f29
  if (filename === '.gitignore' || filename === '.gitattributes') {
    return 'devicon:git-plain colored';
  }
  
  // npm/node - red/green #cb3837 / #5fa04e
  if (filename === 'package.json' || filename === 'package-lock.json') {
    return 'devicon:nodejs-plain colored';
  }
  
  // Cargo (Rust) - use rust icon
  if (filename === 'Cargo.toml' || filename === 'Cargo.lock') {
    return 'devicon:rust-plain colored';
  }
  
  // Svelte config
  if (filename === 'svelte.config.js') {
    return 'devicon:svelte-plain colored';
  }
  
  // Vite - purple/yellow #006bff
  if (filename.includes('vite.config')) {
    return 'devicon:vite-original colored';
  }
  
  // Default fallback - файл без специфичной иконки
  return 'lucide:File';
}
