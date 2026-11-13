/**
 * TOMATO TAKEOVER – deterministic economy and hit calculations.
 * A deliberately fictional, slapstick arcade game: no real people or violence.
 */
export const SAVE_KEY = "tomato-takeover-save-v1";
export const ZONES = Object.freeze({
  city: { id:"city", name:"Neon District", label:"STADT", travel:0, ticket:0, access:"Öffentlich", icon:"⌂" },
  festival: { id:"festival", name:"PixelFest", label:"KONZERT", travel:24, ticket:95, access:"Konzertticket", icon:"♫" },
  summit: { id:"summit", name:"Capitol Plaza", label:"PRESSE-EVENT", travel:32, ticket:180, access:"Pressepass", icon:"★" }
});
export const START = Object.freeze({ cash:145, followers:180, tomatoes:18, totalViews:0, totalLikes:0, totalEarnings:0, passes:[], posts:[], zone:"city", lastGift:0 });
export const MAX_POSTS = 18;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const safeNumber = (x, fallback = 0) => typeof x === "number" && Number.isFinite(x) ? x : fallback;
const asInt = (n, a = 0, b = 1e12) => Math.round(clamp(safeNumber(n), a, b));
export const USD = amount => "$" + Math.floor(Math.max(0, amount)).toLocaleString("en-US");
export const compact = n => new Intl.NumberFormat("de-CH", { notation:"compact", maximumFractionDigits:1 }).format(safeNumber(n));
export function freshSave() { return { ...START, passes:[], posts:[] }; }
export function restoreSave(raw) {
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!o || typeof o !== "object" || Array.isArray(o)) return freshSave();
    const passes = Array.isArray(o.passes) ? [...new Set(o.passes.filter(x => x === "festival" || x === "summit"))] : [];
    const posts = Array.isArray(o.posts) ? o.posts.filter(p => p && typeof p.id === "string" && p.id.length < 120).slice(0, MAX_POSTS).map(p => ({
      id:p.id, headline:String(p.headline || "Street clip").slice(0, 100),
      zone:ZONES[p.zone] ? p.zone : "city",
      views:asInt(p.views), likes:asInt(p.likes), earned:asInt(p.earned),
      newFollowers:asInt(p.newFollowers), hits:asInt(p.hits,0,100),
      viral:!!p.viral, celebrity:!!p.celebrity, postedAt:asInt(p.postedAt),
      duration:asInt(p.duration,0,60)
    })) : [];
    return {
      cash:asInt(o.cash,0,1e10), followers:asInt(o.followers,0,1e9),
      tomatoes:asInt(o.tomatoes,0,100), totalViews:asInt(o.totalViews),
      totalLikes:asInt(o.totalLikes), totalEarnings:asInt(o.totalEarnings ?? posts.reduce((sum,p)=>sum+p.earned,0)), passes, posts,
      zone:ZONES[o.zone] ? o.zone : "city",
      lastGift:asInt(o.lastGift)
    };
  } catch { return freshSave(); }
}
export function tripCost(zone, passes = []) {
  const to = ZONES[zone];
  if (!to) return null;
  return { fare:to.travel, ticket:passes.includes(zone) ? 0 : to.ticket, total:to.travel + (passes.includes(zone) ? 0 : to.ticket) };
}
export function canTravel(money, zone, passes = []) {
  const cost = tripCost(zone, passes);
  return cost !== null && safeNumber(money) >= cost.total;
}
export function estimatePost({ shots = [], followers = 0, duration = 0, rng = Math.random } = {}) {
  const r = () => clamp(safeNumber(rng(), .5), 0, .999999);
  const clean = Array.isArray(shots) ? shots.filter(s => s && ["civilian","streamer","singer","president"].includes(s.kind)) : [];
  const celebrity = clean.some(s => s.kind !== "civilian");
  const peak = clean.reduce((max, shot) => Math.max(max, ({
    civilian:1, streamer:6.5, singer:15, president:22
  })[shot.kind] || 1), 1);
  const engagement = clean.length ? (1 + Math.min(4, clean.length) * .47) : .14;
  const baseline = Math.max(75, Math.round((420 + Math.max(0, safeNumber(followers)) * .62) * (.8 + r() * .65)));
  let views = baseline * peak * engagement;
  // Exactly 5% chance PER civilian-only clip with at least one successful hit.
  // Celebrity clips don't roll the civilian-only lottery.
  const viral = clean.length > 0 && !celebrity && r() < .05;
  if (viral) views *= 130 + r() * 170;
  views = asInt(views, 0, 8e7);
  const likes = asInt(views * (.09 + r() * .085 + (celebrity ? .04 : 0)), 0, views);
  const newFollowers = asInt(views * (viral ? .038 : celebrity ? .022 : .012) * (.75 + r() * .4), 0, 1e7);
  // $8 RPM: earnings are based on all monetized simulated video views.
  const earned = asInt(views * .008, 0, 1e9);
  let title = clean.length === 0 ? "Ich erkunde die Stadt" : "Street tomato challenge";
  if (celebrity) {
    const kinds = clean.map(s => s.kind);
    title = kinds.includes("president") ? "Der berühmteste Vortrag des Jahres?!"
      : kinds.includes("singer") ? "Backstage am PixelFest 🤯" : "Streamer-Moment in Neon District!";
  }
  if (viral) title = "UNGLAUBLICH! Ein normaler Clip geht viral 🔥";
  return { views, likes, newFollowers, earned, viral, celebrity,
    hits:clean.length, headline:title, duration:asInt(duration, 0, 60) };
}
export function returningAudience(posts, followers, rng = Math.random) {
  const clean = Array.isArray(posts) ? posts : [];
  let earned = 0, totalViews = 0, totalLikes = 0;
  const updated = clean.map(post => {
    const r = clamp(safeNumber(rng(), .5),0,1);
    const views = asInt((Math.max(0, safeNumber(followers)) * .12 + 50) * (.55 + .9 * r),0,200000);
    const likes = asInt(views * (.075 + .05 * r),0,views);
    const money = asInt(views * .008,0,30000);
    earned += money; totalViews += views; totalLikes += likes;
    return { ...post, views:asInt(post.views)+views, likes:asInt(post.likes)+likes, earned:asInt(post.earned)+money };
  });
  return { posts:updated, earned, totalViews, totalLikes };
}
export function canClaimGift(state, now = Date.now()) {
  return safeNumber(state?.tomatoes) === 0 && safeNumber(state?.cash) < 18 &&
    now - safeNumber(state?.lastGift) >= 60000;
}
export function shotToTarget(player, forward, target) {
  if (!player || !forward || !target) return false;
  const dx = target.x - player.x, dy = target.y - player.y, dz = target.z - player.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance < .1 || distance > 38) return false;
  const dot = (dx*forward.x + dy*forward.y + dz*forward.z) / distance;
  return dot > Math.cos(.072);
}
