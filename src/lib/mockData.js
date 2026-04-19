// ── Dati demo per BianconeriHub (modalità senza Supabase) ────────────────────────

// ── CATEGORIES ──────────────────────────────────────────────────────────────
export const categories = [
  { id: 'cat-01', name: 'Calcio',     slug: 'calcio',     color: '#1a56db', created_at: '2026-01-01T00:00:00Z' },
  { id: 'cat-02', name: 'Mercato',    slug: 'mercato',    color: '#F5A623', created_at: '2026-01-01T00:00:00Z' },
  { id: 'cat-03', name: 'Formazione', slug: 'formazione', color: '#057a55', created_at: '2026-01-01T00:00:00Z' },
  { id: 'cat-04', name: 'Champions',  slug: 'champions',  color: '#7e3af2', created_at: '2026-01-01T00:00:00Z' },
  { id: 'cat-05', name: 'Serie A',    slug: 'serie-a',    color: '#e02424', created_at: '2026-01-01T00:00:00Z' },
  { id: 'cat-06', name: 'Interviste', slug: 'interviste', color: '#ff5a1f', created_at: '2026-01-01T00:00:00Z' },
]

// ── PROFILES ────────────────────────────────────────────────────────────────
export const profiles = [
  { id: 'usr-01', username: 'Redazione',      avatar_url: null, bio: 'La redazione di BianconeriHub', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'usr-02', username: 'Marco Bianchi',  avatar_url: null, bio: 'Giornalista sportivo e tifoso bianconero', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'usr-03', username: 'Giulia Rossi',   avatar_url: null, bio: 'Esperta di tattica e calcio femminile', created_at: '2026-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z' },
]

// Helper: category/profile lookup
const cat = (slug) => categories.find(c => c.slug === slug)
const prof = (id) => profiles.find(p => p.id === id)

// ── TAGS ────────────────────────────────────────────────────────────────────
export const tags = [
  { id: 'tag-01', name: 'Vlahovic',          slug: 'vlahovic',          created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-02', name: 'Thiago Motta',      slug: 'thiago-motta',     created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-03', name: 'Allianz Stadium',   slug: 'allianz-stadium',  created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-04', name: 'Scudetto',          slug: 'scudetto',         created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-05', name: 'Next Gen',          slug: 'next-gen',         created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-06', name: 'Yildiz',            slug: 'yildiz',           created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-07', name: 'Cambiaso',          slug: 'cambiaso',         created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-08', name: 'Coppa Italia',      slug: 'coppa-italia',    created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-09', name: 'Juve Women',        slug: 'juve-women',      created_at: '2026-01-01T00:00:00Z' },
  { id: 'tag-10', name: 'Tattiche',          slug: 'tattiche',        created_at: '2026-01-01T00:00:00Z' },
]

// ── ARTICLES ────────────────────────────────────────────────────────────────
export const articles = [
  {
    id: 'art-01',
    title: 'La Juventus domina il derby: 3-1 al Torino',
    slug: 'juventus-domina-derby-3-1-torino',
    excerpt: 'Una prestazione maiuscola della squadra bianconera nel derby della Mole. Doppietta di Vlahovic e gol di Yildiz.',
    content: `
      <p>Una serata magica all'Allianz Stadium per la Juventus, che conquista il derby della Mole con un convincente 3-1 sul Torino. I bianconeri hanno dominato il match fin dal primo minuto, mostrando una superiorità tattica evidente.</p>
      <h2>Primo tempo: Vlahovic scatenato</h2>
      <p>Dusan Vlahovic ha aperto le marcature al 12' con un colpo di testa perfetto su cross di Cambiaso dalla destra. Il raddoppio è arrivato al 34' con una conclusione potente dal limite dell'area che non ha lasciato scampo al portiere granata.</p>
      <h2>Secondo tempo: Yildiz chiude i conti</h2>
      <p>Nella ripresa la Juventus ha continuato a spingere e al 67' Kenan Yildiz ha firmato il 3-0 con un sinistro a giro dal limite dell'area, un gol di rara bellezza. Il Torino ha trovato il gol della bandiera all'82' su calcio di rigore.</p>
      <p>Con questa vittoria la Juventus sale al terzo posto in classifica a quota 58 punti, a sole tre lunghezze dalla vetta.</p>
    `,
    cover_image: 'https://placehold.co/800x450/000000/F5A623?text=DERBY+3-1',
    category_id: 'cat-01',
    author_id: 'usr-01',
    status: 'published',
    featured: true,
    views: 15420,
    created_at: '2026-03-30T10:00:00Z',
    updated_at: '2026-03-30T10:00:00Z',
    published_at: '2026-03-30T12:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-02',
    title: 'Calciomercato: il grande colpo per il centrocampo è in arrivo',
    slug: 'calciomercato-grande-colpo-centrocampo',
    excerpt: 'La dirigenza bianconera lavora sottotraccia per rinforzare la mediana. Un nome su tutti infiamma la piazza.',
    content: `
      <p>Il calciomercato non dorme mai in casa Juventus. La dirigenza bianconera, capitanata da Cristiano Giuntoli, sta lavorando sottotraccia per portare a Torino un rinforzo di assoluto livello per il centrocampo.</p>
      <h2>L'obiettivo numero uno</h2>
      <p>Secondo le ultime indiscrezioni, la Juventus avrebbe intensificato i contatti per un centrocampista di caratura internazionale. Le trattative sarebbero a buon punto, con la fumata bianca attesa nelle prossime settimane.</p>
      <p>Il giocatore avrebbe già dato il suo assenso al trasferimento, attratto dal progetto tecnico di Thiago Motta e dalla possibilità di giocare la Champions League.</p>
      <h2>Il budget a disposizione</h2>
      <p>La Juventus sarebbe pronta a investire una cifra importante, con la formula del prestito con obbligo di riscatto che potrebbe facilitare la chiusura dell'affare.</p>
    `,
    cover_image: 'https://placehold.co/800x450/1a1a1a/F5A623?text=MERCATO',
    category_id: 'cat-02',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 8930,
    created_at: '2026-03-28T09:00:00Z',
    updated_at: '2026-03-28T09:00:00Z',
    published_at: '2026-03-28T10:00:00Z',
    scheduled_at: null,
    categories: cat('mercato'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-03',
    title: 'L\'analisi tattica: il 4-2-3-1 di Thiago Motta',
    slug: 'analisi-tattica-4-2-3-1-thiago-motta',
    excerpt: 'Come si è evoluto il modulo della Juventus nel corso della stagione. Dati, movimenti e chiavi tattiche.',
    content: `
      <p>Il 4-2-3-1 di Thiago Motta è diventato il marchio di fabbrica della Juventus in questa stagione. Un sistema di gioco che ha saputo evolversi e adattarsi alle diverse sfide del campionato.</p>
      <h2>La costruzione dal basso</h2>
      <p>Uno degli aspetti più interessanti è la costruzione dal basso, con i due centrali che si allargano e il portiere che partecipa attivamente alla manovra. I terzini si alzano in posizione di mezzala, creando superiorità numerica in mezzo al campo.</p>
      <h2>Il ruolo del trequartista</h2>
      <p>Il trequartista è il fulcro del sistema offensivo. Si muove tra le linee, si abbassa per ricevere e smista il gioco con qualità. In fase difensiva, è il primo a pressare il play avversario, innescando il pressing alto della squadra.</p>
      <h2>I numeri della stagione</h2>
      <p>I dati parlano chiaro: 62% di possesso palla medio, 18 tiri a partita, 3.2 gol attesi per partita. Numeri che collocano la Juventus tra le squadre più propositive d'Europa.</p>
    `,
    cover_image: 'https://placehold.co/800x450/057a55/FFFFFF?text=TATTICA',
    category_id: 'cat-03',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 6200,
    created_at: '2026-03-25T14:00:00Z',
    updated_at: '2026-03-25T14:00:00Z',
    published_at: '2026-03-25T15:00:00Z',
    scheduled_at: null,
    categories: cat('formazione'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-04',
    title: 'Champions League: la Juve vola ai quarti di finale',
    slug: 'champions-league-juve-quarti-finale',
    excerpt: 'Impresa europea dei bianconeri che superano il turno con una prestazione di carattere. Il racconto della serata.',
    content: `
      <p>La Juventus conquista i quarti di finale di Champions League con una prestazione di altissimo livello. Una serata che resterà nella storia recente del club bianconero.</p>
      <h2>Una partita da grande squadra</h2>
      <p>I bianconeri hanno affrontato la sfida con la giusta mentalità fin dal riscaldamento. L'intensità e la concentrazione mostrate dalla squadra di Thiago Motta hanno fatto la differenza contro un avversario di grande qualità.</p>
      <p>Il gol del vantaggio è arrivato al 23' grazie a un'azione corale splendida, conclusa con un tocco sotto misura. Il raddoppio nella ripresa ha chiuso definitivamente i conti.</p>
      <h2>Il cammino europeo</h2>
      <p>Con questa qualificazione, la Juventus torna tra le prime otto d'Europa dopo due anni di assenza. Un risultato che certifica la crescita del progetto tecnico e la maturità di un gruppo in continua evoluzione.</p>
    `,
    cover_image: 'https://placehold.co/800x450/7e3af2/FFFFFF?text=CHAMPIONS',
    category_id: 'cat-04',
    author_id: 'usr-01',
    status: 'published',
    featured: true,
    views: 22100,
    created_at: '2026-03-20T20:00:00Z',
    updated_at: '2026-03-20T20:00:00Z',
    published_at: '2026-03-20T22:30:00Z',
    scheduled_at: null,
    categories: cat('champions'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-05',
    title: 'Serie A: la corsa scudetto è apertissima',
    slug: 'serie-a-corsa-scudetto-apertissima',
    excerpt: 'Analisi della classifica e delle prospettive bianconere nelle ultime giornate di campionato.',
    content: `
      <p>A dieci giornate dalla fine del campionato, la Serie A offre una corsa scudetto avvincente come non si vedeva da anni. La Juventus è pienamente in lotta per il titolo.</p>
      <h2>La classifica attuale</h2>
      <p>Solo tre punti separano le prime tre della classe. Un campionato equilibrato dove ogni partita può spostare gli equilibri. La Juventus ha il calendario dalla sua nelle prossime cinque giornate, con tre partite casalinghe consecutive.</p>
      <h2>I punti di forza bianconeri</h2>
      <p>La difesa meno battuta del campionato e un attacco che sta trovando continuità sono le armi principali della squadra di Thiago Motta. La profondità della rosa, inoltre, permette di affrontare il doppio impegno campionato-Champions senza perdere competitività.</p>
      <h2>Le prossime sfide decisive</h2>
      <p>Il calendario propone scontri diretti che saranno determinanti. La sfida nel prossimo turno sarà un vero e proprio spareggio per il primo posto in classifica.</p>
    `,
    cover_image: 'https://placehold.co/800x450/e02424/FFFFFF?text=SERIE+A',
    category_id: 'cat-05',
    author_id: 'usr-01',
    status: 'published',
    featured: true,
    views: 11350,
    created_at: '2026-03-18T11:00:00Z',
    updated_at: '2026-03-18T11:00:00Z',
    published_at: '2026-03-18T12:00:00Z',
    scheduled_at: null,
    categories: cat('serie-a'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-06',
    title: 'Intervista esclusiva: "Qui per vincere tutto"',
    slug: 'intervista-esclusiva-qui-per-vincere-tutto',
    excerpt: 'Le parole del protagonista in esclusiva per BianconeriHub. Ambizioni, obiettivi e la voglia di scrivere la storia.',
    content: `
      <p>In esclusiva per BianconeriHub, abbiamo incontrato uno dei protagonisti della stagione bianconera per una lunga intervista nella quale ha raccontato ambizioni, obiettivi e il suo rapporto con la maglia della Juventus.</p>
      <h2>"La Juve è la Juve"</h2>
      <p><em>"Quando ti chiama la Juventus non puoi dire di no. È un club che ha una storia unica al mondo. Ogni giorno entrare al training center e vedere tutte quelle stelle sullo stemma ti dà una motivazione incredibile."</em></p>
      <h2>Gli obiettivi stagionali</h2>
      <p><em>"Siamo qui per vincere tutto, su ogni fronte. Il mister ci chiede di dare il massimo in ogni allenamento e in ogni partita. La mentalità è quella giusta, siamo un gruppo unito e determinato."</em></p>
      <h2>Un messaggio ai tifosi</h2>
      <p><em>"Ai tifosi dico: continuate a sostenerci come state facendo, il vostro calore è il nostro dodicesimo uomo. Fino alla fine, sempre."</em></p>
    `,
    cover_image: 'https://placehold.co/800x450/ff5a1f/FFFFFF?text=INTERVISTA',
    category_id: 'cat-06',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 7450,
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-15T09:00:00Z',
    published_at: '2026-03-15T10:00:00Z',
    scheduled_at: null,
    categories: cat('interviste'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-07',
    title: 'Vlahovic incontenibile: doppietta e record stagionale',
    slug: 'vlahovic-doppietta-record-stagionale',
    excerpt: 'Il centravanti serbo raggiunge quota 25 gol stagionali con una prestazione da trascinatore assoluto.',
    content: `
      <p>Dusan Vlahovic continua a essere il trascinatore della Juventus. Con la doppietta nel derby, il centravanti serbo ha raggiunto quota 25 gol stagionali tra tutte le competizioni, il suo record personale in maglia bianconera.</p>
      <h2>I numeri di una stagione straordinaria</h2>
      <p>25 gol e 7 assist in 35 presenze: questi i numeri di Vlahovic in questa stagione. Un rendimento che lo colloca tra i migliori attaccanti d'Europa e che sta trascinando la Juventus nella corsa scudetto.</p>
      <p>Particolarmente impressionante la continuità: il serbo ha segnato in 8 delle ultime 10 partite, dimostrando una costanza che in passato gli era mancata.</p>
      <h2>L'evoluzione sotto Thiago Motta</h2>
      <p>Il lavoro con Thiago Motta ha trasformato Vlahovic in un attaccante più completo. Non solo gol, ma anche partecipazione alla manovra, movimenti a riempire gli spazi e una pressione costante sulla linea difensiva avversaria.</p>
    `,
    cover_image: 'https://placehold.co/800x450/000000/F5A623?text=VLAHOVIC+25',
    category_id: 'cat-01',
    author_id: 'usr-01',
    status: 'published',
    featured: true,
    views: 18700,
    created_at: '2026-03-31T08:00:00Z',
    updated_at: '2026-03-31T08:00:00Z',
    published_at: '2026-03-31T09:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-08',
    title: 'Il progetto Next Gen: i giovani bianconeri che brillano',
    slug: 'progetto-next-gen-giovani-brillano',
    excerpt: 'La Juventus Next Gen sta sfornando talenti a ripetizione. I profili più interessanti della cantera bianconera.',
    content: `
      <p>Il vivaio della Juventus continua a sfornare talenti. La Next Gen, la seconda squadra bianconera che milita in Serie C, è diventata una fucina di giovani pronti per il grande salto.</p>
      <h2>I talenti da seguire</h2>
      <p>Diversi giovani della Next Gen si sono messi in luce in questa stagione, attirando l'attenzione dello staff della prima squadra e di numerosi club europei. Centrocampisti di qualità, difensori moderni e attaccanti veloci compongono un gruppo di grande prospettiva.</p>
      <h2>Il modello di sviluppo</h2>
      <p>La filosofia è chiara: la Next Gen gioca con lo stesso modulo e gli stessi principi della prima squadra, facilitando così l'integrazione dei giovani quando vengono chiamati da Thiago Motta. Un modello che sta dando frutti importanti.</p>
    `,
    cover_image: 'https://placehold.co/800x450/057a55/FFFFFF?text=NEXT+GEN',
    category_id: 'cat-03',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 4820,
    created_at: '2026-03-12T16:00:00Z',
    updated_at: '2026-03-12T16:00:00Z',
    published_at: '2026-03-12T17:00:00Z',
    scheduled_at: null,
    categories: cat('formazione'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-09',
    title: 'Calciomercato: i nomi caldi per rinforzare la difesa',
    slug: 'calciomercato-nomi-caldi-difesa',
    excerpt: 'La Juventus punta a rinforzare il reparto arretrato. Tre profili nel mirino di Giuntoli per la prossima stagione.',
    content: `
      <p>La Juventus pianifica il futuro e guarda con attenzione al mercato dei difensori. Cristiano Giuntoli ha individuato diversi profili per rinforzare il reparto arretrato in vista della prossima stagione.</p>
      <h2>I nomi in lista</h2>
      <p>Tre sono i profili principali seguiti dalla dirigenza bianconera: un centrale di esperienza internazionale, un giovane talento dal campionato francese e un terzino destro che potrebbe garantire alternative tattiche importanti.</p>
      <h2>La strategia di mercato</h2>
      <p>La Juventus punta a chiudere almeno due operazioni prima dell'inizio del ritiro estivo, per permettere ai nuovi acquisti di integrarsi nel sistema di gioco di Thiago Motta fin dalla preparazione.</p>
    `,
    cover_image: 'https://placehold.co/800x450/1a1a1a/F5A623?text=DIFESA',
    category_id: 'cat-02',
    author_id: 'usr-01',
    status: 'published',
    featured: false,
    views: 6100,
    created_at: '2026-03-10T10:00:00Z',
    updated_at: '2026-03-10T10:00:00Z',
    published_at: '2026-03-10T11:00:00Z',
    scheduled_at: null,
    categories: cat('mercato'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-10',
    title: 'L\'Allianz Stadium compie 13 anni: storia di un\'icona',
    slug: 'allianz-stadium-compie-13-anni-storia',
    excerpt: 'Dal "Delle Alpi" all\'impianto più moderno d\'Italia. 13 anni di vittorie, emozioni e sold-out all\'Allianz Stadium.',
    content: `
      <p>L'8 settembre 2011 la Juventus inaugurava il suo nuovo stadio, oggi conosciuto come Allianz Stadium. Un impianto all'avanguardia che ha cambiato per sempre il modo di vivere il calcio a Torino.</p>
      <h2>I numeri dello Stadium</h2>
      <p>41.507 posti a sedere, oltre 500 partite disputate, una media spettatori che sfiora costantemente il tutto esaurito. L'Allianz Stadium è diventato una vera e propria fortezza per la Juventus, con una percentuale di vittorie casalinghe tra le più alte d'Europa.</p>
      <h2>Le notti indimenticabili</h2>
      <p>Dalle rimonte in Champions League alle feste scudetto, passando per le grandi sfide di Serie A: lo Stadium ha ospitato momenti che resteranno per sempre nel cuore dei tifosi bianconeri. Un teatro di emozioni che continua a scrivere la storia del calcio italiano.</p>
      <h2>Il futuro: ampliamento e innovazione</h2>
      <p>La Juventus sta già lavorando a progetti di ammodernamento dell'impianto, con l'obiettivo di migliorare ulteriormente l'esperienza dei tifosi e aumentare i ricavi da stadio.</p>
    `,
    cover_image: 'https://placehold.co/800x450/000000/F5A623?text=STADIUM',
    category_id: 'cat-01',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 9300,
    created_at: '2026-03-08T08:00:00Z',
    updated_at: '2026-03-08T08:00:00Z',
    published_at: '2026-03-08T09:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-02'),
  },
  // ── Nuovi articoli ──
  {
    id: 'art-12',
    title: 'Yildiz incanta l\'Europa: tripletta storica al Genoa',
    slug: 'yildiz-tripletta-storica-genoa',
    excerpt: 'Il gioiello turco firma la prima tripletta in Serie A e lancia la Juve verso lo scudetto.',
    content: `
      <p>Kenan Yildiz ha scritto una pagina di storia bianconera. A soli 20 anni, il fantasista turco ha realizzato la sua prima tripletta in Serie A nella travolgente vittoria per 5-1 contro il Genoa.</p>
      <h2>Una serata magica</h2>
      <p>Il primo gol è arrivato dopo appena 8 minuti: dribbling secco sul difensore e destro chirurgico nell'angolino. Il raddoppio su punizione al 34', con un tiro a giro che ha lasciato di sasso il portiere. Il tris nella ripresa, con un'azione personale partita dalla metà campo.</p>
      <h2>I complimenti di Thiago Motta</h2>
      <p>"Kenan ha un talento straordinario, ma quello che mi colpisce di più è la sua maturità. A 20 anni gioca come un veterano, ha personalità e sa gestire la pressione. Può diventare uno dei migliori al mondo."</p>
      <h2>Numeri da record</h2>
      <p>Con questa tripletta Yildiz sale a 14 gol e 9 assist in campionato, diventando il più giovane giocatore della Juventus a raggiungere la doppia cifra di gol e assist in una singola stagione di Serie A dal 1994.</p>
    `,
    cover_image: 'https://placehold.co/800x450/1a56db/FFFFFF?text=YILDIZ+HAT+TRICK',
    category_id: 'cat-01',
    author_id: 'usr-01',
    status: 'published',
    featured: true,
    views: 22300,
    created_at: '2026-04-02T18:00:00Z',
    updated_at: '2026-04-02T18:00:00Z',
    published_at: '2026-04-02T19:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-13',
    title: 'Mercato: Giuntoli punta il talento brasiliano del Santos',
    slug: 'mercato-giuntoli-talento-brasiliano-santos',
    excerpt: 'La Juventus segue con interesse un giovane centrocampista brasiliano. Primi contatti con il Santos.',
    content: `
      <p>La Juventus continua a guardare al futuro. Secondo fonti brasiliane, Cristiano Giuntoli avrebbe avviato i primi contatti con il Santos per un promettente centrocampista classe 2007.</p>
      <h2>Il profilo del giocatore</h2>
      <p>Si tratta di un mediano moderno, dotato di grande fisicità ma anche di piedi educati. In patria lo paragonano a Casemiro per la capacità di recuperare palloni e a Pogba per la qualità in fase di impostazione.</p>
      <h2>La concorrenza</h2>
      <p>Sul giocatore ci sarebbero anche Real Madrid e Manchester City, ma la Juventus avrebbe il vantaggio di poter offrire un progetto tecnico più definito e un minutaggio garantito fin da subito.</p>
      <h2>I tempi dell'operazione</h2>
      <p>La trattativa è ancora nelle fasi iniziali. Il Santos chiede 25 milioni di euro, la Juventus vorrebbe inserire bonus legati alle presenze per abbassare la parte fissa.</p>
    `,
    cover_image: 'https://placehold.co/800x450/F5A623/000000?text=MERCATO+BRASILE',
    category_id: 'cat-02',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 8900,
    created_at: '2026-03-28T10:00:00Z',
    updated_at: '2026-03-28T10:00:00Z',
    published_at: '2026-03-28T11:00:00Z',
    scheduled_at: null,
    categories: cat('mercato'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-14',
    title: 'Coppa Italia: la Juve vola in semifinale battendo la Lazio',
    slug: 'coppa-italia-juve-semifinale-lazio',
    excerpt: 'Vittoria di misura all\'Olimpico grazie al gol di Locatelli. Bianconeri in semifinale.',
    content: `
      <p>La Juventus conquista la semifinale di Coppa Italia battendo la Lazio 1-0 all'Olimpico. Decisivo il gol di Manuel Locatelli al 72', con un inserimento perfetto su assist di Cambiaso.</p>
      <h2>La partita</h2>
      <p>Match tattico e combattuto. La Lazio ha provato a imporre il proprio gioco nel primo tempo, ma la difesa bianconera ha retto con sicurezza. Nella ripresa la Juve ha alzato il baricentro e trovato il gol della qualificazione.</p>
      <h2>Prossimo avversario</h2>
      <p>In semifinale la Juventus affronterà il Napoli in una doppia sfida che promette spettacolo. Andata al Maradona, ritorno all'Allianz Stadium.</p>
    `,
    cover_image: 'https://placehold.co/800x450/057a55/FFFFFF?text=COPPA+ITALIA',
    category_id: 'cat-01',
    author_id: 'usr-03',
    status: 'published',
    featured: false,
    views: 11200,
    created_at: '2026-03-05T21:00:00Z',
    updated_at: '2026-03-05T21:00:00Z',
    published_at: '2026-03-05T22:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-03'),
  },
  {
    id: 'art-15',
    title: 'L\'evoluzione di Cambiaso: da terzino a jolly universale',
    slug: 'evoluzione-cambiaso-terzino-jolly-universale',
    excerpt: 'Andrea Cambiaso è diventato il giocatore più versatile della rosa bianconera. Analisi tattica del suo ruolo.',
    content: `
      <p>Andrea Cambiaso è forse la più grande sorpresa tattica della stagione bianconera. Partito come terzino sinistro, è diventato un jolly capace di ricoprire almeno cinque ruoli diversi nel sistema di Thiago Motta.</p>
      <h2>Le posizioni occupate</h2>
      <p>Terzino sinistro, terzino destro, esterno di centrocampo, mezzala e persino trequartista atipico: Cambiaso ha giocato in ogni zona del campo con lo stesso livello di rendimento, dimostrando un'intelligenza tattica fuori dal comune.</p>
      <h2>I numeri della versatilità</h2>
      <p>5 gol, 8 assist e una media di 11.2 km percorsi a partita. Cambiaso è il giocatore della Juve con più chilometri nelle gambe, ma anche quello con la maggiore precisione nei passaggi in zona offensiva (89%).</p>
      <h2>Il futuro</h2>
      <p>Con un contratto fino al 2029, Cambiaso rappresenta una delle colonne del progetto Juve. Il suo valore di mercato è raddoppiato nell'ultimo anno, ma la società non ha intenzione di cederlo.</p>
    `,
    cover_image: 'https://placehold.co/800x450/000000/FFFFFF?text=CAMBIASO+TATTICA',
    category_id: 'cat-03',
    author_id: 'usr-03',
    status: 'published',
    featured: false,
    views: 7600,
    created_at: '2026-03-02T14:00:00Z',
    updated_at: '2026-03-02T14:00:00Z',
    published_at: '2026-03-02T15:00:00Z',
    scheduled_at: null,
    categories: cat('formazione'),
    profiles: prof('usr-03'),
  },
  {
    id: 'art-16',
    title: 'Champions: il sorteggio dei quarti sorride alla Juve',
    slug: 'champions-sorteggio-quarti-sorride-juve',
    excerpt: 'La Juventus pesca il PSG nei quarti di finale. Un accoppiamento alla portata per sognare la semifinale.',
    content: `
      <p>Il sorteggio dei quarti di finale di Champions League ha regalato alla Juventus un accoppiamento affascinante ma alla portata: i bianconeri affronteranno il Paris Saint-Germain.</p>
      <h2>L'analisi dell'avversario</h2>
      <p>Il PSG sta vivendo una stagione di transizione dopo l'addio di Mbappé. La squadra di Luis Enrique gioca un calcio propositivo ma ha mostrato fragilità difensive, soprattutto nelle partite europee in trasferta.</p>
      <h2>I precedenti</h2>
      <p>La Juventus ha un bilancio positivo contro il PSG nelle competizioni europee: 4 vittorie, 2 pareggi e 2 sconfitte negli ultimi 8 confronti diretti. L'ultimo precedente risale al girone della Champions 2022-23.</p>
      <h2>Le date</h2>
      <p>L'andata si giocherà a Torino l'8-9 aprile, il ritorno a Parigi il 15-16 aprile. Thiago Motta potrà contare su tutti gli effettivi per questa doppia sfida cruciale.</p>
    `,
    cover_image: 'https://placehold.co/800x450/7e3af2/FFFFFF?text=UCL+QUARTI',
    category_id: 'cat-04',
    author_id: 'usr-01',
    status: 'published',
    featured: true,
    views: 15800,
    created_at: '2026-03-22T12:00:00Z',
    updated_at: '2026-03-22T12:00:00Z',
    published_at: '2026-03-22T13:00:00Z',
    scheduled_at: null,
    categories: cat('champions'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-17',
    title: 'Serie A: il VAR divide ancora, gli episodi contestati',
    slug: 'serie-a-var-divide-episodi-contestati',
    excerpt: 'Polemiche arbitrali nell\'ultima giornata. Analisi degli episodi più discussi che hanno coinvolto la Juventus.',
    content: `
      <p>L'ultima giornata di Serie A ha riacceso le polemiche arbitrali. Diversi episodi hanno fatto discutere, in particolare un rigore non concesso alla Juventus nel match contro la Fiorentina.</p>
      <h2>L'episodio chiave</h2>
      <p>Al 67' minuto, con il risultato in parità, un evidente contatto in area su Vlahovic non è stato sanzionato né dall'arbitro né dal VAR. Le immagini mostrano chiaramente un fallo del difensore viola, che trattiene il serbo per la maglia impedendogli il tiro.</p>
      <h2>Il protocollo VAR</h2>
      <p>L'AIA ha spiegato che il VAR non è intervenuto perché ha giudicato il contatto "non sufficiente per alterare la dinamica dell'azione". Una spiegazione che non ha convinto tifosi e addetti ai lavori.</p>
      <h2>I numeri del VAR in stagione</h2>
      <p>In questa stagione il VAR ha corretto 127 decisioni in Serie A. La Juventus risulta la squadra con il maggior numero di episodi sfavorevoli non corretti (7), seguita da Roma (5) e Napoli (4).</p>
    `,
    cover_image: 'https://placehold.co/800x450/e02424/FFFFFF?text=VAR+POLEMICHE',
    category_id: 'cat-05',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 13400,
    created_at: '2026-02-25T08:00:00Z',
    updated_at: '2026-02-25T08:00:00Z',
    published_at: '2026-02-25T09:00:00Z',
    scheduled_at: null,
    categories: cat('serie-a'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-18',
    title: 'Esclusiva: parla il preparatore atletico della Juve',
    slug: 'esclusiva-parla-preparatore-atletico-juve',
    excerpt: '"La squadra è al top della condizione fisica. Ecco come lavoriamo per prevenire gli infortuni."',
    content: `
      <p>In esclusiva per BianconeriHub, il preparatore atletico della prima squadra racconta i segreti del lavoro fisico che sta portando i bianconeri a essere una delle squadre più in forma d'Europa.</p>
      <h2>La metodologia</h2>
      <p><em>"Utilizziamo un approccio integrato che combina analisi dei dati biometrici, GPS tracking durante gli allenamenti e un programma personalizzato per ogni giocatore. Ogni atleta ha un piano specifico basato sulle sue caratteristiche fisiche."</em></p>
      <h2>La prevenzione infortuni</h2>
      <p><em>"Quest'anno abbiamo ridotto del 40% gli infortuni muscolari rispetto alla scorsa stagione. Il merito è del lavoro di prevenzione che facciamo quotidianamente: stretching mirato, crioterapia, e un monitoraggio costante del carico di lavoro."</em></p>
      <h2>Il segreto della resistenza</h2>
      <p><em>"La Juventus è la squadra di Serie A che corre di più negli ultimi 15 minuti delle partite. Questo non è un caso, ma il frutto di un lavoro specifico sulla resistenza aerobica e sulla capacità di recupero."</em></p>
    `,
    cover_image: 'https://placehold.co/800x450/ff5a1f/FFFFFF?text=PREPARAZIONE',
    category_id: 'cat-06',
    author_id: 'usr-03',
    status: 'published',
    featured: false,
    views: 5200,
    created_at: '2026-02-20T09:00:00Z',
    updated_at: '2026-02-20T09:00:00Z',
    published_at: '2026-02-20T10:00:00Z',
    scheduled_at: null,
    categories: cat('interviste'),
    profiles: prof('usr-03'),
  },
  {
    id: 'art-19',
    title: 'La Juve Women conquista il 7° scudetto consecutivo',
    slug: 'juve-women-settimo-scudetto-consecutivo',
    excerpt: 'Dominio assoluto nel campionato femminile: le ragazze di Canzi vincono con tre giornate di anticipo.',
    content: `
      <p>La Juventus Women scrive un altro capitolo della sua storia dominante. Con la vittoria per 3-0 sulla Roma, le bianconere conquistano il settimo scudetto consecutivo con tre giornate di anticipo.</p>
      <h2>Una stagione perfetta</h2>
      <p>24 vittorie, 3 pareggi e una sola sconfitta: questo il ruolino di marcia della squadra di Canzi. 78 gol fatti e solo 12 subiti, numeri che testimoniano la superiorità assoluta delle bianconere nel campionato italiano.</p>
      <h2>Le protagoniste</h2>
      <p>Barbara Bonansea, con 18 gol, è la capocannoniera del campionato. Ma il successo è di squadra: 12 giocatrici diverse sono andate a segno in stagione, a dimostrazione della profondità della rosa.</p>
      <h2>Il doppio obiettivo</h2>
      <p>Con lo scudetto in tasca, ora lo sguardo è tutto sulla Women's Champions League, dove la Juve è tra le favorite per la vittoria finale dopo aver eliminato il Barcellona nei quarti.</p>
    `,
    cover_image: 'https://placehold.co/800x450/000000/F5A623?text=JUVE+WOMEN',
    category_id: 'cat-01',
    author_id: 'usr-03',
    status: 'published',
    featured: false,
    views: 6700,
    created_at: '2026-02-15T17:00:00Z',
    updated_at: '2026-02-15T17:00:00Z',
    published_at: '2026-02-15T18:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-03'),
  },
  {
    id: 'art-20',
    title: 'Analisi tattica: la difesa a tre di Thiago Motta',
    slug: 'analisi-tattica-difesa-tre-thiago-motta',
    excerpt: 'Thiago Motta sorprende tutti con il passaggio alla difesa a tre. Come cambia il sistema di gioco bianconero.',
    content: `
      <p>Nelle ultime quattro partite Thiago Motta ha sorpreso tutti schierando la Juventus con la difesa a tre. Un cambio tattico significativo che ha portato risultati immediati: 4 vittorie e zero gol subiti.</p>
      <h2>Il 3-5-2 tattico</h2>
      <p>Il modulo base è un 3-5-2 che in fase di possesso diventa un 3-2-5, con gli esterni che si alzano sulla linea degli attaccanti. Bremer, Gatti e un terzo centrale (alternando Danilo e Cabal) formano il terzetto difensivo.</p>
      <h2>Il ruolo chiave dei quinti</h2>
      <p>Cambiaso a destra e uno tra Kostic e un giovane della Next Gen a sinistra: i quinti sono il motore del gioco. Devono coprire tutta la fascia, attaccando e difendendo con uguale intensità.</p>
      <h2>I vantaggi</h2>
      <p>Il passaggio alla difesa a tre ha garantito maggiore copertura centrale, più opzioni in fase di costruzione dal basso e una superiore solidità difensiva. I numeri parlano chiaro: da 1.5 gol subiti a partita si è passati a 0.</p>
    `,
    cover_image: 'https://placehold.co/800x450/057a55/FFFFFF?text=TATTICA+3-5-2',
    category_id: 'cat-03',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 9100,
    created_at: '2026-02-10T11:00:00Z',
    updated_at: '2026-02-10T11:00:00Z',
    published_at: '2026-02-10T12:00:00Z',
    scheduled_at: null,
    categories: cat('formazione'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-21',
    title: 'Top 10: i gol più belli della stagione bianconera',
    slug: 'top-10-gol-piu-belli-stagione',
    excerpt: 'Dalla rovesciata di Vlahovic al tiro a giro di Yildiz: ecco la classifica dei gol più spettacolari.',
    content: `
      <p>La stagione della Juventus è stata ricca di gol spettacolari. Abbiamo selezionato i 10 più belli, quelli che hanno fatto alzare i tifosi in piedi e che resteranno nella memoria collettiva.</p>
      <h2>10. Locatelli vs Napoli — Il destro da fuori area</h2>
      <p>Un tiro potente e preciso dal limite dell'area che si è insaccato all'incrocio dei pali. Gol pesantissimo che ha sbloccato il big match.</p>
      <h2>9. Cambiaso vs Milan — La cavalcata solitaria</h2>
      <p>Partenza dalla propria metà campo, dribbling su tre avversari e conclusione a fil di palo. Un gol alla Maicon.</p>
      <h2>8. Vlahovic vs Inter — La rovesciata</h2>
      <p>Cross di Yildiz dalla sinistra e rovesciata acrobatica del serbo. Gol di una bellezza rara che ha deciso il Derby d'Italia.</p>
      <h2>7-1. Gli altri capolavori</h2>
      <p>Dal sinistro a giro di Yildiz contro il Barcellona in Champions alla punizione magistrale di Vlahovic nel derby: una stagione di gol da standing ovation. Ogni rete racconta una storia diversa, un momento di pura magia calcistica.</p>
    `,
    cover_image: 'https://placehold.co/800x450/1a56db/FFFFFF?text=TOP+10+GOL',
    category_id: 'cat-01',
    author_id: 'usr-01',
    status: 'published',
    featured: false,
    views: 16200,
    created_at: '2026-02-05T08:00:00Z',
    updated_at: '2026-02-05T08:00:00Z',
    published_at: '2026-02-05T09:00:00Z',
    scheduled_at: null,
    categories: cat('calcio'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-22',
    title: 'Serie A: le pagelle della 28ª giornata — Juve promossa',
    slug: 'serie-a-pagelle-28-giornata-juve-promossa',
    excerpt: 'Quattro giocatori sopra il 7 nella vittoria contro il Verona. Ecco i voti della redazione.',
    content: `
      <p>La Juventus batte il Verona 3-1 e consolida il secondo posto in classifica. Prestazione convincente con diversi giocatori in evidenza.</p>
      <h2>I migliori</h2>
      <p><strong>Yildiz 8:</strong> Un gol e un assist. Ormai è il faro del gioco offensivo bianconero, ogni azione pericolosa passa dai suoi piedi.</p>
      <p><strong>Bremer 7.5:</strong> Muro invalicabile. Vince tutti i duelli aerei e legge le situazioni con anticipo perfetto.</p>
      <p><strong>Vlahovic 7.5:</strong> Doppietta e spirito di sacrificio. Corre, lotta e segna: il centravanti completo che la Juve cercava.</p>
      <p><strong>Locatelli 7:</strong> Regia precisa e un recupero palla decisivo che lancia il contropiede del 3-1.</p>
      <h2>Da migliorare</h2>
      <p><strong>Kostic 5.5:</strong> Ancora in difficoltà sulla fascia. Perde troppi palloni e non riesce a incidere in fase offensiva.</p>
    `,
    cover_image: 'https://placehold.co/800x450/e02424/FFFFFF?text=PAGELLE+28',
    category_id: 'cat-05',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 10500,
    created_at: '2026-01-28T20:00:00Z',
    updated_at: '2026-01-28T20:00:00Z',
    published_at: '2026-01-28T21:00:00Z',
    scheduled_at: null,
    categories: cat('serie-a'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-23',
    title: 'Il ritorno in Champions: cronaca di un\'impresa',
    slug: 'ritorno-champions-cronaca-impresa',
    excerpt: 'Dalla delusione delle scorse stagioni alla rinascita europea. Come la Juve è tornata protagonista in Champions.',
    content: `
      <p>Due anni fa la Juventus veniva eliminata ai gironi e sembrava lontanissima dall'élite europea. Oggi è ai quarti di finale di Champions League e sogna in grande. Ecco come è avvenuta la rinascita.</p>
      <h2>Il percorso nel girone</h2>
      <p>Primo posto nel girone con 14 punti: 4 vittorie, 2 pareggi e zero sconfitte. Il miglior girone della Juventus dal 2018. Vittorie di prestigio contro Bayern Monaco e Atletico Madrid.</p>
      <h2>Gli ottavi da brivido</h2>
      <p>Contro il Borussia Dortmund la Juve ha dimostrato carattere. Sconfitta 2-1 in Germania, poi rimonta trionfale all'Allianz Stadium con un 3-0 che ha fatto esplodere lo stadio.</p>
      <h2>L'effetto Thiago Motta</h2>
      <p>Il merito principale va all'allenatore, che ha saputo costruire una mentalità europea in una squadra giovane. "In Champions non esistono partite facili, ma noi non abbiamo paura di nessuno", le sue parole dopo la qualificazione ai quarti.</p>
    `,
    cover_image: 'https://placehold.co/800x450/7e3af2/FFFFFF?text=UCL+RITORNO',
    category_id: 'cat-04',
    author_id: 'usr-01',
    status: 'published',
    featured: false,
    views: 14100,
    created_at: '2026-01-20T15:00:00Z',
    updated_at: '2026-01-20T15:00:00Z',
    published_at: '2026-01-20T16:00:00Z',
    scheduled_at: null,
    categories: cat('champions'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-24',
    title: 'Mercato: il punto sulle cessioni estive e il bilancio',
    slug: 'mercato-punto-cessioni-estive-bilancio',
    excerpt: 'La Juve deve cedere per comprare. Ecco i giocatori in uscita e quanto potrebbero portare nelle casse.',
    content: `
      <p>Il mercato della Juventus non sarà solo in entrata. Per finanziare i colpi estivi, la dirigenza dovrà prima cedere diversi giocatori considerati fuori dal progetto tecnico.</p>
      <h2>I nomi in uscita</h2>
      <p>Almeno tre giocatori sono sulla lista cessioni: un difensore che non ha trovato spazio, un centrocampista in scadenza 2027 e un attaccante che ha deluso le aspettative. Il valore complessivo stimato si aggira intorno ai 45 milioni di euro.</p>
      <h2>L'obiettivo di bilancio</h2>
      <p>La Juventus punta a chiudere il mercato estivo con un saldo positivo di almeno 20 milioni, per rispettare i parametri del Fair Play Finanziario UEFA e mantenere i conti in ordine.</p>
      <h2>Le tempistiche</h2>
      <p>Le prime trattative in uscita dovrebbero concretizzarsi già a maggio, prima dell'apertura ufficiale della sessione estiva, per avere liquidità immediata da reinvestire.</p>
    `,
    cover_image: 'https://placehold.co/800x450/F5A623/000000?text=CESSIONI+ESTATE',
    category_id: 'cat-02',
    author_id: 'usr-02',
    status: 'published',
    featured: false,
    views: 7800,
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    published_at: '2026-01-15T11:00:00Z',
    scheduled_at: null,
    categories: cat('mercato'),
    profiles: prof('usr-02'),
  },
  {
    id: 'art-25',
    title: 'Esclusiva: "Alla Juve si respira aria di scudetto"',
    slug: 'esclusiva-alla-juve-aria-scudetto',
    excerpt: 'Un ex campione bianconero racconta le sensazioni che si vivono a Torino e perché questa Juve può vincere il titolo.',
    content: `
      <p>Per BianconeriHub abbiamo intervistato una leggenda bianconera che frequenta ancora Continassa e conosce l'ambiente dall'interno. Le sue parole trasudano ottimismo.</p>
      <h2>L'atmosfera a Continassa</h2>
      <p><em>"Ogni volta che vado a Continassa respiro un'aria diversa rispetto agli anni scorsi. C'è entusiasmo, c'è voglia di vincere, ma soprattutto c'è serenità. Thiago Motta ha creato un gruppo vero, dove tutti remano nella stessa direzione."</em></p>
      <h2>Il confronto con il passato</h2>
      <p><em>"Questo gruppo mi ricorda la Juve del 2015, quella che arrivò in finale di Champions. Stessa fame, stessa umiltà, stessa voglia di sorprendere. Con la differenza che questa squadra è più giovane e ha margini di crescita enormi."</em></p>
      <h2>La corsa scudetto</h2>
      <p><em>"L'Inter è forte, il Napoli è solido, ma la Juve ha qualcosa in più: la mentalità. Quando indossi quella maglia, senti il peso della storia e questo ti spinge a dare il 110%. Credo che lo scudetto sia alla portata."</em></p>
    `,
    cover_image: 'https://placehold.co/800x450/ff5a1f/FFFFFF?text=ESCLUSIVA',
    category_id: 'cat-06',
    author_id: 'usr-01',
    status: 'published',
    featured: false,
    views: 8400,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
    published_at: '2026-01-10T10:00:00Z',
    scheduled_at: null,
    categories: cat('interviste'),
    profiles: prof('usr-01'),
  },
  {
    id: 'art-26',
    title: 'La strategia commerciale della Juve: ricavi record nel 2026',
    slug: 'strategia-commerciale-juve-ricavi-record-2026',
    excerpt: 'Il club bianconero raggiunge nuovi record nei ricavi commerciali. Il piano per diventare un top club globale.',
    content: `
      <p>La Juventus ha comunicato i dati del primo semestre 2026: ricavi commerciali in crescita del 22% rispetto allo stesso periodo dell'anno precedente. Un risultato che conferma la bontà della strategia di espansione globale del brand.</p>
      <h2>I numeri chiave</h2>
      <p>Ricavi da sponsorizzazioni: +18%. Ricavi da merchandising: +31%. Ricavi da licensing: +25%. Numeri che posizionano la Juventus tra i primi 10 club al mondo per fatturato commerciale.</p>
      <h2>L'espansione in Asia e USA</h2>
      <p>Particolarmente significativa la crescita nei mercati asiatici (+45%) e nordamericani (+38%). Le tournée estive e le partnership strategiche con brand locali stanno pagando dividendi importanti.</p>
      <h2>Il progetto J-Village</h2>
      <p>L'ampliamento del J-Village, il centro sportivo della Juventus, prevede nuove aree commerciali, un museo interattivo e un hotel brandizzato. I lavori inizieranno nell'estate 2026.</p>
    `,
    cover_image: 'https://placehold.co/800x450/1a1a1a/F5A623?text=BUSINESS+JUVE',
    category_id: 'cat-06',
    author_id: 'usr-03',
    status: 'published',
    featured: false,
    views: 4300,
    created_at: '2026-01-05T08:00:00Z',
    updated_at: '2026-01-05T08:00:00Z',
    published_at: '2026-01-05T09:00:00Z',
    scheduled_at: null,
    categories: cat('interviste'),
    profiles: prof('usr-03'),
  },
  // Draft article (for admin testing)
  {
    id: 'art-11',
    title: 'Bozza: Preview della prossima giornata di campionato',
    slug: 'preview-prossima-giornata',
    excerpt: 'Tutti i temi della prossima giornata di Serie A con focus sulla sfida della Juventus.',
    content: '<p>Articolo in lavorazione…</p>',
    cover_image: null,
    category_id: 'cat-05',
    author_id: 'usr-01',
    status: 'draft',
    featured: false,
    views: 0,
    created_at: '2026-04-01T14:00:00Z',
    updated_at: '2026-04-01T14:00:00Z',
    published_at: null,
    scheduled_at: null,
    categories: cat('serie-a'),
    profiles: prof('usr-01'),
  },
]

// ── ARTICLE-TAG JUNCTION ────────────────────────────────────────────────────
export const article_tags = [
  { article_id: 'art-01', tag_id: 'tag-01' }, // Vlahovic
  { article_id: 'art-01', tag_id: 'tag-03' }, // Allianz Stadium
  { article_id: 'art-03', tag_id: 'tag-02' }, // Thiago Motta
  { article_id: 'art-04', tag_id: 'tag-04' }, // Scudetto
  { article_id: 'art-05', tag_id: 'tag-04' }, // Scudetto
  { article_id: 'art-07', tag_id: 'tag-01' }, // Vlahovic
  { article_id: 'art-08', tag_id: 'tag-05' }, // Next Gen
  { article_id: 'art-10', tag_id: 'tag-03' }, // Allianz Stadium
  { article_id: 'art-12', tag_id: 'tag-06' }, // Yildiz
  { article_id: 'art-14', tag_id: 'tag-08' }, // Coppa Italia
  { article_id: 'art-15', tag_id: 'tag-07' }, // Cambiaso
  { article_id: 'art-15', tag_id: 'tag-10' }, // Tattiche
  { article_id: 'art-16', tag_id: 'tag-04' }, // Scudetto
  { article_id: 'art-19', tag_id: 'tag-09' }, // Juve Women
  { article_id: 'art-20', tag_id: 'tag-10' }, // Tattiche
  { article_id: 'art-20', tag_id: 'tag-02' }, // Thiago Motta
  { article_id: 'art-21', tag_id: 'tag-01' }, // Vlahovic
  { article_id: 'art-21', tag_id: 'tag-06' }, // Yildiz
  { article_id: 'art-23', tag_id: 'tag-04' }, // Scudetto
  { article_id: 'art-25', tag_id: 'tag-04' }, // Scudetto
]

// ── COMMENTS (approved, for demo) ───────────────────────────────────────────
export const comments = [
  { id: 'com-01', article_id: 'art-01', author_name: 'Luca',   author_email: 'luca@example.com',   content: 'Grande partita! Vlahovic è in forma straordinaria.',  approved: true, created_at: '2026-03-30T14:30:00Z' },
  { id: 'com-02', article_id: 'art-01', author_name: 'Sara',   author_email: 'sara@example.com',   content: 'Derby dominato, che soddisfazione! Fino alla fine!',   approved: true, created_at: '2026-03-30T15:00:00Z' },
  { id: 'com-03', article_id: 'art-04', author_name: 'Andrea', author_email: 'andrea@example.com', content: 'Quarti di Champions meritatissimi. Grande squadra.',     approved: true, created_at: '2026-03-21T08:00:00Z' },
  { id: 'com-04', article_id: 'art-07', author_name: 'Marco',  author_email: 'marco@example.com',  content: '25 gol! Vlahovic è il miglior attaccante della Serie A.', approved: true, created_at: '2026-03-31T12:00:00Z' },
  { id: 'com-05', article_id: 'art-12', author_name: 'Fabio',  author_email: 'fabio@example.com',  content: 'Yildiz è un fenomeno! Tripletta pazzesca, futuro campione.',  approved: true, created_at: '2026-04-02T20:00:00Z' },
  { id: 'com-06', article_id: 'art-12', author_name: 'Chiara', author_email: 'chiara@example.com', content: 'Che giocatore incredibile! E ha solo 20 anni...',             approved: true, created_at: '2026-04-02T21:00:00Z' },
  { id: 'com-07', article_id: 'art-16', author_name: 'Davide', author_email: 'davide@example.com', content: 'PSG alla portata! Possiamo arrivare in semifinale!',         approved: true, created_at: '2026-03-22T18:00:00Z' },
  { id: 'com-08', article_id: 'art-19', author_name: 'Laura',  author_email: 'laura@example.com',  content: 'Orgogliosa delle nostre ragazze! Fino alla fine!',           approved: true, created_at: '2026-02-15T20:00:00Z' },
  { id: 'com-09', article_id: 'art-21', author_name: 'Simone', author_email: 'simone@example.com', content: 'Il gol di Vlahovic al derby è da brividi. TOP 1 assoluto!',  approved: true, created_at: '2026-02-05T12:00:00Z' },
  { id: 'com-10', article_id: 'art-14', author_name: 'Giulia', author_email: 'giulia@example.com', content: 'Locatelli decisivo! Semifinale meritata.',                   approved: true, created_at: '2026-03-06T08:00:00Z' },
]


// ── NEWSLETTER SUBSCRIBERS (vuoto per demo) ─────────────────────────────────
export const newsletter_subscribers = []

// ── DEMO AUTH USER ──────────────────────────────────────────────────────────
export const demoUser = {
  id: 'usr-01',
  email: 'demo@bianconerihub.com',
  user_metadata: { username: 'Redazione' },
  created_at: '2026-01-01T00:00:00Z',
}
