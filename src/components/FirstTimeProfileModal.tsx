import React, { useState, useRef } from 'react';
import { User, Camera, ArrowRight, Upload, Sparkles } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';

interface FirstTimeProfileModalProps {
  onSave: (profileData: { firstName: string; lastName: string; photoUrl: string | null }) => void;
}

export default function FirstTimeProfileModal({ onSave }: FirstTimeProfileModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Crop related states
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setPhotoUrl(croppedBase64);
    setRawImageSrc(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Veuillez renseigner votre prénom et votre nom.");
      return;
    }
    onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      photoUrl
    });
  };

  return (
    <div className="fixed inset-0 bg-stone-900/50 dark:bg-stone-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden space-y-6">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl mb-1">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
            Créer votre profil
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Personnalisez votre espace avec votre nom et une photo pour une expérience sur mesure.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200/40 dark:border-red-900/40 rounded-xl text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar upload section */}
          <div className="flex flex-col items-center space-y-2">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-md group-hover:opacity-80 transition-all"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-stone-100 dark:bg-stone-800 border-2 border-dashed border-stone-300 dark:border-stone-700 flex flex-col items-center justify-center text-stone-400 dark:text-stone-500 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-all">
                  <Camera className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Photo</span>
                </div>
              )}
              
              <div className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg border border-white dark:border-stone-900">
                <Upload className="w-3.5 h-3.5" />
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
            <span className="text-[11px] text-stone-400 dark:text-stone-500">
              Cliquez pour importer depuis votre galerie
            </span>
          </div>

          {/* Name inputs */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Prénom</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex. Jean"
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">Nom</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex. Dupont"
                className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:border-indigo-500 text-sm transition-colors"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            <span>Commencer à explorer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Render internal cropper overlay if a raw image is loaded */}
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
