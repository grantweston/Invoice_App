'use client';

import TemplateManager from '../components/TemplateManager';

export default function TemplatesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Templates</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your invoice templates here. Upload new templates or set your default template.</p>
      </div>
      
      <TemplateManager />
    </div>
  );
} 