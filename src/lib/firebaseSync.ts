import { doc, setDoc, updateDoc, deleteDoc, writeBatch, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Website, Folder, Todo, ThemeConfig } from '../types';

/**
 * Sync entire user profile and theme preferences to Firestore
 */
export async function syncUserProfile(userId: string, email: string, theme: ThemeConfig) {
  const path = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      uid: userId,
      email: email,
      theme: theme,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync a single bookmark website creation
 */
export async function syncAddWebsite(userId: string, website: Website) {
  const path = `users/${userId}/websites/${website.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'websites', website.id);
    await setDoc(docRef, {
      id: website.id,
      userId: userId,
      name: website.name,
      url: website.url,
      folderId: website.folderId,
      isPinned: website.isPinned,
      createdAt: website.createdAt,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync website fields update
 */
export async function syncUpdateWebsite(userId: string, websiteId: string, updates: Partial<Website>) {
  const path = `users/${userId}/websites/${websiteId}`;
  try {
    const docRef = doc(db, 'users', userId, 'websites', websiteId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync website deletion
 */
export async function syncDeleteWebsite(userId: string, websiteId: string) {
  const path = `users/${userId}/websites/${websiteId}`;
  try {
    const docRef = doc(db, 'users', userId, 'websites', websiteId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Sync folder creation
 */
export async function syncAddFolder(userId: string, folder: Folder) {
  const path = `users/${userId}/folders/${folder.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'folders', folder.id);
    await setDoc(docRef, {
      id: folder.id,
      userId: userId,
      name: folder.name,
      order: folder.order,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync folder update
 */
export async function syncUpdateFolder(userId: string, folderId: string, name: string) {
  const path = `users/${userId}/folders/${folderId}`;
  try {
    const docRef = doc(db, 'users', userId, 'folders', folderId);
    await updateDoc(docRef, {
      name,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync folder deletion and automatically update any websites inside that folder to 'default'
 */
export async function syncDeleteFolder(userId: string, folderId: string, websitesToReset: string[]) {
  const path = `users/${userId}/folders/${folderId}`;
  try {
    const batch = writeBatch(db);
    
    // Delete folder
    const folderRef = doc(db, 'users', userId, 'folders', folderId);
    batch.delete(folderRef);

    // Reset affected websites
    for (const webId of websitesToReset) {
      const webRef = doc(db, 'users', userId, 'websites', webId);
      batch.update(webRef, {
        folderId: 'default',
        updatedAt: Date.now()
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync todo task creation
 */
export async function syncAddTodo(userId: string, todo: Todo) {
  const path = `users/${userId}/todos/${todo.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'todos', todo.id);
    await setDoc(docRef, {
      id: todo.id,
      userId: userId,
      text: todo.text,
      completed: todo.completed,
      createdAt: todo.createdAt,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync todo status/text update
 */
export async function syncUpdateTodo(userId: string, todoId: string, updates: Partial<Todo>) {
  const path = `users/${userId}/todos/${todoId}`;
  try {
    const docRef = doc(db, 'users', userId, 'todos', todoId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: Date.now()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Sync todo deletion
 */
export async function syncDeleteTodo(userId: string, todoId: string) {
  const path = `users/${userId}/todos/${todoId}`;
  try {
    const docRef = doc(db, 'users', userId, 'todos', todoId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Push an entire local dataset to Firestore (for initial sync / imports)
 */
export async function pushFullLocalToCloud(
  userId: string, 
  email: string, 
  theme: ThemeConfig, 
  folders: Folder[], 
  websites: Website[], 
  todos: Todo[]
) {
  const path = `users/${userId}`;
  try {
    // 1. Save root profile document
    await syncUserProfile(userId, email, theme);

    // 2. We can batch save folders, websites, and todos
    const batch = writeBatch(db);

    // Add Folders
    folders.forEach(f => {
      const docRef = doc(db, 'users', userId, 'folders', f.id);
      batch.set(docRef, {
        id: f.id,
        userId: userId,
        name: f.name,
        order: f.order,
        updatedAt: Date.now()
      });
    });

    // Add Websites
    websites.forEach(w => {
      const docRef = doc(db, 'users', userId, 'websites', w.id);
      batch.set(docRef, {
        id: w.id,
        userId: userId,
        name: w.name,
        url: w.url,
        folderId: w.folderId,
        isPinned: w.isPinned,
        createdAt: w.createdAt,
        updatedAt: Date.now()
      });
    });

    // Add Todos
    todos.forEach(t => {
      const docRef = doc(db, 'users', userId, 'todos', t.id);
      batch.set(docRef, {
        id: t.id,
        userId: userId,
        text: t.text,
        completed: t.completed,
        createdAt: t.createdAt,
        updatedAt: Date.now()
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
