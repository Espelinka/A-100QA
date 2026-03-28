"use client";

import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set worker path to local public folder or unpkg for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ file, scale }: { file: string, scale: number }) {
  const [numPages, setNumPages] = useState<number>();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <Document
      file={file}
      onLoadSuccess={onDocumentLoadSuccess}
      loading={
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm">Загрузка документа...</p>
        </div>
      }
      error={
        <div className="text-center py-20 text-red-500 text-sm">
          Ошибка загрузки PDF файла. Убедитесь, что файл существует.
        </div>
      }
    >
      {Array.from(new Array(numPages || 0), (el, index) => (
        <div key={`page_${index + 1}`} className="mb-4 shadow-md bg-white">
          <Page 
            pageNumber={index + 1} 
            scale={scale} 
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="max-w-full"
            width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 32, 800) : 800}
          />
        </div>
      ))}
    </Document>
  );
}
