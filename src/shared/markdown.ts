import { Marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('go', go)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('html', xml)

const marked = new Marked({
  renderer: {
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
      const highlighted =
        language !== 'plaintext'
          ? hljs.highlight(text, { language }).value
          : text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const escaped = text.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<div class="askit-code-block"><div class="askit-code-header"><span class="askit-code-lang">${language}</span><button class="askit-code-copy" data-code="${escaped}">Copy</button></div><pre class="hljs"><code class="language-${language}">${highlighted}</code></pre></div>`
    },
  },
})

export function renderMarkdown(text: string): string {
  return marked.parse(text) as string
}
