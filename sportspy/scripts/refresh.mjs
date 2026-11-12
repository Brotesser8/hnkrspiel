/**
 * SportSpy — kostenlose Datensynchronisation für GitHub Pages.
 * Läuft in GitHub Actions; der Browser lädt ausschliesslich lokale JSON-Dateien.
 * Offene, undokumentierte Provider können ausfallen. Veraltete Daten werden markiert,
 * niemals als frisch ausgegeben.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEST = resolve(ROOT, 'data/snapshot.json');
const LEAGUES = [
  { id: 'national', name: 'National League', sport: 'hockey', source: 'SIHF', providerId: 1 },
  { id: 'super', name: 'Super League', sport: 'football', source: 'Open-Matchday', providerId: 'sui.1' },
  { id: 'swiss', name: 'Swiss League', sport: 'hockey', source: 'SIHF', providerId: 2 },
  { id: 'myhockey', name: 'MyHockey League', sport: 'hockey', source: 'SIHF', providerId: 100 }
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fmtDay = date => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const num = value => value === null || value === undefined || value === '' || value === '-' ? null : (Number.isFinite(Number(String(value).replace(/[’']/g, ''))) ? Number(String(value).replace(/[’']/g, '')) : null);
const team = (id, name, short, logo = null) => ({ id: String(id ?? name ?? ''), name: String(name ?? 'Unbekannt'), short: String(short ?? name ?? '?').slice(0, 5).toUpperCase(), logo });
const addDays = (day, n) => {
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
};
const hockeySeason = day => { const [y, m] = day.split('-').map(Number); return m >= 7 ? y + 1 : y; };
const footballSeason = day => { const [y, m] = day.split('-').map(Number); return m >= 7 ? y : y - 1; };
const seasonText = (season, sport) => sport === 'hockey' ? (season - 1) + '/' + String(season).slice(-2) : season + '/' + String(season + 1).slice(-2);
function swissDay(s) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return String(s);
  const match = String(s ?? '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  return match ? match[3] + '-' + match[2].padStart(2,'0') + '-' + match[1].padStart(2,'0') : null;
}
async function getJson(url) {
  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json', 'User-Agent': 'SportSpy/2.0 (github.com/Brotesser8/hnkrspiel)' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const body = await res.json();
      if (!body || typeof body !== 'object') throw new Error('Leere JSON-Antwort');
      return body;
    } catch (e) {
      error = e;
      if (attempt === 0) await sleep(1100);
    } finally { clearTimeout(timer); }
  }
  throw error;
}
let lastSihf = 0;
async function sihfFetch(leagueId, season, alias) {
  const wait = Math.max(0, 1200 - (Date.now() - lastSihf));
  if (wait) await sleep(wait);
  lastSihf = Date.now();
  const params = new URLSearchParams({
    alias,
    searchQuery: '1//' + leagueId,
    language: 'de',
    filterBy: alias === 'results' ? 'Season,Date' : 'Season,ContentType',
    filterQuery: alias === 'results' ? season + '/01.07.' + (season - 1) + '-30.06.' + season : season + '/All'
  });
  const body = await getJson('https://data.sihf.ch/statistic/api/cms/table?' + params);
  if (!Array.isArray(body.header) || !Array.isArray(body.data) || !Array.isArray(body.filters)) throw new Error('Ungültige SIHF-Tabelle');
  const selected = aliasName => body.filters.find(item => item.alias === aliasName)?.selected;
  if (String(selected('Season') ?? '') !== String(season)) throw new Error('SIHF: falsche Saison');
  if (alias === 'standing' && String(selected('ContentType') ?? '') !== 'All') throw new Error('SIHF: falsche Tabelle');
  if (selected('League') != null && String(selected('League')) !== String(leagueId)) throw new Error('SIHF: falsche Liga');
  if (typeof body.pages === 'number' && body.pages > 0 && body.pages !== body.data.length) throw new Error('SIHF: unvollständige Daten');
  if (body.data.length === 1 && body.data[0]?.length === 1 && typeof body.data[0][0] === 'string') throw new Error('SIHF: keine Ligadaten');
  return body;
}
const snake = name => String(name ?? '').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[- .]/g, '_').toLowerCase();
function decode(raw) {
  const keys = raw.header.map(col => snake(col.alias));
  return raw.data.filter(row => Array.isArray(row) && row.length > 1).map(row => {
    const out = {};
    row.forEach((v, i) => {
      const k = keys[i];
      if (!k) return;
      if (v == null || typeof v !== 'object' || Array.isArray(v)) out[k] = v;
      else if (v.type === 'team') {
        out[k + '_id'] = v.id; out[k + '_name'] = v.name; out[k + '_acronym'] = v.acronym;
      } else if (v.type === 'result' || v.type === 'periods') {
        out[k + '_home'] = v.homeTeam; out[k + '_away'] = v.awayTeam;
      } else if (v.type === 'gameStatus') {
        out[k + '_id'] = v.id; out[k + '_name'] = v.name; out[k + '_percent'] = v.percent;
        out[k + '_canceled'] = v.canceled; out.start_date_time = v.startDateTime;
      } else if (v.type === 'linkToGameDetail') out.game_id = v.gameId;
      else if (v.type === 'broadcasts') out.broadcasts = (v.entries || []).join(', ');
      else { out[k + '_id'] = v.id; out[k + '_name'] = v.name; }
    });
    return out;
  });
}
function hockeyMatches(body, league) {
  return decode(body).filter(r => r.home_team_name && r.away_team_name).map(r => {
    const date = swissDay(r.date) || swissDay(String(r.start_date_time ?? '').slice(0, 10));
    const percent = num(r.status_percent);
    const cancelled = r.status_canceled === true || r.status_canceled === 'true';
    const finished = !cancelled && (Number(r.status_id) === 12 || percent === 100);
    const live = !cancelled && !finished && percent !== null && percent > 0 && percent < 100;
    const state = cancelled ? 'cancelled' : finished ? 'final' : live ? 'live' : 'scheduled';
    return {
      id: league.id + '-' + String(r.game_id ?? date + '-' + r.home_team_id + '-' + r.away_team_id),
      leagueId: league.id, date, time: String(r.time || '–').slice(0, 5),
      home: team(r.home_team_id, r.home_team_name, r.home_team_acronym),
      away: team(r.away_team_id, r.away_team_name, r.away_team_acronym),
      homeScore: state === 'scheduled' ? null : num(r.score_home),
      awayScore: state === 'scheduled' ? null : num(r.score_away),
      state, status: state === 'live' ? String(r.status_name || 'Live') : state === 'final' ? 'Beendet' : state === 'cancelled' ? 'Abgesagt' : 'Geplant'
    };
  }).filter(g => g.date);
}
function hockeyStandings(body) {
  return decode(body).filter(r => r.team_name && r.team_id != null && Number(r.team_id) !== 100000 && !['Durchschnitt','Total'].includes(r.team_name)).map((r, i) => ({
    rank: num(r.rank) ?? i + 1,
    team: team(r.team_id, r.team_name, r.team_acronym),
    played: num(r.games_played),
    wins: num(r.games_won_in_time),
    draws: null,
    losses: num(r.games_lost_in_time),
    scored: num(r.goals_for),
    conceded: num(r.goals_against),
    diff: num(r.goals_difference),
    points: num(r.points)
  })).sort((a, b) => a.rank - b.rank);
}
function footballMatches(bodies, league) {
  const unique = new Map();
  for (const body of bodies) for (const e of body.events || []) {
    const comp = e.competitions?.[0] || {};
    const h = comp.competitors?.find(c => c.homeAway === 'home');
    const a = comp.competitors?.find(c => c.homeAway === 'away');
    const timestamp = comp.date || e.date;
    if (!h || !a || !timestamp || !Number.isFinite(Date.parse(timestamp))) continue;
    const dt = new Date(timestamp);
    const type = comp.status?.type || e.status?.type || {};
    const state = /CANCEL|POSTPONE/i.test(type.name || '') ? 'cancelled' : type.state === 'in' ? 'live' : type.completed || type.state === 'post' ? 'final' : 'scheduled';
    const mapped = c => team(c.team?.id, c.team?.displayName || c.team?.shortDisplayName, c.team?.abbreviation, c.team?.logo || c.team?.logos?.[0]?.href || null);
    unique.set(String(e.id), {
      id: league.id + '-' + e.id, leagueId: league.id,
      date: fmtDay(dt),
      time: new Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(dt),
      home: mapped(h), away: mapped(a),
      homeScore: state === 'scheduled' ? null : num(h.score),
      awayScore: state === 'scheduled' ? null : num(a.score),
      state, status: state === 'live' ? String(type.shortDetail || 'Live') : state === 'final' ? 'Beendet' : state === 'cancelled' ? 'Abgesagt' : 'Geplant'
    });
  }
  return [...unique.values()];
}
function footballStandings(body) {
  const groups = Array.isArray(body.children) ? body.children : [body];
  const entries = groups.flatMap(g => g.standings?.entries || []);
  const stat = (stats, ...names) => {
    for (const name of names) {
      const row = (stats || []).find(item => item.name === name || item.type === name);
      if (row) return num(row.value ?? row.displayValue);
    }
    return null;
  };
  const unique = new Map();
  for (let i = 0; i < entries.length; i++) {
    const row = entries[i], t = row.team || {}, stats = row.stats || [];
    if (t.id == null) continue;
    unique.set(String(t.id), {
      rank: stat(stats, 'rank', 'position') ?? i + 1,
      team: team(t.id, t.displayName || t.name, t.abbreviation, t.logos?.[0]?.href || t.logo || null),
      played: stat(stats, 'gamesPlayed', 'played'),
      wins: stat(stats, 'wins'), draws: stat(stats, 'ties','draws'),
      losses: stat(stats, 'losses'),
      scored: stat(stats, 'pointsFor', 'goalsFor'),
      conceded: stat(stats, 'pointsAgainst','goalsAgainst'),
      diff: stat(stats, 'pointDifferential','goalDifference','netGoals'),
      points: stat(stats, 'points')
    });
  }
  return [...unique.values()].sort((a,b) => a.rank - b.rank);
}
const dateSort = (a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id);
async function readPart(promise) {
  try { return { ok: true, data: await promise }; }
  catch (e) { return { ok: false, error: String(e?.message || e) }; }
}
async function getHockey(l, day) {
  const season = hockeySeason(day);
  const matches = await readPart(sihfFetch(l.providerId, season, 'results').then(r => hockeyMatches(r, l)));
  const standings = await readPart(sihfFetch(l.providerId, season, 'standing').then(hockeyStandings));
  return { season: seasonText(season, 'hockey'), matches, standings };
}

/** Read the public-domain-like, attributed CSV dataset without API keys. */
async function getCsv(url) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(url, {signal: controller.signal, headers: {Accept:'text/csv,text/plain', 'User-Agent':'SportSpy/2.1 (github.com/Brotesser8/hnkrspiel)'}});
      if (!res.ok) throw new Error('CSV HTTP ' + res.status);
      const data = await res.text();
      if (!/^gw,date,time,home,away/i.test(data)) throw new Error('Ungültiger Super-League-CSV-Datensatz');
      return data;
    } catch (e) {
      lastError = e;
      if (!attempt) await sleep(850);
    } finally { clearTimeout(timer); }
  }
  throw lastError;
}
function csvFields(line) {
  const fields = []; let cell = '', quoted = false;
  for (let i=0;i<line.length;i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i+1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { fields.push(cell); cell = ''; }
    else cell += c;
  }
  fields.push(cell);
  return fields;
}
function csvRecords(raw) {
  const lines = raw.replace(/\r/g, '').trim().split('\n').filter(Boolean);
  const columns = csvFields(lines.shift());
  return lines.map(line => {
    const values = csvFields(line), out = {};
    columns.forEach((column, i) => { out[column] = values[i] ?? ''; });
    return out;
  }).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && row.home && row.away);
}
function footballTeam(name) {
  const aliases = {
    'Young Boys':'YB','Basel':'FCB','Grasshoppers':'GC','Lausanne':'LS','Lugano':'LUG','Luzern':'FCL',
    'Servette':'SFC','Sion':'SIO','St. Gallen':'FCSG','Thun':'THU','Vaduz':'VAD','Zurich':'FCZ'
  };
  return team(name.toLowerCase().replace(/[^a-z0-9]/g,''), name, aliases[name] || name.slice(0,3).toUpperCase());
}
function leagueCsvMatch(row, finished) {
  return {
    id:'super-' + row.date + '-' + row.home.toLowerCase().replace(/[^a-z0-9]/g,'') + '-' + row.away.toLowerCase().replace(/[^a-z0-9]/g,''),
    leagueId:'super', date:row.date, time:row.time || '–',
    home:footballTeam(row.home), away:footballTeam(row.away),
    homeScore:finished ? num(row.ft_home) : null,
    awayScore:finished ? num(row.ft_away) : null,
    state:finished ? 'final' : 'scheduled', status:finished ? 'Beendet' : 'Geplant'
  };
}
function computedSwissTable(records) {
  const rows = new Map();
  const ensure = name => {
    if (!rows.has(name)) rows.set(name, {
      team:footballTeam(name), played:0, wins:0, draws:0, losses:0,
      scored:0, conceded:0, diff:0, points:0
    });
    return rows.get(name);
  };
  for (const row of records) {
    const h = num(row.ft_home), a = num(row.ft_away);
    if (h === null || a === null) continue;
    const home = ensure(row.home), away = ensure(row.away);
    home.played++; away.played++;
    home.scored += h; home.conceded += a;
    away.scored += a; away.conceded += h;
    home.diff += h-a; away.diff += a-h;
    if (h > a) {home.wins++;home.points+=3;away.losses++;}
    else if (h < a) {away.wins++;away.points+=3;home.losses++;}
    else {home.draws++;away.draws++;home.points++;away.points++;}
  }
  return [...rows.values()].sort((a,b) => b.points-a.points || b.diff-a.diff || b.scored-a.scored || a.team.name.localeCompare(b.team.name)).map((r,i)=>({rank:i+1,...r}));
}
function compactName(v) {
  const name = String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  if (name.includes('youngboys')) return 'youngboys';
  if (name.includes('grasshopper')) return 'grasshoppers';
  if (name.includes('lausanne')) return 'lausanne';
  if (name.includes('basel')) return 'basel';
  if (name.includes('luzern') || name.includes('lucerne')) return 'luzern';
  if (name.includes('lugano')) return 'lugano';
  if (name.includes('servette')) return 'servette';
  if (name.includes('gallen')) return 'stgallen';
  if (name.includes('zurich')) return 'zurich';
  if (name.includes('sion')) return 'sion';
  if (name.includes('thun')) return 'thun';
  if (name.includes('vaduz')) return 'vaduz';
  return name.replace(/^fc/,'').replace(/^bsc/,'');
}
function sportsDbTime(event) {
  const ts = String(event.strTimestamp || '').trim();
  const raw = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ts) ? (/[zZ]|[+-]\d\d:\d\d$/.test(ts) ? ts : ts + 'Z') : null;
  const alt = /^\d{2}:\d{2}/.test(String(event.strTime || '')) && event.dateEvent ? event.dateEvent + 'T' + event.strTime.slice(0,5) + ':00Z' : null;
  const d = new Date(raw || alt || '');
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat('de-CH', {timeZone:'Europe/Zurich',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d) : null;
}
async function enrichSwissKickoffs(matches) {
  // TheSportsDB's free tier returns only a small upcoming window; it complements
  // Open-Matchday, not the source of truth for complete season standings/schedules.
  try {
    const body = await getJson('https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4675');
    const events = Array.isArray(body.events) ? body.events : [];
    let count = 0;
    for (const e of events) {
      const date = String(e.dateEvent || '').slice(0,10);
      const home = compactName(e.strHomeTeam), away = compactName(e.strAwayTeam);
      const match = matches.find(m => m.state === 'scheduled' && m.date === date &&
        compactName(m.home.name) === home && compactName(m.away.name) === away);
      if (!match) continue;
      const t = sportsDbTime(e);
      if (t) { match.time = t; count++; }
      if (/^https:\/\//.test(e.strHomeTeamBadge || '')) match.home.logo = e.strHomeTeamBadge;
      if (/^https:\/\//.test(e.strAwayTeamBadge || '')) match.away.logo = e.strAwayTeamBadge;
    }
    console.log('Super League TheSportsDB kickoffs added:', count);
  } catch (err) {
    console.warn('TheSportsDB optional times unavailable:', err.message);
  }
}

async function getFootball(l, day) {
  const season = footballSeason(day);
  const code = String(season).slice(-2) + String(season + 1).slice(-2);
  const base = 'https://raw.githubusercontent.com/oladeeayo/open-matchday/master/data/SUI_1_super-league/';
  const feeds = await readPart(Promise.all([
    getCsv(base + 'results_' + code + '.csv'),
    getCsv(base + 'fixtures_' + code + '.csv')
  ]).then(([results,fixtures]) => ({
    results:csvRecords(results), fixtures:csvRecords(fixtures)
  })));
  if (!feeds.ok) {
    return {season:seasonText(season,'football'),
      matches:{ok:false,error:feeds.error},
      standings:{ok:false,error:feeds.error}};
  }
  const results = feeds.data.results.filter(r=>num(r.ft_home)!==null && num(r.ft_away)!==null);
  if (!results.length) {
    return {season:seasonText(season,'football'),
      matches:{ok:false,error:'Keine Resultate für die aktuelle Saison'},
      standings:{ok:false,error:'Keine Resultate zur Berechnung der Tabelle'}};
  }
  const games = [...results.map(r=>leagueCsvMatch(r,true)),...feeds.data.fixtures.map(r=>leagueCsvMatch(r,false))].sort(dateSort);
  const unique = [...new Map(games.map(m=>[m.id,m])).values()];
  await enrichSwissKickoffs(unique);
  const table = computedSwissTable(results);
  console.log('Super League CSV:', results.length, 'finished;', feeds.data.fixtures.length, 'upcoming;', table.length, 'teams');
  return {
    season:seasonText(season,'football'),
    matches:{ok:true,data:unique},
    standings:table.length >= 10 ? {ok:true,data:table} : {ok:false,error:'Unvollständige Super-League-Tabelle'}
  };
}

async function main() {
  let previous = {};
  try { previous = JSON.parse(await readFile(DEST, 'utf8')); } catch {}
  const day = fmtDay(new Date());
  const now = new Date().toISOString();
  const output = { generatedAt: now, localDate: day, leagues: {} };
  let success = 0;
  for (const l of LEAGUES) {
    console.log('Fetching', l.name);
    const current = l.sport === 'hockey' ? await getHockey(l, day) : await getFootball(l, day);
    const old = previous.leagues?.[l.id];
    const validOld = old?.season === current.season ? old : null;
    const merged = { id: l.id, name: l.name, sport: l.sport, source: l.source, season: current.season, tableCalculated: l.id === 'super', errors: [] };
    for (const part of ['matches', 'standings']) {
      if (current[part].ok) {
        const values = current[part].data;
        merged[part] = part === 'matches' ? values.sort(dateSort) : values;
        merged[part + 'UpdatedAt'] = now;
        merged[part + 'Available'] = true;
        success++;
      } else {
        console.warn(l.name, part, current[part].error);
        merged[part] = validOld?.[part] || [];
        merged[part + 'UpdatedAt'] = validOld?.[part + 'UpdatedAt'] || null;
        merged[part + 'Available'] = Boolean(validOld?.[part + 'Available']);
        merged.errors.push(part + ': ' + current[part].error);
      }
    }
    output.leagues[l.id] = merged;
    console.log(l.name, 'matches:', merged.matches.length, 'table:', merged.standings.length);
  }
  if (success === 0 && previous.generatedAt) {
    console.warn('No source updated. Keeping last known snapshot.');
    return;
  }
  await mkdir(dirname(DEST), { recursive: true });
  await writeFile(DEST, JSON.stringify(output) + '\n');
  console.log('Saved', DEST, 'successful parts', success, '/8');
}
main().catch(err => { console.error(err); process.exitCode = 1; });
