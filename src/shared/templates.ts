import type { WritingTemplate } from './types'

export const WRITING_TEMPLATES: WritingTemplate[] = [
  // 邮件
  { id: 'email-formal', icon: '📧', title: '正式邮件', category: '邮件', prompt: '请帮我写一封正式的商务邮件，主题是：' },
  { id: 'email-reply', icon: '↩️', title: '邮件回复', category: '邮件', prompt: '请帮我回复以下邮件，语气专业友好：' },
  { id: 'email-followup', icon: '📬', title: '跟进邮件', category: '邮件', prompt: '请帮我写一封跟进邮件，背景是：' },

  // 社交媒体
  { id: 'social-xiaohongshu', icon: '📕', title: '小红书文案', category: '社交', prompt: '请帮我写一篇小红书风格的种草文案，主题是：' },
  { id: 'social-weibo', icon: '🐦', title: '微博/推文', category: '社交', prompt: '请帮我写一条吸引人的微博/推文，主题是：' },
  { id: 'social-moments', icon: '💬', title: '朋友圈文案', category: '社交', prompt: '请帮我写一条朋友圈文案，场景是：' },

  // 工作
  { id: 'work-report', icon: '📊', title: '工作周报', category: '工作', prompt: '请帮我写一份工作周报，本周完成的工作包括：' },
  { id: 'work-meeting', icon: '📋', title: '会议纪要', category: '工作', prompt: '请帮我整理以下会议内容为结构化的会议纪要：' },
  { id: 'work-plan', icon: '🎯', title: '项目计划', category: '工作', prompt: '请帮我制定一个项目计划，项目目标是：' },
  { id: 'work-okr', icon: '📈', title: 'OKR 制定', category: '工作', prompt: '请帮我制定 OKR，我的职责是：' },

  // 写作
  { id: 'write-blog', icon: '✍️', title: '博客文章', category: '写作', prompt: '请帮我写一篇博客文章，主题是：' },
  { id: 'write-outline', icon: '🗂️', title: '文章大纲', category: '写作', prompt: '请帮我生成一篇文章的大纲，主题是：' },
  { id: 'write-slogan', icon: '💡', title: '广告文案', category: '写作', prompt: '请帮我写一段吸引人的广告文案，产品/服务是：' },
  { id: 'write-story', icon: '📖', title: '创意故事', category: '写作', prompt: '请帮我写一个创意短故事，设定是：' },

  // 学习
  { id: 'study-explain', icon: '🎓', title: '概念解释', category: '学习', prompt: '请用通俗易懂的方式解释以下概念：' },
  { id: 'study-quiz', icon: '❓', title: '生成题目', category: '学习', prompt: '请根据以下内容生成 5 道练习题：' },
  { id: 'study-notes', icon: '📝', title: '学习笔记', category: '学习', prompt: '请帮我整理以下内容为结构化的学习笔记：' },

  // 代码
  { id: 'code-explain', icon: '💻', title: '代码解释', category: '代码', prompt: '请解释以下代码的功能和逻辑：' },
  { id: 'code-review', icon: '🔍', title: '代码审查', category: '代码', prompt: '请审查以下代码，指出潜在问题和改进建议：' },
  { id: 'code-convert', icon: '🔄', title: '代码转换', category: '代码', prompt: '请将以下代码转换为其他语言：' },
]

export const TEMPLATE_CATEGORIES = ['邮件', '社交', '工作', '写作', '学习', '代码'] as const
