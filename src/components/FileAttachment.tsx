import React from 'react';
import { FileText, FileImage, Presentation, File, Download } from 'lucide-react';
import { Attachment } from '../types';

interface FileAttachmentProps {
  attachment: Attachment;
  onRemove: () => void;
}

export default function FileAttachment({ attachment, onRemove }: FileAttachmentProps) {
  const getFileConfig = (type: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return {
        icon: FileImage,
        color: 'text-blue-500',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-900/50'
      };
    }
    if (type === 'application/pdf' || ext === 'pdf') {
      return {
        icon: FileText,
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-900/50'
      };
    }
    if (
      type.includes('presentation') || 
      ['ppt', 'pptx'].includes(ext || '')
    ) {
      return {
        icon: Presentation,
        color: 'text-orange-500',
        bg: 'bg-orange-50 dark:bg-orange-950/30',
        border: 'border-orange-200 dark:border-orange-900/50'
      };
    }
    
    return {
      icon: File,
      color: 'text-stone-500',
      bg: 'bg-stone-50 dark:bg-stone-900/50',
      border: 'border-stone-200 dark:border-stone-800'
    };
  };

  const config = getFileConfig(attachment.type, attachment.name);
  const Icon = config.icon;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="relative group">
      <a 
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        download={attachment.name}
        className={`flex items-center gap-3 p-3 rounded-xl border ${config.border} ${config.bg} hover:shadow-md transition-all cursor-pointer`}
      >
        <div className={`p-2 rounded-lg bg-white dark:bg-stone-900 shadow-sm ${config.color}`}>
          <Icon className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
            {attachment.name}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              {attachment.name.split('.').pop()}
            </span>
            <span className="w-1 h-1 rounded-full bg-stone-300 dark:bg-stone-700" />
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {formatSize(attachment.size)}
            </span>
          </div>
        </div>
        
        <div className="p-2 text-stone-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <Download className="w-4 h-4" />
        </div>
      </a>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-200 dark:hover:bg-red-900/80 z-10"
        title="Supprimer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
}
