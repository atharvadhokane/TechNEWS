'use client';

import { useEffect, useState } from 'react';
import ArticleCard from '../../components/ArticleCard';
import { useAuth } from '../../hooks/useAuth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function BookmarksPage() {
  const { token, isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE_URL}/bookmarks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load bookmarks');
        return res.json();
      })
      .then((data) => setBookmarks(data.bookmarks || []))
      .catch((err) => setError(err.message));
  }, [token]);

  if (!isAuthenticated) {
    return <p className="text-neutral-400">Log in to see your bookmarks.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Your Bookmarks</h2>
      {error && <p className="text-red-400">{error}</p>}
      {bookmarks.length === 0 && !error && (
        <p className="text-neutral-400">No bookmarks yet.</p>
      )}
      <div className="space-y-3">
        {bookmarks.map((b) => (
          <ArticleCard key={b.id} article={b.article} />
        ))}
      </div>
    </div>
  );
}
