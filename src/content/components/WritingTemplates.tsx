import { useState } from 'react'
import { WRITING_TEMPLATES, TEMPLATE_CATEGORIES } from '@/shared/templates'

interface Props {
  onSelect: (prompt: string) => void
}

export function WritingTemplates({ onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(TEMPLATE_CATEGORIES[0])

  const filtered = WRITING_TEMPLATES.filter(t => t.category === activeCategory)

  return (
    <div className="askit-templates">
      <div className="askit-template-cats">
        {TEMPLATE_CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`askit-template-cat ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="askit-template-grid">
        {filtered.map(t => (
          <button key={t.id} className="askit-template-card" onClick={() => onSelect(t.prompt)}>
            <span className="askit-template-icon">{t.icon}</span>
            <span className="askit-template-title">{t.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
