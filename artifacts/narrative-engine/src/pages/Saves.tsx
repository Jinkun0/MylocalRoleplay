import { useListSaves, useCreateSave, useLoadSave, useDeleteSave, getListSavesQueryKey, getGetWorldStateQueryKey } from '@workspace/api-client-react';
import { useState } from 'react';
import { Save, Download, Trash2, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

export default function Saves() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: saves = [], isLoading } = useListSaves();
  const createSave = useCreateSave();
  const loadSave = useLoadSave();
  const deleteSave = useDeleteSave();

  const [newSaveName, setNewSaveName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSaveName.trim()) return;
    createSave.mutate({ data: { name: newSaveName } }, {
      onSuccess: () => {
        setNewSaveName('');
        queryClient.invalidateQueries({ queryKey: getListSavesQueryKey() });
      }
    });
  };

  const handleLoad = (saveId: number) => {
    loadSave.mutate({ saveId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorldStateQueryKey() });
        setLocation('/');
      }
    });
  };

  const handleDelete = (saveId: number) => {
    deleteSave.mutate({ saveId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSavesQueryKey() });
      }
    });
  };

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-4xl mx-auto space-y-12">
      <header className="border-b border-border pb-8">
        <h1 className="text-4xl font-serif text-primary">Persistence Management</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] mt-3">
          State Storage & Retrieval Systems
        </p>
      </header>

      <div className="p-8 border border-border bg-card/30">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary mb-6 flex items-center">
          <Plus className="w-4 h-4 mr-3" /> New Instance Record
        </h2>
        <form onSubmit={handleCreate} className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <input 
            type="text" 
            placeholder="Enter designation..." 
            value={newSaveName}
            onChange={(e) => setNewSaveName(e.target.value)}
            className="flex-1 bg-background border border-border px-5 py-3 font-mono text-sm tracking-wide focus:border-primary focus:outline-none placeholder:uppercase placeholder:text-xs"
            disabled={createSave.isPending}
          />
          <button 
            type="submit"
            disabled={createSave.isPending || !newSaveName.trim()}
            className="px-8 py-3 bg-primary/10 border border-primary/30 text-primary uppercase font-mono text-xs tracking-widest hover:bg-primary/20 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Store State
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="font-mono text-xs uppercase tracking-widest animate-pulse text-muted-foreground">Scanning memory banks...</div>
        ) : saves.length === 0 ? (
          <div className="p-12 border border-border border-dashed text-center font-mono text-xs tracking-widest uppercase text-muted-foreground">
            No persistence records found.
          </div>
        ) : (
          saves.map(save => (
            <div key={save.id} className="p-6 border border-border bg-card/30 flex justify-between items-center group hover:border-primary/50 hover:bg-card/50 transition-colors">
              <div>
                <h3 className="font-serif text-2xl mb-2 group-hover:text-primary transition-colors">{save.name}</h3>
                <div className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest flex space-x-6">
                  <span>Day {save.worldDay} — {save.worldTime}</span>
                  <span className="opacity-50">•</span>
                  <span>{save.locationName}</span>
                </div>
              </div>
              <div className="flex space-x-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleLoad(save.id)}
                  disabled={loadSave.isPending}
                  className="px-4 py-2 border border-border hover:border-primary hover:text-primary text-foreground bg-background transition-colors flex items-center font-mono text-xs uppercase tracking-widest"
                  title="Load Instance"
                >
                  <Download className="w-3 h-3 mr-2" />
                  Load
                </button>
                <button 
                  onClick={() => handleDelete(save.id)}
                  disabled={deleteSave.isPending}
                  className="px-4 py-2 border border-border hover:border-destructive hover:text-destructive hover:bg-destructive/5 text-muted-foreground bg-background transition-colors flex items-center font-mono text-xs uppercase tracking-widest"
                  title="Purge Instance"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Purge
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
