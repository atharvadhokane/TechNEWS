import { api } from '../lib/api';
import ArticleCard from '../components/ArticleCard';

export default async function HomePage() {
  let articles = [];
  let error = null;

  try {
    const data = await api.getArticles();
    articles = data.articles || [];
  } catch (err) {
    error = err.message;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Trending</h2>
      {error && <p className="text-red-400">Could not load articles: {error}</p>}
      {!error && articles.length === 0 && (
        <p className="text-neutral-400">No articles yet — check back after the next fetch cycle.</p>
      )}
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
