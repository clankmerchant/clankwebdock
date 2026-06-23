import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useStore } from './store/useStore';
import { Plus, Search, Settings, Moon, Sun, FolderPlus, ExternalLink, MoreVertical, Trash2, Edit2, GripVertical, Pin, Smartphone, LayoutGrid, Image as ImageIcon, Folder as FolderIcon, LayoutList, CheckCircle2, Circle, X, Calendar, Upload, ShieldCheck, LogOut, RefreshCw, UserCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getFavicon, parseBookmarksHTML } from './lib/utils';
import confetti from 'canvas-confetti';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, logOut as firebaseLogOut } from './lib/firebase';
import { subscribeToUserCloudData, clearCloudSubscriptions } from './lib/firebaseSubscription';

// --- Components ---

const WebsiteIcon = ({ url, name, size = 'md' }: { url: string, name: string, size?: 'sm' | 'md' }) => {
  const { theme } = useStore();
  const provider = theme.faviconService || 'duckduckgo';
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setAttempt(0);
  }, [url, provider]);

  const initials = name ? name.trim().charAt(0).toUpperCase() : '?';

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'bg-red-500/80 text-white',
    'bg-orange-500/80 text-white',
    'bg-amber-500/80 text-white',
    'bg-emerald-500/80 text-white',
    'bg-teal-500/80 text-white',
    'bg-blue-500/80 text-white',
    'bg-indigo-500/80 text-white',
    'bg-purple-500/80 text-white',
    'bg-pink-500/80 text-white',
    'bg-rose-500/80 text-white',
  ];
  const colorClass = colors[Math.abs(hash) % colors.length];

  const renderSimpleIcon = () => {
    let fontSizeClass = "text-sm";
    if (size === 'sm') {
      fontSizeClass = "text-[6px] leading-[8px]";
    } else {
      if (name.length > 12) {
        fontSizeClass = "text-[9px] leading-tight";
      } else if (name.length > 8) {
        fontSizeClass = "text-xs";
      }
    }

    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-lg font-bold select-none shadow-sm px-1 text-center w-full h-full overflow-hidden leading-snug break-all uppercase",
          colorClass
        )}
      >
        <span className={cn("truncate max-w-full block", fontSizeClass)}>{name}</span>
      </div>
    );
  };

  if (theme.useSimpleIcons) {
    return renderSimpleIcon();
  }

  const getSourcesList = () => {
    const list: string[] = [];
    if (!domain) return list;

    if (provider === 'google') {
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
      list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      list.push(`https://icon.horse/icon/${domain}`);
    } else if (provider === 'iconhorse') {
      list.push(`https://icon.horse/icon/${domain}`);
      list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
    } else if (provider === 'cascade') {
      list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
      list.push(`https://icon.horse/icon/${domain}`);
    } else { // default 'duckduckgo'
      list.push(`https://icons.duckduckgo.com/ip3/${domain}.ico`);
      list.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=64`);
      list.push(`https://icon.horse/icon/${domain}`);
    }
    return list;
  };

  const sources = getSourcesList();
  const currentSrc = sources[attempt];

  if (attempt >= sources.length || !domain || !currentSrc) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center rounded-lg font-bold select-none shadow-sm",
          size === 'sm' ? "h-full w-full text-[10px]" : "h-full w-full text-lg",
          colorClass
        )}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt=""
      referrerPolicy="no-referrer"
      className="h-full w-full object-contain"
      onError={() => {
        setAttempt(prev => prev + 1);
      }}
    />
  );
};

const TodoList = () => {
  const { todos, addTodo, toggleTodo, deleteTodo, theme } = useStore();
  const [newTodo, setNewTodo] = useState('');
  const prevCompletedCount = useRef(todos.filter(t => t.completed).length);

  useEffect(() => {
    const completedCount = todos.filter(t => t.completed).length;
    if (todos.length > 0 && completedCount === todos.length && completedCount > prevCompletedCount.current) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: [theme.accentColor, '#ffffff', '#ffd700']
      });
    }
    prevCompletedCount.current = completedCount;
  }, [todos, theme.accentColor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      addTodo(newTodo.trim());
      setNewTodo('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 dark:bg-black/20 dark:border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <CheckCircle2 size={18} /> Tasks
        </h3>
        <span className="text-xs text-white/60 bg-white/10 px-2 py-1 rounded-full">
          {todos.filter(t => t.completed).length}/{todos.length}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a task..."
            className="w-full bg-white/10 border border-white/20 rounded-lg py-2 pl-3 pr-10 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
          <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
            <Plus size={18} />
          </button>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {todos.map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={cn(
                "group flex items-center gap-3 p-2 rounded-lg transition-colors",
                todo.completed ? "bg-white/5" : "bg-white/10 hover:bg-white/15"
              )}
            >
              <button 
                onClick={() => toggleTodo(todo.id)}
                className={cn(
                  "shrink-0 transition-colors",
                  todo.completed ? "text-green-400" : "text-white/40 hover:text-white/60"
                )}
              >
                {todo.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
              <span className={cn(
                "flex-1 text-sm transition-all truncate",
                todo.completed ? "text-white/40 line-through" : "text-white"
              )}>
                {todo.text}
              </span>
              <button 
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
        {todos.length === 0 && (
          <div className="text-center py-8 text-white/40 text-xs">
            No tasks yet. Add one above!
          </div>
        )}
      </div>
    </div>
  );
};

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: '',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
      ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };
    const { theme } = useStore.getState();
    const primaryStyle = variant === 'primary' ? { backgroundColor: theme.accentColor, color: 'white' } : {};

    return (
      <button
        ref={ref}
        style={primaryStyle}
        className={cn('inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100', className)}
      {...props}
    />
  )
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          {children}
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// --- Main App ---

export default function App() {
  const { 
    websites, folders, theme, searchQuery, 
    setSearchQuery, addWebsite, updateWebsite, deleteWebsite, 
    addFolder, updateFolder, deleteFolder, reorderWebsites, setTheme, importBookmarks,
    user, setUser 
  } = useStore();

  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthLoading(true);
      if (currentUser && currentUser.email) {
        setUser({ uid: currentUser.uid, email: currentUser.email });
        subscribeToUserCloudData(currentUser.uid, currentUser.email)
          .then(() => setIsAuthLoading(false))
          .catch(() => setIsAuthLoading(false));
      } else {
        setUser(null);
        clearCloudSubscriptions();
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      clearCloudSubscriptions();
    };
  }, [setUser]);

  const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState(false);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [editingWebsite, setEditingWebsite] = useState<any>(null);
  const [editingFolder, setEditingFolder] = useState<any>(null);

  const filteredWebsites = websites.filter(w => 
    w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    w.url.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });

  const filteredFolders = folders.filter(folder => {
    if (!searchQuery) return true;
    const hasMatchingWebsite = websites.some(w => 
      w.folderId === folder.id && 
      (w.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       w.url.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    const folderNameMatches = folder.name.toLowerCase().includes(searchQuery.toLowerCase());
    return hasMatchingWebsite || folderNameMatches;
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    reorderWebsites(result.draggableId, result.destination.droppableId, result.destination.index);
  };

  const handleAddWebsite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      url: formData.get('url') as string,
      folderId: formData.get('folderId') as string,
      isPinned: false,
    };
    if (editingWebsite) {
      updateWebsite(editingWebsite.id, data);
    } else {
      addWebsite(data);
    }
    setIsAddWebsiteOpen(false);
    setEditingWebsite(null);
  };

  const handleAddFolder = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    if (editingFolder) {
      updateFolder(editingFolder.id, name);
    } else {
      addFolder(name);
    }
    setIsAddFolderOpen(false);
    setEditingFolder(null);
  };

  const DraggableComponent = Draggable as any;

  const backgroundStyle = theme.background.type === 'image' 
    ? { backgroundImage: `url(${theme.background.value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : theme.background.type === 'gradient'
    ? { background: theme.background.value }
    : { backgroundColor: theme.background.value };

  return (
    <div 
      className={cn('min-h-screen transition-colors duration-300', theme.mode === 'dark' ? 'dark' : '')}
      style={backgroundStyle}
    >
      <div className={cn("mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 min-h-screen", theme.background.type !== 'color' ? "bg-black/20 backdrop-blur-sm" : "")}>
        {/* Header */}
        <header className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-lg"
              style={{ backgroundColor: theme.accentColor, boxShadow: `${theme.accentColor}33 0px 10px 15px -3px` }}
            >
              <ExternalLink size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Website Hub</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar size={14} />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 items-center gap-4 sm:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search websites..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              {isAuthLoading ? (
                <div className="flex items-center justify-center p-2 rounded-xl bg-gray-500/10 text-gray-400">
                  <RefreshCw size={14} className="animate-spin" />
                </div>
              ) : user ? (
                <div 
                  title={`Synced to cloud as ${user.email}`}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-500 font-medium"
                >
                  <ShieldCheck size={14} className="text-emerald-550 animate-pulse" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.email}</span>
                </div>
              ) : (
                <button 
                  title="Offline local storage. Click to sign in and sync"
                  className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-xs text-amber-500 font-medium cursor-pointer hover:bg-amber-500/20 transition-all"
                  onClick={() => setIsSettingsOpen(true)}
                >
                  <RefreshCw size={12} className="text-amber-500" />
                  <span className="hidden sm:inline">Unsynced</span>
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setTheme({ mode: theme.mode === 'dark' ? 'light' : 'dark' })}>
                {theme.mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsSettingsOpen(true)}>
                <Settings size={18} />
              </Button>
            </div>
          </div>
        </header>

        {/* Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Button onClick={() => setIsAddWebsiteOpen(true)} className="gap-2">
            <Plus size={18} /> Add Website
          </Button>
          <Button variant="secondary" onClick={() => setIsAddFolderOpen(true)} className="gap-2">
            <FolderPlus size={18} /> New Folder
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => setTheme({ folderLayout: theme.folderLayout === 'sections' ? 'boxes' : 'sections' })} 
            className="gap-2"
          >
            {theme.folderLayout === 'sections' ? <LayoutGrid size={18} /> : <LayoutList size={18} />}
            {theme.folderLayout === 'sections' ? 'Box Folders' : 'Section Folders'}
          </Button>
        </div>        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <DragDropContext onDragEnd={onDragEnd}>
              {theme.folderLayout === 'boxes' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                  {filteredFolders.map((folder) => {
                    const folderWebsites = filteredWebsites.filter(w => w.folderId === folder.id);
                    return (
                      <div key={folder.id} className="flex flex-col items-center gap-2">
                        <div 
                          onClick={() => setExpandedFolderId(folder.id)}
                          className="group relative h-24 w-24 sm:h-32 sm:w-32 cursor-pointer rounded-[2rem] bg-white/20 p-3 backdrop-blur-md transition-all hover:scale-105 hover:bg-white/30 dark:bg-black/20 dark:hover:bg-black/30"
                        >
                          <div className="grid h-full w-full grid-cols-3 grid-rows-3 gap-1 overflow-hidden rounded-xl">
                            {folderWebsites.slice(0, 9).map((website) => (
                              <div key={website.id} className="flex items-center justify-center rounded-sm bg-white/40 p-1 dark:bg-black/40 h-full w-full overflow-hidden">
                                <WebsiteIcon url={website.url} name={website.name} size="sm" />
                              </div>
                            ))}
                          </div>
                          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditingFolder(folder); setIsAddFolderOpen(true); }}
                              className="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Edit2 size={12} className="text-gray-400" />
                            </button>
                            {folder.id !== 'default' && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                                className="bg-white dark:bg-gray-800 rounded-full p-1.5 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 size={12} className="text-red-500" />
                              </button>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-medium text-white drop-shadow-md">{folder.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-12">
                  {filteredFolders.map((folder) => (
                    <section key={folder.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{folder.name}</h2>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            {filteredWebsites.filter(w => w.folderId === folder.id).length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingFolder(folder); setIsAddFolderOpen(true); }}>
                            <Edit2 size={14} />
                          </Button>
                          {folder.id !== 'default' && (
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteFolder(folder.id)}>
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>

                      <Droppable droppableId={folder.id} direction={theme.layout === 'ios' ? 'horizontal' : 'horizontal'}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              theme.layout === 'ios' 
                                ? "grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-6 p-6"
                                : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-2",
                              "min-h-[100px] rounded-xl transition-colors",
                              snapshot.isDraggingOver ? "bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20" : ""
                            )}
                          >
                            {filteredWebsites
                              .filter(w => w.folderId === folder.id)
                              .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                              .map((website, index) => (
                                <DraggableComponent key={website.id} draggableId={website.id} index={index}>
                                  {(provided: any, snapshot: any) => (
                                    theme.layout === 'ios' ? (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                          "group relative flex flex-col items-center gap-2 transition-all",
                                          snapshot.isDragging ? "z-50 scale-110" : ""
                                        )}
                                      >
                                        <div {...provided.dragHandleProps} className="absolute -top-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <div className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700">
                                            <GripVertical size={12} className="text-gray-400" />
                                          </div>
                                        </div>
                                        
                                        <a
                                          href={website.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-col items-center gap-2 w-full"
                                        >
                                          <div 
                                            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-white p-3 shadow-sm transition-transform group-hover:scale-105 dark:bg-gray-900"
                                            style={{ boxShadow: website.isPinned ? `0 0 0 2px ${theme.accentColor}` : '' }}
                                          >
                                            <WebsiteIcon url={website.url} name={website.name} />
                                            {website.isPinned && (
                                              <div className="absolute top-1 right-1">
                                                <Pin size={10} className="fill-blue-500 text-blue-500" />
                                              </div>
                                            )}
                                          </div>
                                          <span className="w-full truncate text-center text-xs font-medium text-gray-900 dark:text-gray-200">
                                            {website.name}
                                          </span>
                                        </a>

                                        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button 
                                            onClick={() => updateWebsite(website.id, { isPinned: !website.isPinned })}
                                            className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                          >
                                            <Pin size={10} className={website.isPinned ? "fill-blue-500 text-blue-500" : "text-gray-400"} />
                                          </button>
                                          <button 
                                            onClick={() => { setEditingWebsite(website); setIsAddWebsiteOpen(true); }}
                                            className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                          >
                                            <Edit2 size={10} className="text-gray-400" />
                                          </button>
                                          <button 
                                            onClick={() => deleteWebsite(website.id)}
                                            className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                          >
                                            <Trash2 size={10} className="text-red-500" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={cn(
                                          "group relative flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900",
                                          snapshot.isDragging ? "shadow-xl ring-2 ring-blue-500 z-50" : "",
                                          website.isPinned ? "border-blue-200 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-900/5" : ""
                                        )}
                                      >
                                        <div {...provided.dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-400 dark:text-gray-700">
                                          <GripVertical size={18} />
                                        </div>
                                        <a
                                          href={website.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex flex-1 items-center gap-3 overflow-hidden"
                                        >
                                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                                            <WebsiteIcon url={website.url} name={website.name} size="md" />
                                          </div>
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                              <h3 className="truncate font-medium text-gray-900 dark:text-white">{website.name}</h3>
                                              {website.isPinned && <Pin size={12} className="fill-blue-500 text-blue-500" />}
                                            </div>
                                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{new URL(website.url).hostname}</p>
                                          </div>
                                        </a>
                                        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                                          <Button variant="ghost" size="sm" onClick={() => updateWebsite(website.id, { isPinned: !website.isPinned })}>
                                            <Pin size={14} className={website.isPinned ? "fill-blue-500 text-blue-500" : ""} />
                                          </Button>
                                          <Button variant="ghost" size="sm" onClick={() => { setEditingWebsite(website); setIsAddWebsiteOpen(true); }}>
                                            <Edit2 size={14} />
                                          </Button>
                                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => deleteWebsite(website.id)}>
                                            <Trash2 size={14} />
                                          </Button>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </DraggableComponent>
                              ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </section>
                  ))}
                </div>
              )}
            </DragDropContext>
          </div>

          {theme.showTodoList && (
            <div className="w-full lg:w-80 shrink-0">
              <TodoList />
            </div>
          )}
        </div>

        {/* Expanded Folder Modal */}
        <Modal
          isOpen={!!expandedFolderId}
          onClose={() => setExpandedFolderId(null)}
          title={folders.find(f => f.id === expandedFolderId)?.name || ''}
        >
          <div className="max-h-[60vh] overflow-y-auto p-4">
            <div className="grid grid-cols-3 gap-6 sm:grid-cols-4">
              {filteredWebsites
                .filter(w => w.folderId === expandedFolderId)
                .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                .map((website) => (
                  <div key={website.id} className="group relative flex flex-col items-center gap-2">
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-2 w-full"
                    >
                      <div 
                        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-gray-100 p-3 shadow-sm transition-transform group-hover:scale-105 dark:bg-gray-800"
                        style={{ boxShadow: website.isPinned ? `0 0 0 2px ${theme.accentColor}` : '' }}
                      >
                        <WebsiteIcon url={website.url} name={website.name} />
                        {website.isPinned && (
                          <div className="absolute top-1 right-1">
                            <Pin size={10} className="fill-blue-500 text-blue-500" />
                          </div>
                        )}
                      </div>
                      <span className="w-full truncate text-center text-xs font-medium text-gray-900 dark:text-gray-200">
                        {website.name}
                      </span>
                    </a>
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => updateWebsite(website.id, { isPinned: !website.isPinned })}
                        className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Pin size={10} className={website.isPinned ? "fill-blue-500 text-blue-500" : "text-gray-400"} />
                      </button>
                      <button 
                        onClick={() => { setEditingWebsite(website); setIsAddWebsiteOpen(true); }}
                        className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Edit2 size={10} className="text-gray-400" />
                      </button>
                      <button 
                        onClick={() => deleteWebsite(website.id)}
                        className="bg-white dark:bg-gray-800 rounded-full p-1 shadow-md border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={10} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              <button 
                onClick={() => setIsAddWebsiteOpen(true)}
                className="flex flex-col items-center gap-2"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-gray-100 border-2 border-dashed border-gray-300 text-gray-400 hover:bg-gray-200 hover:border-gray-400 transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:bg-gray-700">
                  <Plus size={24} />
                </div>
                <span className="text-xs font-medium text-gray-500">Add</span>
              </button>
            </div>
          </div>
        </Modal>

        {/* Modals */}
        <Modal
          isOpen={isAddWebsiteOpen}
          onClose={() => { setIsAddWebsiteOpen(false); setEditingWebsite(null); }}
          title={editingWebsite ? 'Edit Website' : 'Add Website'}
        >
          <form onSubmit={handleAddWebsite} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Name</label>
              <Input name="name" placeholder="Google" defaultValue={editingWebsite?.name} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">URL</label>
              <Input name="url" type="url" placeholder="https://google.com" defaultValue={editingWebsite?.url} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Folder</label>
              <select
                name="folderId"
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                defaultValue={editingWebsite?.folderId || 'default'}
              >
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <Button type="submit" className="w-full">
              {editingWebsite ? 'Update' : 'Add'} Website
            </Button>
          </form>
        </Modal>

        <Modal
          isOpen={isAddFolderOpen}
          onClose={() => { setIsAddFolderOpen(false); setEditingFolder(null); }}
          title={editingFolder ? 'Rename Folder' : 'New Folder'}
        >
          <form onSubmit={handleAddFolder} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium dark:text-gray-200">Folder Name</label>
              <Input name="name" placeholder="Work, Social, etc." defaultValue={editingFolder?.name} required />
            </div>
            <Button type="submit" className="w-full">
              {editingFolder ? 'Rename' : 'Create'} Folder
            </Button>
          </form>
        </Modal>

        <Modal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          title="Settings"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {/* Cloud Synchronization Section */}
            <div className="space-y-3 rounded-2xl bg-gray-50 p-4 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Cloud Sync (Phone & Mac)
              </h4>
              {isAuthLoading ? (
                <div className="flex items-center gap-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  <RefreshCw size={16} className="animate-spin text-blue-500" />
                  <span>Checking sync state...</span>
                </div>
              ) : user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-emerald-500 flex items-center gap-1 font-semibold">
                        <ShieldCheck size={12} /> Auto syncing across devices
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full gap-2 text-xs py-2"
                    onClick={async () => {
                      try {
                        await firebaseLogOut();
                      } catch (err) {
                        console.error('Logout error:', err);
                      }
                    }}
                  >
                    <LogOut size={13} /> Sign Out of Cloud Sync
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    Access bookmarks on any mobile phone, tablet or laptop. Syncs automatically and securely in real-time.
                  </p>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await signInWithGoogle();
                      } catch (err) {
                        console.error('Google Sign-In Error:', err);
                      }
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Sign In with Google</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500">Appearance</h4>
              
              <div className="flex items-center justify-between py-2">
                <label className="text-sm font-medium dark:text-gray-200">Show To-Do List</label>
                <button
                  onClick={() => setTheme({ showTodoList: !theme.showTodoList })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    theme.showTodoList ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    theme.showTodoList ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800/50 pt-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium dark:text-gray-200">Simple Icons</label>
                  <span className="text-[11px] text-gray-400">Display website name instead of favicon</span>
                </div>
                <button
                  onClick={() => setTheme({ useSimpleIcons: !theme.useSimpleIcons })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    theme.useSimpleIcons ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                  )}
                >
                  <span className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    theme.useSimpleIcons ? "translate-x-6" : "translate-x-1"
                  )} />
                </button>
              </div>

              <div className="space-y-2 border-t border-gray-100 dark:border-gray-800/50 pt-3">
                <div className="flex flex-col">
                  <label className="text-sm font-medium dark:text-gray-200">Favicon Provider</label>
                  <span className="text-[11px] text-gray-400">Alternative fallback providers to load your website icons</span>
                </div>
                <select
                  value={theme.faviconService || 'duckduckgo'}
                  onChange={(e) => setTheme({ faviconService: e.target.value as any })}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 cursor-pointer"
                >
                  <option value="duckduckgo">DuckDuckGo IP3 (Overall Best Compatibility & Privacy)</option>
                  <option value="google">Google S2 (Standard Icon Service)</option>
                  <option value="iconhorse">Icon Horse (High Contrast Fallback)</option>
                  <option value="cascade">Auto-Fallback Cascade (DDG ➔ Google ➔ Icon Horse)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium dark:text-gray-200">Accent Color</label>
                <div className="flex flex-wrap gap-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 transition-all",
                        theme.accentColor === color ? "border-gray-900 dark:border-white scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setTheme({ accentColor: color })}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium dark:text-gray-200">Background</label>
                  <label className="cursor-pointer text-xs flex items-center gap-1 text-blue-500 hover:text-blue-600">
                    <Upload size={12} />
                    Upload Image
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setTheme({ background: { type: 'image', value: result } });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Solid Colors</p>
                  <div className="flex flex-wrap gap-2">
                    {['#0f172a', '#09090b', '#171717', '#f8fafc', '#ffffff'].map(color => (
                      <button
                        key={color}
                        className={cn(
                          "h-8 w-12 rounded-md border transition-all",
                          theme.background.value === color ? "ring-2 ring-blue-500 scale-105" : "border-gray-200 dark:border-gray-800"
                        )}
                        style={{ backgroundColor: color }}
                        onClick={() => setTheme({ background: { type: 'color', value: color } })}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Gradients</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'linear-gradient(to bottom right, #ff5f6d, #ffc371)',
                      'linear-gradient(to bottom right, #2193b0, #6dd5ed)',
                      'linear-gradient(to bottom right, #11998e, #38ef7d)',
                      'linear-gradient(to bottom right, #8e2de2, #4a00e0)',
                      'linear-gradient(to bottom right, #ee0979, #ff6a00)'
                    ].map(grad => (
                      <button
                        key={grad}
                        className={cn(
                          "h-8 w-12 rounded-md border transition-all",
                          theme.background.value === grad ? "ring-2 ring-blue-500 scale-105" : "border-gray-200 dark:border-gray-800"
                        )}
                        style={{ background: grad }}
                        onClick={() => setTheme({ background: { type: 'gradient', value: grad } })}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Aesthetic Images</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=400',
                      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=400',
                      'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&q=80&w=400',
                      'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=400',
                      'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=400',
                      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=400'
                    ].map(img => (
                      <button
                        key={img}
                        className={cn(
                          "h-12 w-full rounded-md border transition-all overflow-hidden",
                          theme.background.value === img ? "ring-2 ring-blue-500 scale-105" : "border-gray-200 dark:border-gray-800"
                        )}
                        onClick={() => setTheme({ background: { type: 'image', value: img } })}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500">Data Management</h4>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => {
                  const data = JSON.stringify({ websites, folders });
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'website-hub-backup.json';
                  a.click();
                }}>Export JSON</Button>
                <Button variant="secondary" className="flex-1" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const data = JSON.parse(e.target?.result as string);
                        useStore.getState().importData(data);
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}>Import JSON</Button>
              </div>
              
              <div className="pt-2">
                <label className="cursor-pointer text-xs flex items-center justify-center gap-2 rounded-xl py-3 px-4 bg-blue-600/10 hover:bg-blue-600/15 text-blue-500 hover:text-blue-600 font-semibold transition-all border border-dashed border-blue-500/30 text-center select-none shadow-sm">
                  <Upload size={14} />
                  <span>Import Bookmarks HTML (Safari/Chrome/Firefox)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".html,.htm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          const parsed = parseBookmarksHTML(result);
                          importBookmarks(parsed.folders, parsed.websites);
                          setIsSettingsOpen(false);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
