import { IconType } from 'react-icons';
import {
  VscFile,
  VscFolder,
  VscFolderOpened,
  VscJson,
  VscMarkdown,
  VscTerminalBash,
  VscCode,
  VscSymbolNamespace,
} from 'react-icons/vsc';
import {
  SiTypescript,
  SiJavascript,
  SiPython,
  SiReact,
  SiHtml5,
  SiCss,
  SiDocker,
  SiRust,
  SiGo,
} from 'react-icons/si';

const extensionIcons: Record<string, IconType> = {
  '.ts': SiTypescript,
  '.tsx': SiReact,
  '.js': SiJavascript,
  '.jsx': SiReact,
  '.py': SiPython,
  '.rs': SiRust,
  '.go': SiGo,
  '.json': VscJson,
  '.md': VscMarkdown,
  '.mdx': VscMarkdown,
  '.html': SiHtml5,
  '.css': SiCss,
  '.scss': SiCss,
  '.sh': VscTerminalBash,
  '.bash': VscTerminalBash,
  '.zsh': VscTerminalBash,
  '.dockerfile': SiDocker,
  '.yml': VscCode,
  '.yaml': VscCode,
  '.toml': VscCode,
  '.lock': VscSymbolNamespace,
};

const nameIcons: Record<string, IconType> = {
  'Dockerfile': SiDocker,
  'docker-compose.yml': SiDocker,
  'docker-compose.yaml': SiDocker,
  '.gitignore': VscCode,
  'Makefile': VscTerminalBash,
};

export function getFileIcon(name: string, extension: string): IconType {
  return nameIcons[name] || extensionIcons[extension.toLowerCase()] || VscFile;
}

export function getFolderIcon(isExpanded: boolean): IconType {
  return isExpanded ? VscFolderOpened : VscFolder;
}
