import { openDB } from 'idb';

const DB_NAME = 'invoice-app-db';
const STORE_NAME = 'templates';
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function storeFile(id: string, file: File): Promise<void> {
  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();
  await db.put(STORE_NAME, arrayBuffer, id);
}

export async function getFile(id: string): Promise<ArrayBuffer | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
} 