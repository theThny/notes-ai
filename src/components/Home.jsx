import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Folder, Search, MoreVertical, LayoutGrid, List, Share, FolderDown, Trash2, X, ArrowUpRight, RotateCcw, ArrowLeft } from 'lucide-react';
import PremiumWeatherIcon from './PremiumWeatherIcon';

// Função para extrair texto limpo de HTML
const extractSnippet = (htmlContent) => {
  if (!htmlContent) return 'Nota vazia...';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = htmlContent;
  let text = tmp.textContent || tmp.innerText || '';
  text = text.trim();
  return text.length > 140 ? text.substring(0, 140) + '...' : (text || 'Nota vazia...');
};

const getRandomImage = (htmlContent) => {
  if (!htmlContent) return null;
  
  let images = [];
  
  const extractImagesFromHtml = (html) => {
    const imgRegex = /<img[^>]+>/g;
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src=["']([^"']+)["']/);
      const fallbackMatch = imgTag.match(/this\.src=["']([^"']+)["']/);
      
      if (srcMatch) {
        images.push({
          src: srcMatch[1],
          fallback: fallbackMatch ? fallbackMatch[1] : null
        });
      }
    }
  };

  // 1. Tentar encontrar imagens normais no corpo
  extractImagesFromHtml(htmlContent);

  // 2. Tentar encontrar imagens dentro de payloads da IA
  const payloadRegex = /data-payload=(["'])(.*?)\1/g;
  let payloadMatch;
  while ((payloadMatch = payloadRegex.exec(htmlContent)) !== null) {
    try {
      // Decode the URL-encoded payload safely
      const rawPayload = payloadMatch[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"');
      const decodedPayload = decodeURIComponent(rawPayload);
      extractImagesFromHtml(decodedPayload);
    } catch (e) {
      console.error("Erro ao decodificar payload da IA:", e);
    }
  }

  if (images.length === 0) return null;
  
  // Retorna uma imagem aleatória para variar a capa a cada carregamento
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
};

export const Home = ({ isTrashMode = false, onBack, onEmptyTrash, onRestoreNote, notes = [], folders = [], onSelectNote, onDeleteNote, onMoveNote, theme = 'light' }) => {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [activeNoteMenu, setActiveNoteMenu] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(null);
  
  const [desktopMenu, setDesktopMenu] = useState({ isVisible: false, x: 0, y: 0, selectedNote: null });

  const [userName, setUserName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [showEmptyTrashModal, setShowEmptyTrashModal] = useState(false);
  const [noteToDeletePermanently, setNoteToDeletePermanently] = useState(null);
  const [nameInput, setNameInput] = useState('');

  const pressTimer = useRef(null);

  useEffect(() => {
    const handleClickOutside = () => {
      if (desktopMenu.isVisible) {
        setDesktopMenu(prev => ({ ...prev, isVisible: false }));
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [desktopMenu.isVisible]);

  const handleTouchStart = (noteId) => {
    if (window.innerWidth < 768) {
      pressTimer.current = setTimeout(() => {
        setActiveNoteMenu(noteId);
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleTouchMove = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  const formattedDate = new Intl.DateTimeFormat('pt-BR', dateOptions).format(new Date());
  // Capitalize first letter of weekday
  const finalDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  // Ordena e filtra as notas
  const filteredNotes = [...notes]
    .filter(n => selectedFolder === 'all' || n.folderId === selectedFolder)
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  // Estados Dinâmicos
  const [weather, setWeather] = useState({ temp: null, emoji: '🌤️', city: 'A carregar...' });
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    // Carregar o nome salvo no LocalStorage
    const savedName = localStorage.getItem('arandu_notes_username');
    if (savedName) {
      setUserName(savedName);
    } else {
      setShowNameModal(true);
    }

    // 1. Formatação da Data Local
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    setCurrentDate(new Date().toLocaleDateString('pt-BR', options));

    // Função isolada para buscar os dados baseados em coordenadas
    const fetchWeatherData = (lat, lon, cityName) => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`)
        .then(res => res.json())
        .then(data => {
          const temp = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;
          const isDay = data.current_weather.is_day === 1;
          
          let type = isDay ? 'partly-cloudy' : 'cloud';
          if (code === 0) type = isDay ? 'sun' : 'moon';
          else if (code >= 1 && code <= 3) type = isDay ? 'partly-cloudy' : 'cloud';
          else if (code >= 51 && code <= 67) type = 'rain';
          else if (code >= 95) type = 'storm';
          
          setWeather({ temp, type, city: cityName });
        })
        .catch(err => console.error('Erro na API de clima:', err));
    };

    // 2. Captura de Geolocalização Nativa do Dispositivo
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Detetar o nome da cidade via OpenStreetMap (Reverse Geocoding)
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`)
            .then(res => res.json())
            .then(geoData => {
              const addr = geoData.address || {};
              const cityName = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || addr.county || addr.state_district || 'Local Atual';
              fetchWeatherData(latitude, longitude, cityName);
            })
            .catch(() => {
              // Fallback se o serviço de nomes falhar, mas o clima funciona com as coordenadas
              fetchWeatherData(latitude, longitude, 'Local Atual');
            });
        },
        (error) => {
          console.error('GPS Recusado ou indisponível:', error);
          // Fallback padrão de segurança caso o utilizador negue o acesso ao GPS
          fetchWeatherData(-17.8444, -41.7336, 'Malacacheta');
        }
      );
    } else {
      // Fallback para navegadores antigos sem suporte a Geolocation
      fetchWeatherData(-17.8444, -41.7336, 'Malacacheta');
    }
  }, []);

  // Lógica de Saudação de Horário
  const hour = new Date().getHours();
  const greetingText = hour >= 5 && hour < 12 ? 'Bom dia!' : hour >= 12 && hour < 18 ? 'Boa tarde!' : 'Boa noite!';

  // Lógica de Gradiente Dinâmico para o Clima
  const isNight = weather.type === 'moon' || hour >= 18 || hour < 5;
  let weatherBase = 'var(--hover-bg)';
  let weatherMesh = 'none';
  let weatherTextColor = 'var(--text-main)';
  let weatherMutedColor = 'var(--text-muted)';
  let weatherBorder = '1px solid var(--border-color)';
  
  if (weather.temp !== null) {
    weatherTextColor = '#FFFFFF';
    weatherMutedColor = 'rgba(255, 255, 255, 0.7)';
    weatherBorder = '1px solid rgba(255, 255, 255, 0.15)';
    if (isNight) {
      weatherBase = '#0B132B';
      weatherMesh = 'radial-gradient(ellipse at 15% 0%, #050814 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #1C2541 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #3A506B 0%, #0B132B 60%, transparent 100%)';
    } else if (weather.type === 'rain' || weather.type === 'storm') {
      weatherBase = '#3E4C5E';
      weatherMesh = 'radial-gradient(ellipse at 15% 0%, #1C2331 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #566573 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #76889D 0%, #3E4C5E 60%, transparent 100%)';
    } else if (weather.temp >= 28) {
      weatherBase = '#D66D42';
      weatherMesh = 'radial-gradient(ellipse at 15% 0%, #4A1D0B 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #E68A5C 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #FFB787 0%, #D66D42 60%, transparent 100%)';
    } else if (weather.temp <= 18) {
      weatherBase = '#5382A1';
      weatherMesh = 'radial-gradient(ellipse at 15% 0%, #1D3649 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #83B4D8 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #BFE1FF 0%, #5382A1 60%, transparent 100%)';
    } else {
      weatherBase = '#D6A848';
      weatherMesh = 'radial-gradient(ellipse at 15% 0%, #4A350B 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #E6C26D 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #FFE399 0%, #D6A848 60%, transparent 100%)';
    }
  }



  return (
    <div className="home-container scrollbar-hide" style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', flex: 1, backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', padding: '40px 5%', overflowX: 'hidden', overflowY: 'auto' }}>
      


      {/* 1. Cabeçalho Principal (Minimalista) */}
      <div style={{ position: 'relative', marginBottom: '40px', marginTop: '16px', padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* Lado Esquerdo: Saudação */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {isTrashMode && onBack && (
            <button 
              className="hide-on-desktop"
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 0 16px 0', display: 'flex', alignItems: 'center' }}
            >
              <ArrowLeft size={24} />
            </button>
          )}
          {!isTrashMode && (
            <span style={{ color: '#9CA3AF', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '16px' }}>
              ARANDU NOTES
            </span>
          )}
          <h1 className="greeting-title" style={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}>
            {isTrashMode ? 'Lixeira' : greetingText}
          </h1>
          {!isTrashMode && (
            <h1 className="greeting-title" style={{ fontWeight: 400, fontStyle: 'italic', color: '#FFFFFF', lineHeight: 1.05, letterSpacing: '-0.02em', margin: 0 }}>
              {userName || 'Visitante'}
            </h1>
          )}
        </div>
        
        {/* Lado Direito: Widget de Clima ou Esvaziar Lixeira */}
        {isTrashMode ? (
          <button 
            className="hide-on-mobile transition-all hover:bg-white/10"
            onClick={() => setShowEmptyTrashModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginTop: '12px',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 600
            }}>
            <Trash2 size={20} />
            Esvaziar Lixeira
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 24px',
            borderRadius: '9999px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginTop: '12px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PremiumWeatherIcon type={weather.type || 'sun'} size={22} />
            </span>
            
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', fontWeight: 400, marginLeft: '4px' }}>
              {weather.city || 'Local Atual'}
            </span>
            
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: '0 4px' }}>•</span>
            
            <span style={{ color: '#FFFFFF', fontSize: '1.1rem', fontWeight: 700 }}>
              {weather.temp !== null ? `${weather.temp}°C` : '--°C'}
            </span>
          </div>
        )}

      </div>

      {/* 2. Menu de Pastas (Exclusivo Mobile / Blindado com Inline Styles) */}
      {!isTrashMode && (
        <div 
        className="mobile-chips-container" 
        style={{ 
          display: 'flex', 
          flexShrink: 0,
          flexWrap: 'nowrap', 
          gap: '12px', 
          overflowX: 'auto', 
          width: '100%', 
          marginBottom: '32px', 
          paddingBottom: '8px', 
          alignItems: 'center', 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        <button
          onClick={() => setSelectedFolder('all')}
          style={{
            flexShrink: 0,
            padding: '10px 24px',
            borderRadius: '9999px',
            border: selectedFolder === 'all' ? '1px solid var(--text-main)' : '1px solid var(--border-color)',
            color: selectedFolder === 'all' ? 'var(--bg-color)' : 'var(--text-muted)',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            backgroundColor: selectedFolder === 'all' ? 'var(--text-main)' : 'transparent',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            outline: 'none',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '38px'
          }}
        >
          TODAS AS NOTAS
        </button>
        
        {folders && folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder.id)}
            style={{
              flexShrink: 0,
              padding: '10px 24px',
              borderRadius: '9999px',
              border: selectedFolder === folder.id ? '1px solid var(--text-main)' : '1px solid var(--border-color)',
              color: selectedFolder === folder.id ? 'var(--bg-color)' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              backgroundColor: selectedFolder === folder.id ? 'var(--text-main)' : 'transparent',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              outline: 'none',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '38px'
            }}
          >
            {folder.name}
          </button>
        ))}
        </div>
      )}

      {/* Extração Dinâmica de Imagens para a Galeria */}
      {(() => {
        let allGalleryImages = [];
        const imgRegex = /<img[^>]+>/g;
        
        filteredNotes.forEach(note => {
          if (!note.content) return;
          
          // Extrai imagens normais (do corpo da nota)
          let match;
          while ((match = imgRegex.exec(note.content)) !== null) {
            const srcMatch = match[0].match(/src=["']([^"']+)["']/);
            if (srcMatch && srcMatch[1]) {
              allGalleryImages.push({ src: srcMatch[1], noteId: note.id });
            }
          }
          
          // Extrai imagens do Moodboard (data-payload)
          try {
            const mbRegex = /data-payload=["']([^"']+)["']/g;
            let mbMatch;
            while ((mbMatch = mbRegex.exec(note.content)) !== null) {
               const decoded = decodeURIComponent(mbMatch[1]);
               let innerMatch;
               while ((innerMatch = imgRegex.exec(decoded)) !== null) {
                  const srcMatch = innerMatch[0].match(/src=["']([^"']+)["']/);
                  if (srcMatch && srcMatch[1]) {
                     allGalleryImages.push({ src: srcMatch[1], noteId: note.id });
                  }
               }
            }
          } catch(e) {}
        });
        
        // Remove duplicatas baseadas no src
        const uniqueImagesMap = new Map();
        allGalleryImages.forEach(img => {
          if (!uniqueImagesMap.has(img.src)) {
            uniqueImagesMap.set(img.src, img);
          }
        });
        
        const finalGalleryImages = Array.from(uniqueImagesMap.values()).slice(0, 10); // Limita a 10 imagens

        return (
          <div className="split-layout-container">
        
        {/* Coluna Esquerda: Notas */}
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.8 }}>{isTrashMode ? 'NOTAS EXCLUÍDAS' : 'NOTAS RECENTES'}</h2>
          
          <div className="home-grid">
        {filteredNotes.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>Nenhuma nota encontrada nesta pasta.</div>
        ) : (
          filteredNotes.map((note, index) => {
            // Vibrant & Modern Overlay Themes
            const screenshotThemes = [
              { overlay: 'rgba(190, 18, 60, 0.9)', accent: '#FFD700' },   // Crimson / Gold
              { overlay: 'rgba(67, 56, 202, 0.9)', accent: '#00E5FF' },   // Electric Indigo / Cyan
              { overlay: 'rgba(4, 120, 87, 0.9)', accent: '#FFE600' },    // Emerald / Neon Yellow
              { overlay: 'rgba(217, 119, 6, 0.9)', accent: '#FFFFFF' },   // Deep Amber / White
              { overlay: 'rgba(192, 38, 211, 0.9)', accent: '#00FF9D' }   // Fuchsia / Mint
            ];
            const theme = screenshotThemes[index % screenshotThemes.length];
            const folderName = folders.find(f => f.id === note.folderId)?.name || 'NOTE';
            const cardImg = getRandomImage(note.content);
            const hasImage = !!cardImg;

            return (
              <div 
                key={note.id} 
                onClick={(e) => {
                  if (pressTimer.current) clearTimeout(pressTimer.current);
                  if (onSelectNote) onSelectNote(note.id);
                }}
                onTouchStart={() => handleTouchStart(note.id)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
                onMouseDown={() => handleTouchStart(note.id)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (window.innerWidth >= 768) {
                    setDesktopMenu({ isVisible: true, x: e.clientX, y: e.clientY, selectedNote: note.id });
                  }
                }}
                className="home-card relative overflow-hidden shadow-sm cursor-pointer"
                style={{ 
                  position: 'relative', 
                  minHeight: '230px', 
                  backgroundColor: theme.overlay, 
                  border: '1px solid rgba(255,255,255,0.05)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  borderRadius: '2px' // Sharp edges like the image
                }}
              >
                
                {/* 1. Background Image Full (or empty block if no image) */}
                {cardImg && (
                  <img 
                    src={cardImg.src} 
                    onError={(e) => {
                      if (cardImg.fallback && e.target.src !== cardImg.fallback) {
                        e.target.src = cardImg.fallback;
                      }
                    }}
                    alt="" 
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                  />
                )}
                
                {/* 2. Left Overlay Block */}
                <div 
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: '55%',
                    backgroundColor: theme.overlay,
                    zIndex: 10,
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', flexShrink: 0 }}>
                    {folderName}
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, marginBottom: '20px' }}>
                    <h3 style={{ 
                      color: '#ffffff', 
                      fontSize: '1.25rem', 
                      fontWeight: 800, 
                      lineHeight: 1.15, 
                      marginBottom: '8px', 
                      dropShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      display: '-webkit-box', 
                      WebkitLineClamp: 3, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden',
                      wordBreak: 'break-word'
                    }}>
                      {note.title || 'Nova Nota'}
                    </h3>
                    <p style={{ 
                      color: 'rgba(255,255,255,0.85)', 
                      fontSize: '0.85rem', 
                      lineHeight: 1.45, 
                      display: '-webkit-box', 
                      WebkitLineClamp: 3, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden', 
                      fontWeight: 400,
                      wordBreak: 'break-word'
                    }}>
                      {note.content ? note.content.replace(/<[^>]*>?/gm, '').replace(/\[\d{2}:\d{2}(:\d{2})?\]\s*/g, '') : ''}
                    </p>
                  </div>
                  
                  <span style={{ position: 'absolute', bottom: '16px', left: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 500 }}>
                    {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {/* 3. Right Icons / Badges */}
                <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10, width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ArrowUpRight size={18} color="#ffffff" />
                </div>

                <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px 14px', borderRadius: '24px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em' }}>{folderName}</span>
                </div>
                
              </div>
            );
          })
        )}
          </div>
        </div>

        {/* Coluna Direita: Galeria (Oculta no mobile/tablet, visível apenas no desktop) */}
        <div className="split-right-col" style={{ width: '100%' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.8 }}>{isTrashMode ? 'IMAGENS EXCLUÍDAS' : 'GALERIA'}</h2>
          {finalGalleryImages.length > 0 ? (
            <div className="mock-gallery-grid">
              {finalGalleryImages.map((imgObj, idx) => (
                <div 
                  key={idx} 
                  className="gallery-item"
                  onClick={() => { if(onSelectNote) onSelectNote(imgObj.noteId) }}
                >
                  <img 
                    src={imgObj.src} 
                    alt="Galeria" 
                  />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '24px', backgroundColor: 'var(--hover-bg)', borderRadius: '1.25rem', textAlign: 'center' }}>
              Nenhuma imagem encontrada nas notas.
            </div>
          )}
        </div>

      </div>
      );
      })()}

      {/* Bottom Sheet Menu */}
      {activeNoteMenu && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }} onClick={() => setActiveNoteMenu(null)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'var(--bg-color)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px 24px 40px', boxShadow: '0 -10px 25px var(--shadow-color)' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '40px', height: '4px', backgroundColor: '#4b5563', borderRadius: '2px', margin: '0 auto 24px auto' }} />
            
            {isTrashMode ? (
              <>
                <button onClick={(e) => { 
                  e.stopPropagation(); 
                  if (onRestoreNote) onRestoreNote(activeNoteMenu); 
                  setActiveNoteMenu(null);
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: 'var(--text-main)', fontSize: '1.1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)' }}>
                  <RotateCcw size={24} color="var(--text-muted)" /> Restaurar nota
                </button>
                <button onClick={(e) => {
                  e.stopPropagation();
                  setNoteToDeletePermanently(activeNoteMenu);
                  setActiveNoteMenu(null);
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: '#ef4444', fontSize: '1.1rem', background: 'none', border: 'none' }}>
                  <Trash2 size={24} color="#ef4444" /> Excluir permanentemente
                </button>
              </>
            ) : (
              <>
                <button onClick={async () => {
                  const noteToShare = notes.find(n => n.id === activeNoteMenu);
                  if (navigator.share && noteToShare) {
                    try {
                      await navigator.share({
                        title: noteToShare.title,
                        text: extractSnippet(noteToShare.content)
                      });
                    } catch (e) {}
                  } else if (noteToShare) {
                    navigator.clipboard.writeText(extractSnippet(noteToShare.content));
                    alert("Nota copiada para a área de transferência!");
                  }
                  setActiveNoteMenu(null);
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: 'var(--text-main)', fontSize: '1.1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)' }}>
                  <Share size={24} color="var(--text-muted)" /> Compartilhar
                </button>
                
                <button onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowMoveModal(activeNoteMenu); 
                  setActiveNoteMenu(null);
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: 'var(--text-main)', fontSize: '1.1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)' }}>
                  <FolderDown size={24} color="var(--text-muted)" /> Mover para pasta
                </button>
                
                <button onClick={() => { 
                  if (onDeleteNote) onDeleteNote(activeNoteMenu); 
                  setActiveNoteMenu(null); 
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: '#ef4444', fontSize: '1.1rem', background: 'none', border: 'none' }}>
                  <Trash2 size={24} color="#ef4444" /> Excluir nota
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Move to Folder Sub-Modal */}
      {showMoveModal !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowMoveModal(null)}>
          <div style={{ backgroundColor: 'var(--bg-color)', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px var(--shadow-color)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 'bold' }}>Mover para...</h3>
              <button onClick={() => setShowMoveModal(null)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
              {folders.map(folder => (
                <button key={folder.id} onClick={(e) => {
                  e.stopPropagation();
                  if (onMoveNote) onMoveNote(showMoveModal, folder.id);
                  setShowMoveModal(null);
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--hover-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '1rem', textAlign: 'left', fontWeight: '500' }}>
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Context Menu */}
      {desktopMenu.isVisible && (
        <div 
          style={{
            position: 'fixed',
            top: desktopMenu.y,
            left: desktopMenu.x,
            zIndex: 99999,
            backgroundColor: 'rgba(20, 20, 20, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            padding: '6px',
            minWidth: '180px',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {isTrashMode ? (
            <>
              <button 
                className="transition-colors hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNoteMenu(null);
                  if (onRestoreNote) onRestoreNote(desktopMenu.selectedNote);
                  setDesktopMenu(prev => ({ ...prev, isVisible: false }));
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', textAlign: 'left' }}
              >
                <RotateCcw size={18} color="rgba(255,255,255,0.7)" /> Restaurar nota
              </button>
              <button 
                className="transition-colors hover:bg-red-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setNoteToDeletePermanently(desktopMenu.selectedNote);
                  setDesktopMenu(prev => ({ ...prev, isVisible: false }));
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.9rem', textAlign: 'left' }}
              >
                <Trash2 size={18} color="#ef4444" /> Excluir permanentemente
              </button>
            </>
          ) : (
            <>
              <button 
                className="transition-colors hover:bg-white/10"
                onClick={async (e) => {
                  e.stopPropagation();
                  setActiveNoteMenu(null);
                  const noteToShare = notes.find(n => n.id === desktopMenu.selectedNote);
                  if (navigator.share && noteToShare) {
                    try {
                      await navigator.share({
                        title: noteToShare.title,
                        text: extractSnippet(noteToShare.content)
                      });
                    } catch (e) {}
                  } else if (noteToShare) {
                    navigator.clipboard.writeText(extractSnippet(noteToShare.content));
                    alert("Nota copiada para a área de transferência!");
                  }
                  setDesktopMenu(prev => ({ ...prev, isVisible: false }));
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', textAlign: 'left' }}
              >
                <Share size={18} color="rgba(255,255,255,0.7)" /> Compartilhar
              </button>
              
              <button 
                className="transition-colors hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNoteMenu(null);
                  setShowMoveModal(desktopMenu.selectedNote);
                  setDesktopMenu(prev => ({ ...prev, isVisible: false }));
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', textAlign: 'left' }}
              >
                <FolderDown size={18} color="rgba(255,255,255,0.7)" /> Mover para pasta
              </button>
              
              <button 
                className="transition-colors hover:bg-red-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNoteMenu(null);
                  if (onDeleteNote) onDeleteNote(desktopMenu.selectedNote);
                  setDesktopMenu(prev => ({ ...prev, isVisible: false }));
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', width: '100%', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#ef4444', fontSize: '0.9rem', textAlign: 'left' }}
              >
                <Trash2 size={18} color="#ef4444" /> Excluir nota
              </button>
            </>
          )}
        </div>
      )}

      {/* 5. Modal de Nome (First Access) */}
      {showNameModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Como podemos chamar você?</h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '24px', textAlign: 'center' }}>Adicione seu nome para personalizar a sua experiência no Arandu Notes.</p>
            <input 
              type="text" 
              placeholder="Seu primeiro nome"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && nameInput.trim()) {
                  localStorage.setItem('arandu_notes_username', nameInput.trim());
                  setUserName(nameInput.trim());
                  setShowNameModal(false);
                }
              }}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', marginBottom: '16px', fontSize: '1rem', transition: 'border-color 0.2s' }}
              autoFocus
            />
            <button 
              onClick={() => {
                if (nameInput.trim()) {
                  localStorage.setItem('arandu_notes_username', nameInput.trim());
                  setUserName(nameInput.trim());
                  setShowNameModal(false);
                }
              }}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', backgroundColor: '#fff', color: '#000', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s', opacity: nameInput.trim() ? 1 : 0.5 }}
              disabled={!nameInput.trim()}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal de Confirmar Esvaziar Lixeira */}
      {showEmptyTrashModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Esvaziar Lixeira?</h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center' }}>Tem certeza? Todas as notas na lixeira serão excluídas permanentemente. Esta ação não pode ser desfeita.</p>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setShowEmptyTrashModal(false)}
                style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (onEmptyTrash) onEmptyTrash();
                  setShowEmptyTrashModal(false);
                }}
                style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                Esvaziar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6.5. Modal de Confirmar Exclusão de Nota Individual */}
      {noteToDeletePermanently !== null && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', padding: '32px', borderRadius: '24px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Excluir nota permanentemente?</h2>
            <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '32px', textAlign: 'center' }}>Tem certeza? Esta ação apagará a nota de forma definitiva e não poderá ser desfeita.</p>
            
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setNoteToDeletePermanently(null)}
                style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 600, fontSize: '1rem', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (onDeleteNote) onDeleteNote(noteToDeletePermanently);
                  setNoteToDeletePermanently(null);
                }}
                style={{ flex: 1, padding: '16px', borderRadius: '12px', backgroundColor: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '1rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 7. Mobile FAB para Esvaziar Lixeira */}
      {isTrashMode && (
        <div className="hide-on-desktop" style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, width: '90%', maxWidth: '350px' }}>
          <button 
            onClick={() => setShowEmptyTrashModal(true)}
            style={{
              width: '100%', padding: '16px', borderRadius: '9999px',
              backgroundColor: '#ff1a1a', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: '0 8px 32px rgba(255, 26, 26, 0.4)', border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '1rem'
            }}
          >
            <Trash2 size={20} /> Excluir permanentemente
          </button>
        </div>
      )}
    </div>
  );
};
