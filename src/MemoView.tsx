import { useState } from 'react';
import type { Memo, Member, User, ConfirmOptions } from './types';
import { memberDisplayLabel } from './types';

type MemoViewProps = {
  memos: Memo[];
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  members: Member[];
  activeProjectId?: string; // ProjectManagerView から渡されるプロパティを追加
  currentUser: User;
  isReadOnly?: boolean;
  requestConfirm: (options: ConfirmOptions) => void;
};

const EMOJI_OPTIONS = ['👍', '❤️', '👏', '🎉', '🔥', '😊', '🙌', '✨'];

export default function MemoView({
  memos,
  setMemos,
  members,
  activeProjectId,
  currentUser,
  isReadOnly = false,
  requestConfirm
}: MemoViewProps) {
  const [newMemoContent, setNewMemoContent] = useState('');
  const [activeEmojiPickerMemoId, setActiveEmojiPickerMemoId] = useState<string | null>(null);

  // メモ投稿の作成
  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoContent.trim() || isReadOnly) return;

    // 現在のユーザー情報をメンバー情報から取得
    const currentMember = members.find(m => m.id === currentUser.id);

    const newMemo: Memo = {
      id: `memo_${Date.now()}`,
      projectId: activeProjectId || '', // activeProjectId を反映
      authorId: currentUser.id,
      authorName: currentMember ? currentMember.name : (currentUser.name || 'ゲスト'),
      authorIcon: currentMember ? currentMember.avatarUrl : currentUser.avatarUrl,
      authorColor: currentMember ? currentMember.color : (currentUser.color || 'bg-blue-500'),
      content: newMemoContent.trim(),
      reactions: [],
      createdAt: Date.now()
    };

    setMemos(prev => [newMemo, ...prev]);
    setNewMemoContent('');
  };

  // メモの削除
  const handleDeleteMemo = (memoId: string) => {
    if (isReadOnly) return;
    requestConfirm({
      title: 'メモの削除',
      message: 'このメモを削除しますか？',
      confirmText: '削除する',
      isDanger: true,
      onConfirm: () => {
        setMemos(prev => prev.filter(m => m.id !== memoId));
      }
    });
  };

  // リアクション（絵文字スタンプ）のトグル処理（ユーザーIDベース）
  const handleToggleReaction = (memoId: string, emojiText: string) => {
    if (isReadOnly) return;

    setMemos(prevMemos =>
      prevMemos.map(memo => {
        if (memo.id !== memoId) return memo;

        const currentUserId = currentUser.id;
        const existingReactionIndex = memo.reactions.findIndex(r => r.text === emojiText);

        const updatedReactions = [...memo.reactions];

        if (existingReactionIndex > -1) {
          const targetReaction = updatedReactions[existingReactionIndex];
          const userIds = targetReaction.userIds || [];
          const hasReacted = userIds.includes(currentUserId);

          if (hasReacted) {
            // 既に押している場合はユーザーIDを取り除く
            const newUserIds = userIds.filter(id => id !== currentUserId);
            if (newUserIds.length === 0) {
              // 押し手が0人になった場合はスタンプ自体を削除
              updatedReactions.splice(existingReactionIndex, 1);
            } else {
              updatedReactions[existingReactionIndex] = {
                ...targetReaction,
                count: newUserIds.length,
                userIds: newUserIds
              };
            }
          } else {
            // まだ押していない場合はユーザーIDを追加
            const newUserIds = [...userIds, currentUserId];
            updatedReactions[existingReactionIndex] = {
              ...targetReaction,
              count: newUserIds.length,
              userIds: newUserIds
            };
          }
        } else {
          // 新しくスタンプを追加
          updatedReactions.push({
            text: emojiText,
            count: 1,
            userIds: [currentUserId]
          });
        }

        return {
          ...memo,
          reactions: updatedReactions
        };
      })
    );

    setActiveEmojiPickerMemoId(null);
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-4 md:p-6 mb-16 md:mb-0 relative">
      <div className="flex items-center gap-2 mb-4 text-xl font-bold text-gray-800">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        共有メモ
      </div>

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* 新規メモ投稿フォーム */}
        {!isReadOnly && (
          <form onSubmit={handleAddMemo} className="bg-white rounded-xl border border-gray-300 shadow-sm p-4 flex flex-col gap-3">
            <textarea
              value={newMemoContent}
              onChange={e => setNewMemoContent(e.target.value)}
              placeholder="連絡事項やアイディアを共有しよう..."
              className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newMemoContent.trim()}
                className="bg-blue-600 text-white font-bold text-xs px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                投稿する
              </button>
            </div>
          </form>
        )}

        {/* メモ一覧表示 */}
        <div className="flex flex-col gap-4">
          {(!memos || memos.length === 0) ? (
            <div className="text-center py-12 text-gray-400 font-bold">
              共有メモはまだありません
            </div>
          ) : (
            memos.map(memo => {
              // 投稿者の最新情報をIDベースで参照（Single Source of Truth）
              const authorMember = members.find(m => m.id === memo.authorId);
              const displayName = authorMember
                ? memberDisplayLabel(authorMember)
                : (memo.authorName || '不明なユーザー');
              const avatarUrl = authorMember ? authorMember.avatarUrl : memo.authorIcon;
              const colorClass = authorMember ? authorMember.color : (memo.authorColor || 'bg-blue-500');

              const isMyMemo = memo.authorId === currentUser.id;

              return (
                <div key={memo.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3 relative group">
                  {/* ヘッダー: 投稿者情報 & 削除ボタン */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full ${colorClass} text-white flex items-center justify-center font-bold text-xs shadow-xs`}>
                          {displayName.slice(0, 1)}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="font-bold text-xs text-gray-800">{displayName}</span>
                        {memo.createdAt && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(memo.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isReadOnly && isMyMemo && (
                      <button
                        onClick={() => handleDeleteMemo(memo.id)}
                        className="text-gray-400 hover:text-red-500 text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="メモを削除"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* 本文 */}
                  <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed px-1">
                    {memo.content}
                  </p>

                  {/* リアクションエリア */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                    {memo.reactions && memo.reactions.map((reaction, idx) => {
                      const userIds = reaction.userIds || [];
                      const hasReacted = userIds.includes(currentUser.id);

                      return (
                        <button
                          key={`${reaction.text}-${idx}`}
                          onClick={() => handleToggleReaction(memo.id, reaction.text)}
                          disabled={isReadOnly}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-all ${
                            hasReacted
                              ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span>{reaction.text}</span>
                          <span className="text-[11px]">{reaction.count}</span>
                        </button>
                      );
                    })}

                    {/* リアクション追加ボタン & ピッカー */}
                    {!isReadOnly && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveEmojiPickerMemoId(activeEmojiPickerMemoId === memo.id ? null : memo.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                          title="スタンプを追加"
                        >
                          +
                        </button>

                        {activeEmojiPickerMemoId === memo.id && (
                          <div className="absolute left-0 bottom-9 bg-white border border-gray-200 shadow-lg rounded-xl p-2 flex gap-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                            {EMOJI_OPTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleToggleReaction(memo.id, emoji)}
                                className="hover:bg-gray-100 p-1.5 rounded-lg text-base transition-transform hover:scale-125"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}