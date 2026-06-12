import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getFavicon(url: string) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export interface ImportResult {
  folders: { id: string; name: string }[];
  websites: { name: string; url: string; folderId: string; isPinned: boolean }[];
}

export function parseBookmarksHTML(htmlText: string): ImportResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const result: ImportResult = {
    folders: [],
    websites: []
  };

  const folderMap = new Map<string, string>(); // name -> id

  const getOrCreateFolder = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return 'default';
    const lower = trimmed.toLowerCase();
    if (lower === 'general' || lower === 'bookmarks bar' || lower === 'favorites' || lower === 'bookmarksbar') {
      return 'default';
    }
    if (folderMap.has(trimmed)) {
      return folderMap.get(trimmed)!;
    }
    const id = crypto.randomUUID();
    result.folders.push({ id, name: trimmed });
    folderMap.set(trimmed, id);
    return id;
  };

  // Select all nested <DL> or elements to find anchors and folder names.
  // We use standard QuerySelector to get all anchors.
  // For each anchor, we find the containing folder name by going up the parents.
  const anchors = doc.querySelectorAll('a');
  
  const getDLFolderName = (dl: Element): string => {
    // Look at previous sibling containing h3
    let sibling = dl.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'H3') {
        return sibling.textContent || 'Folder';
      }
      const h3 = sibling.querySelector('h3');
      if (h3) {
        return h3.textContent || 'Folder';
      }
      sibling = sibling.previousElementSibling;
    }

    // Look at parent's previous sibling
    let parent = dl.parentElement;
    while (parent && parent.tagName !== 'BODY') {
      let parentSibling = parent.previousElementSibling;
      while (parentSibling) {
        if (parentSibling.tagName === 'H3') {
          return parentSibling.textContent || 'Folder';
        }
        const h3 = parentSibling.querySelector('h3');
        if (h3) return h3.textContent || 'Folder';
        parentSibling = parentSibling.previousElementSibling;
      }
      parent = parent.parentElement;
    }
    return '';
  };

  anchors.forEach((anchor) => {
    const url = anchor.getAttribute('href') || anchor.getAttribute('HREF') || '';
    const name = anchor.textContent || url;
    
    // Validate we have a real URL starting with HTTP/S
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      // Find parent DL to discover the folder name
      let folderName = '';
      let current: Element | null = anchor;
      while (current && current.tagName !== 'BODY') {
        if (current.tagName === 'DL') {
          folderName = getDLFolderName(current);
          if (folderName) break;
        }
        current = current.parentElement;
      }

      const folderId = folderName ? getOrCreateFolder(folderName) : 'default';
      result.websites.push({
        name: name.trim() || url,
        url: url.trim(),
        folderId,
        isPinned: false
      });
    }
  });

  return result;
}

