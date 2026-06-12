// 夜の書庫 — 紡いだ寓話は端末の中に静かに積まれていく。

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Fable } from './engine/fable';

const KEY = '@fable/library';
const LIMIT = 200;

export async function loadLibrary(): Promise<Fable[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Fable[];
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function saveFable(fable: Fable): Promise<void> {
  const list = await loadLibrary();
  if (list.some((f) => f.id === fable.id)) return;
  const next = [fable, ...list].slice(0, LIMIT);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function deleteFable(id: string): Promise<Fable[]> {
  const list = await loadLibrary();
  const next = list.filter((f) => f.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
