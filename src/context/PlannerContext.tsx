'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { PlanBlock } from '../types';
import { usePersistentState } from '../hooks/usePersistentState';

interface PlannerContextValue {
  blocks: PlanBlock[];
  addBlocks: (blocks: PlanBlock[]) => void;
  updateBlock: (block: PlanBlock) => void;
  deleteBlock: (id: string) => void;
  setAllBlocks: (blocks: PlanBlock[]) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

/** Daily planner time blocks for every date, persisted to localStorage. */
export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [blocks, setBlocks] = usePersistentState<PlanBlock[]>('habitthat_planner_v1', []);

  const addBlocks = useCallback((newBlocks: PlanBlock[]) => {
    setBlocks(prev => [...prev, ...newBlocks]);
  }, [setBlocks]);

  const updateBlock = useCallback((block: PlanBlock) => {
    setBlocks(prev => prev.map(b => b.id === block.id ? block : b));
  }, [setBlocks]);

  const deleteBlock = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  }, [setBlocks]);

  const value = useMemo(
    () => ({ blocks, addBlocks, updateBlock, deleteBlock, setAllBlocks: setBlocks }),
    [blocks, addBlocks, updateBlock, deleteBlock, setBlocks]
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner must be used within a PlannerProvider');
  return context;
}
