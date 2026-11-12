/* SportSpy client — GitHub Pages / static JSON, no external browser API keys */
(function () {
  'use strict';

  const LEAGUES = [
    { id:'national', name:'National League', short:'National League', sport:'hockey', letter:'H', source:'SIHF' },
    { id:'super', name:'Super League', short:'Super League', sport:'football', letter:'F', source:'Open-Matchday' },
    { id:'swiss', name:'Swiss League', short:'Swiss League', sport:'hockey', letter:'H', source:'SIHF' },
    { id:'myhockey', name:'MyHockey League', short:'MyHockey', sport:'hockey', letter:'H', source:'SIHF' }
  ];
  const find = sel => document.querySelector(sel);
  const findAll = sel => [...document.querySelectorAll(sel)];
  const clean = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const dateOf = d => new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/Zurich', year:'numeric', month:'2-digit', day:'2-digit'}).format(d);
  const currentDay = () => dateOf(new Date());
  const dayAdd = (day, n) => {
    const d = new Date(day + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0,10);
  };
  const dayDate = day => new Date(day + 'T12:00:00Z');
  const dayFormat = (day, options) => new Intl.DateTimeFormat('de-CH', Object.assign({timeZone:'Europe/Zurich'}, options)).format(dayDate(day));
  const leagueOf = id => LEAGUES.find(l => l.id === id) || LEAGUES[0];
  const escAttr = clean;
  const matchDateKey = m => String(m.date || '') + 'T' + String(m.time || '');
  const byMatchDate = (a, b) => matchDateKey(a).localeCompare(matchDateKey(b)) || a.id.localeCompare(b.id);
  const starSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.75 6.35.92-4.6 4.49 1.09 6.34L12 17.5l-5.64 3 1.08-6.34-4.6-4.49 6.35-.92L12 3Z"/></svg>';
  const emptySvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>';
  const state = {
    snapshot:null, date:currentDay(), scope:'all', sport:'all',
    view:'day', search:'', standings:'national',
    loading:true, error:null, favorites:new Set()
  };

  try {
    const saved = JSON.parse(localStorage.getItem('sportspy-favorites-v2') || '[]');
    if (Array.isArray(saved)) state.favorites = new Set(saved.filter(v => typeof v === 'string'));
  } catch {}

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    find('#lightMode').classList.toggle('active', theme === 'light');
    find('#darkMode').classList.toggle('active', theme === 'dark');
    find('#lightMode').setAttribute('aria-pressed', String(theme === 'light'));
    find('#darkMode').setAttribute('aria-pressed', String(theme === 'dark'));
    find('#themeColor').content = theme === 'dark' ? '#0f1623' : '#f6f8fc';
    try { localStorage.setItem('sportspy-theme', theme); } catch {}
  }

  function allMatches() {
    return LEAGUES.flatMap(l => {
      const obj = state.snapshot?.leagues?.[l.id];
      return Array.isArray(obj?.matches) && obj.matchesAvailable ? obj.matches : [];
    }).filter(m => m && m.date && m.home && m.away);
  }
  function isFavorite(leagueId, team) { return state.favorites.has(String(leagueId) + ':' + String(team.id)); }
  function matchIsFavorite(m) { return isFavorite(m.leagueId,m.home) || isFavorite(m.leagueId,m.away); }
  function favoriteButton(leagueId, team, compact) {
    const active = isFavorite(leagueId, team);
    return '<button class="fav-button' + (active ? ' active' : '') + '" type="button" data-favorite="' +
      escAttr(leagueId + ':' + team.id) + '" data-team-name="' + escAttr(team.name) +
      '" aria-label="' + escAttr(team.name + (active ? ' aus Favoriten entfernen' : ' zu Favoriten hinzufügen')) +
      '" aria-pressed="' + active + '" title="' + escAttr(active ? 'Favorit entfernen' : 'Team merken') + '">' + starSvg + '</button>';
  }
  function badge(team) {
    const short = String(team.short || team.name || '?').replace(/[^A-Za-zÀ-ÿ0-9]/g,'').slice(0,2).toUpperCase() || '?';
    const logo = typeof team.logo === 'string' && /^https:\/\/(a\.espncdn\.com|cdn\.espn\.com|a\.espncdn\.com\.br|www\.thesportsdb\.com|api\.thesportsdb\.com|r2\.thesportsdb\.com)\//i.test(team.logo)
      ? '<img src="' + escAttr(team.logo) + '" alt="" loading="lazy" onerror="this.remove()">' : '';
    return '<span class="team-mark" aria-hidden="true">' + (logo || clean(short)) + '</span>';
  }

  function renderDates() {
    const first = dayAdd(state.date, -3);
    const games = new Set(allMatches().map(m => m.date));
    find('#dateInput').value = state.date;
    find('#dayList').innerHTML = Array.from({length:7}, (_,i) => {
      const day = dayAdd(first, i), selected = day === state.date;
      const dayName = dayFormat(day,{weekday:'short'}).replace('.','').toUpperCase();
      const today = day === currentDay();
      return '<button type="button" class="day' + (selected ? ' selected' : '') + (today ? ' is-today' : '') +
        '" data-day="' + clean(day) + '" aria-pressed="' + selected + '" aria-label="' +
        clean(dayFormat(day,{weekday:'long',day:'numeric',month:'long'})) + '">' +
        '<small>' + clean(dayName) + '</small><strong>' + clean(day.slice(-2).replace(/^0/,'')) + '</strong>' +
        (games.has(day) ? '<em aria-hidden="true"></em>' : '') + '</button>';
    }).join('');
    find('#todayLabel').textContent = dayFormat(currentDay(), {weekday:'long',day:'numeric',month:'long'});
  }

  function updateStats() {
    const matches = allMatches(), today = currentDay();
    const available = LEAGUES.some(l => state.snapshot?.leagues?.[l.id]?.matchesAvailable);
    find('#statToday').textContent = available ? String(matches.filter(m => m.date === today).length) : '–';
    find('#statLive').textContent = available ? String(matches.filter(m => m.state === 'live').length) : '–';
    find('#statNext').textContent = available ? String(matches.filter(m => m.state === 'scheduled' && m.date >= today && m.date <= dayAdd(today,7)).length) : '–';
  }

  function filteredMatches() {
    const today = currentDay(), q = state.search.toLocaleLowerCase('de-CH').trim();
    let matches = allMatches().filter(m => {
      if (state.scope !== 'all' && state.scope !== 'favorites' && m.leagueId !== state.scope) return false;
      if (state.scope === 'favorites' && !matchIsFavorite(m)) return false;
      if (state.sport !== 'all' && leagueOf(m.leagueId).sport !== state.sport) return false;
      return !q || [m.home?.name, m.away?.name, leagueOf(m.leagueId).name].some(s => String(s || '').toLocaleLowerCase('de-CH').includes(q));
    });
    if (state.view === 'day') matches = matches.filter(m => m.date === state.date).sort(byMatchDate);
    else if (state.view === 'upcoming') matches = matches.filter(m => m.state === 'scheduled' && m.date >= today).sort(byMatchDate).slice(0,35);
    else matches = matches.filter(m => m.state === 'final' && m.date <= today).sort((a,b) => byMatchDate(b,a)).slice(0,35);
    return matches;
  }

  function matchMarkup(m) {
    const stateName = m.state === 'live' ? 'LIVE' : m.state === 'final' ? 'ENDE' : m.state === 'cancelled' ? 'ABGESAGT' : 'GEPLANT';
    const gameTime = m.state === 'final' ? 'Resultat' : String(m.time || '–');
    const withScore = (m.state === 'live' || m.state === 'final') && m.homeScore != null && m.awayScore != null;
    const score = (teamScore) => withScore ? clean(teamScore) : '–';
    return '<article class="match">' +
      '<div class="match-meta"><strong class="match-time">' + clean(gameTime) + '</strong><span class="match-status ' +
      (m.state === 'live' ? 'live' : '') + '">' + stateName + '</span></div>' +
      '<div class="teams"><div class="team-line">' + badge(m.home) + '<span class="team-name" title="' + escAttr(m.home.name) + '">' + clean(m.home.name) +
      '</span>' + favoriteButton(m.leagueId,m.home) + '</div><div class="team-line">' + badge(m.away) +
      '<span class="team-name" title="' + escAttr(m.away.name) + '">' + clean(m.away.name) +
      '</span>' + favoriteButton(m.leagueId,m.away) + '</div></div>' +
      '<div class="scores' + (withScore ? '' : ' scheduled') + '"><span>' + score(m.homeScore) + '</span><span>' + score(m.awayScore) + '</span></div></article>';
  }

  function emptyHtml(title, message, action) {
    return '<div class="empty-state"><span class="empty-symbol">' + emptySvg + '</span><strong>' + clean(title) +
      '</strong><p>' + clean(message) + '</p>' + (action ? '<button type="button" class="today-button" data-empty-upcoming>Demnächst ansehen ↗</button>' : '') + '</div>';
  }

  function renderMatches() {
    findAll('[data-view]').forEach(btn => {
      const active = state.view === btn.dataset.view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    findAll('[data-sport]').forEach(btn => {
      const active = state.sport === btn.dataset.sport;
      btn.classList.toggle('selected', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    let matches = filteredMatches();
    find('#gamesCount').textContent = matches.length + ' ' + (matches.length === 1 ? 'Spiel' : 'Spiele');
    if (state.loading && !state.snapshot) {
      find('#matches').innerHTML = '<div class="loading-state"><span class="loader"></span><p>Spiele werden geladen …</p></div>';
      return;
    }
    const someAvailable = LEAGUES.some(l => state.snapshot?.leagues?.[l.id]?.matchesAvailable);
    if (!matches.length) {
      let title = 'Keine Spiele gefunden';
      let message = 'Für diese Auswahl sind aktuell keine Partien hinterlegt.';
      if (!someAvailable) {
        title = 'Spieldaten nicht verfügbar';
        message = 'Die kostenlosen Datenquellen konnten noch nicht geladen werden. Bitte versuche es später erneut.';
      } else if (state.scope === 'favorites' && !state.favorites.size) {
        title = 'Noch keine Lieblingsteams';
        message = 'Markiere Teams über den Stern bei einer Partie oder in der Tabelle.';
      } else if (state.view === 'day' && !state.search) {
        title = 'An diesem Tag keine Spiele';
        message = 'Wähle einen anderen Spieltag oder sieh dir die nächsten Partien an.';
      }
      find('#matches').innerHTML = emptyHtml(title, message, someAvailable && state.view === 'day');
    } else {
      const groups = new Map();
      for (const match of matches) {
        const key = match.date + '|' + match.leagueId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(match);
      }
      find('#matches').innerHTML = [...groups].map(([key, items]) => {
        const l = leagueOf(items[0].leagueId);
        const day = items[0].date;
        const heading = l.name + (state.view === 'day' ? '' : ' · ' + dayFormat(day, {weekday:'short',day:'numeric',month:'short'}));
        return '<section class="group" aria-label="' + escAttr(heading) + '"><div class="group-heading"><span class="group-name"><span class="group-icon">' +
          l.letter + '</span>' + clean(heading) + '</span><span class="group-count">' + items.length +
          (items.length === 1 ? ' SPIEL' : ' SPIELE') + '</span></div>' + items.map(matchMarkup).join('') + '</section>';
      }).join('');
    }
    const issues = LEAGUES.filter(l => {
      const obj = state.snapshot?.leagues?.[l.id];
      return !obj?.matchesAvailable || (obj?.errors || []).some(e => e.startsWith('matches'));
    }).map(l => l.name);
    if (issues.length && state.snapshot) {
      find('#matches').insertAdjacentHTML('beforeend', '<div class="data-warning"><strong>Datenhinweis:</strong> Der Spielplan ist für ' +
        clean(issues.join(', ')) + ' momentan nicht vollständig verfügbar.</div>');
    }
  }

  function renderTableChoices() {
    find('#tableLeagueSelect').innerHTML = LEAGUES.map(l => {
      const active = state.standings === l.id;
      return '<button type="button" class="table-choice' + (active ? ' selected' : '') + '" data-table="' + l.id +
        '" aria-pressed="' + active + '">' + clean(l.short) + '</button>';
    }).join('');
  }

  function renderStandings() {
    const l = leagueOf(state.standings);
    const obj = state.snapshot?.leagues?.[l.id];
    const rows = Array.isArray(obj?.standings) ? obj.standings : [];
    const q = state.search.toLocaleLowerCase('de-CH').trim();
    find('#tableTitle').textContent = l.name;
    find('#tableSource').textContent = 'QUELLE: ' + l.source + (obj?.tableCalculated ? ' · BERECHNET' : '');
    find('#seasonLabel').textContent = 'SAISON ' + (obj?.season || '–');
    renderTableChoices();
    if (!rows.length) {
      find('#standingsBody').innerHTML = '<tr><td class="table-empty" colspan="5">' + (state.loading ? 'Tabelle wird geladen …' : 'Tabelle derzeit nicht verfügbar.') + '</td></tr>';
      return;
    }
    const filtered = rows.filter(r => !q || String(r.team?.name || '').toLocaleLowerCase('de-CH').includes(q));
    find('#standingsBody').innerHTML = filtered.map((r,i) => {
      const rank = r.rank ?? i + 1;
      return '<tr><td><span class="rank' + (rank <= 4 ? ' top' : '') + '">' + clean(rank) + '</span></td>' +
        '<td><div class="table-team">' + badge(r.team) + '<span class="table-team-name" title="' + escAttr(r.team.name) +
        '">' + clean(r.team.name) + '</span>' + favoriteButton(l.id, r.team, true) + '</div></td><td>' +
        clean(r.played ?? '–') + '</td><td>' + clean(r.diff == null ? '–' : (r.diff > 0 ? '+' : '') + r.diff) +
        '</td><td>' + clean(r.points ?? '–') + '</td></tr>';
    }).join('') || '<tr><td class="table-empty" colspan="5">Kein Team entspricht deiner Suche.</td></tr>';
  }

  function updateNavigation() {
    findAll('[data-scope]').forEach(btn => {
      const active = btn.dataset.scope === state.scope;
      btn.classList.toggle('active', active);
      if (active) btn.setAttribute('aria-current','page'); else btn.removeAttribute('aria-current');
    });
    find('#favCount').textContent = String(state.favorites.size);
  }

  function renderSync() {
    const note = find('#syncNote');
    if (!state.snapshot?.generatedAt) {
      note.className = 'sync-note stale';
      note.innerHTML = '<span class="sync-dot"></span>' + (state.loading ? 'Daten werden geladen' : 'Quelle nicht erreichbar');
      return;
    }
    const date = new Date(state.snapshot.generatedAt);
    const age = Date.now() - date.getTime();
    const issues = LEAGUES.some(l => {
      const obj = state.snapshot.leagues?.[l.id];
      return !obj?.matchesAvailable || !obj?.standingsAvailable || (obj?.errors?.length > 0);
    });
    const stale = !Number.isFinite(age) || age > 2 * 60 * 60 * 1000 || issues;
    const formatted = Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat('de-CH', {timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit'}).format(date) : '–';
    note.className = 'sync-note ' + (stale ? 'stale' : 'fresh');
    note.innerHTML = '<span class="sync-dot"></span>' + (stale ? 'Daten eingeschränkt · ' : 'Stand ') + clean(formatted) + ' Uhr';
    note.title = 'Zeitpunkt des letzten Datenabgleichs: ' + date.toLocaleString('de-CH', {timeZone:'Europe/Zurich'});
  }

  function render() {
    renderDates(); updateStats(); updateNavigation(); renderSync(); renderMatches(); renderStandings();
  }

  function selectDate(day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    state.date = day;
    state.view = 'day';
    render();
  }
  function closeSidebar() {
    find('#sidebar').classList.remove('open');
    find('#overlay').classList.remove('show');
    find('#menuButton').setAttribute('aria-expanded','false');
  }
  function saveFavorites() {
    try { localStorage.setItem('sportspy-favorites-v2', JSON.stringify([...state.favorites])); } catch {}
  }
  function applyScope(scope) {
    state.scope = scope;
    if (LEAGUES.some(l => l.id === scope)) {
      state.standings = scope;
      state.sport = 'all';
    }
    closeSidebar();
    render();
    if (window.innerWidth < 870) find('#gamesHeading').scrollIntoView({behavior:'smooth', block:'start'});
  }

  function bind() {
    find('#lightMode').addEventListener('click', () => setTheme('light'));
    find('#darkMode').addEventListener('click', () => setTheme('dark'));
    find('#prevDays').addEventListener('click', () => selectDate(dayAdd(state.date,-7)));
    find('#nextDays').addEventListener('click', () => selectDate(dayAdd(state.date,7)));
    find('#goToday').addEventListener('click', () => selectDate(currentDay()));
    find('#dateInput').addEventListener('change', e => { if (e.target.value) selectDate(e.target.value); });
    find('#search').addEventListener('input', e => { state.search = e.target.value; renderMatches(); renderStandings(); });
    find('#menuButton').addEventListener('click', () => {
      const open = find('#sidebar').classList.toggle('open');
      find('#overlay').classList.toggle('show',open);
      find('#menuButton').setAttribute('aria-expanded',String(open));
    });
    find('#overlay').addEventListener('click',closeSidebar);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSidebar();
      if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault(); find('#search').focus();
      }
    });
    document.addEventListener('click', e => {
      const fav = e.target.closest('[data-favorite]');
      if (fav) {
        const id = fav.dataset.favorite;
        if (state.favorites.has(id)) state.favorites.delete(id);
        else state.favorites.add(id);
        saveFavorites(); render();
        return;
      }
      const date = e.target.closest('[data-day]');
      if (date) { selectDate(date.dataset.day); return; }
      const scope = e.target.closest('[data-scope]');
      if (scope) { applyScope(scope.dataset.scope); return; }
      const view = e.target.closest('[data-view]');
      if (view) { state.view = view.dataset.view; renderMatches(); return; }
      const sport = e.target.closest('[data-sport]');
      if (sport) { state.sport = sport.dataset.sport; renderMatches(); return; }
      const table = e.target.closest('[data-table]');
      if (table) { state.standings = table.dataset.table; renderStandings(); return; }
      if (e.target.closest('[data-empty-upcoming]')) { state.view='upcoming'; renderMatches(); }
    });
  }

  async function load() {
    try {
      const response = await fetch('./data/snapshot.json?v=' + Date.now(), {cache:'no-store',headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || !data.leagues || typeof data.leagues !== 'object') throw new Error('Ungültige Daten');
      state.snapshot = data;
      state.error = null;
    } catch (error) {
      state.error = String(error?.message || error);
    } finally {
      state.loading = false;
      render();
    }
  }

  setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
  bind();
  render();
  load();
  setInterval(() => { if (!document.hidden) load(); }, 120000);
})();
