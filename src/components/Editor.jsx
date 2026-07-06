import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Lightbulb, ChevronLeft, Share } from 'lucide-react';
import { expandNoteWithAI } from '../services/ai';
import { TipTapEditor, MenuBar } from './TipTapEditor';
import { CustomAISelector } from './CustomAISelector';
import { cleanText } from '../utils/sanitize';
import { ErrorModal } from './Notifications';
import { marked } from 'marked';

export const Editor = ({ note, onDelete, onUpdateNote, settings, onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [errorModal, setErrorModal] = useState(null);
  const [editorInstance, setEditorInstance] = useState(null);
  const [selectedAI, setSelectedAI] = useState(null);
  
  useEffect(() => {
    if (!selectedAI) {
      if (settings?.geminiKey) setSelectedAI('gemini');
      else if (settings?.groqKey) setSelectedAI('groq');
    }
  }, [settings?.geminiKey, settings?.groqKey, selectedAI]);
  
  const hasGemini = !!settings?.geminiKey;
  const hasGroq = !!settings?.groqKey;
  const hasAnyKey = hasGemini || hasGroq;

  const editorRef = useRef(null);
  const noteIdRef = useRef(note?.id);

  // Maintain references for events
  useEffect(() => {
    noteIdRef.current = note?.id;
  }, [note?.id]);

  useEffect(() => {
    if (note) {
      setTitle(prev => prev !== note.title ? (note.title || '') : prev);
      
      // Migration from blocks to content
      let initialContent = note.content || '';
      if (!initialContent && note.blocks && note.blocks.length > 0) {
        initialContent = note.blocks.map(b => b.type === 'ai' ? `<div data-type="ai-block">${marked.parse(b.text)}</div>` : `<p>${b.text}</p>`).join('');
        // Persist migration immediately
        onUpdateNote(note.id, { content: initialContent, blocks: [] });
      }
      setContent(initialContent);
    } else {
      setTitle('');
      setContent('');
      setEditorInstance(null);
      editorRef.current = null;
    }
  }, [note, onUpdateNote]);

  const handleTitleBlur = () => {
    if (note && title !== note.title) {
      onUpdateNote(note.id, { title, isCustomTitle: true });
    }
  };

  const handleContentChange = (html, newTitle) => {
    // Only update if it actually changed to prevent infinite loops
    if (note && html !== note.content) {
      const purified = cleanText(html);
      setContent(purified);
      
      // Dispatch for Global State and Local State sync
      // Only auto-update the title if the user hasn't set a custom one
      if (!note.isCustomTitle && newTitle !== undefined && newTitle !== title) {
        setTitle(newTitle);
        onUpdateNote(note.id, { content: purified, title: newTitle });
      } else {
        onUpdateNote(note.id, { content: purified });
      }
    }
  };

  // Listen for voice transcript events
  useEffect(() => {
    const handleVoiceTranscript = (e) => {
      const { noteId, chunkText } = e.detail;
      if (noteId === noteIdRef.current && editorRef.current) {
        // Insert text at cursor
        editorRef.current.commands.insertContent(chunkText);
      }
    };
    
    window.addEventListener('onVoiceTranscript', handleVoiceTranscript);
    return () => window.removeEventListener('onVoiceTranscript', handleVoiceTranscript);
  }, []);

  const handleExpandRef = useRef(null);

    // Listen for trigger-ai-expand event
    useEffect(() => {
      const handleTriggerAI = () => {
        if (handleExpandRef.current) handleExpandRef.current();
      };
      
      const handleAddBlock = () => {
        if (editorRef.current) {
          editorRef.current.commands.focus('end');
          editorRef.current.commands.insertContent('<p></p>');
        }
      };

      window.addEventListener('trigger-ai-expand', handleTriggerAI);
      window.addEventListener('trigger-add-block', handleAddBlock);
      return () => {
        window.removeEventListener('trigger-ai-expand', handleTriggerAI);
        window.removeEventListener('trigger-add-block', handleAddBlock);
      };
    }, []);

  const handleExpand = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const { state } = editor;
    const { from, to } = state.selection;
    let textToExpand = state.doc.textBetween(from, to, ' ');
    if (!textToExpand.trim()) {
      const activeBlockText = state.selection.$head.parent.textContent;
      const fullText = editor.getText();
      
      if (!activeBlockText.trim() && !fullText.trim()) {
        setErrorModal({ message: 'Nenhum texto encontrado para expandir.', provider: null });
        return;
      }
      
      textToExpand = `[CONTEXTO ANTERIOR]:\n${fullText}\n\n[COMANDO PRINCIPAL]:\n${activeBlockText}\n\n[DIRETIVA DE SISTEMA]: O texto acima é o rascunho atual. Foque a sua expansão ESTRITAMENTE no [COMANDO PRINCIPAL]. Continue a linha de raciocínio da última adição de forma orgânica.`;
    }

    setIsExpanding(true);
    try {
      const { text: expandedText, data } = await expandNoteWithAI(textToExpand, selectedAI);
      
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const timestampHtml = `<span class="timestamp text-xs text-gray-500 font-mono select-none" style="color: #6b7280; font-size: 0.75rem; user-select: none; margin-right: 4px;">[${hh}:${mm} - IA]</span>`;

      if (data && (data.moodboard || data.title)) {
        const payload = data.moodboard ? data.moodboard : data;
        const keywords = Array.isArray(payload.search_keywords) ? payload.search_keywords : ['aesthetic reference'];

        console.log("🔍 Iniciando busca de curadoria visual via Google Custom Search...");

        // Credenciais oficiais do projeto
        const GOOGLE_API_KEY = 'AIzaSyAWIpfpCguc6nd0Etlub43OD3vuCsomd9g';
        const SEARCH_ENGINE_ID = '849e29ade9241463e';

        Promise.all(keywords.map(async (keyword) => {
          try {
            console.log(`🔍 Consultando Serper.dev para: [${keyword}]`);
            
            // Chave do Serper (sem faturamento)
            const SERPER_API_KEY = '97c60c1f6593f8d5486956b84452028c39eb10bd'; 
            
            // Usa a palavra-chave robusta gerada pela IA diretamente
            const curatedQuery = `${keyword} high quality`;
            
            const myHeaders = new Headers();
            myHeaders.append("X-API-KEY", SERPER_API_KEY);
            myHeaders.append("Content-Type", "application/json");

            const requestOptions = {
              method: 'POST',
              headers: myHeaders,
              body: JSON.stringify({ q: curatedQuery }),
              redirect: 'follow'
            };

            const res = await fetch("https://google.serper.dev/images", requestOptions);
            const data = await res.json();
            
            console.log("📸 Resposta Serper:", data);

            // Serper devolve a foto original na chave imageUrl e o cache do Google em thumbnailUrl
            const imageUrl = data.images?.[0]?.imageUrl || `https://placehold.co/600x400/2d3748/a0aec0?text=${encodeURIComponent('Zero Resultados Estéticos')}`;
            const thumbUrl = data.images?.[0]?.thumbnailUrl || imageUrl;
            
            return `<img src="${imageUrl}" onerror="this.onerror=null; this.src='${thumbUrl}';" class="mb-image" alt="Referência: ${keyword}" />`;
          } catch (e) {
            console.error("🚨 Erro na API Serper:", e);
            return `<img src="https://placehold.co/600x400/2d3748/a0aec0?text=Erro+de+Rede" class="mb-image" />`;
          }
        })).then(imagesHtmlArray => {
          const imagesHtml = imagesHtmlArray.join('');
          const payload = data.moodboard ? data.moodboard : data;
          
          // UI atualizada para exibir o Flexbox com o Hexadecimal embaixo
          const colorsHtml = (Array.isArray(payload.colors) ? payload.colors : []).map(c => 
            `<div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
               <div class="mb-color" style="background-color: ${c}; width: 48px; height: 48px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" title="${c}"></div>
               <span style="font-size: 11px; font-family: monospace; color: currentColor; opacity: 0.8;">${c.toUpperCase()}</span>
             </div>`
          ).join('');

          const sourcesHtml = Array.isArray(payload.sources) && payload.sources.length > 0 
            ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(128,128,128,0.2); font-size: 0.85rem; opacity: 0.8;">
                 <strong style="display: block; margin-bottom: 8px;">Fontes & Referências:</strong>
                 ${payload.sources.map(s => {
                   if (typeof s === 'string') return '<div style="margin-bottom: 4px;">' + s + '</div>';
                   
                   // Concatenação clássica para evitar quebra de parser (sem template literals)
                   const safeSearchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(s.title);
                   const linkId = s.id ? '<strong>' + s.id + '</strong> ' : '';
                   const linkTitle = s.title || 'Referência';
                   
                   return '<a href="' + safeSearchUrl + '" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: none; display: block; margin-bottom: 6px; transition: opacity 0.2s;" onmouseover="this.style.textDecoration=\'underline\'" onmouseout="this.style.textDecoration=\'none\'">' + linkId + linkTitle + '</a>';
                 }).join('')}
               </div>` 
            : '';

          const finalHtml = `
            <div class="moodboard-container" style="user-select: text; -webkit-user-select: text;">
              <h3 class="mb-title">${payload.title || 'Sem título'}</h3>
              <p class="mb-desc" style="text-align: justify;">${payload.description || ''}</p>
              ${sourcesHtml}
              <div class="mb-palette" style="display: flex; gap: 16px; margin: 24px 0;">${colorsHtml}</div>
              <div class="mb-gallery">${imagesHtml}</div>
            </div>
          `;

          console.log("🔥 Disparando injeção via HTML Parser no TipTap...");
          const encodedPayload = encodeURIComponent(finalHtml);
          
          editor.chain().focus('end').insertContent(`
            <div data-type="moodboard" data-payload="${encodedPayload}"></div>
            <p></p>
          `).run();
        });
      } else {
        // Parse markdown to HTML
        const htmlResponse = await marked.parse(expandedText);
        // Extract timestamp string from timestampHtml for the new NodeView
        const timestampMatch = timestampHtml.match(/\[\d{2}:\d{2}\]/);
        const timestampText = timestampMatch ? timestampMatch[0] : '';
        // Inject AI block using the custom extension
        editor.chain().focus('end').insertContent(`<div data-type="ai-block" data-timestamp="${timestampText}">${htmlResponse}</div><p></p>`).run();
      }
    } catch (e) {
      setErrorModal({ message: e.message, provider: e.provider || null });
    } finally {
      setIsExpanding(false);
    }
  };

  useEffect(() => {
    handleExpandRef.current = handleExpand;
  }, [handleExpand]);

  if (!note) {
    return (
      <div className="editor-container">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '16px', opacity: 0.5 }}>
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p>Selecione uma nota para visualizar ou comece a gravar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container w-full max-w-[100vw] overflow-x-hidden min-w-0" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top Navigation Bar (Apenas Mobile) */}
      <div className="hide-on-desktop" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}>
          <ChevronLeft size={28} strokeWidth={2.5} />
        </button>
        <button onClick={async () => {
          if (navigator.share && note) {
            try {
              const div = document.createElement('div');
              div.innerHTML = note.content;
              const textContent = div.textContent || div.innerText || '';
              await navigator.share({
                title: note.title,
                text: textContent
              });
            } catch (e) {}
          } else if (note) {
            const div = document.createElement('div');
            div.innerHTML = note.content;
            const textContent = div.textContent || div.innerText || '';
            navigator.clipboard.writeText(textContent);
            alert("Nota copiada para a área de transferência!");
          }
        }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}>
          <Share size={24} strokeWidth={2.5} />
        </button>
      </div>

      <div className="editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '16px' }}>
        <input 
          className="editor-title-input"
          style={{ flex: 1, minWidth: 0 }}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            // Salva no banco imediatamente como customizado para garantir que o auto-title não subscreva
            if (note) onUpdateNote(note.id, { title: e.target.value, isCustomTitle: true });
          }}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          placeholder="Título da Nota..."
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          {/* MenuBar removido a pedido do usuário */}
          <div className="editor-ai-controls hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <CustomAISelector 
              selectedAI={selectedAI}
              setSelectedAI={setSelectedAI}
              hasGemini={hasGemini}
              hasGroq={hasGroq}
              disabled={isExpanding}
            />

            <button  
              className="icon-btn" 
              style={{ 
                backgroundColor: 'var(--btn-bg, var(--primary-color))', 
                color: 'var(--btn-text, #ffffff)', 
                border: '1px solid var(--btn-border, transparent)',
                padding: '6px 12px', 
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9rem',
                width: 'max-content',
                opacity: (isExpanding || !hasAnyKey) ? 0.7 : 1,
                cursor: (isExpanding || !hasAnyKey) ? 'not-allowed' : 'pointer'
              }} 
              onClick={handleExpand} 
              disabled={isExpanding || !hasAnyKey}
            >
              <Lightbulb size={16} />
              {isExpanding ? 'Expandindo conhecimento...' : 'Expandir com IA'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="editor-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '0' }}>
        <TipTapEditor 
          content={content} 
          onChange={handleContentChange} 
          onInit={(instance) => { 
            editorRef.current = instance; 
            setEditorInstance(instance); 
          }}
        />
      </div>

      {errorModal && (
        <ErrorModal
          message={errorModal.message}
          provider={errorModal.provider}
          onClose={() => setErrorModal(null)}
        />
      )}
    </div>
  );
};
