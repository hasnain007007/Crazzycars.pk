'use client'
import { useRef } from 'react'
import { Editor } from '@tinymce/tinymce-react'

export default function TinyEditor({
  value,
  onChange,
  height = 500,
  placeholder = 'Start writing...'
}) {
  const editorRef = useRef(null)

  return (
    <Editor
      // TODO: replace with your TinyMCE API key from tiny.cloud
      apiKey="l19dc6n1tdutbtn2olt6bn3bexpbzvin5v6c9oa2ukr5unsn"
      onInit={(evt, editor) => {
        editorRef.current = editor
      }}
      value={value || ''}
      onEditorChange={(content) => {
        if (onChange) onChange(content)
      }}
      init={{
        height,
        menubar: true,
        plugins: [
          'anchor', 'autolink', 'charmap',
          'codesample', 'emoticons', 'link',
          'lists', 'media', 'searchreplace',
          'table', 'visualblocks', 'wordcount',
          'checklist', 'advtable', 'advcode',
          'formatpainter', 'pageembed',
          'tableofcontents', 'footnotes',
          'autocorrect', 'typography',
          'inlinecss', 'markdown',
          'importword', 'exportword', 'exportpdf'
        ],
        toolbar: [
          'undo redo | blocks fontfamily fontsize',
          'bold italic underline strikethrough',
          'link media table',
          'align lineheight',
          'checklist numlist bullist indent outdent',
          'emoticons charmap | removeformat'
        ].join(' | '),
        toolbar_mode: 'sliding',
        content_style: `
          body {
            font-family: Inter, Arial, sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #111111;
            padding: 16px;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          table td, table th {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
          }
          table th {
            background: #f9fafb;
            font-weight: 600;
          }
        `,
        placeholder,
        skin: 'oxide',
        content_css: 'default',
        branding: false,
        promotion: false,
        resize: true,
        autoresize_bottom_margin: 20,
        table_toolbar:
          'tableprops tabledelete | ' +
          'tableinsertrowbefore tableinsertrowafter ' +
          'tabledeleterow | ' +
          'tableinsertcolbefore tableinsertcolafter ' +
          'tabledeletecol',
        table_appearance_options: true,
        table_grid: true,
        table_resize_bars: true,
        table_default_styles: {
          'border-collapse': 'collapse',
          width: '100%'
        },
        table_default_attributes: {
          border: '1'
        }
      }}
    />
  )
}
