import { useState, useRef, useEffect } from 'react';
import { 
  useGetWorldState, 
  useGetNarrativeHistory, 
  usePerformAction, 
  useTickWorld,
  getGetNarrativeHistoryQueryKey,
  getGetWorldStateQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, FastForward, Cloud, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState('');
  
  const { data: worldState } = useGetWorldState({ query: { queryKey: getGetWorldStateQueryKey(), refetchInterval: 5000 } });
  const { data: history = [] } = useGetNarrativeHistory({ limit: 50 }, { query: { queryKey: getGetNarrativeHistoryQueryKey({ limit: 50 }), refetchInterval: 5000 } });
  
  const performAction = usePerformAction();
  const tickWorld = useTickWorld();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || performAction.isPending) return;
    
    const text = inputText;
    setInputText('');
    
    performAction.mutate({ data: { text } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNarrativeHistoryQueryKey({ limit: 50 }) });
        queryClient.invalidateQueries({ queryKey: getGetWorldStateQueryKey() });
      }
    });
  };

  const handleTick = () => {
    tickWorld.mutate({ data: {} }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNarrativeHistoryQueryKey({ limit: 50 }) });
        queryClient.invalidateQueries({ queryKey: getGetWorldStateQueryKey() });
      }
    });
  };

  return (
    <div className="flex h-full w-full">
      {/* Narrative Chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 z-10">
          {history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground uppercase tracking-widest font-mono text-xs">
              <div className="w-1.5 h-1.5 bg-primary rounded-full mb-4 animate-ping" />
              Establishing neural link...
            </div>
          )}
          {/* History array assumed to be newest first, so we reverse it for display */}
          {[...history].reverse().map((msg) => (
            <div 
              key={msg.id} 
              className={cn(
                "max-w-3xl flex flex-col transition-all duration-500 animate-in fade-in slide-in-from-bottom-4",
                msg.role === 'player' ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className="flex items-center space-x-2 text-[10px] text-muted-foreground mb-2 font-mono uppercase tracking-widest">
                <span>Day {msg.worldDay}</span>
                <span className="opacity-50">•</span>
                <span>{msg.worldTime}</span>
              </div>
              <div 
                className={cn(
                  "p-5 border",
                  msg.role === 'player' 
                    ? "bg-primary/10 border-primary/20 text-primary font-mono text-sm max-w-[80%]" 
                    : "bg-card/80 border-border text-foreground font-serif text-xl leading-relaxed shadow-lg"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-border bg-background/80 backdrop-blur-md z-10">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center">
            <span className="absolute left-5 text-primary font-bold opacity-70 animate-pulse">{'>'}</span>
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Awaiting command..."
              className="w-full bg-card border border-border p-4 pl-12 pr-14 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 text-foreground font-mono text-sm transition-all placeholder:text-muted-foreground/50 uppercase tracking-wide"
              disabled={performAction.isPending}
            />
            <button 
              type="submit"
              disabled={performAction.isPending || !inputText.trim()}
              className="absolute right-3 p-3 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-80 border-l border-border bg-card/50 hidden xl:flex flex-col z-10 backdrop-blur-sm">
        <div className="p-8 border-b border-border">
          <h2 className="text-[10px] uppercase tracking-[0.2em] text-primary mb-8 flex items-center">
            <div className="w-1.5 h-1.5 bg-primary mr-3 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
            Simulation Status
          </h2>
          
          <div className="space-y-8 font-mono text-xs tracking-wider">
            <div className="flex items-start space-x-4 text-foreground">
              <Clock className="w-4 h-4 text-primary mt-0.5 opacity-70" />
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase">Local Time</span>
                <span className="text-sm">Day {worldState?.worldDay || 0} — {worldState?.worldTime || '00:00'}</span>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 text-foreground">
              <Cloud className="w-4 h-4 text-primary mt-0.5 opacity-70" />
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase">Atmosphere</span>
                <span className="text-sm capitalize">{worldState?.weather || 'Unknown'}</span>
              </div>
            </div>

            <div className="flex items-start space-x-4 text-foreground">
              <MapPin className="w-4 h-4 text-primary mt-0.5 opacity-70" />
              <div className="flex flex-col space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase">Coordinates</span>
                <span className="text-sm">{worldState?.currentLocationName || 'Void'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-8 mt-auto border-t border-border">
          <button
            onClick={handleTick}
            disabled={tickWorld.isPending}
            className="w-full py-4 px-4 border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
          >
            <FastForward className="w-4 h-4" />
            <span>Advance Time</span>
          </button>
        </div>
      </div>
    </div>
  );
}
