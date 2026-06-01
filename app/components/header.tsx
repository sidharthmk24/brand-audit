'use client';

import React from 'react';

export default function Header() {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <img src="/svgs/logo.svg" alt="Megamind Logo" className="h-6 w-auto" />
        </div>
      </div>
    </header>
  );
}
