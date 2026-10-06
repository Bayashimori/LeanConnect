import { useState } from 'react';
import type { Memo, User, Member, ConfirmOptions, Reaction } from './types';

type MemoViewProps = {
  activeProjectId: string;
  memos: Memo[];
  setMemos: (memos: Memo[]) => void;
  members: Member[];
  currentUser: User;
  isReadOnly?: boolean;
  requestConfirm: (options: ConfirmOptions) => void;
};

const STAMP_TEMPLATES = ['👍', '❤️', '🎉', '👀', '🚀', '🙏', '👏', '🔥'];

export default function MemoView({
  activeProjectId,
  memos,
  setMemos,
  members,
  currentUser,
  isReadOnly = false,
  requestConfirm
}: MemoViewProps) {
  const [newMemoContent, setNewMemoContent] = useState('');
  const [activePickerMemoId, setActivePickerMemoId] = useState<string | null>(null);

  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoContent.trim()) return;

    const newMemo: Memo = {
      id: `memo_${Date.now()}`,
      projectId: activeProjectId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorIcon: currentUser.avatarUrl,
      authorColor: currentUser.color || 'bg-blue-600',
      content: newMemoContent.trim(),
      reactions: [],
      createdAt: Date.now()
    };

    setMemos([...memos, newMemo]);
    setNewMemoContent('');
  };

  const handleDeleteMemo = (memoId: string) => {
    if (isReadOnly) return;
    requestConfirm({
      title: 'メモの削除',
      message: 'このメッセージを削除しますか？\n（削除したメッセージは元に戻せません）',
      confirmText: '削除する',
      isDanger: true,
      onConfirm: () => {
        setMemos(memos.filter((m) => m.id !== memoId));
      }
    });
  };

  const handleToggleReaction = (memoId: string, emoji: string) => {
    const updatedMemos = memos.map((memo) => {
      if (memo.id !== memoId) return memo;

      const currentReactions = memo.reactions || [];
      const existingReactionIndex = currentReactions.findIndex((r) => r.text === emoji);

      let nextReactions: Reaction[];

      if (existingReactionIndex > -1) {
        const target = currentReactions[existingReactionIndex];
        const userIds = target.userIds || [];
        const hasReacted = userIds.includes(currentUser.id);

        if (hasReacted) {
          const nextUserIds = userIds.filter((uid) => uid !== currentUser.id);
          if (nextUserIds.length === 0) {
            nextReactions = currentReactions.filter((r) => r.text !== emoji);
          } else {
            nextReactions = currentReactions.map((r, idx) =>
              idx === existingReactionIndex ? { ...r, count: nextUserIds.length, userIds: nextUserIds } : r
            );
          }
        } else {
          const nextUserIds = [...userIds, currentUser.id];
          nextReactions = currentReactions.map((r, idx) =>
            idx === existingReactionIndex ? { ...r, count: nextUserIds.length, userIds: nextUserIds } : r
          );
        }
      } else {
        nextReactions = [...currentReactions, { text: emoji, count: 1, userIds: [currentUser.id] }];
      }

      return { ...memo, reactions: nextReactions };
    });

    setMemos(updatedMemos);
    setActivePickerMemoId(null);
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-gray-100/70 relative font-sans overflow-hidden"
      onClick={() => setActivePickerMemoId(null)}
    >
      <div className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-2 font-black text-gray-800 text-base">
          <span className="text-xl">💬</span>
          <span>共有メモ・チャット</span>
          <span className="text-xs font-bold text-gray-400 ml-1">({memos.length}件)</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 flex flex-col gap-5">
        {memos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl">
              📝
            </div>
            <p className="font-extrabold text-sm">共有メモはまだありません</p>
            <p className="text-xs text-gray-400">メッセージや注意事項を書き込んで共有しましょう！</p>
          </div>
        ) : (
          memos.map((memo) => {
            const isMe = memo.authorId === currentUser.id;

            const matchedMember = members.find((m) => m.id === memo.authorId);
            const authorDisplayName = isMe
              ? 'あなた'
              : matchedMember?.name || memo.authorName || 'メンバー';
            const authorAvatar = isMe
              ? currentUser.avatarUrl
              : matchedMember?.avatarUrl || memo.authorIcon;
            const authorBadgeColor = isMe
              ? 'bg-blue-600'
              : matchedMember?.color || memo.authorColor || 'bg-gray-500';

            const isPickerOpen = activePickerMemoId === memo.id;

            return (
              <div
                key={memo.id}
                className={`flex gap-3 max-w-[85%] sm:max-w-[70%] group relative ${
                  isMe ? 'self-end flex-row-reverse' : 'self-start flex-row'
                }`}
              >
                {/* ユーザーアバター */}
                <div className="shrink-0 pt-0.5">
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorDisplayName}
                      className="w-9 h-9 rounded-full border border-gray-200 object-cover shadow-xs"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full ${authorBadgeColor} text-white font-black text-sm flex items-center justify-center shadow-xs`}
                    >
                      {(authorDisplayName === 'あなた' ? currentUser.name : authorDisplayName).charAt(0)}
                    </div>
                  )}
                </div>

                <div className={`flex flex-col gap-1.5 ${isMe ? 'items-end' : 'items-start'} relative`}>
                  {/* 投稿者名 ＆ 削除ボタン */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-xs font-extrabold text-gray-600">
                      {authorDisplayName}
                    </span>
                    {isMe && !isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMemo(memo.id);
                        }}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded cursor-pointer flex items-center gap-0.5"
                        title="このメモを削除"
                      >
                        <span>🗑️</span>
                        <span className="text-[10px] hidden sm:inline">削除</span>
                      </button>
                    )}
                  </div>

                  {/* 吹き出し */}
                  <div
                    className={`p-3.5 rounded-2xl shadow-xs text-sm leading-relaxed whitespace-pre-wrap wrap-break-word ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                        : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none font-medium'
                    }`}
                  >
                    {memo.content}
                  </div>

                  {/* リアクション一覧 ＆ ＋ボタンエリア */}
                  <div className={`flex flex-wrap items-center gap-1.5 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {memo.reactions?.map((reaction) => {
                      const hasReacted = reaction.userIds?.includes(currentUser.id);
                      return (
                        <button
                          key={reaction.text}
                          onClick={() => handleToggleReaction(memo.id, reaction.text)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                            hasReacted
                              ? 'bg-blue-50 border-blue-400 text-blue-600 shadow-xs'
                              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 shadow-2xs'
                          }`}
                        >
                          <span className="text-sm leading-none">{reaction.text}</span>
                          <span className="text-xs">{reaction.count}</span>
                        </button>
                      );
                    })}

                    {/* スタンプ追加ボタン */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePickerMemoId(isPickerOpen ? null : memo.id);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border transition-all shadow-2xs cursor-pointer ${
                        isPickerOpen
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-gray-50 hover:bg-white border-gray-300 text-gray-600 hover:text-blue-600 hover:border-blue-400'
                      }`}
                      title="リアクションを追加"
                    >
                      <span className="text-[11px] leading-none font-extrabold">＋</span>
                    </button>
                  </div>

                  {/* Slack風 絵文字ピッカー */}
                  {isPickerOpen && (
                    <div
                      className={`absolute top-full mt-2 z-30 bg-white border border-gray-200 shadow-xl rounded-2xl p-2 flex items-center gap-1.5 animate-in fade-in zoom-in duration-150 ${
                        isMe ? 'right-0' : 'left-0'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {STAMP_TEMPLATES.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(memo.id, emoji)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-base transition-transform hover:scale-125 cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isReadOnly && (
        <div className="absolute bottom-0 left-0 right-0 md:relative p-3 md:p-4 bg-white border-t border-gray-200 shrink-0 shadow-sm z-20">
          <form onSubmit={handleAddMemo} className="max-w-4xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={newMemoContent}
                onChange={(e) => setNewMemoContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAddMemo(e);
                  }
                }}
                rows={2}
                placeholder="メッセージを入力... (Ctrl + Enter で送信)"
                className="w-full border border-gray-300 rounded-2xl p-3 focus:ring-2 focus:ring-blue-500 outline-none text-base font-medium resize-none bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={!newMemoContent.trim()}
              className="h-11 px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-sm rounded-2xl shadow-sm transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
            >
              <span>送信</span>
              <span className="text-base">🚀</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}