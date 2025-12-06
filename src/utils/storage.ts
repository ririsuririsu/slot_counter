const STORAGE_KEY = 'slot_counter_data';

export interface StorageData {
  machines: unknown[];
  currentMachineId: string | null;
  version: number;
}

const DEFAULT_DATA: StorageData = {
  machines: [],
  currentMachineId: null,
  version: 1,
};

export function loadFromStorage(): StorageData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as StorageData;
    }
  } catch (e) {
    console.error('Failed to load from storage:', e);
  }
  return DEFAULT_DATA;
}

export function saveToStorage(data: StorageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to storage:', e);
    // 容量エラーの場合
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      alert('ストレージ容量が不足しています。古いデータを削除してください。');
    }
  }
}

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear storage:', e);
  }
}
