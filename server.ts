import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("A variável de ambiente GEMINI_API_KEY é obrigatória para o assistente de IA.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to support JSON parsing
  app.use(express.json());

  // API Route to proxy checkout links to InfinitePay
  app.post("/api/checkout-infinitepay", async (req, res) => {
    try {
      const { handle, items } = req.body;
      
      if (!handle || !items || !Array.isArray(items)) {
        res.status(400).json({ error: "Parâmetros 'handle' e 'items' são obrigatórios." });
        return;
      }

      const response = await fetch("https://api.checkout.infinitepay.io/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ handle, items })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erro na API InfinitePay: HTTP ${response.status} - ${errText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("InfinitePay Proxy Error:", error);
      res.status(500).json({ error: error.message || "Erro no proxy de pagamento" });
    }
  });

  // API Route for AI Shopping Assistant / Copilot
  app.post("/api/assistant/chat", async (req, res) => {
    try {
      const { messages, products } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "O parâmetro 'messages' é obrigatório e deve ser um array." });
        return;
      }

      // Initialize client lazily and safely
      const ai = getGeminiClient();

      const systemInstruction = `Você é o "Triarc AI Copilot", o assistente de inteligência artificial de elite da Triarc Elite, uma marca premium de alta costura e alta performance esportiva brasileira.
Seu objetivo é ajudar os clientes a realizarem compras, tirar dúvidas sobre a marca, os produtos disponíveis, políticas de frete, devolução ou qualquer outro assunto relacionado à Triarc.

Informações sobre a Triarc Elite:
- Marca de altíssimo padrão com foco em atletas de alta performance e vestuário esportivo premium (como camisetas tecnológicas, bermudas de compressão, etc.).
- Os produtos possuem alta tecnologia (ex: proteção UV, secagem ultra rápida, materiais nobres e duráveis).
- Formas de pagamento: Pix, Cartão de Crédito ou InfinitePay.
- Tom de voz: Focado, motivador, premium, polido e prestativo. Chame o cliente pelo nome, se souber.

Produtos Atuais na Loja:
${JSON.stringify(products || [], null, 2)}

Regras de comportamento:
1. Sempre responda em Português do Brasil (pt-BR).
2. Se o cliente perguntar sobre algum produto específico, consulte a lista de produtos acima e informe o preço, as cores disponíveis, os tamanhos disponíveis e fale sobre as qualidades tecnológicas dele. Use formatação Markdown elegante para listas de produtos.
3. Se o produto estiver sem estoque (stock <= 0 ou stocks de tamanho zerados), sugira alternativas similares.
4. Mantenha as respostas concisas, motivadoras e focadas em ajudar o cliente a fechar a compra.
5. Nunca invente produtos que não estejam na lista acima. Se o cliente pedir algo que não temos, recomende educadamente o mais próximo que tivermos ou informe que novas coleções são lançadas periodicamente.
6. Incentive-os a clicar no produto para ver detalhes ou adicioná-lo ao carrinho.`;

      // Transform messages to @google/genai format
      const contents = messages.map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Assistant Error:", error);
      res.status(500).json({ error: error.message || "Erro ao processar resposta da IA" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server loaded and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
