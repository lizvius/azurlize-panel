import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialise Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required in settings/secrets");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// API endpoint for AI content generation
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { action, title, description, platform, size, theme, color } = req.body;
    const ai = getGemini();

    if (action === 'text') {
      const prompt = `Anda adalah Senior Copywriter dan Recruitment Specialist di TeamAzurLize.
Tugas Anda adalah membuat copywriting promosi lowongan rekrutmen yang sangat menarik berdasarkan info berikut:
- Judul: ${title}
- Deskripsi: ${description}
- Target Platform: ${platform}
- Tema Visual: ${theme}
- Warna Dominan: ${color}

Hasilkan output dalam format JSON valid dengan key:
- caption: Copywriting caption media sosial yang menarik, informatif, persuasif, memiliki jarak paragraf yang baik (readability tinggi), dan menggunakan emoji yang relevan.
- hashtags: 5-8 hashtag populer dan relevan dalam satu baris, diawali dengan #.
- cta: Call To Action pendek yang menarik (misalnya: "Daftar sekarang melalui link di bio!", atau "Hubungi Telegram admin kami!").
- imagePrompt: Prompt deskriptif detail bahasa Inggris (sekitar 50-80 kata) untuk generator gambar AI. Prompt harus fokus pada latar belakang abstrak profesional yang estetik, modern, minimalis, dan futuristik dengan kombinasi warna dominan ${color} dan tema ${theme}, tanpa teks di dalam gambar untuk dijadikan latar belakang poster lowongan kerja.

Gunakan bahasa Indonesia yang profesional namun santai dan persuasif untuk caption, hashtags, dan cta. Untuk imagePrompt wajib menggunakan bahasa Inggris.
Output HARUS hanya berupa JSON valid tanpa markdown block.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.STRING },
              cta: { type: Type.STRING },
              imagePrompt: { type: Type.STRING }
            },
            required: ["caption", "hashtags", "cta", "imagePrompt"]
          }
        }
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      return res.json({ status: "success", data: parsed });
    }

    if (action === 'image') {
      const { prompt: imagePrompt, size } = req.body;
      let aspectRatio = "1:1";
      if (size === "Story (1080x1920)") aspectRatio = "9:16";
      else if (size === "Portrait (1080x1350)") aspectRatio = "3:4";
      else if (size === "Landscape (1920x1080)") aspectRatio = "16:9";

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: `${imagePrompt || 'Abstract minimal geometric background with corporate colors, professional, modern, HR promotion poster background'}. High definition, cinematic style, vector-like clean graphics, no text, no letters.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any
          }
        }
      });

      let base64Image = "";
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            base64Image = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!base64Image) {
        throw new Error("No image data returned from Gemini Image API");
      }

      return res.json({ status: "success", imageUrl: base64Image });
    }

    return res.status(400).json({ error: "Invalid action specified" });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    return res.status(500).json({ error: error.message || "Gagal berkomunikasi dengan AI" });
  }
});

// Vite middleware in development / static in production
async function startServer() {
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
