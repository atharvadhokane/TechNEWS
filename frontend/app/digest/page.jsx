import { api } from '../../lib/api';
import ArticleCard from '../../components/ArticleCard';

export default async function DigestPage() {
  let digest = null;
  let error = null;

  try {
    const data = await api.getDigest();
    digest = data.digest;
  } catch (err) {
    error = err.message;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Daily Digest</h2>
      {error && <p className="text-neutral-400">No digest available yet.</p>}
      {digest && (
        <>
          <p className="text-sm text-neutral-400">{digest.title}</p>
          <div className="space-y-3">
            {digest.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
