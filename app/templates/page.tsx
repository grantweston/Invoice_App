'use client';

import TemplateManager from '../components/TemplateManager';

export default function TemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Invoice Templates</h1>
        <p className="text-gray-400 text-lg">Manage your invoice templates here. Upload new templates or set your default template.</p>
      </div>
      
      <TemplateManager />
    </div>
  );
} 