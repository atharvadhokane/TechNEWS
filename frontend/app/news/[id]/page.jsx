import { api } from '../../../lib/api';

export default async function ArticlePage({ params }) {
  const { article } = await api.getArticle(params.id);

  return (
    <article className="space-y-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400">{article.category}</div>
      <h1 className="text-2xl font-semibold">{article.headline || article.title}</h1>
      <p className="text-neutral-300">{article.summary}</p>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 underline text-sm"
      >
        Read original source
      </a>
    </article>
  );
}
