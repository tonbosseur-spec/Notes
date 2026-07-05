import React, { useRef } from 'react';
import { Paperclip, Plus } from 'lucide-react';
import { Attachment } from '../types';
import FileAttachment from './FileAttachment';
import AudioPlayer from './AudioPlayer';
import { generateUUID } from '../lib/utils';

interface AttachmentsListProps {
  attachments: Attachment[];
  onUpdate: (attachments: Attachment[]) => void;
}

export default function AttachmentsList({ attachments, onUpdate }: AttachmentsListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const newAttachment: Attachment = {
          id: generateUUID(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          url: base64
        };
        onUpdate([...attachments, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onUpdate(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="mt-8 border-t border-stone-200 dark:border-stone-800 pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Paperclip className="w-4 h-4" />
          Pièces jointes {attachments.length > 0 && `(${attachments.length})`}
        </h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter
        </button>
      </div>

      <input 
        id="attachment-file-input"
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple 
        accept="audio/*,image/*,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
      />

      {attachments.length === 0 ? (
        <div className="text-center py-6 bg-stone-50 dark:bg-stone-900/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
          <p className="text-sm text-stone-500 dark:text-stone-400">Aucune pièce jointe. Cliquez sur Ajouter pour insérer un fichier.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {attachments.map(att => {
            if (att.type.startsWith('audio/')) {
              return (
                <AudioPlayer 
                  key={att.id} 
                  attachment={att} 
                  onRemove={() => handleRemove(att.id)} 
                />
              );
            }
            return (
              <FileAttachment 
                key={att.id} 
                attachment={att} 
                onRemove={() => handleRemove(att.id)} 
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
