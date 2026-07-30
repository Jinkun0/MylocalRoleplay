import { useListNpcs } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function Npcs() {
  const { data: npcs = [], isLoading } = useListNpcs();
  const [filter, setFilter] = useState('');

  const filteredNpcs = npcs.filter(npc => 
    npc.name.toLowerCase().includes(filter.toLowerCase()) ||
    npc.locationName.toLowerCase().includes(filter.toLowerCase()) ||
    npc.currentActivity.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-8 md:p-12 overflow-y-auto w-full max-w-6xl mx-auto space-y-10">
      <header className="space-y-6 border-b border-border pb-8 flex flex-col md:flex-row md:justify-between md:items-end">
        <div>
          <h1 className="text-4xl font-serif text-primary">Entity Index</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-[0.2em] mt-3">
            Monitored Sentients
          </p>
        </div>
        <div className="relative mt-6 md:mt-0 w-full md:w-80">
          <Search className="w-4 h-4 absolute left-4 top-3.5 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search entities..." 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-card/50 border border-border p-3 pl-12 font-mono text-sm focus:border-primary focus:outline-none focus:bg-card transition-colors tracking-wide uppercase placeholder:normal-case"
          />
        </div>
      </header>

      {isLoading ? (
        <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground animate-pulse">Compiling roster...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNpcs.map(npc => (
            <Link key={npc.id} href={`/npcs/${npc.id}`}>
              <div className="p-6 border border-border bg-card/30 hover:bg-card/80 hover:border-primary/50 transition-all cursor-pointer group flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 w-8 h-8 bg-primary/5 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="font-serif text-2xl group-hover:text-primary transition-colors">{npc.name}</div>
                <div className="text-primary/60 font-mono text-[10px] uppercase tracking-widest mt-2 mb-6">{npc.locationName}</div>
                
                <div className="mt-auto space-y-3 font-mono text-xs tracking-wide">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground/60 uppercase text-[10px]">State</span>
                    <span className="text-primary capitalize">{npc.emotionalState}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground/60 uppercase text-[10px]">Activity</span>
                    <span className="truncate ml-4 max-w-[150px] text-right" title={npc.currentActivity}>{npc.currentActivity}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground/60 uppercase text-[10px]">Relation</span>
                    <span className="text-foreground capitalize">{npc.relationshipWithPlayer || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {filteredNpcs.length === 0 && (
            <div className="col-span-full p-12 border border-border border-dashed text-center font-mono text-muted-foreground uppercase tracking-widest text-xs">
              No matching entities found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
