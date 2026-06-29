var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var aiClient = null;
function getGemini() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required in settings/secrets");
    }
    aiClient = new import_genai.GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}
app.post("/api/ai/generate", async (req, res) => {
  try {
    const { action, title, description, platform, size, theme, color } = req.body;
    const ai = getGemini();
    if (action === "text") {
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
            type: import_genai.Type.OBJECT,
            properties: {
              caption: { type: import_genai.Type.STRING },
              hashtags: { type: import_genai.Type.STRING },
              cta: { type: import_genai.Type.STRING },
              imagePrompt: { type: import_genai.Type.STRING }
            },
            required: ["caption", "hashtags", "cta", "imagePrompt"]
          }
        }
      });
      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText.trim());
      return res.json({ status: "success", data: parsed });
    }
    if (action === "image") {
      const { prompt: imagePrompt, size: size2 } = req.body;
      let aspectRatio = "1:1";
      if (size2 === "Story (1080x1920)") aspectRatio = "9:16";
      else if (size2 === "Portrait (1080x1350)") aspectRatio = "3:4";
      else if (size2 === "Landscape (1920x1080)") aspectRatio = "16:9";
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            {
              text: `${imagePrompt || "Abstract minimal geometric background with corporate colors, professional, modern, HR promotion poster background"}. High definition, cinematic style, vector-like clean graphics, no text, no letters.`
            }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio
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
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return res.status(500).json({ error: error.message || "Gagal berkomunikasi dengan AI" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
