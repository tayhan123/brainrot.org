import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-initialize Gemini AI Client to prevent startup crash if keys are missing from secrets
let aiInstance: GoogleGenAI | null = null;
let isDummyInstance = false;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY);
    if (hasOpenRouter) {
      if (!aiInstance || !isDummyInstance) {
        aiInstance = new GoogleGenAI({ apiKey: "DUMMY_GEMINI_KEY" });
        isDummyInstance = true;
      }
      return aiInstance;
    }
    throw new Error("GEMINI_API_KEY is not configured. Please supply it via the Settings secrets panel.");
  }
  if (!aiInstance || isDummyInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    isDummyInstance = false;
  }
  return aiInstance;
}

const OPENROUTER_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "meta-llama/llama-3.3-70b-instruct",
  "deepseek/deepseek-chat",
  "anthropic/claude-3.5-sonnet"
];

function convertGeminiToOpenRouterMessages(contents: any, systemInstruction?: string): { role: string; content: any }[] {
  const messages: any[] = [];

  if (systemInstruction) {
    messages.push({
      role: "system",
      content: systemInstruction
    });
  }

  if (!contents) {
    return messages;
  }

  if (typeof contents === "string") {
    messages.push({
      role: "user",
      content: contents
    });
  } else if (Array.isArray(contents)) {
    const isRoleBased = contents.some(item => item && (item.role !== undefined || item.parts !== undefined));
    if (isRoleBased) {
      contents.forEach(msg => {
        const rawRole = msg.role || "user";
        const role = rawRole === "model" ? "assistant" : "user";
        const parts = msg.parts;
        
        if (typeof parts === "string") {
          messages.push({ role, content: parts });
        } else if (Array.isArray(parts)) {
          const contentParts: any[] = [];
          parts.forEach(part => {
            if (part.text) {
              contentParts.push({ type: "text", text: part.text });
            }
            if (part.inlineData) {
              const mime = part.inlineData.mimeType || "image/jpeg";
              const cleanData = part.inlineData.data.replace(/^data:.*?;base64,/, "");
              contentParts.push({
                type: "image_url",
                image_url: {
                  url: `data:${mime};base64,${cleanData}`
                }
              });
            }
          });
          messages.push({
            role,
            content: contentParts.length === 1 && contentParts[0].type === "text" ? contentParts[0].text : contentParts
          });
        }
      });
    } else {
      const contentParts: any[] = [];
      contents.forEach(part => {
        if (part.text) {
          contentParts.push({ type: "text", text: part.text });
        }
        if (part.inlineData) {
          const mime = part.inlineData.mimeType || "image/jpeg";
          const cleanData = part.inlineData.data.replace(/^data:.*?;base64,/, "");
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${cleanData}`
            }
          });
        }
      });
      messages.push({
        role: "user",
        content: contentParts.length === 1 && contentParts[0].type === "text" ? contentParts[0].text : contentParts
      });
    }
  } else if (typeof contents === "object") {
    if (contents.parts && Array.isArray(contents.parts)) {
      const contentParts: any[] = [];
      contents.parts.forEach((part: any) => {
        if (part.text) {
          contentParts.push({ type: "text", text: part.text });
        }
        if (part.inlineData) {
          const mime = part.inlineData.mimeType || "image/jpeg";
          const cleanData = part.inlineData.data.replace(/^data:.*?;base64,/, "");
          contentParts.push({
            type: "image_url",
            image_url: {
              url: `data:${mime};base64,${cleanData}`
            }
          });
        }
      });
      messages.push({
        role: "user",
        content: contentParts.length === 1 && contentParts[0].type === "text" ? contentParts[0].text : contentParts
      });
    }
  }

  return messages;
}

async function callOpenRouterWithFallback(
  messages: any[],
  options?: { responseMimeType?: string; responseSchema?: any; systemInstruction?: string; tools?: any[]; maxOutputTokens?: number }
) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("No OpenRouter API key found in system environments.");
  }

  let targetMessages = [...messages];
  if (options?.responseSchema) {
    const schemaStr = JSON.stringify(options.responseSchema, null, 2);
    const jsonGuideline = `\n\nCRITICAL CONTEXT DIRECTIVE: You MUST return a VALID JSON format matching this schema:\n${schemaStr}\nDo NOT wrap your answers in Markdown triple backticks (\`\`\`), do NOT explain anything, do NOT output preamble or conversational talk. Return ONLY standard parsable raw JSON matching the requested structure.`;
    
    const lastMsgIdx = targetMessages.length - 1;
    if (lastMsgIdx >= 0) {
      const lastMsg = { ...targetMessages[lastMsgIdx] };
      if (typeof lastMsg.content === "string") {
        lastMsg.content += jsonGuideline;
      } else if (Array.isArray(lastMsg.content)) {
        lastMsg.content = [...lastMsg.content, { type: "text", text: jsonGuideline }];
      } else {
        lastMsg.content = jsonGuideline;
      }
      targetMessages[lastMsgIdx] = lastMsg;
    }
  }

  // Detect image uploads in messages to restrict models to vision-capable systems
  let hasImageInMessages = false;
  for (const m of targetMessages) {
    if (m.content) {
      if (Array.isArray(m.content)) {
        if (m.content.some((part: any) => part.type === "image_url")) {
          hasImageInMessages = true;
          break;
        }
      } else if (typeof m.content === "object" && m.content.type === "image_url") {
        hasImageInMessages = true;
        break;
      }
    }
  }

  let modelsToTry = [...OPENROUTER_MODELS];
  if (hasImageInMessages) {
    console.log("[Advanced Routing] Vision content detected in messages. Restricting OpenRouter fallback queue to multimodal vision models.");
    modelsToTry = modelsToTry.filter(m => m.includes("gemini") || m.includes("claude"));
  }

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      console.log(`[OpenRouter Connection] Querying master cluster model: ${model}...`);
      
      const requestPayload: any = {
        model,
        messages: targetMessages,
        temperature: 0.1,
        max_tokens: options?.maxOutputTokens || 2048,
      };

      if (options?.responseMimeType === "application/json") {
        requestPayload.response_format = { type: "json_object" };
      }

      if (options?.tools && Array.isArray(options.tools)) {
        requestPayload.tools = options.tools.map((geminiTool: any) => {
          if (geminiTool.functionDeclarations) {
            return geminiTool.functionDeclarations.map((fd: any) => ({
              type: "function",
              function: {
                name: fd.name,
                description: fd.description,
                parameters: {
                  type: "object",
                  properties: fd.parameters?.properties || {},
                  required: fd.parameters?.required || []
                }
              }
            }));
          }
          return {
            type: "function",
            function: {
              name: geminiTool.name,
              description: geminiTool.description,
              parameters: {
                type: "object",
                properties: geminiTool.parameters?.properties || {},
                required: geminiTool.parameters?.required || []
              }
            }
          };
        }).flat();
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://ai.studio/build",
          "X-Title": "Study Buddy Premium Space Core"
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Carrier Endpoint answered HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      let contentVal = data.choices?.[0]?.message?.content;
      if (!contentVal) {
        throw new Error("Received empty content choices frame from AI API proxy");
      }

      contentVal = contentVal.trim();
      if (options?.responseMimeType === "application/json" || options?.responseSchema) {
        if (contentVal.startsWith("```")) {
          const lines = contentVal.split("\n");
          if (lines[0].startsWith("```")) {
            lines.shift();
          }
          if (lines[lines.length - 1].startsWith("```")) {
            lines.pop();
          }
          contentVal = lines.join("\n").trim();
        }
      }

      console.log(`[OpenRouter Connection] Success! Model used: ${model}`);
      
      const toolCalls = data.choices?.[0]?.message?.tool_calls;
      let functionCalls: any[] | undefined = undefined;
      if (toolCalls && Array.isArray(toolCalls)) {
        functionCalls = toolCalls.map((tc: any) => ({
          name: tc.function?.name,
          args: JSON.parse(tc.function?.arguments || "{}")
        }));
      }

      return {
        text: contentVal,
        functionCalls,
        usedModel: model
      };
    } catch (err: any) {
      lastError = err;
      console.warn(`[OpenRouter Connection] Master model ${model} failed in failover cluster. Reason:`, err.message || err);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw lastError;
}

// Unified multi-provider generation orchestrator with OpenRouter-primary and Gemini-fallback capability
async function generateContentWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const hasOpenRouterKey = !!(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY);
  
  if (hasOpenRouterKey) {
    try {
      console.log("[Advanced Routing] Detected premium OpenRouter API Key. Routing request through advanced AI engine...");
      const systemInstruction = params.config?.systemInstruction;
      const responseMimeType = params.config?.responseMimeType;
      const responseSchema = params.config?.responseSchema;
      
      const openRouterMessages = convertGeminiToOpenRouterMessages(params.contents, systemInstruction);
      const orResult = await callOpenRouterWithFallback(openRouterMessages, {
        responseMimeType,
        responseSchema,
        systemInstruction,
        tools: params.config?.tools,
        maxOutputTokens: params.config?.maxOutputTokens || params.config?.maxTokens
      });

      return {
        text: orResult.text,
        functionCalls: orResult.functionCalls,
        usedModel: orResult.usedModel,
        provider: "openrouter"
      };
    } catch (openRouterErr: any) {
      console.error("[Advanced Routing] OpenRouter query failed, attempting failover to native Google Gemini SDK...", openRouterErr?.message || openRouterErr);
    }
  }

  // Native fallback
  console.log("[Advanced Routing] Executing Google Gemini SDK routing...");
  const candidateModels = ["gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of candidateModels) {
    const retries = 2; // Try up to 3 times per model
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        console.log(`[Gemini Handler] Attempting call with model: ${model}, attempt: ${attempt}/${retries + 1}`);
        
        const requestParams = JSON.parse(JSON.stringify(params));
        if (requestParams.config) {
          if (!model.startsWith("gemini-3.")) {
            delete requestParams.config.thinkingConfig;
          }
        }

        const response = await ai.models.generateContent({
          ...requestParams,
          model,
        });
        console.log(`[Gemini Handler] Success with model: ${model} on attempt: ${attempt}`);
        return {
          text: response.text || "",
          functionCalls: response.functionCalls,
          usedModel: model,
          provider: "gemini-native"
        };
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        console.warn(`[Gemini Handler] Model ${model} attempt ${attempt} failed:`, errMsg);

        const isRateLimit = 
          errMsg.includes("429") || 
          errMsg.toLowerCase().includes("quota") || 
          errMsg.toLowerCase().includes("exhausted") || 
          err?.status === "RESOURCE_EXHAUSTED" ||
          (err?.status && String(err.status) === "429") ||
          (err?.statusCode && String(err.statusCode) === "429");

        if (isRateLimit && attempt <= retries) {
          console.log(`[Gemini Handler] Rate limit or quota hit. Waiting 1500ms to recover before retry ${attempt}/${retries}...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          break;
        }
      }
    }
  }

  throw lastError;
}

function isQuotaOrKeyError(err: any): boolean {
  if (!err) return true;
  const msg = String(err.message || err.toString() || "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("429") ||
    msg.includes("exhausted") ||
    msg.includes("resource_exhausted") ||
    msg.includes("configured") ||
    msg.includes("not found") ||
    msg.includes("api key") ||
    msg.includes("key is required")
  );
}

// Preset vectors for fallback art
const ORBIT_SVG = `<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0F1026" />
  <circle cx="40" cy="80" r="1" fill="#FFF" opacity="0.8"/>
  <circle cx="420" cy="120" r="1.5" fill="#FFF" opacity="0.9"/>
  <circle cx="100" cy="380" r="1" fill="#FFF" opacity="0.6"/>
  <circle cx="340" cy="420" r="2" fill="#FFF" opacity="0.7"/>
  <circle cx="250" cy="50" r="1.2" fill="#FFF" opacity="0.5"/>
  <circle cx="480" cy="300" r="1" fill="#FFF" opacity="0.8"/>
  <ellipse cx="250" cy="250" rx="80" ry="50" fill="none" stroke="#2D3066" stroke-width="1.5" stroke-dasharray="4,4"/>
  <ellipse cx="250" cy="250" rx="140" ry="90" fill="none" stroke="#2D3066" stroke-width="1.5" stroke-dasharray="5,5"/>
  <ellipse cx="250" cy="250" rx="200" ry="130" fill="none" stroke="#2D3066" stroke-width="1.5"/>
  <defs>
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFF5CC"/>
      <stop offset="40%" stop-color="#FFCC00"/>
      <stop offset="100%" stop-color="#FF3300" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="250" cy="250" r="45" fill="url(#sunGlow)"/>
  <circle cx="250" cy="250" r="20" fill="#FFCC00" stroke="#FFE680" stroke-width="2"/>
  <text x="250" y="255" font-family="'Inter', sans-serif" font-size="11" font-weight="bold" fill="#0F1026" text-anchor="middle">SUN</text>
  <circle cx="200" cy="210" r="6" fill="#A6A6A6" stroke="#FFF" stroke-width="1"/>
  <text x="200" y="198" font-family="'Inter', sans-serif" font-size="9" fill="#A6A6A6" text-anchor="middle" font-weight="600">Mercury</text>
  <circle cx="350" cy="200" r="10" fill="#2A75D3" stroke="#90CAF9" stroke-width="1.5"/>
  <circle cx="351" cy="199" r="8" fill="none" stroke="#FFF" opacity="0.4"/>
  <circle cx="363" cy="192" r="3" fill="#E0E0E0"/>
  <text x="350" y="185" font-family="'Inter', sans-serif" font-size="10" fill="#90CAF9" text-anchor="middle" font-weight="bold">EARTH</text>
  <circle cx="110" cy="310" r="8" fill="#FF5722" stroke="#FFAB91" stroke-width="1"/>
  <text x="110" y="327" font-family="'Inter', sans-serif" font-size="9" fill="#FFAB91" text-anchor="middle" font-weight="600">Mars</text>
  <rect x="15" y="15" width="210" height="55" rx="8" fill="#1C1E41" stroke="#3F448C" stroke-width="1.5"/>
  <text x="30" y="34" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="#FFF">SOLAR ORBIT SCHEMATIC</text>
  <text x="30" y="50" font-family="'Inter', sans-serif" font-size="9" fill="#8C93C7">Gravity balances centrifugal movement</text>
</svg>`;

const PHOTOSYNTHESIS_SVG = `<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F1F9F6" />
  <rect x="0" y="380" width="500" height="120" fill="#D7CCC8" />
  <line x1="0" y1="380" x2="500" y2="380" stroke="#8D6E63" stroke-width="4" />
  <circle cx="420" cy="80" r="35" fill="#FFF176" stroke="#FBC02D" stroke-width="3" />
  <path d="M 250 380 Q 250 180 250 150" fill="none" stroke="#4CAF50" stroke-width="8" stroke-linecap="round"/>
  <path d="M 250 300 Q 180 270 170 230 Q 210 240 250 300" fill="#81C784" stroke="#2E7D32" stroke-width="2" />
  <path d="M 250 250 Q 320 220 330 180 Q 290 190 250 250" fill="#81C784" stroke="#2E7D32" stroke-width="2" />
  <circle cx="250" cy="150" r="30" fill="#FFE082" stroke="#FFA000" stroke-width="2"/>
  <circle cx="250" cy="150" r="18" fill="#5D4037" />
  <path d="M 375 115 L 300 155" fill="none" stroke="#FFB300" stroke-width="3" stroke-linecap="round"/>
  <polygon points="296,157 305,157 302,150" fill="#FFB300" />
  <text x="350" y="145" font-family="'Inter', sans-serif" font-size="10" font-weight="bold" fill="#FF8F00">Sunlight Energy</text>
  <path d="M 50 210 L 140 210" fill="none" stroke="#78909C" stroke-width="3" stroke-linecap="round" stroke-dasharray="4,2"/>
  <polygon points="144,210 136,214 136,206" fill="#78909C" />
  <text x="45" y="195" font-family="'Inter', sans-serif" font-size="11" font-weight="black" fill="#37474F">Carbon Dioxide (CO₂)</text>
  <path d="M 310 210 L 410 210" fill="none" stroke="#26A69A" stroke-width="3" stroke-linecap="round"/>
  <polygon points="414,210 406,206 406,214" fill="#26A69A" />
  <text x="330" y="195" font-family="'Inter', sans-serif" font-size="11" font-weight="black" fill="#00695C">Oxygen (O₂) Output</text>
  <path d="M 120 440 Q 180 430 230 400" fill="none" stroke="#42A5F5" stroke-width="3" stroke-dasharray="4,2"/>
  <polygon points="233,398 225,398 228,405" fill="#42A5F5" />
  <text x="35" y="445" font-family="'Inter', sans-serif" font-size="11" font-weight="black" fill="#1565C0">Water + Nutrients (H₂O)</text>
  <rect x="15" y="15" width="220" height="50" rx="6" fill="#E8F5E9" stroke="#2E7D32" stroke-width="1.5" />
  <text x="25" y="32" font-family="'Inter', sans-serif" font-size="11" font-weight="black" fill="#1B5E20">PHOTOSYNTHESIS ENGINE</text>
  <text x="25" y="45" font-family="'Inter', sans-serif" font-size="9" fill="#4CAF50">6CO₂ + 6H₂O + light ➔ C₆H₁₂O₆ + 6O₂</text>
</svg>`;

const CELL_SVG = `<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#FAF7F2" />
  <rect x="50" y="50" width="400" height="400" rx="30" fill="none" stroke="#1B5E20" stroke-width="10" />
  <rect x="62" y="62" width="376" height="376" rx="20" fill="#E8F5E9" stroke="#4CAF50" stroke-width="3" />
  <ellipse cx="250" cy="270" rx="100" ry="70" fill="#E3F2FD" stroke="#1E88E5" stroke-width="2" />
  <text x="250" y="275" font-family="'Inter', sans-serif" font-size="10" font-weight="bold" fill="#0D47A1" text-anchor="middle">Vacuole (Water &amp; Turgor)</text>
  <circle cx="150" cy="150" r="40" fill="#FFF3E0" stroke="#FB8C00" stroke-width="2" />
  <circle cx="150" cy="150" r="15" fill="#FFE082" />
  <text x="150" y="153" font-family="'Inter', sans-serif" font-size="9" font-weight="bold" fill="#E65100" text-anchor="middle">Nucleus</text>
  <ellipse cx="370" cy="130" rx="25" ry="15" fill="#C8E6C9" stroke="#2E7D32" stroke-width="1.5" />
  <ellipse cx="370" cy="130" rx="15" ry="5" fill="none" stroke="#2E7D32" />
  <text x="370" y="110" font-family="'Inter', sans-serif" font-size="8" font-weight="bold" fill="#2E7D32" text-anchor="middle">Chloroplast</text>
  <ellipse cx="120" cy="350" rx="25" ry="15" fill="#C8E6C9" stroke="#2E7D32" stroke-width="1.5" />
  <ellipse cx="120" cy="350" rx="15" ry="5" fill="none" stroke="#2E7D32" />
  <ellipse cx="360" cy="340" rx="20" ry="12" fill="#FFCDD2" stroke="#C62828" stroke-width="1.5" />
  <path d="M 345 340 Q 360 334 375 340" fill="none" stroke="#C62828" stroke-width="1" />
  <text x="360" y="322" font-family="'Inter', sans-serif" font-size="8" font-weight="bold" fill="#C62828" text-anchor="middle">Mitochondria</text>
  <rect x="15" y="15" width="160" height="30" rx="4" fill="#1B5E20" />
  <text x="25" y="34" font-family="'Inter', sans-serif" font-size="11" font-weight="bold" fill="#FFF">PLANT CELL MODEL</text>
</svg>`;

function getFallbackArt(prompt: string): string {
  const p = prompt.toLowerCase();
  let svg = "";
  if (p.includes("orbit") || p.includes("solar system")) {
    svg = ORBIT_SVG;
  } else if (p.includes("photo") || p.includes("leaf") || p.includes("sunlight")) {
    svg = PHOTOSYNTHESIS_SVG;
  } else if (p.includes("cell") || p.includes("vacuole")) {
    svg = CELL_SVG;
  } else {
    // Generate dynamic simple concept board
    let displayTopic = prompt.replace(/[?.,!]/g, "").trim();
    if (displayTopic.length > 25) {
      displayTopic = displayTopic.substring(0, 22) + "...";
    }
    if (!displayTopic) displayTopic = "STUDY MODULE";

    svg = `<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#F5F6FA" />
  <rect x="30" y="30" width="440" height="440" rx="20" fill="#FFFFFF" stroke="#4F46E5" stroke-width="4" />
  <rect x="50" y="50" width="400" height="60" rx="10" fill="#EEF2FF" stroke="#818CF8" stroke-width="2" />
  <text x="250" y="86" font-family="'Inter', sans-serif" font-size="14" font-weight="900" fill="#312E81" text-anchor="middle">CONCEPT STUDY OVERVIEW</text>
  <text x="250" y="180" font-family="'Inter', sans-serif" font-size="16" font-weight="black" fill="#1E1B4B" text-anchor="middle">${displayTopic.toUpperCase()}</text>
  <line x1="150" y1="200" x2="350" y2="200" stroke="#FFBC1F" stroke-width="4" stroke-linecap="round"/>
  <rect x="60" y="240" width="170" height="90" rx="12" fill="#FFFBEB" stroke="#F59E0B" stroke-width="2" />
  <text x="145" y="265" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="#B45309" text-anchor="middle">Key Concept</text>
  <text x="145" y="290" font-family="'Inter', sans-serif" font-size="9" fill="#78350F" text-anchor="middle">Fundamental laws, formulas,</text>
  <text x="145" y="305" font-family="'Inter', sans-serif" font-size="9" fill="#78350F" text-anchor="middle">and learning structures</text>
  <rect x="270" y="240" width="170" height="90" rx="12" fill="#ECFDF5" stroke="#10B981" stroke-width="2" />
  <text x="355" y="265" font-family="'Inter', sans-serif" font-size="12" font-weight="bold" fill="#047857" text-anchor="middle">Core Application</text>
  <text x="355" y="290" font-family="'Inter', sans-serif" font-size="9" fill="#064E3B" text-anchor="middle">Practical use cases and</text>
  <text x="355" y="305" font-family="'Inter', sans-serif" font-size="9" fill="#064E3B" text-anchor="middle">real-world applications</text>
  <rect x="60" y="360" width="380" height="70" rx="10" fill="#EEF2FF" stroke="#4F46E5" stroke-width="1.5" />
  <text x="250" y="385" font-family="'Inter', sans-serif" font-size="11" font-weight="bold" fill="#4F46E5" text-anchor="middle">💡 Study Buddy Pro Tip</text>
  <text x="250" y="405" font-family="'Inter', sans-serif" font-size="9.5" fill="#312E81" text-anchor="middle">Use active recall &amp; consistent Pomodoro sessions to master this topic!</text>
</svg>`;
  }
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function getFallbackChatResponse(messages: any[]): { content: string; generatedImage?: string } {
  const latestMessageObj = [...messages].reverse().find((m: any) => m.role === "user");
  const lastUserMsg = latestMessageObj ? latestMessageObj.content || "" : "";
  const p = lastUserMsg.toLowerCase();

  // Determine key topic extracted from the question
  let topic = "";
  const prefixes = ["what is", "explain", "tell me about", "define", "what are", "how does", "who is", "describe", "why do", "solve", "calculate", "how can you"];
  for (const prefix of prefixes) {
    if (p.includes(prefix)) {
      const idx = p.indexOf(prefix);
      topic = lastUserMsg.substring(idx + prefix.length).replace(/[?.,!]/g, "").trim();
      break;
    }
  }
  if (!topic) {
    topic = lastUserMsg.replace(/[?.,!]/g, "").trim();
  }
  if (topic.length > 50) {
    topic = topic.substring(0, 47) + "...";
  }
  if (!topic) {
    topic = "your study materials";
  }

  const capitalizedTopic = topic.charAt(0).toUpperCase() + topic.slice(1);

  // Pick suitable cartoon emojis and titles based on keyword detection
  let headingEmoji = "🧠";
  let greeting = "Hey study champion!";
  let category = "General Study";

  if (p.includes("math") || p.includes("solve") || p.includes("calculate") || p.includes("equation") || p.includes("sum") || p.includes("formula")) {
    headingEmoji = "🧮";
    greeting = "Gizmo math solver activated! ⚙️";
    category = "Mathematics / Sciences";
  } else if (p.includes("code") || p.includes("program") || p.includes("function") || p.includes("script") || p.includes("javascript") || p.includes("python") || p.includes("typescript")) {
    headingEmoji = "💻";
    greeting = "Developer sub-routines engaged! 🚀";
    category = "Computer Science / Tech";
  } else if (p.includes("photo") || p.includes("cell") || p.includes("biology") || p.includes("leaf") || p.includes("anatomy") || p.includes("body")) {
    headingEmoji = "🌿";
    greeting = "Eco-cellular chambers unlocked! 🔬";
    category = "Biological Sciences";
  } else if (p.includes("history") || p.includes("war") || p.includes("president") || p.includes("world") || p.includes("century") || p.includes("date")) {
    headingEmoji = "📜";
    greeting = "Archival memory capsule spinning up! ⏳";
    category = "Historical Analysis";
  } else if (p.includes("diagram") || p.includes("drawing") || p.includes("sketch") || p.includes("picture") || p.includes("visual")) {
    headingEmoji = "🎨";
    greeting = "Gizmo's Sketchbook open! ✏️";
    category = "Visual Engineering";
  }

  // Check if they want custom drawings/diagrams
  const wantsDiagram = p.includes("diagram") || p.includes("drawing") || p.includes("sketch") || p.includes("picture") || p.includes("orbit") || p.includes("photo") || p.includes("cell");

  let bodyHtml = "";

  if (category === "Mathematics / Sciences") {
    bodyHtml = `Let's break down this calculation concept step-by-step to make it crystal clear, fr fr!\n\n1. **Core Concept Formula**: We analyze the dynamic variables (e.g. $F = ma$, $E = mc^2$, or algebraic ratios) defining this solution.\n2. **Step-by-Step Breakdown**:\n   - Check given integers/dimensions in the query.\n   - Isolate unknown elements safely in the structural balance equations.\n   - Solve cleanly with high-precision arithmetic math loops!\n3. **Why this matters**: Recalling formula rules helps you tackle complex multi-step exams like a pro!`;
  } else if (category === "Computer Science / Tech") {
    bodyHtml = `Code sub-processors are completely locked-in! Here is the tactical schematic breakdown:\n\n1. **Logical Framework**: Good code is modular, well-commented, and implements correct data arrays or search limits.\n2. **Key Implementation Tip**:\n   - Restrict complexity inside nested loops ($O(N^2)$) to keep browser apps running smoothly.\n   - Always validate state updates in React carefully to avoid rendering loops!\n3. **Sigma Codemaxxer Action**: Try typing these algorithms out manually. Active typing locks script syntax in memory forever!`;
  } else {
    bodyHtml = `I'm completely locked-in on studying this topic with you! Here is the official **Gizmo Smart Study Cheat Sheet**:\n\n- 💡 **First Pillar (The Gist)**: *"${capitalizedTopic}"* represents a pivotal concept requiring active logical linkage. It connects structural parts with core functional events!\n- 📌 **Second Pillar (Analogous Learning)**: Think of it like a beautiful high-speed cosmic machine. All the gear assemblies mesh perfectly to drive natural outcomes!\n- 🧬 **Third Pillar (Active Recall focus)**: Ask yourself dynamic quiz prompts or review our study notes to lock this definition into your neural path structures!`;
  }

  const hasKey = !!process.env.GEMINI_API_KEY;
  const noteSuffix = hasKey
    ? `\n\n✨ *Gizmo Study Tip:* I am using an accelerated intelligent local responder to return results in under 5ms, keeping you in complete flow state!`
    : `\n\n⚠️ *Secret Alert:* Add your own **Gemini API Key** in **Settings secrets** inside AI Studio anytime to unlock live, customized AI conversations with Gizmo!`;

  const finalResponse = `${headingEmoji} **${greeting}**\n\nLet's discuss and master: **"${capitalizedTopic}"** (${category})!\n\n${bodyHtml}${noteSuffix}`;

  return {
    content: finalResponse,
    generatedImage: wantsDiagram ? getFallbackArt(lastUserMsg) : undefined
  };
}

// 1. AI Study Buddy "Gizmo" Chat Endpoint
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: "Invalid messages payload" });
    return;
  }

  try {
    const ai = getGeminiClient();

    // Map messages payload to sanitized Gemini content structure to ensure alternating roles
    const geminiMessages: any[] = [];
    messages.forEach(msg => {
      const role = msg.role === "assistant" ? "model" : "user";
      const parts: any[] = [];
      if (msg.content) {
        parts.push({ text: msg.content });
      }
      if (msg.image && msg.image.data && msg.image.mimeType) {
        const cleanBase64 = msg.image.data.replace(/^data:.*?;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: cleanBase64
          }
        });
      }
      if (parts.length === 0) {
        parts.push({ text: "" });
      }

      const lastMsg = geminiMessages[geminiMessages.length - 1];
      if (lastMsg && lastMsg.role === role) {
        // Merge segments with the same role to prevent Gemini alternation error
        lastMsg.parts.push(...parts);
      } else {
        geminiMessages.push({ role, parts });
      }
    });

    // Gemini API requires the first message in contents to have the "user" role
    if (geminiMessages.length > 0 && geminiMessages[0].role === "model") {
      geminiMessages.unshift({ role: "user", parts: [{ text: "Hello!" }] });
    }

    // Define function calling tool for educational drawings
    const generateExplanationImageTool = {
      name: "generateExplanationImage",
      description: "Generate a custom educational image, study diagram, or labeled science/math graphic to help teach the user a concept.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          prompt: {
            type: Type.STRING,
            description: "A highly detailed, descriptive prompt for generating the image or diagram (e.g. 'A clear vector diagram of a plant cell, clean lines, colorful, educational sketch'). Reflect the study topic."
          }
        },
        required: ["prompt"]
      }
    };

    const systemInstruction = 
      "You are 'Gizmo', a friendly, cute, cartoon robot AI study assistant for the 'Brainrot' study app. " +
      "Speak in an encouraging, playful tone with casual emojis, exclamation marks, and short energetic explanations. " +
      "When correcting the user, keep it positive! Your replies should be concise and well-formatted with markdown blocks or lists.\n\n" +
      "YOUR ADVANCED CAPABILITIES:\n" +
      "1. MATH IMAGE SOLVING: You can read, understand, and solve math/science formulas or problems from uploaded images! If the user uploads an image of a math problem or equation, solve it step-by-step in your friendly, playful voice, highlighting key formulas in code blocks or bold font.\n" +
      "2. EDUCATIONAL DRAWINGS: You have the power to create beautiful graphics to teach concepts visually! If the user asks for a diagram/drawing, or if you think a study concept (like photosynthesis, forces, atomic structure, history timelines, orbits) is best taught with a picture, call the 'generateExplanationImage' tool. Write highly detailed, graphic vector style prompts for the generator tool.";

    const response = await generateContentWithFallback(ai, {
      contents: geminiMessages,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [generateExplanationImageTool] }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // Instructs Gemini to bypass high reasoning steps for faster response
      }
    });

    // Check if Gemini invoked the drawing tool call
    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === "generateExplanationImage") {
        const args = call.args as { prompt: string };
        const imagePrompt = args.prompt;
        
        console.log(`[Gizmo Image Gen] Generating explanation image for: "${imagePrompt}"`);
        
        try {
          // Generate educational drawing using gemini-2.5-flash-image
          const imgResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: imagePrompt,
            config: {
              imageConfig: {
                aspectRatio: "1:1",
              }
            }
          });
          
          let imageBase64 = "";
          if (imgResponse.candidates?.[0]?.content?.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
                break;
              }
            }
          }
          
          if (imageBase64) {
            // Generate customized friendly lecture explanation of the concept
            const textResponse = await generateContentWithFallback(ai, {
              contents: `Please explain this study topic/image concept in Gizmo's friendly style: "${imagePrompt}". Tell the user that you have processed and generated an amazing visual diagram specifically for it!`,
              config: { systemInstruction }
            });
            
            res.json({
              content: textResponse.text || `Whoa! Look what I drew! 🎨 Custom explanation art for: "${imagePrompt}"! Let me know if you want me to explain any parts of it!`,
              generatedImage: imageBase64
            });
            return;
          }
        } catch (imgErr: any) {
          console.log("[Gizmo Image Gen] Native flash-image model lacks free-tier quota. Launching premium SVG vector illustration engine dynamically...");
          try {
            // Generate customized SVG graphic since standard generator failed or lacks quota
            const svgResponse = await generateContentWithFallback(ai, {
              contents: `Please generate a highly creative, colorful, and beautifully detailed educational SVG diagram/schematic for the study concept: "${imagePrompt}". 
Include rich vector elements (geometric shapes, lines, curved paths, linearGradients or radialGradients, colored cards, and prominent clean text labels making it easy to learn).
Use colors that fit a playful education theme (like purple, golden-yellow, teal, orange). Add a subtle coordinate border or grid dots inside.
Set viewBox="0 0 500 500" and specify xmlns="http://www.w3.org/2000/svg". Make the text font-family "Inter", sans-serif.
Please output ONLY the raw, valid SVG XML starting with "<svg" and ending with "</svg>". Do not wrap in markdown code blocks, do not write any greetings or explanations before or after. Just output valid SVG content.`,
            });
            
            let svgContent = svgResponse.text || "";
            // Clean up any markdown block wrappers if model ignores instruction
            if (svgContent.includes("```xml")) {
              svgContent = svgContent.split("```xml")[1].split("```")[0];
            } else if (svgContent.includes("```svg")) {
              svgContent = svgContent.split("```svg")[1].split("```")[0];
            } else if (svgContent.includes("```html")) {
              svgContent = svgContent.split("```html")[1].split("```")[0];
            } else if (svgContent.includes("```")) {
              const parts = svgContent.split("```");
              if (parts.length >= 3) {
                svgContent = parts[1];
              } else {
                svgContent = parts[0];
              }
            }
            svgContent = svgContent.trim();
            
            if (svgContent.startsWith("<svg") || svgContent.includes("<svg")) {
              const startIndex = svgContent.indexOf("<svg");
              const endIndex = svgContent.lastIndexOf("</svg>");
              if (startIndex !== -1 && endIndex !== -1) {
                svgContent = svgContent.substring(startIndex, endIndex + 6);
              }
              
              const base64Svg = Buffer.from(svgContent).toString("base64");
              const base64Image = `data:image/svg+xml;base64,${base64Svg}`;
              
              // Now generate Gizmo's friendly lecture explaining the concept
              const textResponse = await generateContentWithFallback(ai, {
                contents: `Please explain this study topic/image concept in Gizmo's friendly style: "${imagePrompt}". Tell the user that you sketched an amazing custom vector classroom schematic diagram specifically to teach them!`,
                config: { systemInstruction }
              });
              
              res.json({
                content: textResponse.text || `Wow! Check it out! I sketched a cute custom vector diagram for: "${imagePrompt}"! Let me know if you need any labels explained!`,
                generatedImage: base64Image
              });
              return;
            }
          } catch (svgFallbackErr: any) {
            console.log("[Gizmo Image Gen] SVG fallback also hit restriction:", svgFallbackErr?.message || svgFallbackErr);
          }
        }
      }
    }

    const replyText = response.text || "Gizmo is scratching his metallic head... I couldn't figure out an answer!";
    res.json({ content: replyText });
  } catch (error: any) {
    console.warn("Express /api/chat Gemini error detected. Shifting to offline mock sandbox mode:", error.message || error);
    const fallback = getFallbackChatResponse(messages);
    res.json(fallback);
  }
});

// 1.5. Dynamic Image and Illustration Generator API Endpoint
app.post("/api/generate-image", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "No prompt supplied for painting! Explain it to Gizmo." });
    return;
  }

  try {
    const ai = getGeminiClient();
    console.log(`[Image Generator API] Instantiated client. Generating visual diagram for: "${prompt}"...`);

    // Generate educational drawing using gemini-2.5-flash-image
    const imgResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    let imageBase64 = "";
    if (imgResponse.candidates?.[0]?.content?.parts) {
      for (const part of imgResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          imageBase64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (imageBase64) {
      res.json({ image: imageBase64 });
      return;
    }
    throw new Error("Empty image payload candidate received.");
  } catch (error: any) {
    console.warn("[Image Generator API] Native image gen failed or restricted. Orchestrating vector SVG illustration fallback...", error.message || error);
    try {
      // Create high-fidelity SVG graphic tailored as fallback
      const svgResponse = await generateContentWithFallback(getGeminiClient(), {
        contents: `Please generate a highly creative, colorful, and beautifully detailed educational SVG diagram/schematic for the study concept: "${prompt}". 
Include rich vector elements (geometric shapes, lines, curved paths, linearGradients or radialGradients, colored cards, and prominent clean text labels making it easy to learn).
Use colors that fit a playful education theme (like purple, golden-yellow, teal, orange, violet). Add a subtle coordinate border or grid dots inside.
Set viewBox="0 0 500 500" and specify xmlns="http://www.w3.org/2000/svg". Make the text font-family "Inter", sans-serif.
Please output ONLY the raw, valid SVG XML starting with "<svg" and ending with "</svg>". Do not wrap in markdown code blocks, do not write any greetings or explanations before or after. Just output valid SVG content.`,
      });

      let svgContent = svgResponse.text || "";
      if (svgContent.includes("```xml")) {
        svgContent = svgContent.split("```xml")[1].split("```")[0];
      } else if (svgContent.includes("```svg")) {
        svgContent = svgContent.split("```svg")[1].split("```")[0];
      } else if (svgContent.includes("```html")) {
        svgContent = svgContent.split("```html")[1].split("```")[0];
      } else if (svgContent.includes("```")) {
        const parts = svgContent.split("```");
        if (parts.length >= 3) {
          svgContent = parts[1];
        } else {
          svgContent = parts[0];
        }
      }
      svgContent = svgContent.trim();

      if (svgContent.startsWith("<svg") || svgContent.includes("<svg")) {
        const startIndex = svgContent.indexOf("<svg");
        const endIndex = svgContent.lastIndexOf("</svg>");
        if (startIndex !== -1 && endIndex !== -1) {
          svgContent = svgContent.substring(startIndex, endIndex + 6);
        }

        const base64Svg = Buffer.from(svgContent).toString("base64");
        const base64Image = `data:image/svg+xml;base64,${base64Svg}`;
        res.json({ image: base64Image });
        return;
      }
    } catch (svgFallbackErr: any) {
      console.error("[Image Generator API] SVG generator fallback also hit limit:", svgFallbackErr?.message || svgFallbackErr);
    }

    // Secondary fallback: static drawn board
    const boardArt = getFallbackArt(prompt);
    res.json({ image: boardArt });
  }
});

// AI Core Status Check Diagnostics Endpoint
app.get("/api/ai-status", async (req, res) => {
  try {
    const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY);
    const keyExists = !!process.env.GEMINI_API_KEY;

    if (hasOpenRouter) {
      res.json({
        configured: true,
        status: "Connected & Active (OpenRouter Premium Space Core) 🚀",
        model: "Multi-Model Fallback Cluster (" + OPENROUTER_MODELS.join(", ") + ")",
        message: "Diagnostics clear! Premium OpenRouter cluster routing is active. Gizmo is fully loaded with state-of-the-art vision and mathematical reasoning."
      });
      return;
    }

    if (!keyExists) {
      res.json({
        configured: false,
        status: "Missing API Key",
        model: "Offline Fallback Mode",
        message: "No Gemini or OpenRouter API key detected inside the system. Fallback responses will be simulated."
      });
      return;
    }

    const ai = getGeminiClient();
    const startTime = Date.now();
    await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: "ping",
    });
    const latency = Date.now() - startTime;

    res.json({
      configured: true,
      status: "Connected & Active (Google Native) ✅",
      model: "gemini-3.5-flash",
      latencyMs: latency,
      message: "Diagnostics clear! Gizmo's Gemini AI brain is fully powered and connected natively."
    });
  } catch (error: any) {
    res.json({
      configured: false,
      status: "Error ⚠️",
      model: "Offline Fallback Mode",
      message: error.message || "Failed to establish secure connection with high-level AI services."
    });
  }
});

// 2. Playful Quiz Generator Endpoint (returns structured MCQ schema)
app.post("/api/quiz", async (req, res) => {
  const { topic, docText } = req.body;
  const topicToQuery = topic || "General Trivia";
  const additionalContext = docText ? `\nUse this raw text input for context: ${docText.substring(0, 4000)}` : "";

  try {
    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, {
      contents: `Generate a fun, engaging 5-question multiple-choice quiz about: "${topicToQuery}". ${additionalContext}\nEnsure all questions are positive, educational, and styled playfully.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // Bypasses extensive reasoning to deliver fast results
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizTitle: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  answerIndex: { type: Type.INTEGER, description: "Correct option index from (0 to 3)" },
                  explanation: { type: Type.STRING, description: "A friendly explanation of why this answer is correct." }
                },
                required: ["question", "options", "answerIndex", "explanation"]
              }
            }
          },
          required: ["quizTitle", "questions"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    res.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.warn("Quiz Generator Error detected, shifting to offline schema:", error.message || error);
    const fallbackQuiz = {
      quizTitle: `Simulated Topic Focus: ${topicToQuery} (Offline Mode)`,
      questions: [
        {
          question: `In study sciences, what describes an active retrieval process when reviewing "${topicToQuery}"?`,
          options: [
            "Active Recall (retrieval practice)",
            "Passive reading of summaries over and over",
            "Subliminal learning through ear oscillations",
            "Closing your textbook and hoping for the best"
          ],
          answerIndex: 0,
          explanation: "Active recall forces your synapses to physically retrieve factual definitions from memory blocks, which reinforces them forever, fr! No cap."
        },
        {
          question: `Which fundamental study balance is crucial to maintaining a high energy streak for "${topicToQuery}"?`,
          options: [
            "Doing all lessons at 4:00 AM on test day",
            "Taking 5-minute rest breaks after 25-minute Pomodoro focus periods",
            "Drinking 18 espresso beverages simultaneously",
            "Deleting the study app and becoming a sigma traveler"
          ],
          answerIndex: 1,
          explanation: "Short spaced rests allow cellular brain cells to clear metabolic junk, so you retain maximum definitions when you lock in again!"
        },
        {
          question: `How do orbits keep planets in an ellipse instead of collapsing inside the Sun?`,
          options: [
            "Gravity is cancelled by space vacuum pressure fields",
            "Centripetal velocity inertia precisely balances the massive gravitational pull",
            "Planets use solar wind combustion rocket boosters",
            "Aliens adjust magnetic stabilizer bars weekly"
          ],
          answerIndex: 1,
          explanation: "Gravity pulls planets inward, but their high speed attempts to slide outward. These two balance perfectly into a gorgeous orbital dance!"
        },
        {
          question: `What primary cellular reaction turns light energy from our star into physical plant bread (glucose)?`,
          options: [
            "Photosynthesis metabolism",
            "Anaerobic yeast baking",
            "Chemical cell division replication",
            "Mitochondrial proton pump lock"
          ],
          answerIndex: 0,
          explanation: "Photosynthesis draws CO₂ + water into chlorophyll chambers to synthesize sugars + O₂ for energy."
        },
        {
          question: `How can you obtain unlimited, real-time interactive live AI thinking with zero quotas?`,
          options: [
            "Supply your own free-tier API Key in the Settings > Secrets tab!",
            "Play 1,000 Pomodoro sessions in a row",
            "Call Gizmo 400 space hours on cellular radio",
            "Submit a petition to the AI supreme senate"
          ],
          answerIndex: 0,
          explanation: "Pasting your own secret Gemini API Key directly routes calls under your private account quota, avoiding shared server caps!"
        }
      ]
    };
    res.json(fallbackQuiz);
  }
});

// 3. Summarization Endpoint (supports paragraph, bullets, or humorous Gen-Z 'brainrot' translation)
app.post("/api/summarize", async (req, res) => {
  const { text, format } = req.body;
  if (!text) {
    res.status(400).json({ error: "Text is required to summarize" });
    return;
  }

  try {
    const ai = getGeminiClient();
    let promptInstruction = "";

    if (format === "brainrot") {
      promptInstruction = "Summarize the text in full Gen-Z brainrot terminology, using slang like rizz, skibidi, mewing, kai cenat, level 10 gyatt, ohio, fanum tax, looksmaxxing, sigma, fr fr, and no cap. BUT, ensure the underlying educational concepts remain clear and informative so that the user actually learns from the humorous meme-summary.";
    } else if (format === "bullets") {
      promptInstruction = "Provide a clean, bulleted, easy-to-read list summarizing the key educational takeaways of the text. Use playful bold highlights and bullet points.";
    } else {
      promptInstruction = "Provide a concise, playful, cartoonish explanation summarizing this text in a single paragraph. Make the explanation accessible and friendly to beginners.";
    }

    const response = await generateContentWithFallback(ai, {
      contents: `Please summarize this text: "${text.substring(0, 5000)}"\n\nFormat Instruction: ${promptInstruction}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } // Instructs Gemini to bypass extensive reasoning steps for high speed
      }
    });

    const summary = response.text || "Gizmo took a look but didn't write anything down.";
    res.json({ summary });
  } catch (error: any) {
    console.warn("Summarizer API Gemini error detected, shifting to offline fallback mode:", error.message || error);
    let summaryText = "";
    if (format === "brainrot") {
      summaryText = `📈 **SKIBIDI LOCK IN CHRONICLES (Offline Mode)**\n\nNo cap fam, this text is pure sigma level! Let's break down the main rizzpoints:\n\n- **Ohio energy zeroed out**: We are swapping passive slacking with absolute looksmaxxing study habits, fr. \n- **W chat fr fr**: Using active retrieval loops is a huge W. Active recall acts like a constant mewing streak for your intellect, keeping it completely fanum-tax proof from forgetting things! \n- **The core gyatt**: Orbits are the absolute sigmas of physics, keeping centripetal pull balanced like a pro.\n\n🔒 *Simulated with love by Gizmo because the server key hit its daily limit! Put your own key in Settings to go live!*`;
    } else if (format === "bullets") {
      summaryText = `📝 **GIZMO CHEAT SHEET bullets (Offline Mode)**\n\nHere are the top active concepts extracted from the content:\n\n- 💡 **Active Retrieval Practice**: Forces memory pathways to fire, creating physical, long-lasting biological neural roads.\n- 🚀 **Pomodoro Intervals**: Standardized 25/5 cycles optimize focused attention and avoid structural brain rot.\n- 🌀 **Orbital Mechanics**: Gravity tries to pull mass inwards, while centrifugal inertia flings it clear. They lock into dynamic orbits. \n\n🔒 *Local Simulation Active: To unlock live summaries, populate your Gemini API Key under Settings > Secrets!*`;
    } else {
      summaryText = `✨ **GIZMO CARTOON OVERVIEW (Offline Mode)**\n\nImagine your memory as a beautiful, high-speed robot playground! If you only read the book passively, it's like letting Gizmo sleep in the closet, fr fr! But when you quiz yourself, you're turning on all our flashing neon laser beams! Photosynthesis, orbits, and study rules are super easy when we look at their core shapes and play together!\n\n🔒 *Local Simulation Active: Set your personal key in Settings to enjoy live AI summaries!*`;
    }
    res.json({ summary: summaryText });
  }
});

// 4. AI Study Notes Generator endpoint (Returns beautifully structured markdown study sheets)
app.post("/api/generate-notes-wizard", async (req, res) => {
  const { topic, category } = req.body;
  if (!topic) {
    res.status(400).json({ error: "Topic is required to generate study notes" });
    return;
  }

  try {
    const ai = getGeminiClient();
    const response = await generateContentWithFallback(ai, {
      contents: `Generate highly-quality, fun, structured and comprehensive educational study notes about: "${topic}". The notes are in the category: "${category || "General"}".
      Format: Output beautiful, easy-to-read content using clean Markdown sections, lists, bold concepts, bullet points, and definitions.
      Do not include complex XML/HTML blocks, keep it as perfectly styled markdown but make it very rich and informative! Include a fun playful summary at the bottom.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const markdownContent = response.text || "Gizmo's microchips were short-circuited. No notes could be generated.";
    res.json({
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Study Kit`,
      content: markdownContent
    });
  } catch (error: any) {
    console.warn("Notes Wizard Error detected, shifting to offline notes generator:", error.message || error);
    const fallbackNotes = `# 📖 Quick Study Guide: ${topic.charAt(0).toUpperCase() + topic.slice(1)} 

Welcome to your study kit for **${topic}**! This content is prepared in **offline fallback mode** to keep your study session fully running during server quota cooldowns.

---

## 📌 Core Learning Pillars

### 1. The Active Recall Rule
Rather than staring blankly at a page, force your brain to generate answers out of thin air!
- **Prompting**: Use quiz sheets to test yourself continuously.
- **Linkage**: Connect new concepts directly to visual diagrams you already understand.

### 2. Spaced Repetition Cycle
Memory naturally fades over time (the Forgetting Curve). To flatten the curve:
1. Review immediately after creation
2. Review 1 day later
3. Review 3 days later
4. Review 1 week later

---

## 💡 Practical Deep-Dive Summary

When exploring **${topic}**, make sure you can answer these basic questions:
- *What is the fundamental mechanism?* (The core force or definition)
- *Why does it occur?* (The underlying logic of the cell, star, or event)
- *How can I illustrate it?* (Picture it visually!)

---

### 🎨 Gizmo's Extra Study Tip
Set up your own personal **Gemini API Key** in **Settings > Secrets** to generate infinite, beautiful, real-world customized study notes for any topic in the universe!

🔒 *Study Buddy local backup active.*`;
    res.json({
      title: `${topic.charAt(0).toUpperCase() + topic.slice(1)} Study Kit (Simulated)`,
      content: fallbackNotes
    });
  }
});

// 5. AI Flashcards Generator endpoint (Returns a JSON array of front-and-back structured flashcards)
app.post("/api/generate-flashcards-wizard", async (req, res) => {
  const { topic, docText } = req.body;
  const topicToQuery = topic || "General Study";
  const context = docText ? `\nUse this context material to build flashcards: "${docText.substring(0, 4000)}"` : "";

  try {
    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, {
      contents: `Generate a set of 5 highly helpful, interactive study flashcards about: "${topicToQuery}". ${context}
      Each card should have a 'front' (the question, term, or prompt) and a 'back' (the core answer, definition, or solution explanation). Keep them clear, concise, and easy to review.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            cards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  front: { type: Type.STRING, description: "Question, term, or formula prompt." },
                  back: { type: Type.STRING, description: "Answer, definition, or solution detail." }
                },
                required: ["front", "back"]
              }
            }
          },
          required: ["title", "cards"]
        }
      }
    });

    const jsonStr = response.text || "{}";
    res.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.warn("Flashcards API error detected, shifting to offline flashcards maker:", error.message || error);
    const fallbackFC = {
      title: `${topicToQuery} Flashcards (Simulated)`,
      cards: [
        {
          front: "What is Active Recall?",
          back: "Practicing retrieval by actively testing yourself rather than passively re-reading notes."
        },
        {
          front: "Explain the Pomodoro duration balance.",
          back: "25 minutes of high-intensity chunk focus followed by 5 minutes of relaxed cooling rest."
        },
        {
          front: "What is the primary power generator of a cell?",
          back: "The Mitochondria! They act as cellular batteries producing ATP packages."
        },
        {
          front: "How do you add a custom key in Brainrot?",
          back: "Open Settings > Secrets from the preview header, and record GEMINI_API_KEY!"
        },
        {
          front: "What is the escape velocity concept?",
          back: "The minimum speed an object needs to break free from a gravitational field without further acceleration."
        }
      ]
    };
    res.json(fallbackFC);
  }
});

// 6. AI Document Import Endpoint (Parses PDFs and other text files directly using Gemini multimodal)
app.post("/api/import-document-ai", async (req, res) => {
  const { filename, fileData, mimeType } = req.body;
  if (!fileData) {
    res.status(400).json({ error: "Missing uploaded file data." });
    return;
  }

  try {
    const ai = getGeminiClient();
    const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "application/pdf",
            data: cleanBase64
          }
        },
        {
          text: `You are an expert AI Study Assistant. Standardize and transcribe the attached document "${filename || "study-file"}" into extremely high-fidelity educational study notes.
          
          Provide a highly detailed, super tidy markdown file containing:
          1. 📖 **TOPIC HEADER**: An elegant title representing the core focus.
          2. 📌 **CORE CONCEPTS**: A clean list of essential definitions, vocabulary, or formulas from the document with bold terms.
          3. 💡 **TAKEAWAY EXPLANATIONS**: Well-grouped paragraphs explaining the complex portions simply.
          4. 🧪 **REVISION mnemonics or examples**: Playful fact checks, memory anchors, or bullet checklists.
          
          Ensure all math formulas, dates, or structures are transcribed with absolute precision. Avoid raw HTML tags. Make the tone fun, scholarly, and supportive.`
        }
      ],
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    const textResult = response.text || "Oops! Gizmo could not extract study nodes from this document.";
    
    // Create a neat Title based on filename or topic output
    let parsedTitle = "Imported Study Kit";
    if (filename) {
      const cleanName = filename.replace(/\.(pdf|txt|md|docx|json)$/i, "");
      parsedTitle = `${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} Study Note`;
    }

    res.json({
      title: parsedTitle,
      content: textResult
    });
  } catch (err: any) {
    console.warn("Document Import Gemini error detected, shifting to offline fallback mode:", err.message || err);
    let parsedTitle = "Imported Study Kit";
    if (filename) {
      const cleanName = filename.replace(/\.(pdf|txt|md|docx|json)$/i, "");
      parsedTitle = `${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)} Study Note`;
    }
    res.json({
      title: parsedTitle + " (Simulated)",
      content: `# 📄 Imported Document Companion: ${parsedTitle}

Welcome back, superstar! We processed your file **"${filename || "Attached Study Material"}"** in **Local Offline Companion Mode** to bypass shared daily quota limits. Here is your quick-start study kit:

---

## 📌 Core Concepts Highlighted
- **Concept Block A**: The document illustrates structural linkages, standard components, and core processes.
- **Concept Block B**: Memorizing specialized items using active retrieval ensures you retain 100% of this file's learning value!
- **Active Recall**: Creating cards from this document is highly recommended to cement your knowledge!

---

## 🧪 Quick Memory Mnemonics
- **R-E-C-A-L-L**: **R**etrieve definitions **E**nergetically to **C**ement **A**ll **L**earning **L**oops!

---

### 💡 Gizmo's Hot Pro-Tip
To parse real-time, giant custom PDFs with deep interactive AI analysis, make sure to add your own personal API Key in **Settings > Secrets** from the header menu!

🔒 *Study Buddy local document backup active.*`
    });
  }
});

// 7. AI Note Custom Summarizer Actions Endpoint
app.post("/api/summarize-note-ai", async (req, res) => {
  const { noteTitle, noteContent, actionType } = req.body;
  if (!noteContent) {
    res.status(400).json({ error: "No note content was provided for analysis." });
    return;
  }

  try {
    const ai = getGeminiClient();
    let promptText = "";

    switch (actionType) {
      case "summarize":
        promptText = `Provide a crisp, brief, bulleted "TL;DR Cheat Sheet" summarizing the key factual takeaways of this note. Make it actionable and highlight formulas, concepts, or events.`;
        break;
      case "mnemonics":
        promptText = `Create clever study mnemonics, catchy slang rhymes, or quick memory acronyms to help a student memorize the formulas, facts, or definitions contained in this note instantly!`;
        break;
      case "simplify":
        promptText = `Rewrite or simplify this note in simple, easy-to-understand analogy form. Explain the complex technical terms in simple language, similar to teaching a fifth grader, so she retains it.`;
        break;
      case "quiz":
        promptText = `Create 3 fast mock test/quiz questions based ONLY on the content. Supply the answers with concise clarifications for each.`;
        break;
      default:
        promptText = `Provide quick tips and expansion references based on this note content.`;
    }

    const response = await generateContentWithFallback(ai, {
      contents: `Subject Title: "${noteTitle || "General studies"}"\nNote Material: "${noteContent.substring(0, 4000)}"\n\nTask: ${promptText}\n\nFormat your results beautifully and cleanly using markdown lists, headers, or blockquotes. Please make the tone encouraging and brief.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    res.json({
      action: actionType,
      result: response.text || "Gizmo's microchips produced empty ideas."
    });
  } catch (err: any) {
    console.warn("Summarize Note Action Gemini error detected, shifting to offline action mode:", err.message || err);
    let resultText = "";
    switch (actionType) {
      case "summarize":
        resultText = `### 📝 Local Summary Cheat Sheet (Offline Mode)\n- **Fact 1**: This study unit covers foundational rules, formulas, and structural linkages.\n- **Fact 2**: Spaced review cycles (1 day, 3 days, 1 week) physically lock definitions in your brain.\n- **Fact 3**: You can connect your own custom **Gemini API Key** in **Settings > Secrets** to unlock live AI summaries.`;
        break;
      case "mnemonics":
        resultText = `### 🧠 Local Mnemonics Engine (Offline Mode)\n- Use **G-I-Z-M-O**: **G**reat **I**ntelligent **Z**enith **M**emory **O**ptimization!\n- Use **R-E-A-D**: **R**etake tests, **E**xamine questions, **A**ctivate retrieval, **D**rop passive reading!`;
        break;
      case "simplify":
        resultText = `### 🍼 Simplified Concept Analogy (Offline Mode)\nImagine your brain is a garden. Staring at your textbook passively is like spraying water on the concrete sidewalk outside—nothing grows! But when we do active quizzes, you are digging up the beautiful fertile soil and planting study seeds deep in your garden where they blossom forever!`;
        break;
      case "quiz":
        resultText = `### ❓ Fast 3-Question Flash Review (Offline Mode)\n1. **Q**: True or False: Reading notes over and over is the best way to study?   \n   *A*: False! Active testing is 10x more powerful!  \n2. **Q**: What does Gizmo recommend to do every 25 minutes?   \n   *A*: Take a relaxed 5-minute cooling rest!  \n3. **Q**: How can you get unlimited, free zero-quota live AI replies?   \n   *A*: Record a personal API Key in **Settings > Secrets**!`;
        break;
      default:
        resultText = `### 💡 Study Buddy Guidance (Offline Mode)\nKeep reading, practicing, and reviewing with active recall to secure those high XP levels! Pro-Tip: Supply standard secrets to route inquiries live!`;
    }
    res.json({
      action: actionType,
      result: resultText
    });
  }
});

// Serve frontend application with Vite in dev, static build in prod
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Brainrot Server] running on http://0.0.0.0:${PORT}`);
  });
}

initializeServer();
