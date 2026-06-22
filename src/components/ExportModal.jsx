import React, { useState } from 'react';
import html2pdf from 'html2pdf.js';
import cssText from '../index.css?raw';

export const ExportModal = ({ folders, notes, onClose }) => {
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [format, setFormat] = useState('md');
  const [isExporting, setIsExporting] = useState(false);

  const toggleNote = (noteId) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) newSelected.delete(noteId);
    else newSelected.add(noteId);
    setSelectedNotes(newSelected);
  };

  const toggleFolder = (folderId) => {
    const folderNotes = notes.filter(n => n.folderId === folderId);
    const allSelected = folderNotes.every(n => selectedNotes.has(n.id));
    const newSelected = new Set(selectedNotes);
    
    if (allSelected) {
      folderNotes.forEach(n => newSelected.delete(n.id));
    } else {
      folderNotes.forEach(n => newSelected.add(n.id));
    }
    setSelectedNotes(newSelected);
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateHTMLContent = (note) => {
    const title = `<h1>${note.title}</h1>`;
    const body = (note.blocks || []).map(b => {
      const htmlText = b.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="markdown-link" href="$2">$1</a>');
      if (b.type === 'ai') {
        return `<div class="block-ai" style="padding: 10px; margin-bottom: 10px;">${htmlText}</div>`;
      }
      return `<div class="block-transcription" style="padding: 10px; margin-bottom: 10px;">${htmlText}</div>`;
    }).join('');
    
    return `
      <html>
        <head>
          <meta charset="utf-8">
          <style>${cssText}</style>
        </head>
        <body class="${document.body.className}" style="padding: 20px;">
          <div class="markdown-body">
            ${title}${body}
          </div>
        </body>
      </html>
    `;
  };

  const handleExport = async () => {
    setIsExporting(true);
    const notesToExport = notes.filter(n => selectedNotes.has(n.id));

    try {
      for (let note of notesToExport) {
        const textContent = `# ${note.title}\n\n` + (note.blocks || []).map(b => b.text).join('\n\n');
        
        if (format === 'md' || format === 'txt') {
          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
          downloadBlob(blob, `${note.title}.${format}`);
        } else if (format === 'docx') {
          const htmlContent = generateHTMLContent(note);
          const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
          downloadBlob(blob, `${note.title}.docx`);
        } else if (format === 'pdf') {
          const element = document.createElement('div');
          element.className = document.body.className;
          element.style.padding = '40px';
          element.style.backgroundColor = 'var(--bg-color)';
          element.style.color = 'var(--text-main)';
          
          const wrapper = document.createElement('div');
          wrapper.className = 'markdown-body';
          
          const title = document.createElement('h1');
          title.textContent = note.title;
          wrapper.appendChild(title);

          (note.blocks || []).forEach(b => {
            const htmlText = b.text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a class="markdown-link" href="$2">$1</a>');
            const blockDiv = document.createElement('div');
            blockDiv.className = b.type === 'ai' ? 'block-ai' : 'block-transcription';
            blockDiv.style.padding = '10px';
            blockDiv.style.marginBottom = '10px';
            blockDiv.innerHTML = htmlText;
            wrapper.appendChild(blockDiv);
          });
          
          element.appendChild(wrapper);
          
          element.style.position = 'absolute';
          element.style.left = '-9999px';
          document.body.appendChild(element);

          await html2pdf().set({
            margin: 10,
            filename: `${note.title}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          }).from(element).save();

          document.body.removeChild(element);
        }
      }
    } catch (e) {
      alert("Erro na exportação: " + e.message);
    } finally {
      setIsExporting(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">Exportar em Lote</h2>
        
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
          {folders.map(folder => {
            const folderNotes = notes.filter(n => n.folderId === folder.id);
            if (folderNotes.length === 0) return null;
            
            const allSelected = folderNotes.every(n => selectedNotes.has(n.id));
            const someSelected = folderNotes.some(n => selectedNotes.has(n.id));
            
            return (
              <div key={folder.id} style={{ marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', marginBottom: '5px' }}>
                  <input 
                    type="checkbox" 
                    checked={allSelected}
                    ref={input => { if (input) input.indeterminate = someSelected && !allSelected; }}
                    onChange={() => toggleFolder(folder.id)}
                    style={{ marginRight: '8px' }}
                  />
                  <span style={{ color: 'var(--text-main)' }}>📁 {folder.name}</span>
                </div>
                <div style={{ marginLeft: '25px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {folderNotes.map(note => (
                    <label key={note.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                      <input 
                        type="checkbox"
                        checked={selectedNotes.has(note.id)}
                        onChange={() => toggleNote(note.id)}
                        style={{ marginRight: '8px' }}
                      />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          {notes.length === 0 && <p style={{ color: 'var(--text-muted)' }}>Nenhuma nota disponível para exportar.</p>}
        </div>

        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: 'var(--text-main)' }}>Formato de Saída</label>
          <select className="input-field" value={format} onChange={e => setFormat(e.target.value)}>
            <option value="md">Markdown (.md)</option>
            <option value="txt">Texto Simples (.txt)</option>
            <option value="docx">Documento Word (.docx)</option>
            <option value="pdf">PDF (.pdf)</option>
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={isExporting}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={selectedNotes.size === 0 || isExporting}>
            {isExporting ? 'Exportando...' : `Exportar ${selectedNotes.size} Notas`}
          </button>
        </div>
      </div>
    </div>
  );
};
