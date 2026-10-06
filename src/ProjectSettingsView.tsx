import { useState } from 'react';
import type { Project, ConfirmOptions } from './types';

type ProjectSettingsViewProps = {
  project: Project;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onBackToHome: () => void;
  requestConfirm: (options: ConfirmOptions) => void;
};

export default function ProjectSettingsView({ project, projects, setProjects, onBackToHome, requestConfirm }: ProjectSettingsViewProps) {
  const [projectName, setProjectName] = useState(project.name);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setErrorMessage('プロジェクト名を入力してください');
      return;
    }

    setIsSaving(true);

    try {
      setProjects(projects.map(p => p.id === project.id ? { ...p, name: trimmedName } : p));
      setSuccessMessage('設定を保存しました');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch {
      setErrorMessage('保存に失敗しました。通信状況を確認して再度お試しください。');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = () => {
    setErrorMessage('');
    requestConfirm({
      title: 'プロジェクトの削除',
      message: `本当にプロジェクト「${project.name}」を削除しますか？\n紐づくタスク、予算、メモなどのデータはすべて失われます。`,
      confirmText: '削除する',
      isDanger: true,
      onConfirm: async () => {
        try {
          setProjects(projects.filter(p => p.id !== project.id));
          onBackToHome();
        } catch {
          setErrorMessage('プロジェクトの削除に失敗しました。');
        }
      }
    });
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-6 relative">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        
        <div className="flex items-center gap-2 text-xl font-bold text-gray-800 border-b pb-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          プロジェクト設定
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
            <span>⚠</span> {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in fade-in duration-200 shadow-sm">
            <span>✓</span> {successMessage}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-gray-800 text-base mb-4">プロジェクト名の変更</h3>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">プロジェクト名</label>
              <input 
                type="text" 
                value={projectName}
                onChange={e => { setProjectName(e.target.value); setSuccessMessage(''); setErrorMessage(''); }}
                className="w-full border border-gray-300 rounded-xl p-3 font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none text-base"
                required
                disabled={isSaving}
              />
            </div>
            <div className="flex justify-end">
              <button 
                type="submit" 
                disabled={isSaving}
                className={`font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm ${
                  isSaving ? 'bg-blue-400 cursor-not-allowed text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSaving ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
          <h3 className="font-bold text-red-600 text-base mb-2">危険なエリア</h3>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            一度プロジェクトを削除すると、すべてのデータが完全に失われます。慎重に行ってください。
          </p>
          <div className="flex justify-start">
            <button 
              type="button" 
              onClick={handleDeleteProject}
              disabled={isSaving}
              className={`font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm ${
                isSaving ? 'bg-red-50 text-red-300 border border-red-100 cursor-not-allowed' : 'bg-red-50 hover:bg-red-100 border border-red-300 text-red-600'
              }`}
            >
              このプロジェクトを削除
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}