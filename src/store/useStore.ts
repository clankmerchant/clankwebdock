import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Website, Folder, ThemeConfig, Todo } from '../types';
import { 
  syncUserProfile, 
  syncAddWebsite, 
  syncUpdateWebsite, 
  syncDeleteWebsite, 
  syncAddFolder, 
  syncUpdateFolder, 
  syncDeleteFolder, 
  syncAddTodo, 
  syncUpdateTodo, 
  syncDeleteTodo,
  pushFullLocalToCloud
} from '../lib/firebaseSync';

interface AppStore {
  websites: Website[];
  folders: Folder[];
  todos: Todo[];
  theme: ThemeConfig;
  searchQuery: string;
  user: { uid: string; email: string } | null;
  setSearchQuery: (query: string) => void;
  setUser: (user: { uid: string; email: string } | null) => void;
  addWebsite: (website: Omit<Website, 'id' | 'createdAt'>) => void;
  updateWebsite: (id: string, updates: Partial<Website>) => void;
  deleteWebsite: (id: string) => void;
  addFolder: (name: string) => void;
  updateFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addTodo: (text: string) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  reorderWebsites: (websiteId: string, targetFolderId: string, newIndex: number) => void;
  setTheme: (theme: Partial<ThemeConfig>) => void;
  importData: (data: { websites: Website[]; folders: Folder[]; todos?: Todo[] }) => void;
  importBookmarks: (folders: { id: string; name: string }[], websites: { name: string; url: string; folderId: string; isPinned: boolean }[]) => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      websites: [],
      folders: [{ id: 'default', name: 'General', order: 0 }],
      todos: [],
      theme: {
        mode: 'dark',
        accentColor: '#3b82f6',
        layout: 'ios',
        folderLayout: 'boxes',
        showTodoList: true,
        background: { type: 'color', value: '#0f172a' },
      },
      searchQuery: '',
      user: null,
      setSearchQuery: (query) => set({ searchQuery: query }),
      setUser: (user) => set({ user }),
      addWebsite: (website) =>
        set((state) => {
          const newId = crypto.randomUUID();
          const createdAt = Date.now();
          const newWeb: Website = { ...website, id: newId, createdAt };
          if (state.user) {
            syncAddWebsite(state.user.uid, newWeb);
          }
          return {
            websites: [...state.websites, newWeb],
          };
        }),
      updateWebsite: (id, updates) =>
        set((state) => {
          if (state.user) {
            syncUpdateWebsite(state.user.uid, id, updates);
          }
          return {
            websites: state.websites.map((w) => (w.id === id ? { ...w, ...updates } : w)),
          };
        }),
      deleteWebsite: (id) =>
        set((state) => {
          if (state.user) {
            syncDeleteWebsite(state.user.uid, id);
          }
          return {
            websites: state.websites.filter((w) => w.id !== id),
          };
        }),
      addFolder: (name) =>
        set((state) => {
          const newId = crypto.randomUUID();
          const newF: Folder = { id: newId, name, order: state.folders.length };
          if (state.user) {
            syncAddFolder(state.user.uid, newF);
          }
          return {
            folders: [...state.folders, newF],
          };
        }),
      updateFolder: (id, name) =>
        set((state) => {
          if (state.user) {
            syncUpdateFolder(state.user.uid, id, name);
          }
          return {
            folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
          };
        }),
      deleteFolder: (id) =>
        set((state) => {
          const affectedWebsiteIds: string[] = [];
          const websites = state.websites.map((w) => {
            if (w.folderId === id) {
              affectedWebsiteIds.push(w.id);
              return { ...w, folderId: 'default' };
            }
            return w;
          });

          if (state.user) {
            syncDeleteFolder(state.user.uid, id, affectedWebsiteIds);
          }

          return {
            folders: state.folders.filter((f) => f.id !== id),
            websites,
          };
        }),
      addTodo: (text) =>
        set((state) => {
          const newId = crypto.randomUUID();
          const createdAt = Date.now();
          const newT: Todo = { id: newId, text, completed: false, createdAt };
          if (state.user) {
            syncAddTodo(state.user.uid, newT);
          }
          return {
            todos: [...state.todos, newT],
          };
        }),
      toggleTodo: (id) =>
        set((state) => {
          const todo = state.todos.find((t) => t.id === id);
          const updatedCompleted = todo ? !todo.completed : false;
          if (state.user && todo) {
            syncUpdateTodo(state.user.uid, id, { completed: updatedCompleted });
          }
          return {
            todos: state.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
          };
        }),
      deleteTodo: (id) =>
        set((state) => {
          if (state.user) {
            syncDeleteTodo(state.user.uid, id);
          }
          return {
            todos: state.todos.filter((t) => t.id !== id),
          };
        }),
      reorderWebsites: (websiteId, targetFolderId, newIndex) =>
        set((state) => {
          const websites = [...state.websites];
          const websiteIndex = websites.findIndex((w) => w.id === websiteId);
          if (websiteIndex === -1) return state;

          const [website] = websites.splice(websiteIndex, 1);
          website.folderId = targetFolderId;
          websites.splice(newIndex, 0, website);

          if (state.user) {
            syncUpdateWebsite(state.user.uid, websiteId, { folderId: targetFolderId });
          }

          return { websites };
        }),
      setTheme: (theme) =>
        set((state) => {
          const updatedTheme = { ...state.theme, ...theme };
          if (state.user) {
            syncUserProfile(state.user.uid, state.user.email, updatedTheme);
          }
          return {
            theme: updatedTheme,
          };
        }),
      importData: (data) =>
        set((state) => {
          const websites = data.websites;
          const folders = data.folders;
          const todos = data.todos || [];
          if (state.user) {
            pushFullLocalToCloud(state.user.uid, state.user.email, state.theme, folders, websites, todos);
          }
          return { websites, folders, todos };
        }),
      importBookmarks: (importedFolders, importedWebsites) =>
        set((state) => {
          const existingFolders = [...state.folders];
          const folderIdMap = new Map<string, string>();

          folderIdMap.set('default', 'default');

          importedFolders.forEach((imp) => {
            const match = existingFolders.find(
              (ef) => ef.name.trim().toLowerCase() === imp.name.trim().toLowerCase()
            );
            if (match) {
              folderIdMap.set(imp.id, match.id);
            } else {
              const newId = crypto.randomUUID();
              folderIdMap.set(imp.id, newId);
              existingFolders.push({
                id: newId,
                name: imp.name.trim(),
                order: existingFolders.length,
              });
            }
          });

          const newWebsites = [...state.websites];

          importedWebsites.forEach((site) => {
            const mappedFolderId = folderIdMap.get(site.folderId) || 'default';
            const duplicate = newWebsites.find(
              (w) => w.folderId === mappedFolderId && w.url === site.url
            );
            if (!duplicate) {
              newWebsites.push({
                id: crypto.randomUUID(),
                name: site.name,
                url: site.url,
                folderId: mappedFolderId,
                isPinned: site.isPinned,
                createdAt: Date.now(),
              });
            }
          });

          if (state.user) {
            pushFullLocalToCloud(state.user.uid, state.user.email, state.theme, existingFolders, newWebsites, state.todos);
          }

          return {
            folders: existingFolders,
            websites: newWebsites,
          };
        }),
    }),
    {
      name: 'website-hub-storage',
      // Explicitly partialize to exclude system auth transient user state
      partialize: (state) => ({
        websites: state.websites,
        folders: state.folders,
        todos: state.todos,
        theme: state.theme,
      }),
    }
  )
);
