// frontend/src/components/MarkdownPreview.jsx
import React from 'react';
import './MarkdownPreview.css';

const MarkdownPreview = ({ content }) => {
  const convertMarkdownToHtml = (text) => {
    if (!text) return '';

    let html = text;

    // Headers - improved for Hebrew
    html = html.replace(/^### (.+)$/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gim, '<h1>$1</h1>');

    // Bold - improved
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Italic - improved  
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Code inline - improved
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Code blocks
    html = html.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');

    // Links - improved
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Unordered lists - improved
    html = html.replace(/^[\s]*[-*+] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Ordered lists - improved
    html = html.replace(/^[\s]*\d+\. (.+)$/gm, '<li>$1</li>');
    
    // Blockquotes - improved
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Line breaks and paragraphs
    html = html.split('\n\n').map(paragraph => {
      if (paragraph.trim() === '') return '';
      if (paragraph.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|hr)/)) {
        return paragraph;
      }
      return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    return html;
  };

  return (
    <div className="markdown-preview">
      <div 
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: convertMarkdownToHtml(content) }}
      />
    </div>
  );
};

export default MarkdownPreview;
