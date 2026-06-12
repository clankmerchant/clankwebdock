import { doc, collection, onSnapshot, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { useStore } from '../store/useStore';
import { pushFullLocalToCloud } from './firebaseSync';

let unsubscribes: (() => void)[] = [];

/**
 * Stop all active Firestore real-time snapshot listeners
 */
export function clearCloudSubscriptions() {
  unsubscribes.forEach(unsub => unsub());
  unsubscribes = [];
}

/**
 * Subscribe to the user's Firestore cloud data in real-time.
 * If the user's profile doesn't exist, execute a genesis sync pushing current local bookmarks to the cloud.
 */
export async function subscribeToUserCloudData(userId: string, email: string) {
  // Clear any existing listeners first to prevent duplicates
  clearCloudSubscriptions();

  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnapshot = await getDoc(userDocRef);

    // Grab current local Zustand store
    const store = useStore.getState();

    if (!userSnapshot.exists()) {
      // First-time cloud sync: Upload existing local bookmarks, folders, and todos
      console.log("No cloud database record found. Executing genesis bookmark upload to secure your local layout...");
      await pushFullLocalToCloud(userId, email, store.theme, store.folders, store.websites, store.todos);
    }

    // Establish real-time sync listeners for multi-device live syncing:
    
    // 1. Theme Configuration & profile settings
    const unsubUser = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.theme) {
          useStore.setState({ theme: data.theme });
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}`);
    });
    unsubscribes.push(unsubUser);

    // 2. Folder Collections
    const foldersColRef = collection(db, 'users', userId, 'folders');
    const unsubFolders = onSnapshot(foldersColRef, (snapshot) => {
      const foldersList: any[] = [];
      snapshot.forEach(docSnap => {
        foldersList.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (foldersList.length > 0) {
        // Enforce the defined category sort order
        foldersList.sort((a, b) => (a.order || 0) - (b.order || 0));
        useStore.setState({ folders: foldersList });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/folders`);
    });
    unsubscribes.push(unsubFolders);

    // 3. Website Collections
    const websitesColRef = collection(db, 'users', userId, 'websites');
    const unsubWebsites = onSnapshot(websitesColRef, (snapshot) => {
      const websitesList: any[] = [];
      snapshot.forEach(docSnap => {
        websitesList.push({ id: docSnap.id, ...docSnap.data() });
      });
      useStore.setState({ websites: websitesList });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/websites`);
    });
    unsubscribes.push(unsubWebsites);

    // 4. Todo Collections
    const todosColRef = collection(db, 'users', userId, 'todos');
    const unsubTodos = onSnapshot(todosColRef, (snapshot) => {
      const todosList: any[] = [];
      snapshot.forEach(docSnap => {
        todosList.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort items by creation time to preserve task chronological ordering
      todosList.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      useStore.setState({ todos: todosList });
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${userId}/todos`);
    });
    unsubscribes.push(unsubTodos);

  } catch (error) {
    console.error("Failed to establish real-time Firestore database subscription:", error);
  }
}
