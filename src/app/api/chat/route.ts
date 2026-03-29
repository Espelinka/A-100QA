import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, contextText, title } = await req.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key is not configured" }, { status: 500 });
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
        model: "openai/gpt-4o-mini",
        messages: openRouterMessages,
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter API Error:", err);
      return NextResponse.json({ error: "Ошибка ответа от ИИ сервиса" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ text: data.choices[0].message.content });
  } catch (error) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
  }
}
