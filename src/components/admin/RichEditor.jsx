import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { mergeAttributes, Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Link as LinkIcon, Image as ImageIcon,
  List, ListOrdered, Quote, Code, Minus,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Undo, Redo, Film, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadImage } from '@/lib/supabase'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog'

const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      controls: { default: true },
      playsinline: { default: true },
      preload: { default: 'metadata' },
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes(HTMLAttributes, {
      controls: 'controls',
      playsinline: 'playsinline',
      preload: HTMLAttributes.preload || 'metadata',
      class: 'w-full rounded-sm border border-gray-200 bg-black',
    })]
  },

  addCommands() {
    return {
      setVideo: (attributes) => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: attributes,
      }),
    }
  },
})

function ToolbarBtn({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'tiptap-btn',
        active && 'is-active',
        disabled && 'opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

function Separator() {
  return <div className="w-px h-6 bg-gray-300 mx-1" />
}

export default function RichEditor({ content = '', onChange }) {
  const videoInputRef = useRef(null)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [imageOpen, setImageOpen] = useState(false)
  const [imageValue, setImageValue] = useState('')
  const [videoUrlOpen, setVideoUrlOpen] = useState(false)
  const [videoUrlValue, setVideoUrlValue] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      VideoNode,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Inizia a scrivere il tuo articolo…' }),
    ],
    content,
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor) return
    const incoming = content || ''
    const current = editor.getHTML()
    if (current === incoming) return
    editor.commands.setContent(incoming, { emitUpdate: false })
  }, [editor, content])

  if (!editor) return null

  const setLink = () => {
    const prev = editor.getAttributes('link').href
    setLinkValue(prev || '')
    setLinkOpen(true)
  }

  const addImage = () => {
    setImageValue('')
    setImageOpen(true)
  }

  const addVideoFromUrl = () => {
    setVideoUrlValue('')
    setVideoUrlOpen(true)
  }

  const addVideo = async (file) => {
    if (!file) return
    if (!file.type.startsWith('video/')) {
      window.alert('Seleziona un file video valido.')
      return
    }
    if (file.size > 120 * 1024 * 1024) {
      window.alert('Il video è troppo grande. Limite attuale: 120MB.')
      return
    }

    setUploadingVideo(true)
    try {
      const path = `videos/${Date.now()}-${file.name.replace(/\s+/g, '-')}`
      const url = await uploadImage(file, path)
      editor.chain().focus().setVideo({ src: url }).run()
    } catch {
      window.alert('Caricamento video non riuscito. Riprova.')
    } finally {
      if (videoInputRef.current) videoInputRef.current.value = ''
      setUploadingVideo(false)
    }
  }

  const confirmVideoUrl = () => {
    const url = videoUrlValue.trim()
    if (!url) return
    editor.chain().focus().setVideo({ src: url }).run()
    setVideoUrlOpen(false)
    setVideoUrlValue('')
  }

  const confirmLink = () => {
    const url = linkValue.trim()
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      setLinkOpen(false)
      setLinkValue('')
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkOpen(false)
    setLinkValue('')
  }

  const confirmImage = () => {
    const url = imageValue.trim()
    if (!url) return
    editor.chain().focus().setImage({ src: url }).run()
    setImageOpen(false)
    setImageValue('')
  }

  return (
    <>
      <div className="border border-gray-300 bg-white">
        {/* Toolbar */}
        <div className="tiptap-toolbar sticky top-0 z-10">
        {/* History */}
        <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annulla">
          <Undo className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Rifai">
          <Redo className="h-4 w-4" />
        </ToolbarBtn>

        <Separator />

        {/* Headings */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Titolo H1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Titolo H2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Titolo H3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarBtn>

        <Separator />

        {/* Text formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Grassetto"
        >
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Corsivo"
        >
          <Italic className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Sottolineato"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Barrato"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Codice inline"
        >
          <Code className="h-4 w-4" />
        </ToolbarBtn>

        <Separator />

        {/* Alignment */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Allinea a sinistra"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Centra"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Allinea a destra"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          active={editor.isActive({ textAlign: 'justify' })}
          title="Giustifica"
        >
          <AlignJustify className="h-4 w-4" />
        </ToolbarBtn>

        <Separator />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Elenco puntato"
        >
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Elenco numerato"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Citazione"
        >
          <Quote className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Separatore"
        >
          <Minus className="h-4 w-4" />
        </ToolbarBtn>

        <Separator />

        {/* Media */}
        <ToolbarBtn onClick={setLink} active={editor.isActive('link')} title="Link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={addImage} title="Immagine da URL">
          <ImageIcon className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={addVideoFromUrl} disabled={uploadingVideo} title="Video da URL">
          <Film className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => videoInputRef.current?.click()} disabled={uploadingVideo} title="Carica video">
          {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
        </ToolbarBtn>
        </div>

        {/* Editor area */}
        <EditorContent
          editor={editor}
          className="p-6 min-h-[450px] prose prose-lg max-w-none focus:outline-none"
        />

        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          className="hidden"
          onChange={(e) => addVideo(e.target.files?.[0])}
        />
      </div>

      <Dialog open={videoUrlOpen} onClose={() => setVideoUrlOpen(false)}>
        <DialogHeader onClose={() => setVideoUrlOpen(false)}>
          <DialogTitle>Inserisci video da URL</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Incolla un link diretto a un file video pubblico, ad esempio `mp4` o `webm`.
          </p>
          <input
            autoFocus
            type="url"
            value={videoUrlValue}
            onChange={(event) => setVideoUrlValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmVideoUrl()
              }
            }}
            placeholder="https://..."
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
          />
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setVideoUrlOpen(false)}
            className="border border-gray-300 px-4 py-2 text-sm font-medium hover:border-juve-black transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={confirmVideoUrl}
            disabled={!videoUrlValue.trim()}
            className="bg-juve-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-juve-gold hover:text-black disabled:opacity-50"
          >
            Inserisci video
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog open={imageOpen} onClose={() => setImageOpen(false)}>
        <DialogHeader onClose={() => setImageOpen(false)}>
          <DialogTitle>Inserisci immagine da URL</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Incolla il link diretto dell’immagine che vuoi inserire nell’articolo.
          </p>
          <input
            autoFocus
            type="url"
            value={imageValue}
            onChange={(event) => setImageValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmImage()
              }
            }}
            placeholder="https://..."
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
          />
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            className="border border-gray-300 px-4 py-2 text-sm font-medium hover:border-juve-black transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={confirmImage}
            disabled={!imageValue.trim()}
            className="bg-juve-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-juve-gold hover:text-black disabled:opacity-50"
          >
            Inserisci immagine
          </button>
        </DialogFooter>
      </Dialog>

      <Dialog open={linkOpen} onClose={() => setLinkOpen(false)}>
        <DialogHeader onClose={() => setLinkOpen(false)}>
          <DialogTitle>Inserisci link</DialogTitle>
        </DialogHeader>
        <DialogContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Incolla l’URL del collegamento. Lascia il campo vuoto se vuoi rimuovere il link selezionato.
          </p>
          <input
            autoFocus
            type="url"
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmLink()
              }
            }}
            placeholder="https://..."
            className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-juve-black"
          />
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="border border-gray-300 px-4 py-2 text-sm font-medium hover:border-juve-black transition-colors"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={confirmLink}
            className="bg-juve-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-juve-gold hover:text-black"
          >
            Salva link
          </button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
