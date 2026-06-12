export interface Website {
  id: string;
  name: string;
  url: string;
  icon?: string;
  folderId: string;
  isPinned: boolean;
  createdAt: number;
}

export interface Folder {
  id: string;
  name: string;
  order: number;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface ThemeConfig {
  mode: 'light' | 'dark';
  accentColor: string;
  layout: 'grid' | 'ios';
  folderLayout: 'sections' | 'boxes';
  showTodoList: boolean;
  background: {
    type: 'color' | 'gradient' | 'image';
    value: string;
  };
}

export interface AppState {
  websites: Website[];
  folders: Folder[];
  todos: Todo[];
  theme: ThemeConfig;
  searchQuery: string;
}
