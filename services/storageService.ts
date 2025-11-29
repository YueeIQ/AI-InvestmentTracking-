
import { Holding } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'wealthtrack_holdings_v1';

// --- Local Storage (Guest Mode) ---

export const getHoldings = (): Holding[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load local holdings', e);
    return [];
  }
};

export const saveHoldings = (holdings: Holding[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch (e) {
    console.error('Failed to save local holdings', e);
  }
};

// --- Cloud Storage (Authenticated Mode) ---

export const getUserHoldings = async (userId: string): Promise<Holding[] | null> => {
  if (!db) {
    console.warn("Firestore not initialized.");
    return null;
  }
  try {
    const docRef = doc(db, 'portfolios', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().holdings as Holding[];
    } else {
      return null; // Indicates no cloud data found (new user or first sync)
    }
  } catch (e) {
    console.error('Failed to fetch cloud holdings', e);
    throw e;
  }
};

export const saveUserHoldings = async (userId: string, holdings: Holding[]): Promise<void> => {
  if (!db) {
    console.warn("Firestore not initialized.");
    return;
  }
  try {
    const docRef = doc(db, 'portfolios', userId);
    await setDoc(docRef, { 
      holdings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error('Failed to save cloud holdings', e);
    throw e;
  }
};
