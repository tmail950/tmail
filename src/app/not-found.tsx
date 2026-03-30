"use client";

import Link from "next/link";
import { MoveLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
      <div className="relative">
        <h1 className="text-9xl font-black text-white/5 tracking-tighter">404</h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-2xl font-black uppercase tracking-widest text-[var(--color-brand-pink)] drop-shadow-[0_0_15px_rgba(255,18,177,0.5)]">
            Signal Lost
          </p>
        </div>
      </div>
      <p className="text-gray-500 max-w-md font-medium">
        The requested transmission could not be found in the TMAIL.PK network. 
        The sequence may have expired or never existed.
      </p>
      <Link 
        href="/"
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all group"
      >
        <MoveLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Return to Source
      </Link>
    </div>
  );
}
