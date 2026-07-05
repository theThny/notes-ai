# Documentação de Arquitetura: Note AI (Modo Visual & Integração TipTap)

Este documento foi gerado para auxiliar outras instâncias de IA (como Gemini) a entenderem o contexto atual, a arquitetura e as soluções de contorno (workarounds) implementadas no projeto **Note AI**.

## 1. Visão Geral do Projeto
O **Note AI** é um aplicativo de anotações inteligente construído com React. O núcleo de edição de texto utiliza a engine **TipTap** (baseada no ProseMirror). O aplicativo conta com transcrição de voz e expansão de conhecimento usando LLMs (Gemini e Groq).

## 2. O "Modo Visual" (Moodboard)
O "Modo Visual" é uma feature onde o usuário solicita que a IA expanda um conceito não apenas com texto, mas com uma galeria de imagens e uma paleta de cores, gerando um "Moodboard" que é inserido diretamente no meio da nota (renderizado nativamente no TipTap).

### Fluxo de Funcionamento Atual:
1. **API Persona (`src/services/ai.js`)**
   - O prompt do Modo Visual proíbe estritamente o LLM de agir como assistente conversacional.
   - O LLM atua como um endpoint RESTful, retornando **apenas um objeto JSON puro**.
   - **Blindagem no Parser:** O código limpa quebras de linha (`\n`, `\r`) inseridas literalmente pelo LLM antes do `JSON.parse` usando o método de extração baseada em `substring` (buscando o primeiro `{` e o último `}`).

2. **A Ponte TipTap (`src/components/Editor.jsx`)**
   - A função `handleExpand` orquestra a chamada da IA.
   - **Nuclear Option (Bypass de Serialização):** O TipTap (ProseMirror) falha ao lidar com objetos e arrays complexos injetados. Para contornar os erros de `flushSync` e de atributos vazios, o `Editor.jsx` pega o payload da IA, transforma os arrays (`colors` e `images`) em strings (`JSON.stringify`) e aciona:
     ```javascript
     setTimeout(() => {
       editor.chain().focus().insertContent({ type: 'moodboard', attrs: { ... } }).run();
     }, 150);
     ```
   - O `setTimeout` de 150ms impede a colisão de re-renders síncronos entre o TipTap e o React.

3. **React NodeView Customizado (`src/extensions/MoodboardExtension.jsx`)**
   - O componente Moodboard não é HTML estático, ele é um bloco React vivo injetado na árvore do TipTap via `@tiptap/react`.
   - **Schema:** O método `addAttributes()` define os atributos com `default: '[]'` (como strings) para que o TipTap não perca a referência.
   - **Render HTML:** O método `renderHTML` garante que, se o TipTap precisar desserializar o documento, os dados fiquem salvos como `data-colors` e `data-images`.
   - **Renderização Segura:** Dentro do `MoodboardComponent`, as props vêm como string. O próprio React Component executa um `try/catch` com `JSON.parse` para reverter as strings de volta para Arrays reais e iterar sobre elas com `.map()` para desenhar as galerias.

4. **Estilização Global (`src/index.css`)**
   - A interface do Moodboard (o bloco `.moodboard-container`, `.mb-title`, `.mb-palette` e `.mb-gallery`) usa um esquema visual isolado, com tema "Notion-like" escuro. O contêiner usa fundo leve transparente (`rgba`) e bordas suaves.

## 3. Principais Erros Recentes Resolvidos (Para a IA estar Ciente)
- **Error: `DOMException: Failed to execute 'insertContent'`**: Resolvido ao parar de tentar injetar tags `<div>` puras sem schema no TipTap e usar o objeto de estrutura nativa do TipTap (`type: 'moodboard'`).
- **Error: Warning de `flushSync` (React)**: Resolvido ao colocar a injeção do NodeView no `setTimeout` (delegando para o próximo tick do Event Loop).
- **Error: Atributos Vazios (Array(0))**: Resolvido abandonando a injeção de Arrays nativos no TipTap (o TipTap dropava os atributos durante a hidratação) e forçando a injeção estritamente como *Strings*, empurrando a responsabilidade de desserializar os arrays de volta para o React.

## 4. Onde Iniciar Soluções de Problemas
- Se o **Moodboard falhar ao renderizar as imagens/cores**: O problema estará no `MoodboardComponent` (`src/extensions/MoodboardExtension.jsx`) tentando decodificar a string.
- Se a **IA começar a falar textos antes do JSON**: O problema estará no Prompt do `ai.js`, que precisará de mais reforço na diretiva RESTful API.
- Se o **TipTap rejeitar a inserção do nó**: Verifique se a variável `payload` em `Editor.jsx` montou as strings corretamente e se a extensão está registrada em `TipTapEditor.jsx`.
