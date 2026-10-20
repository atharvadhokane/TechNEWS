export default function ArticleCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-neutral-800 rounded-lg p-4 hover:border-neutral-600 transition"
    >
      <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
        {article.category || 'Uncategorized'}
      </div>
      <h2 className="text-lg font-medium mb-1">{article.headline || article.title}</h2>
      {article.summary && <p className="text-sm text-neutral-300 mb-2">{article.summary}</p>}
      {article.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <span key={tag} className="text-xs bg-neutral-800 rounded px-2 py-0.5">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}
