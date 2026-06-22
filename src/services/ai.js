import { storage } from './storage';

export const expandNoteWithAI = async (rawText) => {
  const settings = storage.getSettings();
  const provider = settings.activeProvider || 'gemini';

  const isInteractive = settings.interactiveMode === true || String(settings.interactiveMode) === 'true';
  const applyVisualMode = isInteractive && provider === 'gemini';

  const interactiveRule = applyVisualMode 
    ? '\n\nOBRIGATÓRIO: Você DEVE formatar nomes de pessoas famosas, locais ou conceitos-chave como links Markdown reais apontando para a Wikipédia. Exemplo exato que você deve imitar: "O [Platão](https://pt.wikipedia.org/wiki/Platão) foi um grande filósofo." Se não houver links Markdown, o sistema falhará.' 
    : '';

  const geminiPrompt = `Você é um tutor de estudos minimalista. O texto a seguir é uma anotação de voz ou citação gravada pelo usuário enquanto lia um livro. Sua tarefa é: 1. Corrigir pequenos erros de transcrição. 2. Criar um título bem curto e em negrito na primeira linha. 3. Reescrever a frase/ideia original do usuário de forma limpa e em itálico logo abaixo do título. 4. A partir dessa ideia, gerar de 3 a 5 tópicos curtos e altamente relevantes que expandam o assunto, trazendo contexto, conceitos relacionados ou pontos de reflexão para aprofundar o aprendizado do usuário. Retorne APENAS o resultado final formatado em Markdown, sem introduções ou saudações.${interactiveRule}

Texto do usuário:
"${rawText}"`;

  if (provider === 'gemini') {
    if (!settings.geminiKey) {
      throw new Error('Gemini API Key is missing. Please add it in the settings.');
    }

    console.log('Prompt Enviado:', geminiPrompt);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${settings.geminiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: geminiPrompt }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Gemini API Error Response:', errorData);
        throw new Error(`Gemini API Error ${response.status}: ${errorData.error?.message || 'Unknown error. Check console for details.'}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        let finalText = data.candidates[0].content.parts[0].text;
        console.log('Texto Bruto Recebido:', finalText);
        finalText = finalText.replace(/```markdown\n?/gi, '').replace(/```\n?/g, '');
        return await processInteractiveFeatures(finalText.trim(), applyVisualMode);
      } else {
        console.error('Unexpected API Response format:', data);
        throw new Error('Unexpected response format from Gemini API. Check console for details.');
      }
    } catch (error) {
      console.error('Gemini Expansion Error Details:', error);
      throw new Error(error.message || 'Failed to expand note with Gemini.');
    }
  } else if (provider === 'groq') {
    if (!settings.groqKey) {
      throw new Error('Groq API Key is missing. Please add it in the settings.');
    }

    const groqSystemPrompt = `Você é um tutor de estudos minimalista. Pegue a nota transcrita e: 1. Corrija erros. 2. Crie um título em negrito. 3. Reescreva a frase original em itálico. 4. Gere 3 a 5 tópicos curtos expandindo o assunto. Retorne apenas o resultado formatado em Markdown.`;
    console.log('Prompt Enviado:', groqSystemPrompt);

    try {
      const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.groqKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { 
              role: "system", 
              content: groqSystemPrompt
            },
            { 
              role: "user", 
              content: rawText 
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Groq API Error Response:', errorData);
        throw new Error(`Groq API Error ${response.status}: ${errorData.error?.message || 'Unknown error. Check console for details.'}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let finalText = data.choices[0].message.content;
        console.log('Texto Bruto Recebido:', finalText);
        finalText = finalText.replace(/```markdown\n?/gi, '').replace(/```\n?/g, '');
        return await processInteractiveFeatures(finalText.trim(), false);
      } else {
        console.error('Unexpected API Response format:', data);
        throw new Error('Unexpected response format from Groq API. Check console for details.');
      }
    } catch (error) {
      console.error('Groq Expansion Error Details:', error);
      throw new Error(error.message || 'Failed to expand note with Groq.');
    }
  }
};

const processInteractiveFeatures = async (text, isInteractive) => {
  let imageUrl = null;
  if (isInteractive) {
    const match = text.match(/https:\/\/pt\.wikipedia\.org\/wiki\/([^)\s"']+)/);
    if (match && match[1]) {
      try {
        const term = match[1];
        const summaryRes = await fetch(`https://pt.wikipedia.org/api/rest_v1/page/summary/${term}`);
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData.thumbnail && summaryData.thumbnail.source) {
            imageUrl = summaryData.thumbnail.source;
          }
        }
      } catch (err) {
        console.error("Failed to fetch wiki image", err);
      }
    }
  }
  return { text, imageUrl };
};
