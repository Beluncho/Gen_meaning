import { GoogleGenAI, Type } from "@google/genai";
import { TransformationParams, TransformationResult } from "../types";
import { SYSTEM_PROMPT, GOALS, AUDIENCES, TONALITIES, FORMALITIES, LENGTHS } from "../constants";

export const transformText = async (
  text: string,
  params: TransformationParams,
  apiKey: string
): Promise<TransformationResult> => {
  if (!apiKey) {
    throw new Error("API-ключ не задан. Пожалуйста, введите его в настройках.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Исходный текст: ${text}
    
    Выбранные параметры:
    - Цель: ${GOALS[params.goal].label} (${GOALS[params.goal].description})
    - Аудитория: ${AUDIENCES[params.audience].label} (${AUDIENCES[params.audience].description})
    - Тональность: ${TONALITIES[params.tonality].label} (${TONALITIES[params.tonality].description})
    - Формальность: ${FORMALITIES[params.formality]}
    - Длина: ${LENGTHS[params.length]}
    - Упрощение терминов: ${params.simplifyTerms ? 'Да' : 'Нет'}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adapted: { type: Type.STRING },
            neutral: { type: Type.STRING },
            changes: { type: Type.STRING },
          },
          required: ["adapted", "neutral", "changes"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("AI вернул пустой ответ");
    }

    return JSON.parse(resultText) as TransformationResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("API_KEY_INVALID")) {
      throw new Error("Неверный API-ключ. Проверьте настройки.");
    }
    if (error.message?.includes("User location is not supported")) {
        throw new Error("API Gemini недоступно в вашем регионе без VPN.");
    }
    throw new Error(`Ошибка API: ${error.message || "Неизвестная ошибка"}`);
  }
};
