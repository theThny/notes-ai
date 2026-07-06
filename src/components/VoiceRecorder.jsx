import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Plus, Grid, Menu } from 'lucide-react';

const Waveform = () => (
  <div className="waveform">
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
    <div className="bar"></div>
  </div>
);

export const VoiceRecorder = ({ onRecordStart, onCreateNote, onTranscriptChunk, onToast, onOpenMenu, currentView }) => {
  const [isRecording, setIsRecording]       = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef      = useRef(null);
  const isRecordingRef      = useRef(false);
  const targetNoteIdRef     = useRef(null);
  const lastProcessedIndexRef = useRef(0);
  const lastFinalStringRef    = useRef('');

  // Always call the latest version of the callback without recreating the engine
  const onChunkRef = useRef(onTranscriptChunk);
  useEffect(() => { onChunkRef.current = onTranscriptChunk; }, [onTranscriptChunk]);

  // Build the recognition engine once on mount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = 'pt-BR';

    recognition.onstart = () => {
      lastProcessedIndexRef.current = 0;
    };

    recognition.onresult = (event) => {
      let currentInterim = '';
      let currentFinal = '';

      // Fix Android bug where resultIndex is always 0 despite new items
      const startIndex = Math.max(event.resultIndex, lastProcessedIndexRef.current);

      for (let i = startIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          let originalT = event.results[i][0].transcript;
          let t = originalT;

          // Fix Android bug where a new session repeats the entire previous buffer
          if (lastFinalStringRef.current) {
            const prev = lastFinalStringRef.current.trim();
            const curr = t.trim();
            if (prev && curr.toLowerCase().startsWith(prev.toLowerCase())) {
              t = ' ' + curr.substring(prev.length).trim();
            }
          }

          currentFinal += t;
          lastFinalStringRef.current = originalT;
          lastProcessedIndexRef.current = i + 1;
        } else {
          currentInterim += event.results[i][0].transcript;
        }
      }

      // Atualiza a UI visual para o usuário ver que está sendo ouvido, SEM piscar o editor
      setInterimTranscript(currentInterim);

      // Apenas injeta no TipTap/Estado Principal quando a frase estiver consolidada
      if (currentFinal.trim()) {
        onChunkRef.current(targetNoteIdRef.current, currentFinal.trim() + ' ');
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'no-speech' || e.error === 'aborted') {
        isRecordingRef.current = false;
        setIsRecording(false);
        setInterimTranscript('');
      }
    };

    recognition.onend = () => {
      // Auto-restart if user hasn't pressed stop
      if (isRecordingRef.current) {
        recognition.start();
      } else {
        setIsRecording(false);
        setInterimTranscript('');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror  = null;
      recognition.onend    = null;
      try { recognition.abort(); } catch {}
    };
  }, []);

  const toggleRecording = async () => {
    if (!recognitionRef.current) {
      if (onToast) onToast("Seu navegador não tem suporte à API de Voz. Use o Chrome ou Edge.");
      return;
    }

    if (isRecordingRef.current) {
      // Stop
      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimTranscript('');
      try { recognitionRef.current.stop(); } catch {}
    } else {
      // Start — await note creation before starting the engine
      lastFinalStringRef.current = ''; // Clear deduplication memory on explicit start
      const noteId = await onRecordStart();
      targetNoteIdRef.current = noteId;
      isRecordingRef.current  = true;
      setIsRecording(true);
      try { recognitionRef.current.start(); } catch {}
    }
  };

  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) return null;

  return (
    <>
      {/* Elementos Globais (Visíveis no Desktop e Mobile) */}
      {isRecording && (
        <div style={{ position: 'fixed', bottom: '120px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 1001, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
            Gravando...
            <Waveform />
          </div>
        </div>
      )}

      {interimTranscript && (
        <div style={{ position: 'fixed', bottom: '144px', left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: '400px', backgroundColor: 'rgba(24, 24, 27, 0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: 'white', padding: '12px 20px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', border: '1px solid rgba(63, 63, 70, 0.5)', zIndex: 1000, textAlign: 'center', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', pointerEvents: 'none' }}>
          <p style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{interimTranscript}</p>
        </div>
      )}

      {/* Container Mobile (Bottom Bar) */}
      <div className="fab-container hide-on-desktop" style={{ 
        position: 'fixed', 
        bottom: '0', 
        left: '0', 
        width: '100%', 
        padding: '48px 24px 32px 24px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '16px', 
        zIndex: 1000, 
        boxSizing: 'border-box',
        background: 'linear-gradient(to top, rgba(15,15,18,0.95) 0%, rgba(15,15,18,0.7) 40%, transparent 100%)',
        pointerEvents: 'none'
      }}>
        
      {currentView === 'home' && (
        <button 
          onClick={onOpenMenu} 
          style={{ 
            pointerEvents: 'auto', 
            width: '56px', 
            height: '56px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            backgroundColor: 'rgba(255, 255, 255, 0.08)', 
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#ffffff', 
            borderRadius: '50%', 
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
            flexShrink: 0
          }}
        >
          <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.4046 14.4721C12.9755 14.4721 13.4384 14.9349 13.4384 15.5058C13.4384 16.0767 12.9755 16.5395 12.4046 16.5395H3.10116C2.53025 16.5395 2.06744 16.0767 2.06744 15.5058C2.06744 14.9349 2.53025 14.4721 3.10116 14.4721H12.4046ZM17.5732 7.23604C18.1441 7.23604 18.607 7.69885 18.607 8.26976C18.607 8.84067 18.1441 9.30348 17.5732 9.30348H1.03372C0.462814 9.30348 0 8.84067 0 8.26976C0 7.69885 0.462812 7.23604 1.03372 7.23604H17.5732ZM15.5058 0C16.0767 0 16.5395 0.462812 16.5395 1.03372C16.5395 1.60463 16.0767 2.06744 15.5058 2.06744H6.20232C5.63141 2.06744 5.1686 1.60463 5.1686 1.03372C5.1686 0.462812 5.63141 0 6.20232 0H15.5058Z" fill="white"/>
          </svg>
        </button>
      )}

      {/* Centro: Fabs Container */}
      <div style={{ pointerEvents: 'auto', display: 'flex', gap: currentView === 'editor' ? '24px' : '0', position: 'relative' }}>
        
        {currentView === 'editor' && (
          <button 
            onClick={onOpenMenu} 
            style={{ 
              width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '50%', boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
            }}
          >
            <svg width="19" height="17" viewBox="0 0 19 17" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.4046 14.4721C12.9755 14.4721 13.4384 14.9349 13.4384 15.5058C13.4384 16.0767 12.9755 16.5395 12.4046 16.5395H3.10116C2.53025 16.5395 2.06744 16.0767 2.06744 15.5058C2.06744 14.9349 2.53025 14.4721 3.10116 14.4721H12.4046ZM17.5732 7.23604C18.1441 7.23604 18.607 7.69885 18.607 8.26976C18.607 8.84067 18.1441 9.30348 17.5732 9.30348H1.03372C0.462814 9.30348 0 8.84067 0 8.26976C0 7.69885 0.462812 7.23604 1.03372 7.23604H17.5732ZM15.5058 0C16.0767 0 16.5395 0.462812 16.5395 1.03372C16.5395 1.60463 16.0767 2.06744 15.5058 2.06744H6.20232C5.63141 2.06744 5.1686 1.60463 5.1686 1.03372C5.1686 0.462812 5.63141 0 6.20232 0H15.5058Z" fill="white"/>
            </svg>
          </button>
        )}

        {currentView === 'home' ? (
          <div 
            className="glass-pill"
            onClick={async () => {
              if (isRecording) {
                toggleRecording();
              } else if (onCreateNote) {
                await onCreateNote();
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9999px',
              padding: '6px 24px 6px 6px', gap: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', transition: 'all 0.3s ease', cursor: 'pointer'
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleRecording();
              }}
              title={isRecording ? "Parar gravação" : "Iniciar gravação"}
              style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.4)' : '0 2px 10px rgba(0,0,0,0.2)', flexShrink: 0 }}
            >
              {isRecording ? <Square fill="#dc2626" size={18} /> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#fff' }}></div></div>}
            </button>
            <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500, userSelect: 'none', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
              {isRecording ? "Parar gravação..." : "Criar nova anotação"}
            </div>
          </div>
        ) : currentView !== 'trash' ? (
          <button
            onClick={toggleRecording}
            title={isRecording ? "Parar gravação" : "Iniciar gravação"}
            style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0, boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 12px 40px rgba(0,0,0,0.3)', flexShrink: 0 }}
          >
            {isRecording ? <Square fill="#dc2626" size={24} /> : <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fff' }}></div></div>}
          </button>
        ) : null}

        {currentView === 'editor' && (
          <button 
            onClick={() => {
              const event = new CustomEvent('trigger-ai-expand');
              window.dispatchEvent(event);
            }} 
            className="fab-button animate-pulse"
            title="Expandir com IA"
            style={{ 
              width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              backgroundColor: 'rgba(255, 174, 0, 0.4)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 174, 0, 0.2)', color: '#ffffff', borderRadius: '50%', boxShadow: '0 12px 40px rgba(255, 174, 0, 0.3)',
              cursor: 'pointer'
            }}
          >
            <svg width="29" height="32" viewBox="0 0 29 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.6128 30.7411L14.6294 30.7383C14.6405 30.7402 14.6478 30.7485 14.6515 30.7632L14.675 31.3529L14.6695 31.3764L14.6529 31.3985L14.5093 31.5007L14.4927 31.5062L14.472 31.5007L14.3284 31.3985L14.3146 31.3805L14.3076 31.3529L14.3311 30.7618L14.3366 30.748C14.344 30.7388 14.3551 30.736 14.3698 30.7397L14.4678 30.7894L14.4872 30.795L14.5148 30.7894L14.6128 30.7411Z" fill="white"/>
              <path d="M14.9747 30.5851L14.994 30.5823C15.0078 30.5851 15.017 30.5952 15.0216 30.6127L15.0686 31.4606L15.063 31.4799C15.0538 31.4919 15.0405 31.4956 15.023 31.491L14.7454 31.3639L14.7344 31.3529L14.7275 31.3363L14.7026 30.7425L14.7068 30.7273L14.7206 30.7135L14.9747 30.5851Z" fill="white"/>
              <path d="M13.9863 30.5817C13.9932 30.5802 14.0005 30.5814 14.0066 30.5851L14.2607 30.7121L14.2745 30.7259L14.2786 30.7425L14.2538 31.3363L14.2496 31.3515L14.2358 31.3626L13.9583 31.491L13.9375 31.4937C13.9228 31.4882 13.915 31.4772 13.9141 31.4606L13.961 30.6127L13.9693 30.5933C13.9733 30.5874 13.9793 30.5833 13.9863 30.5817Z" fill="white"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M11.7374 1.38099C12.5384 1.38099 13.3256 1.46109 14.0837 1.61576C14.4427 1.68865 14.758 1.90114 14.9602 2.20648C15.1625 2.51183 15.2352 2.88501 15.1623 3.24395C15.0894 3.60289 14.8769 3.91817 14.5716 4.12044C14.2662 4.32271 13.893 4.39539 13.5341 4.32251C11.7947 3.96768 9.98921 4.13655 8.3458 4.80777C6.70239 5.47899 5.2949 6.62242 4.30128 8.09349C3.30766 9.56456 2.77253 11.2972 2.76355 13.0724C2.75456 14.8476 3.27213 16.5855 4.25081 18.0666C5.22949 19.5476 6.62533 20.7053 8.26186 21.3931C9.8984 22.0809 11.7021 22.268 13.445 21.9308C15.1879 21.5936 16.7916 20.7472 18.0535 19.4986C19.3154 18.25 20.1787 16.6553 20.5344 14.9161C20.5705 14.7384 20.6412 14.5695 20.7425 14.4191C20.8439 14.2687 20.9739 14.1398 21.1251 14.0396C21.2763 13.9395 21.4457 13.8701 21.6237 13.8354C21.8017 13.8007 21.9848 13.8015 22.1626 13.8375C22.3403 13.8736 22.5092 13.9444 22.6595 14.0457C22.8099 14.1471 22.9389 14.2771 23.039 14.4283C23.1392 14.5795 23.2086 14.7489 23.2433 14.9269C23.2779 15.1049 23.2772 15.288 23.2411 15.4657C22.9047 17.1127 22.2186 18.6683 21.229 20.0272L20.9569 20.3862L26.0003 25.4296C26.2506 25.6775 26.3967 26.0118 26.4087 26.3639C26.4206 26.716 26.2975 27.0594 26.0646 27.3237C25.8317 27.5881 25.5065 27.7534 25.1557 27.7859C24.8049 27.8183 24.4549 27.7154 24.1774 27.4983L24.0476 27.3823L19.0042 22.3389C17.5341 23.4975 15.8082 24.2878 13.9705 24.6437C12.1329 24.9996 10.2367 24.9109 8.44034 24.385C6.64393 23.8591 4.99934 22.9112 3.64377 21.6204C2.2882 20.3297 1.26096 18.7334 0.647762 16.9649C0.0345611 15.1964 -0.146822 13.3069 0.118745 11.454C0.384312 9.60114 1.08913 7.83864 2.17439 6.31356C3.25965 4.78848 4.69389 3.54504 6.35745 2.68699C8.021 1.82894 9.86563 1.38115 11.7374 1.38099ZM23.4759 0C23.7342 -5.754e-07 23.9874 0.0724717 24.2066 0.209181C24.4259 0.34589 24.6023 0.541353 24.716 0.773356L24.7823 0.934932L24.9618 1.45695C25.1513 2.01236 25.4566 2.52118 25.8575 2.94972C26.2584 3.37826 26.7458 3.71674 27.2874 3.94273L27.5429 4.0394L28.0649 4.21755C28.3234 4.30574 28.55 4.46861 28.7159 4.68556C28.8819 4.90252 28.9797 5.1638 28.9972 5.43638C29.0146 5.70896 28.9508 5.9806 28.8139 6.21693C28.677 6.45326 28.473 6.64368 28.2279 6.7641L28.0649 6.83039L27.5429 7.00992C26.9875 7.19939 26.4787 7.5047 26.0501 7.90562C25.6216 8.30654 25.2831 8.79393 25.0571 9.33551L24.9604 9.59099L24.7823 10.113C24.6939 10.3714 24.531 10.5979 24.3139 10.7637C24.0969 10.9295 23.8356 11.0272 23.563 11.0445C23.2904 11.0618 23.0188 10.9979 22.7826 10.8608C22.5464 10.7238 22.356 10.5198 22.2357 10.2746L22.1695 10.113L21.9899 9.59099C21.8005 9.03558 21.4951 8.52676 21.0942 8.09822C20.6933 7.66968 20.2059 7.33121 19.6643 7.10521L19.4089 7.00854L18.8868 6.83039C18.6283 6.7422 18.4018 6.57933 18.2358 6.36238C18.0699 6.14542 17.972 5.88414 17.9546 5.61156C17.9371 5.33898 18.0009 5.06734 18.1378 4.83101C18.2748 4.59468 18.4787 4.40426 18.7239 4.28384L18.8868 4.21755L19.4089 4.03802C19.9643 3.84855 20.4731 3.54324 20.9016 3.14232C21.3302 2.7414 21.6686 2.25401 21.8946 1.71243L21.9913 1.45695L22.1695 0.934932C22.2625 0.662306 22.4385 0.425601 22.6727 0.257955C22.907 0.0903089 23.1878 0.000114936 23.4759 0ZM23.4759 4.41365C23.1492 4.82477 22.7767 5.19729 22.3656 5.52397C22.778 5.85081 23.1481 6.22091 23.4759 6.63429C23.8027 6.22183 24.1728 5.85173 24.5862 5.52397C24.1751 5.19729 23.8026 4.82477 23.4759 4.41365Z" fill="white"/>
            </svg>
          </button>
        )}

        {currentView === 'editor' && (
          <button 
            onClick={() => {
              const event = new CustomEvent('trigger-add-block');
              window.dispatchEvent(event);
            }} 
            style={{ 
              width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              backgroundColor: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', borderRadius: '50%', boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
            }}
          >
            <Plus size={24} color="#ffffff" />
          </button>
        )}
      </div>
    </div>

    {/* Container Desktop (Bottom Right) */}
    <div className="hide-on-mobile" style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      zIndex: 1000,
      pointerEvents: 'auto'
    }}>
      {currentView !== 'trash' && (
        <>
          {/* Record Button */}
          <button
            onClick={toggleRecording}
            title={isRecording ? "Parar gravação" : "Gravar transcrição"}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 8px 32px rgba(0,0,0,0.4)',
              transition: 'all 0.3s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isRecording ? (
              <Square fill="#dc2626" size={28} />
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }}></div>
              </div>
            )}
          </button>

          {/* Plus Manual Note Button (Glassmorphism) */}
          <button
            onClick={async () => {
              if (onCreateNote) await onCreateNote();
            }}
            title="Criar anotação manual"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease',
              color: '#fff',
              flexShrink: 0
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            <Plus size={32} strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  </>
  );
};
