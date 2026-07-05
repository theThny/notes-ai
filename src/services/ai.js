import { storage } from './storage';

const callGeminiAPI = async (rawText, geminiApiKey, applyVisualMode) => {
  if (!geminiApiKey) {
    const err = new Error('Chave do Google Gemini ausente. Adicione-a nas configurações.');
    err.provider = 'gemini';
    throw err;
  }

  const cleanKey = geminiApiKey.trim();
  let prompt = '';
  if (applyVisualMode) {
    prompt = `[SYSTEM INSTRUCTION]: Você é um endpoint RESTful operando como um motor de "Deep Research" (estilo Perplexity). Retorne APENAS o JSON puro. Estrutura obrigatória: {
  "moodboard": {
    "title": "Tópico",
    "description": "Um texto denso, aprofundado e acadêmico sobre o tema. Você DEVE usar citações no formato [1], [2] ao longo do texto apontando para as fontes.",
    "sources": [
      { "id": "[1]", "title": "Nome da Fonte/Artigo, Autor ou Livro" },
      { "id": "[2]", "title": "Nome da Fonte/Artigo, Autor ou Livro" }
    ],
    "colors": ["#Hex1", "#Hex2", "#Hex3"],
    "search_keywords": ["Obrigatório: 3 frases (3-5 palavras) em inglês descrevendo exatamente o sujeito/tema principal do texto para achar fotos precisas. Ex: 'canon xl1 vintage camcorder'"]
  }
} [USER INPUT]: ${rawText}`;
  } else {
    prompt = `Você é um tutor de estudos minimalista. O texto a seguir é uma anotação de voz ou citação gravada pelo usuário enquanto lia um livro. Sua tarefa é: 1. Corrigir pequenos erros de transcrição. 2. Criar um título bem curto e em negrito na primeira linha. 3. Reescrever a frase/ideia original do usuário de forma limpa e em itálico logo abaixo do título. 4. A partir dessa ideia, gerar de 3 a 5 tópicos curtos e altamente relevantes que expandam o assunto, trazendo contexto, conceitos relacionados ou pontos de reflexão para aprofundar o aprendizado do usuário. Retorne APENAS o resultado final formatado em Markdown, sem introduções ou saudações.\n\nTexto do usuário:\n"${rawText}"`;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${cleanKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    const err = new Error(`${response.status} ${response.statusText} - ${errorText}`);
    err.provider = 'gemini';
    throw err;
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textResponse) {
    throw new Error("Estrutura de resposta inesperada da API do Gemini.");
  }

  const cleaned = textResponse.replace(/```markdown\n?/gi, '').replace(/```\n?/g, '').trim();
  return processInteractiveFeatures(cleaned, applyVisualMode);
};

/**
 * AI expansion service.
 * Fetches settings directly from async storage to ensure keys are loaded before proceeding.
 */
export const expandNoteWithAI = async (rawText, provider) => {
  const settings = await storage.getSettings();
  const activeProvider = provider || settings.activeProvider || 'gemini';
  const isInteractive = settings.interactiveMode === true || String(settings.interactiveMode) === 'true';

  // Directive logic moved directly to the API providers below to avoid legacy prompt mixing

  if (activeProvider === 'gemini') {
    const applyVisualMode = isInteractive;
    return await callGeminiAPI(rawText, settings.geminiKey, applyVisualMode);
  }

  if (activeProvider === 'groq') {
    if (!settings.groqKey) {
      const err = new Error('Chave do Groq ausente. Adicione-a nas configurações.');
      err.provider = 'groq';
      throw err;
    }

    const cleanKey = settings.groqKey.trim();
    let systemPrompt = '';
    let userContent = rawText;
    
    if (isInteractive) {
      systemPrompt = `[SYSTEM INSTRUCTION]: Você é um endpoint RESTful operando como um motor de "Deep Research" (estilo Perplexity). Retorne APENAS o JSON puro. Estrutura obrigatória: {
  "moodboard": {
    "title": "Tópico",
    "description": "Um texto denso, aprofundado e acadêmico sobre o tema. Você DEVE usar citações no formato [1], [2] ao longo do texto apontando para as fontes.",
    "sources": [
      { "id": "[1]", "title": "Nome da Fonte/Artigo, Autor ou Livro" },
      { "id": "[2]", "title": "Nome da Fonte/Artigo, Autor ou Livro" }
    ],
    "colors": ["#Hex1", "#Hex2", "#Hex3"],
    "search_keywords": ["Obrigatório: 3 frases (3-5 palavras) em inglês descrevendo exatamente o sujeito/tema principal do texto para achar fotos precisas. Ex: 'canon xl1 vintage camcorder'"]
  }
}`;
    } else {
      systemPrompt = `Você é um tutor de estudos minimalista. Pegue a nota transcrita e: 1. Corrija erros. 2. Crie um título em negrito. 3. Reescreva a frase original em itálico. 4. Gere 3 a 5 tópicos curtos expandindo o assunto. Retorne apenas o resultado formatado em Markdown.`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: rawText }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`${response.status} ${response.statusText} - ${errorText}`);
      err.provider = 'groq';
      throw err;
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      throw new Error('Formato de resposta inesperado da API Groq.');
    }
    const cleaned = raw.replace(/```markdown\n?/gi, '').replace(/```\n?/g, '').trim();
    return processInteractiveFeatures(cleaned, isInteractive);
  }
};

export const parseAIResponse = (rawResponse) => {
  try {
    const firstBrace = rawResponse.indexOf('{');
    const lastBrace = rawResponse.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("Estrutura JSON não encontrada na resposta da IA.");
    }

    const jsonString = rawResponse.substring(firstBrace, lastBrace + 1);
    const cleanString = jsonString.replace(/\n/g, '').replace(/\r/g, '');

    return JSON.parse(cleanString);
  } catch (error) {
    console.error("Falha ao parsear o Moodboard:", error);
    const customErr = new Error("O formato de dados recebido da IA estava corrompido.");
    customErr.provider = 'json-parser';
    throw customErr;
  }
};

const processInteractiveFeatures = async (text, isInteractive) => {
  if (!isInteractive) return { text, imageUrl: null };

  try {
    console.log('Raw LLM Response:', text);
    const parsedData = parseAIResponse(text);
    console.log('JSON Visual Sucesso:', parsedData);
    
    return { text: '', data: parsedData };
  } catch (err) {
    if (err.provider === 'json-parser') throw err;
    const error = new Error("Falha ao processar a estrutura visual. A IA não retornou um formato de dados válido.");
    error.provider = 'json-parser';
    throw error;
  }
};
