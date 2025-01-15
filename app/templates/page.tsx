'use client';

import TemplateManager from '../components/TemplateManager';

export default function TemplatesPage() {
  return (
    <div className="px-4 pt-4 pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Invoice Templates</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Manage your invoice templates here. Upload new templates or set your default template.</p>
      </div>
      
      <TemplateManager />
    </div>
  );
} 