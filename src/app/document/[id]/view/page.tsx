"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Maximize, ExternalLink } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export default function DocumentViewerPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL;
        if (!pbUrl) throw new Error("PocketBase URL is not configured");

        const res = await fetch(`${pbUrl}/api/collections/documents/records?filter=(title='${id}')`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
          const record = data.items[0];
          // Construct the PocketBase file URL
          const file = `${pbUrl}/api/files/${record.collectionId}/${record.id}/${record.pdf_file}`;
          setFileUrl(file);
        } else {
          setError("Файл для данного раздела не найден в базе данных");
        }
      } catch (err: any) {
        console.error("Error fetching document:", err);
        setError("Ошибка при загрузке документа");
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full bg-white shadow-sm z-50 px-4 py-3 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800 text-sm truncate max-w-[200px]">
            {id === 'shtukaturka' ? 'Штукатурные работы' : 'Документ'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {fileUrl && (
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-full flex items-center gap-1 text-xs font-medium"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </header>

      {/* PDF Container - using native iframe/embed for 100% stability */}
      <main className="flex-1 pt-[60px] w-full h-full bg-slate-100">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm">Загрузка из базы данных...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500 text-sm px-4 text-center">
            {error}
          </div>
        ) : fileUrl ? (
          <iframe 
            src={`${fileUrl}#toolbar=0&navpanes=0`} 
            className="w-full h-full border-none"
            title="PDF Viewer"
          />
        ) : null}
      </main>
    </div>
  );
}
