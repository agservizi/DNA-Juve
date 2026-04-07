import { useRef, useCallback } from 'react'

function drawSocialCard(canvas, { title, category, author, date, siteUrl = 'bianconerihub.com' }) {
  const ctx = canvas.getContext('2d')
  const W = 1200
  const H = 630
  canvas.width = W
  canvas.height = H

  // Background
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, W, H)

  // Gold accent bar top
  ctx.fillStyle = '#F5A623'
  ctx.fillRect(0, 0, W, 6)

  // Gold accent bar left
  ctx.fillRect(0, 0, 6, H)

  // Category badge
  if (category) {
    ctx.fillStyle = '#F5A623'
    const catText = category.toUpperCase()
    ctx.font = 'bold 16px sans-serif'
    const catWidth = ctx.measureText(catText).width + 24
    ctx.fillRect(60, 60, catWidth, 32)
    ctx.fillStyle = '#000000'
    ctx.textBaseline = 'middle'
    ctx.fillText(catText, 72, 76)
  }

  // Title
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 48px serif'
  ctx.textBaseline = 'top'
  const maxWidth = W - 120
  const words = (title || '').split(' ')
  let lines = []
  let currentLine = ''
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }
  if (currentLine) lines.push(currentLine)
  lines = lines.slice(0, 4) // Max 4 lines

  const titleY = category ? 120 : 80
  lines.forEach((line, i) => {
    ctx.fillText(line, 60, titleY + i * 60)
  })

  // Author & date
  const bottomY = H - 100
  ctx.fillStyle = '#888888'
  ctx.font = '18px sans-serif'
  ctx.textBaseline = 'top'
  const meta = [author, date].filter(Boolean).join('  •  ')
  ctx.fillText(meta, 60, bottomY)

  // Logo
  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 28px sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.fillText('BIANCONERI', 60, H - 30)
  const bWidth = ctx.measureText('BIANCONERI').width
  ctx.fillStyle = '#F5A623'
  ctx.fillText('HUB', 60 + bWidth + 8, H - 30)

  // Site URL
  ctx.fillStyle = '#666666'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillText(siteUrl, W - 60, H - 35)
}

export function useSocialCardGenerator() {
  const canvasRef = useRef(null)

  const generate = useCallback(async (props) => {
    const canvas = canvasRef.current || document.createElement('canvas')
    if (!canvasRef.current) canvasRef.current = canvas

    drawSocialCard(canvas, props)

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob))
        } else {
          resolve(null)
        }
      }, 'image/png')
    })
  }, [])

  const download = useCallback(async (props, filename = 'social-card.png') => {
    const url = await generate(props)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }, [generate])

  return { generate, download, canvasRef }
}

export default function SocialCardPreview({ title, category, author, date }) {
  const canvasRef = useRef(null)

  const handleGenerate = () => {
    if (!canvasRef.current) return
    drawSocialCard(canvasRef.current, { title, category, author, date })
  }

  return (
    <div>
      <canvas
        ref={(el) => {
          canvasRef.current = el
          if (el) drawSocialCard(el, { title, category, author, date })
        }}
        className="w-full max-w-[600px] border border-gray-200"
        style={{ aspectRatio: '1200/630' }}
      />
    </div>
  )
}
