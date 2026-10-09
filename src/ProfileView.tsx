import { useState, useRef } from 'react';
import type { User } from './types';
import { saveUserDoc } from './firestoreService';

type ProfileViewProps = {
  currentUser: User;
  onUpdateUser: (updatedUser: User) => void;
  onBack: () => void;
};

// 画像をアバターサイズに圧縮・リサイズする関数（最大128px四方、品質0.75）
const resizeAndCompressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 128;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context is not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
        resolve(compressedDataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function ProfileView({ currentUser, onUpdateUser, onBack }: ProfileViewProps) {
  const [nickname, setNickname] = useState(currentUser.name || '');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentUser.avatarUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const defaultUsername = currentUser.email ? currentUser.email.split('@')[0] : (currentUser.username || 'user');

  // 変更があるかどうかを判定
  const hasChanges = nickname.trim() !== (currentUser.name || '') || avatarPreview !== currentUser.avatarUrl;

  const handleClose = async () => {
    if (hasChanges && nickname.trim()) {
      setIsSaving(true);
      try {
        const updatedUser: User = {
          ...currentUser,
          name: nickname.trim(),
          username: defaultUsername,
          avatarUrl: avatarPreview
        };

        await saveUserDoc(updatedUser);
        onUpdateUser(updatedUser);
      } catch (error) {
        console.error('プロフィールの自動保存に失敗しました:', error);
        alert('保存に失敗しました。');
      } finally {
        setIsSaving(false);
      }
    }
    onBack();
  };

  const handleCopyUid = () => {
    navigator.clipboard.writeText(currentUser.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedImage = await resizeAndCompressImage(file);
      setAvatarPreview(compressedImage);
    } catch (error) {
      console.error('画像の処理に失敗しました:', error);
      alert('画像の処理に失敗しました。別の画像をお試しください。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div 
        className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <span className="font-extrabold text-gray-800 text-lg">プロフィール設定</span>
        </div>

        <div className="p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col items-center gap-3 pb-6 border-b border-gray-100 text-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="avatar"
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-600 text-white font-black text-3xl flex items-center justify-center shadow-md group-hover:opacity-80 transition-opacity">
                  {nickname ? nickname.charAt(0) : 'U'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                📷 変更
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 transition-colors cursor-pointer"
            >
              写真を選択・変更する
            </button>

            <div>
              <h2 className="text-xl font-extrabold text-gray-800">{nickname || currentUser.name}</h2>
              <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">@{defaultUsername}</p>
              <p className="text-xs font-medium text-gray-400 mt-0.5">{currentUser.email || 'メールアドレス未設定'}</p>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-500">あなたの Google UID</span>
              <button
                type="button"
                onClick={handleCopyUid}
                className={`text-xs font-bold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  copied ? 'bg-green-600 text-white shadow-xs' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {copied ? '✓ コピー完了' : 'UIDをコピー'}
              </button>
            </div>
            <p className="font-mono text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-200 break-all select-all">
              {currentUser.id}
            </p>
            <p className="text-[11px] text-gray-400 leading-tight">
              ※ プロジェクトに直接招待してもらう際に相手へ伝えるIDです。
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                表示名（ニックネーム） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-800"
                placeholder="例: たろう / Taro"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">ユーザーID（@ユーザー名）</label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 text-sm font-bold">@</span>
                <input
                  type="text"
                  disabled
                  value={defaultUsername}
                  className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3 pl-7 outline-none text-sm font-medium font-mono text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">※ メールアドレスの「@」より前のアカウント名が自動的に設定されます。</p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving || !nickname.trim()}
                className={`w-full py-3.5 font-bold rounded-2xl shadow-sm transition-all cursor-pointer ${
                  hasChanges 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]' 
                    : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                } disabled:opacity-50`}
              >
                {isSaving ? '保存中...' : hasChanges ? '保存して閉じる' : '閉じる'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}