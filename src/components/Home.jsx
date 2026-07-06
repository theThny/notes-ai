import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Folder, Search, MoreVertical, LayoutGrid, List, Share, FolderDown, Trash2, X } from 'lucide-react';
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

export const Home = ({ notes = [], folders = [], onSelectNote, onDeleteNote, onMoveNote, theme = 'light' }) => {
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [activeNoteMenu, setActiveNoteMenu] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  
  const pressTimer = useRef(null);

  const handleTouchStart = (noteId) => {
    pressTimer.current = setTimeout(() => {
      setActiveNoteMenu(noteId);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
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
      


      {/* 1. Cabeçalho Principal */}
      <div style={{ position: 'relative', marginBottom: '36px', marginTop: '8px', padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
        
        {/* Lado Esquerdo: Saudação e Data */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.025em' }}>
            {greetingText}
          </h1>
          
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <p style={{ color: '#a1a1aa', textTransform: 'capitalize', fontWeight: 500, fontSize: '1rem', margin: 0, paddingLeft: '2px' }}>
              {currentDate || 'Carregando data...'}
            </p>
            
            {/* Weather Badge (Apenas Mobile) */}
            <div className="hide-on-desktop" style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: weatherBase, backgroundImage: weatherMesh, border: weatherBorder, padding: '6px 14px', borderRadius: '1.25rem', boxShadow: '0 4px 12px var(--shadow-color)' }}>
              {/* Noise Overlay */}
              <div style={{ position: 'absolute', inset: 0, opacity: 0.2, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, pointerEvents: 'none', zIndex: 0 }} />
              <span style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}><PremiumWeatherIcon type={weather.type || 'sun'} size={24} /></span>
              <span style={{ fontWeight: 700, color: weatherTextColor, letterSpacing: '0.025em', fontSize: '0.9rem', display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                {weather.temp !== null ? `${weather.temp}°` : '--°'} 
                <span style={{ color: weatherMutedColor, fontWeight: 300, marginLeft: '6px', textTransform: 'capitalize', fontSize: '0.85rem', letterSpacing: '0.05em' }}>{weather.city}</span>
              </span>
            </div>
          </div>
        </div>
        
        {/* Lado Direito: Widget de Clima Glassmorphism (Apenas Desktop) */}
        <div className="hide-on-mobile" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '18px',
          padding: '16px 28px',
          borderRadius: '1.25rem',
          backgroundColor: weatherBase,
          backgroundImage: weatherMesh,
          border: weatherBorder,
          boxShadow: '0 12px 40px -12px var(--shadow-color), inset 0 1px 0 rgba(255,255,255,0.05)',
          minWidth: '220px',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'default'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {/* Noise Overlay */}
          <div style={{ position: 'absolute', inset: 0, opacity: 0.25, mixBlendMode: 'overlay', backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`, pointerEvents: 'none', zIndex: 0 }} />
          
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <PremiumWeatherIcon type={weather.type || 'sun'} size={60} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: weatherTextColor, letterSpacing: '-0.05em', lineHeight: 1 }}>
              {weather.temp !== null ? `${weather.temp}°` : '--°'}
            </span>
            <span style={{ color: weatherMutedColor, fontSize: '0.9rem', fontWeight: 300, letterSpacing: '0.05em', textTransform: 'capitalize', marginTop: '6px' }}>
              {weather.city || 'Localizando...'}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Menu de Pastas (Exclusivo Mobile / Blindado com Inline Styles) */}
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
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.8 }}>NOTAS RECENTES</h2>
          
          <div className="home-grid">
        {filteredNotes.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>Nenhuma nota encontrada nesta pasta.</div>
        ) : (
          filteredNotes.map((note, index) => {
            const vibrantThemes = [
              { bg: '#FF005A', title: '#FFFFFF', desc: 'rgba(255,255,255,0.9)', date: 'rgba(255,255,255,0.7)' },
              { bg: '#0047FF', title: '#FFFFFF', desc: 'rgba(255,255,255,0.9)', date: 'rgba(255,255,255,0.7)' },
              { bg: '#FFC800', title: '#111827', desc: 'rgba(17,24,39,0.9)', date: 'rgba(17,24,39,0.7)' },
              { bg: '#FF5C00', title: '#FFFFFF', desc: 'rgba(255,255,255,0.9)', date: 'rgba(255,255,255,0.7)' },
              { bg: '#00A859', title: '#FFFFFF', desc: 'rgba(255,255,255,0.9)', date: 'rgba(255,255,255,0.7)' }
            ];
            const theme = vibrantThemes[index % vibrantThemes.length];
            const cardImg = getRandomImage(note.content);
            const hasImage = !!cardImg;
            
            // Sophisticated Mesh Gradient Themes (Aurō style)
            const meshThemes = [
              { // Theme 1: "Aurō" (Reference Image)
                base: '#E8A973',
                mesh: 'radial-gradient(ellipse at 15% 0%, #1A110D 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #6B8E92 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #FFE3BA 0%, #E8A973 60%, transparent 100%)'
              },
              { // Theme 2: Midnight Plum
                base: '#8A4B75',
                mesh: 'radial-gradient(ellipse at 15% 0%, #120914 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #5C7C8A 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #FFB8D2 0%, #8A4B75 60%, transparent 100%)'
              },
              { // Theme 3: Deep Sea
                base: '#3A6F62',
                mesh: 'radial-gradient(ellipse at 15% 0%, #0A1412 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #8A755C 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #A0E8D3 0%, #3A6F62 60%, transparent 100%)'
              },
              { // Theme 4: Crimson Velvet
                base: '#9C4140',
                mesh: 'radial-gradient(ellipse at 15% 0%, #1A0A0A 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #6E5A7A 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #FFBBA8 0%, #9C4140 60%, transparent 100%)'
              },
              { // Theme 5: Twilight Steel
                base: '#4A658A',
                mesh: 'radial-gradient(ellipse at 15% 0%, #0A0F1A 0%, transparent 65%), radial-gradient(ellipse at 85% 0%, #8A6B7E 0%, transparent 65%), radial-gradient(ellipse at 50% 100%, #B8D4FF 0%, #4A658A 60%, transparent 100%)'
              }
            ];
            const meshTheme = meshThemes[index % meshThemes.length];
            
            const cardColor = meshTheme.base;
            const bgImage = meshTheme.mesh;
            const borderStyle = '1px solid rgba(255, 255, 255, 0.15)';
            const shadowStyle = '0 10px 30px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
            const textColor = '#FFFFFF';
            const descColor = 'rgba(255, 255, 255, 0.9)';
            const dateColor = 'rgba(255, 255, 255, 0.7)';

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
                onContextMenu={(e) => e.preventDefault()}
                /* A MÁGICA ESTÁ AQUI: relative e overflow-hidden cortam a imagem nas bordas do card */
                className="home-card relative overflow-hidden rounded-[1.25rem] p-6 min-h-[160px] shadow-sm cursor-pointer flex flex-col justify-center"
                style={{ 
                  position: 'relative', 
                  overflow: 'hidden', 
                  borderRadius: '1.25rem', 
                  padding: '1.5rem', 
                  minHeight: '160px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  backgroundColor: cardColor,
                  backgroundImage: bgImage,
                  border: borderStyle,
                  boxShadow: shadowStyle,
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none'
                }}
              >
                
                {/* Noise Texture Overlay (Aplica a TODOS os cards) */}
                <div 
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.25,
                    mixBlendMode: 'overlay',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                />

                {/* CAMADA 1: BACKGROUND IMAGE MASCARADA (Fica no fundo: z-0) */}
                {cardImg && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      right: 0, 
                      bottom: 0, 
                      width: '75%', 
                      zIndex: 0, 
                      pointerEvents: 'none',
                      WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)',
                      maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)'
                    }}
                  >
                    {/* Imagem de Fundo (A máscara acima faz o fade suave revelando o mesh gradient por baixo) */}
                    <img 
                      src={cardImg.src} 
                      onError={(e) => {
                        if (cardImg.fallback && e.target.src !== cardImg.fallback) {
                          e.target.src = cardImg.fallback;
                        }
                      }}
                      alt="" 
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.9 }}
                    />
                  </div>
                )}

                {/* CAMADA 2: CONTEÚDO DE TEXTO (Fica na frente: z-10 e contido na esquerda se houver imagem) */}
                <div 
                  className="relative z-10"
                  style={{ position: 'relative', zIndex: 10, width: hasImage ? '66.666667%' : '100%' }}
                >
                  <h3 
                    className="text-gray-900 font-bold mb-2"
                    style={{ 
                      color: textColor, 
                      fontWeight: 700, 
                      fontSize: '1rem', 
                      marginBottom: '0.5rem', 
                      whiteSpace: 'normal', 
                      display: '-webkit-box', 
                      WebkitLineClamp: 3, 
                      WebkitBoxOrient: 'vertical', 
                      overflow: 'hidden',
                      lineHeight: '1.2'
                    }}
                  >
                    {note.title || 'Nova Nota'}
                  </h3>
                  <p 
                    className="text-gray-800 text-sm line-clamp-3 leading-relaxed opacity-90"
                    style={{ color: descColor, fontSize: '0.875rem', lineHeight: 1.625, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {note.content ? note.content.replace(/<[^>]*>?/gm, '') : ''}
                  </p>
                  {/* Data ilustrativa mantendo o design do Figma */}
                  <span 
                    className="block mt-4 text-xs text-gray-500/80 font-semibold tracking-wide"
                    style={{ color: dateColor, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
                  >
                    {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

              </div>
            );
          })
        )}
          </div>
        </div>

        {/* Coluna Direita: Galeria (Oculta no mobile/tablet, visível apenas no desktop) */}
        <div className="split-right-col" style={{ width: '100%' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', opacity: 0.8 }}>GALERIA</h2>
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
            
            <button onClick={() => { setShowMoveModal(true); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: 'var(--text-main)', fontSize: '1.1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border-color)' }}>
              <FolderDown size={24} color="var(--text-muted)" /> Mover para pasta
            </button>
            
            <button onClick={() => { 
              if (onDeleteNote) onDeleteNote(activeNoteMenu); 
              setActiveNoteMenu(null); 
            }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 0', color: '#ef4444', fontSize: '1.1rem', background: 'none', border: 'none' }}>
              <Trash2 size={24} color="#ef4444" /> Excluir nota
            </button>
          </div>
        </div>
      )}

      {/* Move to Folder Sub-Modal */}
      {showMoveModal && activeNoteMenu && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowMoveModal(false)}>
          <div style={{ backgroundColor: 'var(--bg-color)', width: '100%', maxWidth: '400px', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 25px var(--shadow-color)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 'bold' }}>Mover para...</h3>
              <button onClick={() => setShowMoveModal(false)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}><X size={24} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '50vh', overflowY: 'auto' }}>
              {folders.map(folder => (
                <button key={folder.id} onClick={() => {
                  if (onMoveNote) onMoveNote(activeNoteMenu, folder.id);
                  setShowMoveModal(false);
                  setActiveNoteMenu(null);
                }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '16px', backgroundColor: 'var(--hover-bg)', color: 'var(--text-main)', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '1rem', textAlign: 'left', fontWeight: '500' }}>
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
