"use client";

import { useEffect, useState, memo } from "react";
import Link from "next/link";
import { domainService } from "@/services/domainService";

const Footer = memo(() => {
  const [copyright, setCopyright] = useState("TMAIL.PK. All Rights Reserved.");

  useEffect(() => {
    domainService.getSettings().then(settings => {
      if (settings.copyright_text) setCopyright(settings.copyright_text);
    });
  }, []);

  return (
    <footer className="w-full py-8 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-sm px-4">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-8 text-gray-500 text-[10px] uppercase font-bold tracking-[0.2em] mb-2">
            <Link href="/privacy" className="hover:text-[var(--color-brand-pink)] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[var(--color-brand-pink)] transition-colors">Terms of Service</Link>
            <Link href="/safety" className="hover:text-[#ff12b1] transition-colors">Safety Clause</Link>
            <Link href="/admin" className="hover:text-[var(--color-brand-pink)] transition-colors">Portal Access</Link>
        </div>
        
        <div className="text-center space-y-2">
          <p className="text-sm font-black tracking-widest text-white/40 uppercase">
            {(!copyright.includes("©") && !copyright.includes("&copy;")) && <span>&copy; {new Date().getFullYear()} </span>}
            {copyright}
          </p>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            Handcrafted with precision by{" "}
            <a 
              href="https://369aiventures.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[var(--color-brand-pink)] hover:brightness-125 underline decoration-dotted underline-offset-4 transition-all"
            >
              369AIVentures.com
            </a>
          </p>
        </div>

        <div className="flex items-center gap-2 mt-2 opacity-30 group">
            <div className="w-8 h-[1px] bg-white/5 group-hover:w-16 transition-all duration-700"></div>
            <div className="w-1 h-1 rounded-full bg-[var(--color-brand-pink)] shadow-[0_0_8px_rgba(0,210,255,0.8)]"></div>
            <div className="w-8 h-[1px] bg-white/5 group-hover:w-16 transition-all duration-700"></div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";
export default Footer;
