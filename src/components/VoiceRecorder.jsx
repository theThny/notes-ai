import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square } from 'lucide-react';

const Waveform = () => (
  <div className="waveform">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

export const VoiceRecorder = ({ onRecordStart, onTranscriptChunk }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const recognitionRef = useRef(null);
  const isRecordingRef = useRef(false);
  const targetNoteIdRef = useRef(null);

  // Limpeza profunda ao desmontar o componente
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try { recognitionRef.current.abort(); } catch(e) {}
      }
    };
  }, []);

  const initRecognition = () => {
    // Reset Total: destruir instância anterior antes de criar nova
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      try { recognitionRef.current.abort(); } catch (e) {} 
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    // Garantia de idioma
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      console.log('Speech API: onstart - Microfone ativado e ouvindo');
    };

    recognition.onresult = (event) => {
      console.log('Speech API: onresult - Resultado recebido do microfone');
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalStr += event.results[i][0].transcript;
        } else {
          interimStr += event.results[i][0].transcript;
        }
      }
      
      if (finalStr) {
        onTranscriptChunk(targetNoteIdRef.current, finalStr.trim());
      }
      setInterimTranscript(interimStr);
    };

    // Tratamento de Erros Robusto
    recognition.onerror = (event) => {
      console.error('Speech API: onerror - Erro:', event.error);
      if (event.error === 'not-allowed' || event.error === 'no-speech' || event.error === 'aborted') {
        // Reinicia o estado visual e bloqueia reinício fantasma
        isRecordingRef.current = false;
        setIsRecording(false);
        setInterimTranscript('');
      }
    };

    recognition.onend = () => {
      console.log('Speech API: onend - Sessão encerrada');
      if (isRecordingRef.current) {
        // Se ainda deveria estar gravando (ex: timeout longo silencioso sem error), tenta ligar novamente de forma segura
        try {
          recognitionRef.current?.start();
          console.log('Speech API: onend - Reiniciando sessão automaticamente...');
        } catch (e) {
          console.error("Speech API: onend - Failed to restart recognition", e);
          isRecordingRef.current = false;
          setIsRecording(false);
          setInterimTranscript('');
        }
      } else {
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;
    return true;
  };

  const toggleRecording = () => {
    // Gerenciamento de Estado Seguro
    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimTranscript('');
      
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    } else {
      // Iniciar a gravação limpa
      const hasSupport = initRecognition();
      if (!hasSupport) {
        alert("Speech recognition not supported in this browser.");
        return;
      }
      
      // Fallback/routing setup
      targetNoteIdRef.current = onRecordStart();
      
      setInterimTranscript('');
      isRecordingRef.current = true;
      setIsRecording(true);
      
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Could not start recording", err);
        isRecordingRef.current = false;
        setIsRecording(false);
      }
    }
  };

  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
    return null; // Oculta o botão se não houver suporte
  }

  return (
    <div className="fab-container">
      {isRecording && (
        <div className="fab-status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            Recording...
            <Waveform />
          </div>
          {interimTranscript && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              "{interimTranscript}"
            </div>
          )}
        </div>
      )}
      <button 
        className={`fab-button ${isRecording ? 'recording' : ''}`}
        onClick={toggleRecording}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {isRecording ? <Square fill="currentColor" size={20} /> : <Mic size={24} />}
      </button>
    </div>
  );
};
