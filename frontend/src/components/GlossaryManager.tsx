import React, { useState, useMemo } from 'react';
import professionalGlossary from '../data/professional_glossary.json';

export interface GlossaryEntry {
  id: string;
  english: string;
  spanishVariants: string[];
}

interface GlossaryManagerProps {
  glossary: GlossaryEntry[];
  setGlossary: React.Dispatch<React.SetStateAction<GlossaryEntry[]>>;
  onClose: () => void;
}

export const GlossaryManager: React.FC<GlossaryManagerProps> = ({ 
  glossary, 
  setGlossary, 
  onClose 
}) => {
  const [english, setEnglish] = useState('');
  const [spanish, setSpanish] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSpanish, setEditSpanish] = useState('');
  const [editEnglish, setEditEnglish] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!english.trim() || !spanish.trim()) return;
    const variants = spanish.split('/').map(v => v.trim()).filter(Boolean);
    const newEntry: GlossaryEntry = {
      id: Date.now().toString(),
      english: english.trim(),
      spanishVariants: variants
    };
    setGlossary(prev => [...prev, newEntry]);
    setEnglish('');
    setSpanish('');
  };

  const handleRemove = (idToRemove: string) => {
    setGlossary(prev => prev.filter(entry => entry.id !== idToRemove));
  };

  const startEditing = (entry: GlossaryEntry) => {
    setEditingId(entry.id);
    setEditSpanish(entry.spanishVariants.join(' / '));
    setEditEnglish(entry.english);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setGlossary(prev => prev.map(entry => {
      if (entry.id === editingId) {
        return {
          ...entry,
          english: editEnglish.trim(),
          spanishVariants: editSpanish.split('/').map(v => v.trim()).filter(Boolean)
        };
      }
      return entry;
    }));
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') setEditingId(null);
  };

  const handleImportProfessional = () => {
    setGlossary(prev => {
      const existingKeys = new Set(prev.map(e => e.english.toLowerCase()));
      const newTerms = professionalGlossary.filter(e => !existingKeys.has(e.english.toLowerCase()));
      return [...prev, ...newTerms as GlossaryEntry[]];
    });
  };

  const filteredGlossary = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return glossary;
    return glossary.filter(g => 
      g.english.toLowerCase().includes(q) || 
      g.spanishVariants.some(v => v.toLowerCase().includes(q))
    );
  }, [glossary, searchTerm]);

  return (
    <div className="overlay open" onClick={onClose} style={{ zIndex: 100 }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="mhdr">
          <div className="mtitle">
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M3 2h8a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M12 4l2-1v11l-2-1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Glosario
          </div>
          <button className="mcls" onClick={onClose}>
            <svg viewBox="0 0 13 13" fill="none"><path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        
        <div className="mbody" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
            <button 
              onClick={handleImportProfessional}
              style={{
                fontSize: '12px', padding: '6px 12px', background: 'var(--bg-hover)', 
                border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              🚀 Importar DB ({professionalGlossary.length})
            </button>
            <input 
              className="gsearch" 
              type="text" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ marginBottom: 0, flex: 1 }}
            />
          </div>

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: '10px', marginTop: '10px', background: 'var(--bg-hover)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
             <input 
                type="text" 
                value={spanish}
                onChange={e => setSpanish(e.target.value)}
                placeholder='Español (ej. Título/Grado)'
                className="gsearch"
                style={{ marginBottom: 0, flex: 1, padding: '7px 10px', fontSize: '13px' }}
             />
             <input 
                type="text" 
                value={english}
                onChange={e => setEnglish(e.target.value)}
                placeholder='Inglés (ej. Degree)'
                className="gsearch"
                style={{ marginBottom: 0, flex: 1, padding: '7px 10px', fontSize: '13px' }}
             />
             <button 
                type="submit"
                disabled={!english.trim() || !spanish.trim()}
                style={{
                  background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
                  padding: '0 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', opacity: (!english.trim() || !spanish.trim()) ? 0.5 : 1
                }}
             >
                Add
             </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {filteredGlossary.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>No hay términos.</div>
            ) : (
               filteredGlossary.map((entry) => {
                 const isEditing = editingId === entry.id;
                 return (
                   <div key={entry.id} className="gitem" style={{ position: 'relative', paddingRight: '30px' }} onDoubleClick={() => !isEditing && startEditing(entry)}>
                     {isEditing ? (
                       <>
                         <input 
                            className="gsearch"
                            style={{ margin: 0, padding: '4px 8px', fontSize: '13px', flex: 1 }}
                            value={editEnglish}
                            onChange={e => setEditEnglish(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={saveEdit}
                            autoFocus
                         />
                         <input 
                            className="gsearch"
                            style={{ margin: 0, padding: '4px 8px', fontSize: '13px', flex: 1 }}
                            value={editSpanish}
                            onChange={e => setEditSpanish(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={saveEdit}
                         />
                       </>
                     ) : (
                       <>
                         <span className="gen" title="Double click to edit">{entry.english}</span>
                         <span className="ges" title="Double click to edit">{entry.spanishVariants.join(" / ")}</span>
                         <button 
                           onClick={() => handleRemove(entry.id)}
                           style={{
                             position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                             background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px',
                             opacity: 0.7
                           }}
                           title="Remove Entry"
                         >
                           ✕
                         </button>
                       </>
                     )}
                   </div>
                 );
               })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
