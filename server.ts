import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini AI Client to prevent startup crash if keys are missing from secrets
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Please supply it via the Settings secrets panel.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Helper to call generateContent with fallback models in case of high demand (503) or other errors
async function generateContentWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const candidateModels = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
  let lastError: any = null;
  for (const model of candidateModels) {
    try {
      console.log(`[Gemini Handler] Attempting call with model: ${model}`);
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      console.log(`[Gemini Handler] Success with model: ${model}`);
      return response;
    } catch (err: any) {
      console.warn(`[Gemini Handler] Model ${model} failed:`, err);
      lastError = err;
    }
  }
  throw lastError;
}

// 1. AI Study Buddy "Gizmo" Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages payload" });
      return;
    }

    const ai = getGeminiClient();

    // Map messages payload to Gemini content structure
    // Gemini roles: 'user', 'model'
    // Support multimodal user-uploaded math images
    const geminiMessages = messages.map(msg => {
      const role = msg.role === "assistant" ? "model" : "user";
      const parts: any[] = [{ text: msg.content || "" }];
      if (msg.image && msg.image.data && msg.image.mimeType) {
        parts.push({
          inlineData: {
            mimeType: msg.image.mimeType,
            data: msg.image.data
          }
        });
      }
      return {
        role,
        parts
      };
    });

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
            const textResponse = await ai.models.generateContent({
              model: "gemini-3.5-flash",
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
            const svgResponse = await ai.models.generateContent({
              model: "gemini-3.5-flash",
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
              const textResponse = await ai.models.generateContent({
                model: "gemini-3.5-flash",
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
    console.error("Chat Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with Gizmo chat." });
  }
});

// AI Core Status Check Diagnostics Endpoint
app.get("/api/ai-status", async (req, res) => {
  try {
    const keyExists = !!process.env.GEMINI_API_KEY;
    if (!keyExists) {
      res.json({
        configured: false,
        status: "Missing API Key",
        model: "Offline Fallback Mode",
        message: "No Gemini API key detected inside the system. Fallback responses will be simulated."
      });
      return;
    }

    // Try a very short fast probe call to verify the key works and check latency
    const ai = getGeminiClient();
    const startTime = Date.now();
    await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // lightweight verification probe
      contents: "ping",
    });
    const latency = Date.now() - startTime;

    res.json({
      configured: true,
      status: "Connected & Active ✅",
      model: "gemini-3.5-flash",
      latencyMs: latency,
      message: "Diagnostics clear! Gizmo's AI brain is fully powered and connected."
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
  try {
    const { topic, docText } = req.body;
    const topicToQuery = topic || "General Trivia";
    const additionalContext = docText ? `\nUse this raw text input for context: ${docText.substring(0, 4000)}` : "";

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
    console.error("Quiz Generator Error:", error);
    res.status(500).json({ error: error.message || "Could not generate questions." });
  }
});

// 3. Summarization Endpoint (supports paragraph, bullets, or humorous Gen-Z 'brainrot' translation)
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, format } = req.body;
    if (!text) {
      res.status(400).json({ error: "Text is required to summarize" });
      return;
    }

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
    console.error("Summarizer Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with summarization." });
  }
});

// 4. AI Study Notes Generator endpoint (Returns beautifully structured markdown study sheets)
app.post("/api/generate-notes-wizard", async (req, res) => {
  try {
    const { topic, category } = req.body;
    if (!topic) {
      res.status(400).json({ error: "Topic is required to generate study notes" });
      return;
    }

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
    console.error("Notes Wizard Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with Note generation." });
  }
});

// 5. AI Flashcards Generator endpoint (Returns a JSON array of front-and-back structured flashcards)
app.post("/api/generate-flashcards-wizard", async (req, res) => {
  try {
    const { topic, docText } = req.body;
    const topicToQuery = topic || "General Study";
    const context = docText ? `\nUse this context material to build flashcards: "${docText.substring(0, 4000)}"` : "";
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
    console.error("Flashcards Wizard Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with Flashcard generation." });
  }
});

// 6. AI Document Import Endpoint (Parses PDFs and other text files directly using Gemini multimodal)
app.post("/api/import-document-ai", async (req, res) => {
  try {
    const { filename, fileData, mimeType } = req.body;
    if (!fileData) {
      res.status(400).json({ error: "Missing uploaded file data." });
      return;
    }

    const ai = getGeminiClient();
    const cleanBase64 = fileData.replace(/^data:.*?;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
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
    console.error("Document Import General Error:", err);
    res.status(500).json({ error: err.message || "An error occurred while parsing research documents." });
  }
});

// 7. AI Note Custom Summarizer Actions Endpoint
app.post("/api/summarize-note-ai", async (req, res) => {
  try {
    const { noteTitle, noteContent, actionType } = req.body;
    if (!noteContent) {
      res.status(400).json({ error: "No note content was provided for analysis." });
      return;
    }

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
    console.error("Summarize Action Error:", err);
    res.status(500).json({ error: err.message || "An error occurred processing study actions." });
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
