// frontend/src/components/MarkdownPreview.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownPreview.css';

const MarkdownPreview = ({ content, presentationFontSize }) => {
  return (
    <div className="markdown-preview" style={{ fontSize: presentationFontSize ? `${presentationFontSize}px` : undefined }}>
      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Open external links safely
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            // Wrap tables in a scrollable container
            table: ({ children }) => (
              <div className="md-table-wrapper"><table>{children}</table></div>
            ),
            // Style images, show alt text as caption
            img: ({ src, alt }) => (
              <figure className="md-figure">
                <img src={src} alt={alt || ''} />
                {alt && <figcaption className="md-figcaption">{alt}</figcaption>}
              </figure>
            ),
            // Render task-list checkboxes as styled elements
            input: ({ type, checked, disabled }) => {
              if (type !== 'checkbox') return null;
              return (
                <span
                  className={`md-checkbox${checked ? ' md-checkbox--checked' : ''}`}
                  aria-hidden="true"
                >
                  {checked ? '☑' : '☐'}
                </span>
              );
            },
          }}
        >
          {content || ''}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownPreview;
