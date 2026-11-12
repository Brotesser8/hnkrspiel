/* SportSpy 3 — focused league pages with official badges and readable match cards */
(() => {
  'use strict';

  const LEAGUES = [
    {id:'national',name:'National League',sport:'hockey',label:'EISHOCKEY',source:'SIHF',accent:'blue'},
    {id:'super',name:'Super League',sport:'football',label:'FUSSBALL',source:'Open-Matchday',accent:'indigo'},
    {id:'swiss',name:'Swiss League',sport:'hockey',label:'EISHOCKEY',source:'SIHF',accent:'blue'},
    {id:'myhockey',name:'MyHockey League',sport:'hockey',label:'EISHOCKEY',source:'SIHF',accent:'blue'}
  ];
  const FOOTBALL_LOGOS = Object.freeze({
    'youngboys':'bsc-young-boys','basel':'fc-basel','lugano':'fc-lugano',
    'luzern':'fc-luzern','sion':'fc-sion','stgallen':'fc-st-gallen',
    'thun':'fc-thun','zurich':'fc-zurich','grasshoppers':'grasshopper-club-zurich',
    'lausanne':'lausanne-sport','servette':'servette-fc','vaduz':'vaduz'
  });
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const today = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Zurich',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const dayShift = (day,n) => {const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
  const dateLabel = (day, opts={}) => {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(day))) return 'Datum unbekannt';
    return new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',...opts}).format(new Date(day+'T12:00:00Z'));
  };
  const formatDay = day => dateLabel(day,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const dateShort = day => dateLabel(day,{weekday:'short',day:'numeric',month:'short'});
  const leagueOf = id => LEAGUES.find(l=>l.id===id);
  const icon = {
    arrow:'<svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    calendar:'<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>',
    star:'<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.75 6.35.92-4.6 4.49 1.09 6.34L12 17.5l-5.64 3 1.08-6.34-4.6-4.49 6.35-.92L12 3Z"/></svg>',
    left:'<svg viewBox="0 0 24 24"><path d="m14 6-6 6 6 6"/></svg>',
    right:'<svg viewBox="0 0 24 24"><path d="m10 6 6 6-6 6"/></svg>'
  };
  const app = {snapshot:null,loading:true,selectedDate:today(),favorites:new Set(),tableSearch:'',route:null};

  try {
    const v=JSON.parse(localStorage.getItem('sportspy-favorites-v2') || '[]');
    if(Array.isArray(v)) app.favorites=new Set(v.filter(x=>typeof x==='string'));
  }catch(_){}

  function badgeUrl(leagueId,team){
    if(!team) return null;
    const l=leagueOf(leagueId);
    if(l?.sport==='hockey' && /^\d{3,8}$/.test(String(team.id || ''))) {
      return 'https://www.sihf.ch/images/team/' + encodeURIComponent(team.id) + '.png';
    }
    if(leagueId==='super'){
      const key=String(team.id || '').replace(/[^a-z0-9]/gi,'').toLowerCase();
      const slug=FOOTBALL_LOGOS[key];
      if(slug) return 'https://www.footylogos.com/dls/logo/rgba-v1/' + slug + '.png';
    }
    // Only use curated sources, not arbitrary URLs inside external API data.
    return null;
  }
  function badge(leagueId,team,cls=''){
    const short=String(team?.short || team?.name || '?').replace(/[^A-Za-zÀ-ÿ0-9]/g,'').slice(0,2).toUpperCase();
    const url=badgeUrl(leagueId,team);
    return '<span class="crest '+cls+'" aria-hidden="true"><span class="crest-fallback">'+escapeHTML(short||'?')+'</span>'+
      (url?'<img src="'+escapeHTML(url)+'" alt="" loading="lazy" decoding="async" onerror="this.remove()">':'')+'</span>';
  }
  function favId(leagueId,t){return leagueId+':'+String(t.id)};
  function isFav(leagueId,t){return app.favorites.has(favId(leagueId,t))}
  function star(leagueId,team,cls=''){
    if(!team)return '';
    const selected=isFav(leagueId,team);
    return '<button type="button" class="star-button '+cls+(selected?' is-favorite':'')+'" data-fav="'+escapeHTML(favId(leagueId,team))+'" title="'+escapeHTML(selected?'Favorit entfernen':'Als Favorit speichern')+'" aria-label="'+escapeHTML(team.name+(selected?' aus Favoriten entfernen':' zu Favoriten hinzufügen'))+'" aria-pressed="'+String(selected)+'">'+icon.star+'</button>';
  }
  function snapshotLeague(id){return app.snapshot?.leagues?.[id] || null}
  function leagueGames(id){
    const obj=snapshotLeague(id);
    return Array.isArray(obj?.matches) && obj.matchesAvailable ? obj.matches.filter(g=>g?.date&&g?.home&&g?.away) : [];
  }
  function allGames(){return LEAGUES.flatMap(l=>leagueGames(l.id))}
  function sortedGames(games,reverse=false){
    return [...games].sort((a,b)=>{
      const k = (String(a.date)+' '+String(a.time||'')).localeCompare(String(b.date)+' '+String(b.time||''));
      return (reverse?-k:k)||String(a.id).localeCompare(String(b.id));
    });
  }
  function parseRoute(){
    const bits=(location.hash || '#home').slice(1).split('/');
    if(bits[0]==='liga'&&leagueOf(bits[1]))
      return {page:'league',id:bits[1],tab:['heute','naechste','resultate','tabelle'].includes(bits[2])?bits[2]:'heute'};
    if(bits[0]==='favoriten')return {page:'favorites'};
    return {page:'home'};
  }
  function setTheme(v){
    const theme=v==='dark'?'dark':'light';
    document.documentElement.dataset.theme=theme;
    $('#themeColor').content=theme==='dark'?'#101823':'#f7f9fc';
    for(const [id,val] of [['themeDark','dark'],['themeLight','light']]){
      const b=$('#'+id);b.classList.toggle('selected',theme===val);b.setAttribute('aria-pressed',String(theme===val));
    }
    try{localStorage.setItem('sportspy-theme',theme)}catch(_){}
  }
  function closeMenu(){
    $('#sidebar').classList.remove('mobile-open');$('#scrim').hidden=true;
    $('#menuButton').setAttribute('aria-expanded','false');
  }
  function setStatus(){
    const label=$('#dataStatus');
    const stamp=app.snapshot?.generatedAt;
    const time=new Date(stamp);
    if(!stamp || !Number.isFinite(time.getTime())){
      label.className='data-status stale';
      label.innerHTML='<i></i>'+(app.loading?'Daten werden geladen':'Daten nicht verfügbar');
      return;
    }
    const age=Date.now()-time.getTime();
    const incomplete=LEAGUES.some(l=>{const d=snapshotLeague(l.id);return !d?.matchesAvailable || !d?.standingsAvailable || d?.errors?.length>0;});
    const stale=age>2*60*60*1000 || incomplete;
    label.className='data-status '+(stale?'stale':'fresh');
    const clock=new Intl.DateTimeFormat('de-CH',{timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit'}).format(time);
    label.innerHTML='<i></i>'+escapeHTML((stale?'Letzter Stand ':'Aktualisiert ')+clock);
    label.title='Datenstand: '+time.toLocaleString('de-CH',{timeZone:'Europe/Zurich'});
  }
  function matchMarkup(g){
    const finished=g.state==='final',live=g.state==='live',cancelled=g.state==='cancelled';
    const showScore=(finished||live)&&g.homeScore!=null&&g.awayScore!=null;
    const status=cancelled?'Abgesagt':live?'LIVE':finished?'Beendet':'Geplant';
    const kicker=(g.time&&g.time!=='–')?g.time+' Uhr':'Anspielzeit offen';
    const score=showScore?escapeHTML(g.homeScore)+' : '+escapeHTML(g.awayScore):'– : –';
    const body=(t,side) => '<div class="match-side '+side+'">'+badge(g.leagueId,t,'crest-md')+
      '<div class="match-team-copy"><strong>'+escapeHTML(t.name)+'</strong><small>'+escapeHTML(side==='home'?'HEIM':'GAST')+'</small></div>'+
      star(g.leagueId,t,'match-star')+'</div>';
    return '<article class="game-card"><div class="game-topline"><span>'+escapeHTML(dateShort(g.date))+' <span class="text-divider">·</span> '+escapeHTML(kicker)+'</span>'+
      '<span class="game-state '+(live?'state-live':finished?'state-final':cancelled?'state-cancelled':'')+'">'+(live?'<i></i>':'')+status+'</span></div>'+
      '<div class="game-body">'+body(g.home,'home')+
      '<div class="game-score"><strong class="'+(showScore?'has-score':'')+'">'+score+'</strong><small>'+(showScore?(finished?'ENDSTAND':'ZWISCHENSTAND'):'VS')+'</small></div>'+
      body(g.away,'away')+'</div></article>';
  }
  function emptyBox(title,description){
    return '<div class="empty-box"><span class="empty-illustration">'+icon.calendar+'</span><h3>'+escapeHTML(title)+'</h3><p>'+escapeHTML(description)+'</p></div>';
  }
  function renderLeagueCards(){
    const now=today();
    $('#leagueCards').innerHTML=LEAGUES.map((l,i)=>{
      const obj=snapshotLeague(l.id);
      const games=leagueGames(l.id);
      const next=games.filter(g=>g.state==='scheduled'&&g.date>=now).length;
      const teams=(obj?.standings||[]).slice(0,3);
      const crests=teams.map(r=>badge(l.id,r.team,'crest-preview')).join('');
      return '<a href="#liga/'+l.id+'/heute" class="league-card league-'+l.id+'">' +
        '<div class="card-topline"><span class="card-sport-label">'+escapeHTML(l.label)+'</span><span class="card-number">0'+(i+1)+'</span></div>'+
        '<div class="card-emblem">'+(l.sport==='hockey'?'H':'F')+'</div>'+
        '<div class="card-text"><h3>'+escapeHTML(l.name)+'</h3><span>'+escapeHTML(obj?.season?'Saison '+obj.season:'Schweizer Liga')+'</span></div>'+
        '<div class="card-bottom"><div class="preview-crests">'+crests+'</div><div class="card-action">'+(app.loading?'Laden …':next+' nächste Spiele')+' '+icon.arrow+'</div></div>'+
        '</a>';
    }).join('');
  }
  function renderHome(){
    $('#currentDate').textContent=dateLabel(today(),{weekday:'long',day:'numeric',month:'long'});
    $('#homeDate').textContent=formatDay(today());
    renderLeagueCards();
    const matches=sortedGames(allGames().filter(g=>g.date===today()));
    const games=matches.length?matches.slice(0,3):sortedGames(allGames().filter(g=>g.date>today()&&g.state==='scheduled')).slice(0,3);
    if(!games.length){
      $('#homeMatches').innerHTML=emptyBox(app.loading?'Spiele werden geladen':'Noch keine Partien','Die Datenquellen werden regelmässig aktualisiert.');
      return;
    }
    const label=matches.length?'Heutige Spiele':'Die nächsten Partien';
    $('#homeMatches').innerHTML='<p class="home-group-label">'+label+'</p>'+games.map(g=>{
      const l=leagueOf(g.leagueId);
      return '<div class="home-match-row"><div class="home-match-league"><span class="sport-tile '+(l.sport==='hockey'?'hockey-tile':'football-tile')+'">'+(l.sport==='hockey'?'H':'F')+'</span><span>'+escapeHTML(l.name)+'</span></div>'+
        '<div class="home-pair">'+badge(g.leagueId,g.home,'crest-small')+badge(g.leagueId,g.away,'crest-small')+
        '<strong>'+escapeHTML(g.home.name)+' <span>vs.</span> '+escapeHTML(g.away.name)+'</strong></div>'+
        '<div class="home-match-date">'+escapeHTML(g.date===today()?(g.time&&g.time!=='–'?g.time+' Uhr':'Heute'):dateShort(g.date))+'</div>'+
        '<a class="round-arrow" href="#liga/'+g.leagueId+'/'+(g.date===today()?'heute':'naechste')+'" aria-label="'+escapeHTML(l.name+' öffnen')+'">'+icon.arrow+'</a></div>';
    }).join('')+'<div class="home-afterword">Wähle eine Liga, um alle ihre Partien und die Tabelle zu sehen.</div>';
  }
  function matchGroups(games,limit){
    const subset=games.slice(0,limit);
    const byDay=new Map();
    for(const g of subset){if(!byDay.has(g.date))byDay.set(g.date,[]);byDay.get(g.date).push(g)}
    return [...byDay].map(([date,rows])=>'<section class="match-day-group"><div class="group-title"><h3>'+escapeHTML(formatDay(date))+'</h3><span>'+rows.length+' '+(rows.length===1?'Spiel':'Spiele')+'</span></div><div class="game-stack">'+rows.map(matchMarkup).join('')+'</div></section>').join('');
  }
  function renderDayTools(){
    const d=app.selectedDate;
    $('#viewTools').innerHTML='<div class="date-controls">'+
      '<button type="button" data-shift="-1" aria-label="Vorheriger Tag">'+icon.left+'</button>'+
      '<label class="date-selector">'+icon.calendar+'<span>'+escapeHTML(dateShort(d))+'</span><input type="date" id="dayPicker" value="'+escapeHTML(d)+'" aria-label="Datum auswählen"></label>'+
      '<button type="button" data-shift="1" aria-label="Nächster Tag">'+icon.right+'</button></div>'+
      '<button type="button" class="today-ghost" id="resetToday">Heute</button>';
  }
  function renderStandings(l,obj){
    const rows=Array.isArray(obj?.standings)?obj.standings:[];
    if(!rows.length) return emptyBox('Tabelle nicht verfügbar','Für diese Liga liegen derzeit keine Tabellendaten vor.');
    const filtered=rows.filter(r=>String(r.team?.name||'').toLocaleLowerCase('de-CH').includes(app.tableSearch.toLocaleLowerCase('de-CH')));
    const football=l.sport==='football';
    const headers='<th scope="col">#</th><th scope="col" class="team-col">Verein</th><th scope="col" title="Spiele">SP</th>'+
      (football?'<th scope="col" class="extra-stat" title="Siege">S</th><th scope="col" class="extra-stat" title="Unentschieden">U</th><th scope="col" class="extra-stat" title="Niederlagen">N</th>':'')+
      '<th scope="col" title="Tor-/Tordifferenz">DIFF</th><th scope="col" class="points-col" title="Punkte">PKT</th>';
    const body=filtered.map((r,i)=>{
      const diff=r.diff==null?'–':((Number(r.diff)>0?'+':'')+r.diff);
      return '<tr><td><span class="rank'+(Number(r.rank)<=4?' rank-top':'')+'">'+escapeHTML(r.rank||i+1)+'</span></td>'+
        '<td><div class="table-team">'+badge(l.id,r.team,'crest-small')+'<strong>'+escapeHTML(r.team.name)+'</strong>'+star(l.id,r.team,'table-star')+'</div></td>'+
        '<td>'+escapeHTML(r.played??'–')+'</td>'+(football?'<td class="extra-stat">'+escapeHTML(r.wins??'–')+'</td><td class="extra-stat">'+escapeHTML(r.draws??'–')+'</td><td class="extra-stat">'+escapeHTML(r.losses??'–')+'</td>':'')+
        '<td>'+escapeHTML(diff)+'</td><td class="points-cell">'+escapeHTML(r.points??'–')+'</td></tr>';
    }).join('')||'<tr><td class="empty-row" colspan="'+(football?8:5)+'">Kein Team gefunden.</td></tr>';
    return '<div class="table-shell"><div class="table-intro"><div><strong>'+escapeHTML(l.name)+'</strong><small>SAISON '+escapeHTML(obj?.season||'–')+'</small></div><label class="table-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg><input id="teamSearch" type="search" value="'+escapeHTML(app.tableSearch)+'" placeholder="Team suchen …" aria-label="Tabelle durchsuchen"></label></div>'+
      '<div class="table-scroll"><table class="standings-table"><thead><tr>'+headers+'</tr></thead><tbody>'+body+'</tbody></table></div>'+
      '<div class="table-bottom">SP = Spiele · DIFF = Tordifferenz · PKT = Punkte'+(obj?.tableCalculated?' · Aus Resultaten berechnet':'')+'</div></div>';
  }
  function renderLeague(){
    const {id,tab}=app.route,l=leagueOf(id),obj=snapshotLeague(id),games=leagueGames(id);
    $('#leagueIcon').className='league-hero-icon '+(l.sport==='hockey'?'hockey-cover':'football-cover');
    $('#leagueIcon').textContent=l.sport==='hockey'?'H':'F';
    $('#leagueTitle').textContent=l.name;
    $('#leagueSport').textContent=l.label+' · SCHWEIZ';
    $('#leagueSubtitle').textContent='Saison '+(obj?.season||'–')+' · '+(l.sport==='hockey'?'Schweizer Eishockey':'Schweizer Fussball');
    $('#leagueTeams').textContent=(obj?.standings?.length||'–')+' Teams';
    $('#leagueSource').textContent=l.source;
    $$('#leagueTabs [data-tab]').forEach(a=>{
      a.href='#liga/'+id+'/'+a.dataset.tab;
      a.classList.toggle('active',a.dataset.tab===tab);
      if(a.dataset.tab===tab)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    const config={
      heute:['SPIELTAG','Spiele am gewählten Tag','Wähle einen Spieltag und sieh nur die Partien dieser Liga.'],
      naechste:['AUSBLICK','Nächste Spiele','Alle kommenden Partien dieser Liga, chronologisch sortiert.'],
      resultate:['RÜCKBLICK','Letzte Resultate','Die letzten abgeschlossenen Partien dieser Liga.'],
      tabelle:['KLASSIERUNG','Tabelle','Die aktuelle Rangliste auf einen Blick.']
    }[tab];
    $('#viewEyebrow').textContent=config[0];$('#viewTitle').textContent=config[1];$('#viewDescription').textContent=config[2];
    $('#viewTools').innerHTML='';
    if(tab==='heute')renderDayTools();
    if(tab==='tabelle'){
      $('#leagueContent').innerHTML=renderStandings(l,obj);
    }else{
      let matches=[];
      if(tab==='heute')matches=sortedGames(games.filter(g=>g.date===app.selectedDate));
      else if(tab==='naechste')matches=sortedGames(games.filter(g=>g.date>=today()&&g.state==='scheduled')).slice(0,36);
      else matches=sortedGames(games.filter(g=>g.date<=today()&&(g.state==='final'||g.state==='cancelled')),true).slice(0,36);
      const isToday=tab==='heute';
      $('#leagueContent').innerHTML=matches.length?'<div class="results-container">'+matchGroups(matches,36)+'</div>':
        emptyBox(app.loading?'Daten werden geladen':isToday?'An diesem Tag kein Spiel':'Keine Spiele verfügbar',
          app.loading?'Die Sportdaten werden abgerufen.':isToday?'Nutze die Datumsauswahl, um einen anderen Spieltag anzusehen.':'Für diesen Bereich sind momentan keine Partien hinterlegt.');
    }
    const date=obj?.[tab==='tabelle'?'standingsUpdatedAt':'matchesUpdatedAt'];
    const formatted=date&&Number.isFinite(Date.parse(date))?new Date(date).toLocaleString('de-CH',{timeZone:'Europe/Zurich'}):'unbekannt';
    const partial=(obj?.errors?.length||0)>0;
    $('#sourceNote').textContent='Datenquelle: '+l.source+' · Letzter Abgleich: '+formatted+(partial?' · Hinweis: Einige Daten sind verzögert.':'')+
      (obj?.tableCalculated&&tab==='tabelle'?' · Berechnete Rangliste; offizielle Tie-Breaker können abweichen.':'');
  }
  function favoriteRecords(){
    const records=[];
    for(const l of LEAGUES){
      const obj=snapshotLeague(l.id);
      const seen=new Map();
      for(const row of obj?.standings||[]) if(row.team)seen.set(String(row.team.id),row.team);
      for(const g of obj?.matches||[])for(const t of [g.home,g.away])if(t)seen.set(String(t.id),t);
      for(const t of seen.values())if(isFav(l.id,t))records.push({league:l,team:t});
    }
    return records;
  }
  function renderFavorites(){
    const selected=favoriteRecords();
    $('#favoriteTeams').innerHTML=selected.length?selected.map(({league:l,team:t})=>'<div class="favorite-team">'+badge(l.id,t,'crest-lg')+
      '<div class="favorite-copy"><strong>'+escapeHTML(t.name)+'</strong><small>'+escapeHTML(l.name)+'</small></div>'+
      star(l.id,t)+'</div>').join(''):
      emptyBox('Noch keine Lieblingsteams','Wähle in einer Liga den Stern neben einem Verein aus.');
    const games=sortedGames(allGames().filter(g=>g.date>=today()&&g.state==='scheduled'&&(isFav(g.leagueId,g.home)||isFav(g.leagueId,g.away)))).slice(0,12);
    $('#favoriteMatches').innerHTML=games.length?matchGroups(games,12):emptyBox('Noch keine kommenden Partien','Sobald deine Teams einen Spielplan haben, erscheinen ihre nächsten Spiele hier.');
  }
  function render(){
    app.route=parseRoute();
    const p=app.route;
    $('#homePage').hidden=p.page!=='home';$('#leaguePage').hidden=p.page!=='league';$('#favoritesPage').hidden=p.page!=='favorites';
    $('#breadcrumb').textContent=p.page==='home'?'ÜBERSICHT':p.page==='favorites'?'MEINE TEAMS':leagueOf(p.id)?.name.toUpperCase();
    $$('[data-nav]').forEach(a=>{
      const key=p.page==='league'?p.id:p.page;
      const active=a.dataset.nav===key;
      a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    $('#favoriteCount').textContent=app.favorites.size;
    setStatus();closeMenu();
    if(p.page==='home')renderHome();
    else if(p.page==='league')renderLeague();
    else renderFavorites();
  }
  function selectDay(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value+'T12:00:00Z')))return;
    app.selectedDate=value;renderLeague();
  }
  function events(){
    $('#themeLight').addEventListener('click',()=>setTheme('light'));
    $('#themeDark').addEventListener('click',()=>setTheme('dark'));
    $('#menuButton').addEventListener('click',()=>{
      const opened=$('#sidebar').classList.toggle('mobile-open');
      $('#scrim').hidden=!opened;
      $('#menuButton').setAttribute('aria-expanded',String(opened));
    });
    $('#scrim').addEventListener('click',closeMenu);
    window.addEventListener('hashchange',()=>{render();window.scrollTo({top:0,behavior:'instant'})});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
    document.addEventListener('change',e=>{
      if(e.target?.id==='dayPicker')selectDay(e.target.value);
    });
    document.addEventListener('input',e=>{
      if(e.target?.id==='teamSearch'){
        app.tableSearch=e.target.value;
        const index=e.target.selectionStart;
        renderLeague();
        const next=$('#teamSearch');
        if(next){next.focus();next.setSelectionRange(index,index)}
      }
    });
    document.addEventListener('click',e=>{
      const shift=e.target.closest('[data-shift]');
      if(shift){selectDay(dayShift(app.selectedDate,Number(shift.dataset.shift)));return}
      if(e.target.closest('#resetToday')){selectDay(today());return}
      const fav=e.target.closest('[data-fav]');
      if(fav){
        const id=fav.dataset.fav;
        if(app.favorites.has(id))app.favorites.delete(id);
        else app.favorites.add(id);
        try{localStorage.setItem('sportspy-favorites-v2',JSON.stringify([...app.favorites]))}catch(_){}
        render();
      }
    });
  }
  async function load(){
    try{
      const res=await fetch('./data/snapshot.json?v='+Date.now(),{cache:'no-store'});
      if(!res.ok)throw Error('HTTP '+res.status);
      const data=await res.json();
      if(!data||!data.leagues||typeof data.leagues!=='object')throw Error('Ungültiger Daten-Snapshot');
      app.snapshot=data;
    }catch(error){console.warn('SportSpy: Daten konnten nicht geladen werden',error)}
    finally{app.loading=false;render()}
  }
  setTheme(document.documentElement.dataset.theme);
  events();render();load();
  setInterval(()=>{if(!document.hidden)load()},120000);
})();