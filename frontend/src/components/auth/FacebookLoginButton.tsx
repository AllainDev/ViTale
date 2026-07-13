'use client';
import React from 'react';

export default function FacebookLoginButton({ label }: { label: string }) {
  // We use standard backend-driven OAuth code flow now to avoid implicit flow bugs
  // and Facebook HTTP limitations
  return (
    <a href="http://localhost:5000/api/v1/auth/login/Facebook" className="flex items-center justify-center gap-2 py-2.5 border border-stone-200 rounded-full hover:bg-stone-50 transition-colors w-full">
      <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 9.882 11.854v-8.385H7.078v-3.469h2.804V9.43c0-2.775 1.657-4.291 4.17-4.291 1.213 0 2.48.217 2.48.217v2.727h-1.396c-1.376 0-1.804.854-1.804 1.728v2.261h3.064l-.49 3.469h-2.574v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      <span className="font-bold text-stone-600">{label}</span>
    </a>
  );
}
