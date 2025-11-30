
import React, { useRef } from 'react';
import { extractTextFromPdf, chunkText } from '../services/pdfService';
import { Book } from '../types';
import { saveBook } from '../services/dbService';
import { MAX_CHUNK_LENGTH } from '../constants';

interface Props {
  onBookSelected: (book: Book) => void;
  onDeleteBook: (id: string) => void;
  savedBooks: Book[];
}

const Library: React.FC<Props> = ({ onBookSelected, onDeleteBook, savedBooks }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else if (file.type === 'text/plain') {
        text = await file.text();
      } else {
        alert("Unsupported file type. Please upload PDF or TXT.");
        return;
      }

      // Use constant MAX_CHUNK_LENGTH for optimal TTS performance
      const chunks = chunkText(text, MAX_CHUNK_LENGTH);
      
      const newBook: Book = {
        id: Date.now().toString(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: text,
        chunks,
        lastPosition: 0,
        createdAt: Date.now()
      };

      await saveBook(newBook);
      onBookSelected(newBook);

    } catch (err) {
      console.error(err);
      alert("Error reading file: " + (err as Error).message);
    }
  };

  const handleDrivePick = () => {
    const mockBook: Book = {
      id: 'drive-mock-1',
      title: 'Google Drive Document (Demo)',
      content: 'Demo',
      chunks: [
        { id: 0, text: 'This is a simulated document imported from Google Drive.' },
        { id: 1, text: 'In a production environment, this would open the Google Picker API with OAuth 2.0 to securely select files from your account.' },
        { id: 2, text: 'The text-to-speech engine would then process the content seamlessly.' }
      ],
      lastPosition: 0,
      createdAt: Date.now()
    };
    saveBook(mockBook).then(() => onBookSelected(mockBook));
    alert("Simulating Google Drive selection (Mock Mode)");
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <header className="mb-12 text-center">
            <h1 className="text-5xl font-display font-bold text-amber-500 mb-4 tracking-tight">Lumina Reader</h1>
            <p className="text-zinc-400 text-lg font-light">Professional Text-to-Speech powered by Gemini AuraVox</p>
        </header>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="group p-8 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-amber-500/50 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-4 text-center h-48"
            >
                <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-amber-500 text-amber-500 group-hover:text-zinc-900 flex items-center justify-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-medium text-white mb-1">Upload Local File</h3>
                    <p className="text-zinc-500 text-sm">PDF or TXT supported</p>
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.txt" className="hidden" />
            </div>

            <div 
                onClick={handleDrivePick}
                className="group p-8 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-blue-500/50 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-4 text-center h-48"
            >
                <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-blue-500 text-blue-500 group-hover:text-white flex items-center justify-center transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.01 1.986C8.84 1.986 6.07 3.326 4.05 5.486L6.5 9.736L12.02 1.986ZM12.01 1.986L18.78 13.736L21.23 9.486C21.43 9.136 21.56 8.736 21.56 8.286C21.56 4.806 18.74 1.986 15.26 1.986H12.01ZM4.05 5.486C3.06 7.196 2.5 9.176 2.5 11.286C2.5 16.736 6.47 21.286 11.69 22.186L14.71 16.936L4.05 5.486ZM12.01 22.286C16.89 22.286 20.93 18.736 21.5 14.036H15.69L12.01 22.286Z"/>
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-medium text-white mb-1">Google Drive</h3>
                    <p className="text-zinc-500 text-sm">Import from cloud</p>
                </div>
            </div>
        </div>

        {/* Recent Files */}
        <div>
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Continue Reading</h2>
            <div className="grid grid-cols-1 gap-4">
                {savedBooks.length === 0 ? (
                    <p className="text-zinc-600 italic">No recent books.</p>
                ) : (
                    savedBooks.map(book => {
                        const progress = book.chunks.length > 0 
                            ? Math.round(((book.lastPosition || 0) / book.chunks.length) * 100) 
                            : 0;

                        return (
                            <div key={book.id} onClick={() => onBookSelected(book)} className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-zinc-800 hover:border-amber-500/30 cursor-pointer transition group relative overflow-hidden">
                                {/* Progress Bar Background */}
                                <div 
                                    className="absolute bottom-0 left-0 h-1 bg-amber-500/50 transition-all duration-1000" 
                                    style={{ width: `${progress}%` }}
                                ></div>

                                <div className="flex items-center gap-4 z-10 overflow-hidden">
                                    <div className="w-12 h-12 flex-shrink-0 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 font-serif text-xl group-hover:text-amber-500 transition-colors">
                                        {book.title.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-white font-medium text-lg truncate pr-4">{book.title}</h3>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {book.chunks.length} sections • {new Date(book.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="z-10 flex items-center gap-4 flex-shrink-0">
                                    {progress > 0 && (
                                        <div className="text-right flex flex-col justify-center">
                                            <span className="text-lg font-bold text-amber-500 leading-none">{progress}%</span>
                                            <span className="text-[9px] uppercase font-bold text-zinc-600">Leído</span>
                                        </div>
                                    )}
                                    <div className="w-12 h-12 rounded-full bg-zinc-800 group-hover:bg-amber-500 text-zinc-500 group-hover:text-zinc-900 flex items-center justify-center transition shadow-lg border border-zinc-700 group-hover:border-amber-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 ml-1" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    </div>
                                    
                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteBook(book.id);
                                        }}
                                        className="w-10 h-10 rounded-full bg-zinc-800/50 hover:bg-red-500/20 text-zinc-600 hover:text-red-500 flex items-center justify-center transition border border-transparent hover:border-red-500/30 ml-2"
                                        title="Delete Book"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default Library;
