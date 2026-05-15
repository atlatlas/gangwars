"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, X } from "lucide-react";
import { profile as profileApi } from "@/lib/api";
import { compressImage } from "@/lib/imageUtils";
import { useTopNotification } from "@/components/TopNotification";

interface Props {
  currentAvatar: string | null;
  onUpdate: (url: string | null) => void;
  onClose: () => void;
}

const PRESET_PROFILES = [
  { url: "/profiles/profile1.png", name: "The Street Kid" },
  { url: "/profiles/profile2.png", name: "The Enforcer" },
  { url: "/profiles/profile3.png", name: "The Fixer" },
  { url: "/profiles/profile4.png", name: "The Kingpin" },
  { url: "/profiles/profile5.png", name: "The Hacker" },
  { url: "/profiles/profile6.png", name: "The Dealer" },
  { url: "/profiles/profile7.png", name: "The Muscle" },
  { url: "/profiles/profile8.png", name: "The Ghost" },
];

export default function AvatarPicker({ currentAvatar, onUpdate, onClose }: Props) {
  const { showNotification } = useTopNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(currentAvatar);

  const handleSelectPreset = async (url: string) => {
    setSelected(url);
    try {
      await profileApi.avatar(url);
      onUpdate(url);
      showNotification("Profile picture updated!", "success");
    } catch (err: any) {
      showNotification(err?.message || "Failed to set profile picture", "error");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressImage(file, 256, 0.8);
      await profileApi.avatar(dataUrl);
      onUpdate(dataUrl);
      showNotification("Profile picture uploaded!", "success");
      onClose();
    } catch (err: any) {
      showNotification(err?.message || "Failed to upload image", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setSelected(null);
    try {
      await profileApi.avatar(null);
      onUpdate(null);
      showNotification("Profile picture removed", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-bg-card border border-white/10 rounded-sm w-full max-w-lg mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-xs font-mono uppercase tracking-wider text-white/70">Choose Profile Picture</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Presets grid */}
        <div className="p-4">
          <p className="text-[10px] font-mono text-text-muted/40 uppercase tracking-wider mb-3">Presets</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {PRESET_PROFILES.map((p) => (
              <button
                key={p.url}
                onClick={() => handleSelectPreset(p.url)}
                className={`group rounded-sm overflow-hidden border-2 transition-all ${
                  selected === p.url
                    ? "border-neon-cyan shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                    : "border-white/5 hover:border-white/20"
                }`}
              >
                <div className="aspect-square relative">
                  <Image
                    src={p.url}
                    alt={p.name}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[8px] font-mono text-text-muted/40 text-center py-1 truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/5" />

        {/* Upload + Remove */}
        <div className="p-4 flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-sm bg-neon-navy/20 text-neon-navy border border-neon-navy/30 hover:bg-neon-navy/30 transition-all"
          >
            <Camera size={12} />
            {uploading ? "Uploading..." : "Upload Custom"}
          </button>

          {currentAvatar && (
            <button
              onClick={handleRemove}
              className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider rounded-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all"
            >
              Remove
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      </div>
    </div>
  );
}
