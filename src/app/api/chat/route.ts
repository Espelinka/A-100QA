import { NextResponse } from "next/server";
import pb from "@/lib/pb";

export const maxDuration = 60; // Increase Vercel function timeout to 60 seconds

export async function POST(req: Request) {
  try {
    const { messages, documentId, title } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key is not configured" }, { status: 500 });
    }

    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    if (!pbUrl) {
      return NextResponse.json({ error: "PocketBase URL is not configured" }, { status: 500 });
    }

    // Fetch the extracted text directly from the database to avoid massive HTTP payloads from the frontend
    const records = await fetch(`${pbUrl}/api/collections/documents/records?filter=(title='${documentId}')`, { cache: 'no-store' });
    const data = await records.json();
    
    let contextText = "";
    if (data.items && data.items.length > 0) {
      contextText = data.items[0].extracted_text || "";
    }

    if (!contextText) {
      return NextResponse.json({ error: "Текст документа не найден в базе данных" }, { status: 400 });
    }

    const systemPrompt = `Ты — узкоспециализированный строительный эксперт-ассистент (Отдел качества А-100). Твоя задача — отвечать на вопросы пользователя ИСКЛЮЧИТЕЛЬНО на основе предоставленного ниже текста Строительных Правил (СП). Текущий раздел: "${title}".

Текст документа:
${contextText}

СТРОГИЕ ПРАВИЛА:
1. Если ответа нет в тексте, ты должен прямо сказать: 'В данном документе нет информации по этому вопросу'.
2. Тебе строго запрещено использовать свои знания из интернета или выдумывать ответы (никаких галлюцинаций).
3. При ответе всегда ссылайся на конкретный пункт в документе, из которого ты взял информацию (например, "согласно пункту 4.12...").
4. ВАЖНО: Если текст ссылается на таблицу или приложение (например, "значения указаны в таблице 2"), ты ОБЯЗАТЕЛЬНО должен найти эту таблицу в предоставленном тексте, извлечь оттуда конкретные цифры и привести их в своем ответе! Не заставляй пользователя самого искать таблицу. Пиши сами значения.
5. Будь краток, точен и профессионален.`;

    // Map messages format if needed
    const openRouterMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text
      }))
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://a-100qa.vercel.app", // Optional site URL
        "X-Title": "A-100 QA" // Optional site name
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Use Gemini 2.5 Flash for its massive 1M token context window
        messages: openRouterMessages,
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter API Error:", err);
      return NextResponse.json({ error: "Ошибка ответа от ИИ сервиса", details: err }, { status: response.status });
    }

    const resData = await response.json();
    return NextResponse.json({ text: resData.choices[0].message.content });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
