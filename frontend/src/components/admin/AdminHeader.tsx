'use client';

import { Menu, Search, UserCircle } from 'lucide-react';

export default function AdminHeader() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <form className="hidden md:flex relative" onSubmit={(e) => e.preventDefault()}>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search..." 
            className="pl-9 pr-4 py-1.5 bg-gray-100 border-transparent rounded-md text-sm focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none"
          />
        </form>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 p-1.5 px-3 rounded-md text-sm font-medium text-gray-700 select-none">
          <UserCircle className="w-5 h-5 text-gray-400" />
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
}
