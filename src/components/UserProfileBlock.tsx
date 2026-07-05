import React, { useRef, useState } from 'react';
import { Camera, Edit2, Upload, Chrome, UserCircle } from 'lucide-react';
import { UserProfile } from '../types';
import ImageCropperModal from './ImageCropperModal';

interface UserProfileBlockProps {
  profile: UserProfile | null;
  onUpdateProfile?: (updates: Partial<UserProfile>) => void;
  editable?: boolean;
}

export default function UserProfileBlock({ profile, onUpdateProfile, editable = false }: UserProfileBlockProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  if (!profile) {
    return (
      <div className="flex items-center gap-6 p-6 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 rounded-3xl animate-pulse">
        <div className="w-20 h-20 rounded-full bg-stone-200 dark:bg-stone-800 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-32 bg-stone-200 dark:bg-stone-800 rounded-md" />
          <div className="h-4 w-24 bg-stone-200 dark:bg-stone-800 rounded-md" />
        </div>
      </div>
    );
  }

  const { firstName, lastName, photoUrl, isGoogle } = profile;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawImageSrc(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropped = (croppedBase64: string) => {
    if (onUpdateProfile) {
      onUpdateProfile({ photoUrl: croppedBase64 });
    }
    setRawImageSrc(null);
  };

  return (
    <div className="relative p-6 bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800/80 rounded-3xl flex items-center gap-6 shadow-xs select-none">
      {/* Avatar Container on the Left (un grand rond) */}
      <div className="relative shrink-0">
        <div 
          onClick={() => {
            if (editable) {
              fileInputRef.current?.click();
            }
          }}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden relative group flex items-center justify-center bg-stone-100 dark:bg-stone-850 border border-stone-200 dark:border-stone-800 ${
            editable ? 'cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20 transition-all' : ''
          }`}
        >
          {photoUrl ? (
            <img 
              src={photoUrl} 
              alt={`${firstName} ${lastName}`} 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-400 dark:text-stone-500">
              <UserCircle className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
          )}

          {/* Edit overlay */}
          {editable && (
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase tracking-wider">
              <Camera className="w-5 h-5 mb-1" />
              <span>Modifier</span>
            </div>
          )}
        </div>

        {/* Floating small Upload icon badge */}
        {editable && (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-lg border border-white dark:border-stone-900 cursor-pointer"
            title="Importer une photo"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Google badge integrated on the avatar for Google login */}
        {isGoogle && (
          <div 
            className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-stone-900 rounded-full shadow-md border border-stone-200 dark:border-stone-800 flex items-center justify-center"
            title="Synchronisé avec Google"
          >
            <Chrome className="w-4 h-4 text-indigo-500" />
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* User Information on the Right */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 truncate">
            {firstName}
          </h2>
          {isGoogle && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-900/30 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Compte Google
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm sm:text-base font-semibold text-stone-500 dark:text-stone-400 truncate">
            {lastName} {profile.preferredName ? `(${profile.preferredName})` : ''}
          </h3>
          {profile.pronoun && (
            <span className="text-xs text-indigo-500 font-medium">Pronom: {profile.pronoun === 'il' ? 'Il' : 'Elle'}</span>
          )}
        </div>
      </div>

      {/* Invisible/internal crop handler if active */}
      {rawImageSrc && (
        <ImageCropperModal
          imageSrc={rawImageSrc}
          onCrop={handleCropped}
          onClose={() => setRawImageSrc(null)}
        />
      )}
    </div>
  );
}
