import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey, GameSettingsInputActiveMode, GameSettingsInputNarrativeSpeed } from '@workspace/api-client-react';
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [formState, setFormState] = useState({
    activeMode: 'novel' as GameSettingsInputActiveMode,
    narrativeSpeed: 'normal' as GameSettingsInputNarrativeSpeed,
    autoTickEnabled: false,
    autoTickIntervalMinutes: 60
  });

  useEffect(() => {
    if (settings) {
      setFormState({
        activeMode: settings.activeMode as GameSettingsInputActiveMode,
        narrativeSpeed: settings.narrativeSpeed as GameSettingsInputNarrativeSpeed,
        autoTickEnabled: settings.autoTickEnabled,
        autoTickIntervalMinutes: settings.autoTickIntervalMinutes
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate({ data: formState }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      }
    });
  };

  if (isLoading) return <div className="p-12 font-mono text-xs tracking-widest uppercase animate-pulse text-muted-foreground">Accessing configuration...</div>;

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-4xl mx-auto space-y-12 pb-20">
      <header className="border-b border-border pb-8">
        <h1 className="text-4xl font-serif text-primary">System Parameters</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] mt-3">
          Engine Operation Configuration
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        <section className="space-y-8">
          <div className="flex items-center text-primary border-b border-border/50 pb-3">
            <SettingsIcon className="w-4 h-4 mr-3 opacity-70" />
            <h3 className="font-mono uppercase tracking-[0.2em] text-xs">Simulation Constraints</h3>
          </div>

          <div className="space-y-8 font-mono text-sm tracking-wide">
            <div className="flex flex-col space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Operating Mode</label>
              <select 
                value={formState.activeMode}
                onChange={(e) => setFormState({ ...formState, activeMode: e.target.value as GameSettingsInputActiveMode })}
                className="bg-card/50 border border-border p-4 focus:border-primary focus:outline-none w-full md:w-1/2"
              >
                <option value="novel">Novel (Story focused)</option>
                <option value="rpg">RPG (Stat focused)</option>
                <option value="advanced">Advanced (All systems)</option>
                <option value="auto">Auto (Observational)</option>
              </select>
            </div>

            <div className="flex flex-col space-y-3">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Narrative Pacing</label>
              <select 
                value={formState.narrativeSpeed}
                onChange={(e) => setFormState({ ...formState, narrativeSpeed: e.target.value as GameSettingsInputNarrativeSpeed })}
                className="bg-card/50 border border-border p-4 focus:border-primary focus:outline-none w-full md:w-1/2"
              >
                <option value="slow">Slow (Verbose)</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast (Concise)</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4 pt-6">
              <input 
                type="checkbox" 
                id="autoTick"
                checked={formState.autoTickEnabled}
                onChange={(e) => setFormState({ ...formState, autoTickEnabled: e.target.checked })}
                className="w-5 h-5 bg-card/50 border-border checked:bg-primary accent-primary"
              />
              <label htmlFor="autoTick" className="uppercase text-foreground cursor-pointer text-xs tracking-widest">Enable Autonomous Time Progression</label>
            </div>

            {formState.autoTickEnabled && (
              <div className="flex flex-col space-y-3 pl-8 border-l-2 border-primary/30 ml-2 py-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Tick Interval (In-game Minutes)</label>
                <input 
                  type="number" 
                  value={formState.autoTickIntervalMinutes}
                  onChange={(e) => setFormState({ ...formState, autoTickIntervalMinutes: parseInt(e.target.value) || 60 })}
                  className="bg-card/50 border border-border p-4 focus:border-primary focus:outline-none w-32"
                  min="1"
                  max="1440"
                />
              </div>
            )}
          </div>
        </section>

        <div className="pt-8 border-t border-border">
          <button 
            type="submit"
            disabled={updateSettings.isPending}
            className="flex items-center space-x-3 px-10 py-4 bg-primary/10 border border-primary/30 text-primary uppercase font-mono text-xs tracking-[0.2em] hover:bg-primary/20 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Apply Parameters</span>
          </button>
        </div>
      </form>
    </div>
  );
}
