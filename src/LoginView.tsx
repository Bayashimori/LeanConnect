import { useState, useRef } from 'react';
import { auth, googleProvider, signInWithPopup } from './firebase';
import { getUserDoc, saveUserDoc } from './firestoreService';
import type { User } from './types';

type LoginViewProps = {
  onLogin: (user: User) => void;
};

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

export default function LoginView({ onLogin }: LoginViewProps) {
  const [step, setStep] = useState<'login' | 'register'>('login');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const existingUser = await getUserDoc(firebaseUser.uid);

      if (existingUser && existingUser.name) {
        onLogin(existingUser);
      } else {
        const defaultHandle = firebaseUser.email ? firebaseUser.email.split('@')[0] : 'user';
        const initialUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          username: defaultHandle,
          email: firebaseUser.email || undefined,
          avatarUrl: firebaseUser.photoURL || undefined
        };
        setPendingUser(initialUser);
        setNickname(firebaseUser.displayName || '');
        setAvatarPreview(firebaseUser.photoURL || undefined);
        setStep('register');
      }
    } catch (error) {
      console.error('Googleログインに失敗しました', error);
      alert('ログインに失敗しました。ポップアップがブロックされていないか確認してください。');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await resizeAndCompressImage(file);
      setAvatarPreview(compressed);
    } catch (error) {
      console.error('画像処理エラー:', error);
      alert('画像の処理に失敗しました。');
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUser || !nickname.trim()) return;

    setIsSubmitting(true);
    try {
      const finalizedUser: User = {
        ...pendingUser,
        name: nickname.trim(),
        username: pendingUser.username,
        avatarUrl: avatarPreview,
        createdAt: Date.now()
      };

      await saveUserDoc(finalizedUser);
      onLogin(finalizedUser);
    } catch (error) {
      console.error('ユーザー登録に失敗しました', error);
      alert('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center gap-6">
        
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-800">
            Lean<span className="text-blue-600">Connect</span>
          </h1>
        </div>

        {step === 'login' ? (
          <div className="w-full flex flex-col gap-5 mt-2">
            <div>
              <h2 className="text-lg font-bold text-gray-700">ようこそ</h2>
              <p className="text-xs text-gray-400 mt-1">Googleアカウントでログインまたは新規会員登録</p>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="w-full py-3.5 px-4 border border-gray-200 rounded-2xl font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Googleアカウントでログイン
            </button>
            <p className="text-[11px] text-gray-400">
              ログインすることで
              <a href={`${import.meta.env.BASE_URL}terms.html`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mx-0.5">利用規約</a>
              に同意したものとみなされます
            </p>
            <p className="text-[11px] text-gray-400 -mt-3">
              <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">プライバシーポリシー</a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleCompleteRegistration} className="w-full flex flex-col gap-4 text-left">
            <div className="text-center pb-2 border-b border-gray-100">
              <h2 className="text-base font-extrabold text-gray-800">アカウント作成 (初期設定)</h2>
              <p className="text-xs text-gray-400 mt-0.5">LeanConnect内で表示される名前・写真を設定してください</p>
            </div>

            <div className="flex flex-col items-center gap-2 my-1">
              <div
                className="relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-20 h-20 rounded-full border-2 border-white shadow-md object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
                    {nickname ? nickname.charAt(0) : 'U'}
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold">
                  📷 写真変更
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
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                アイコン写真を設定する
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">表示名（ニックネーム） <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required 
                value={nickname} 
                onChange={e => setNickname(e.target.value)} 
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
                  value={pendingUser?.username || ''} 
                  className="w-full border border-gray-200 bg-gray-100 rounded-xl p-3 pl-7 outline-none text-sm font-medium font-mono text-gray-500 cursor-not-allowed" 
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">※ メールアドレスに基づいて自動発行されます</p>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting || !nickname.trim()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? '登録中...' : 'アカウントを作成して始める'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}