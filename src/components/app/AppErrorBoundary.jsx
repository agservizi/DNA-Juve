import React from 'react'

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary', error, info)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-juve-black px-6 py-16 text-white">
        <div className="w-full max-w-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-juve-gold">Errore Applicazione</p>
          <h1 className="mt-4 font-display text-4xl font-black">Qualcosa si e inceppato</h1>
          <p className="mt-4 text-sm leading-relaxed text-gray-300">
            Il magazine ha incontrato un errore imprevisto. Puoi ricaricare la pagina e tornare subito alla lettura.
          </p>

          {this.state.error?.message && (
            <p className="mt-4 border border-white/10 bg-black/20 px-4 py-3 text-left text-xs text-gray-400">
              {this.state.error.message}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="bg-juve-gold px-5 py-3 text-sm font-black uppercase tracking-wider text-black transition-colors hover:bg-juve-gold-dark"
            >
              Ricarica pagina
            </button>
            <a
              href="/"
              className="border border-white/20 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition-colors hover:border-juve-gold hover:text-juve-gold"
            >
              Torna alla home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
