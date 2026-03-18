import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function parseGleephText(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract a list of books from the following text copied from a Gleeph shelf. 
    Return a JSON array of objects with "title" and "author" properties.
    Ignore any text that isn't a book title or author.
    
    Text:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
          },
          required: ["title", "author"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return [];
  }
}

export async function parseGleephImage(base64Image: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          data: base64Image.split(',')[1] || base64Image,
          mimeType: mimeType,
        },
      },
      {
        text: `Extract a list of books from this screenshot of a Gleeph shelf. 
        Return a JSON array of objects with "title" and "author" properties.
        Only include books that are clearly visible.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            author: { type: Type.STRING },
          },
          required: ["title", "author"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response:", e);
    return [];
  }
}
