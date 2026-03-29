import { NextResponse } from "next/server";
import pb from "@/lib/pb";
import { upsertDocumentToPinecone } from "@/lib/rag";

export const maxDuration = 60; // 60 seconds limit on Vercel

export async function POST(req: Request) {
  try {
    const { title } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Необходим параметр title" }, { status: 400 });
    }

    const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
    const adminEmail = process.env.POCKETBASE_ADMIN_EMAIL;
    const adminPassword = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!pbUrl || !adminEmail || !adminPassword) {
      return NextResponse.json({ error: "Не настроены ключи администратора PocketBase в .env" }, { status: 500 });
    }

    // 1. Авторизация как админ
    await pb.admins.authWithPassword(adminEmail, adminPassword);

    // 2. Ищем документ по title
    const records = await pb.collection("documents").getList(1, 1, {
      filter: `title='${title}'`
    });

    if (records.items.length === 0) {
      return NextResponse.json({ error: "Документ не найден" }, { status: 404 });
    }

    const record = records.items[0];

    if (!record.pdf_file) {
      return NextResponse.json({ error: "У документа нет прикрепленного PDF файла" }, { status: 400 });
    }

    // 3. Получаем URL файла и скачиваем его во временный буфер
    const fileUrl = `${pbUrl}/api/files/${record.collectionId}/${record.id}/${record.pdf_file}`;
    console.log("Скачиваем PDF для парсинга:", fileUrl);
    
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json({ error: "Не удалось скачать PDF файл" }, { status: 500 });
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 4. Парсим PDF с помощью pdf-parse
    // Динамический импорт чтобы обойти строгую проверку Next.js Webpack
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim() === "") {
      return NextResponse.json({ error: "Не удалось извлечь текст из PDF (возможно, это сканы без распознавания)" }, { status: 400 });
    }

    // 5. RAG: Нарезаем текст и загружаем в Pinecone (Векторная база)
    try {
      await upsertDocumentToPinecone(title, extractedText);
    } catch (pineconeErr: any) {
      console.error("Ошибка при сохранении в Pinecone:", pineconeErr);
      // Временно пробрасываем ошибку Pinecone в UI для дебага на Vercel
      return NextResponse.json({ error: "Pinecone Error: " + (pineconeErr.message || String(pineconeErr)) }, { status: 500 });
    }

    // 6. Сохраняем извлеченный текст обратно в PocketBase (на всякий случай как бэкап)
    await pb.collection("documents").update(record.id, {
      extracted_text: extractedText
    });

    // Очищаем сессию админа
    pb.authStore.clear();

    return NextResponse.json({ 
      success: true, 
      message: "Текст успешно извлечен и сохранен", 
      pages: pdfData.numpages,
      textLength: extractedText.length 
    });

  } catch (error: any) {
    console.error("Ошибка парсинга PDF:", error);
    pb.authStore.clear();
    return NextResponse.json({ error: "Внутренняя ошибка сервера", details: error.message }, { status: 500 });
  }
}
