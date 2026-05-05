const DB_NAME = 'ielts-speaking-backups';
const DB_VERSION = 1;
const STORE_NAME = 'audio-backups';

interface BackupEntry {
  questionId: string;
  attemptId: string;
  blob: Blob;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'questionId' });
        store.createIndex('attemptId', 'attemptId', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });
}

export async function saveAudioBackup(questionId: string, attemptId: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({
      questionId,
      attemptId,
      blob,
      savedAt: Date.now()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingBackups(): Promise<Array<{ questionId: string; attemptId: string; blob: Blob; savedAt: number }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result as BackupEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBackup(questionId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(questionId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function retryPendingBackups(uploadFn: (questionId: string, attemptId: string, blob: Blob) => Promise<void>): Promise<void> {
  try {
    const backups = await getPendingBackups();
    if (backups.length === 0) return;
    
    for (const backup of backups) {
      try {
        if (!backup.blob || backup.blob.size === 0) {
          console.warn(`Skipping empty backup for question: ${backup.questionId}`);
          await deleteBackup(backup.questionId);
          continue;
        }
        console.log(`Retrying backup for question: ${backup.questionId}`);
        await uploadFn(backup.questionId, backup.attemptId, backup.blob);
        await deleteBackup(backup.questionId);
        console.log(`Successfully uploaded and deleted backup for question: ${backup.questionId}`);
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`Failed to retry backup for question ${backup.questionId}: ${errMsg}`);
        // Don't re-throw, continue with next backup to avoid stack overflow
      }
    }
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in retryPendingBackups:', errMsg);
  }
}
