// ALMOST. — hand-curated dimensions and dates; public source links shown per answer.
// All height values are metres. Distance uses spherical great-circle ("Luftlinie") kilometres.
export const MODES=[
 {id:"scale",num:"01",name:"Scale it",subtitle:"GRÖSSENVERHÄLTNISSE",desc:"Mach ein Objekt so gross, wie es im Vergleich zum anderen wirklich ist.",mark:"↟",tone:"mint"},
 {id:"distance",num:"02",name:"Far apart",subtitle:"GEOGRAFISCHE DISTANZEN",desc:"Schätz die Luftlinie zwischen zwei Orten, ohne einen Routenplaner.",mark:"↔",tone:"blue"},
 {id:"time",num:"03",name:"Time machine",subtitle:"GESCHICHTE EINORDNEN",desc:"Setze historische Momente mit einem Regler ins richtige Jahr.",mark:"◷",tone:"orange"},
 {id:"weather",num:"04",name:"Outside now",subtitle:"LIVE-WETTER",desc:"Rate die momentane Temperatur in einer Stadt, bevor das Wettermodell sie verrät.",mark:"°",tone:"lavender"}
];
export const OBJECTS={
 eiffel:{name:"Eiffelturm",height:330,art:"eiffel",source:"https://www.toureiffel.paris/de/monument/zahlen",note:"Höhe inklusive Antenne, aktuell 330 m."},
 burj:{name:"Burj Khalifa",height:828,art:"skyscraper",source:"https://www.burjkhalifa.ae/en/assets/FACT-SHEET.pdf",note:"Gesamthöhe 828 m."},
 skytree:{name:"Tokyo Skytree",height:634,art:"skytree",source:"https://www.tokyo-skytree.jp/about/outline/",note:"Offizielle Höhe 634 m."},
 elizabeth:{name:"Elizabeth Tower",height:96,art:"clock",source:"https://www.parliament.uk/about/living-heritage/building/palace/big-ben/facts-figures/",note:"Der Turm ist etwa 96 m hoch (oft Big Ben genannt)."},
 shard:{name:"The Shard",height:309.6,art:"shard",source:"https://www.the-shard.com/",note:"Gebäudehöhe rund 309,6 m."},
 cntower:{name:"CN Tower",height:553.3,art:"tower",source:"https://www.cntower.ca/",note:"Gesamthöhe rund 553 m."},
 taipei:{name:"Taipei 101",height:508,art:"pagoda",source:"https://www.taipei-101.com.tw/",note:"Architektonische Höhe 508 m."},
 oneworld:{name:"One World Trade Center",height:541.3,art:"spire",source:"https://www.onewtc.com/",note:"Gesamthöhe einschliesslich Spitze 541,3 m."},
 pyramid:{name:"Cheops-Pyramide",height:138.5,art:"pyramid",source:"https://en.wikipedia.org/wiki/Great_Pyramid_of_Giza",note:"Heutige Höhe ungefähr 138,5 m (ursprünglich 146,6 m)."},
 arch:{name:"Gateway Arch",height:192,art:"arch",source:"https://www.nps.gov/jeff/planyourvisit/gateway-arch.htm",note:"Bogenhöhe rund 192 m."},
 needle:{name:"Space Needle",height:184,art:"needle",source:"https://www.spaceneedle.com/",note:"Höhe ungefähr 184 m."}
};
const PAIRS=[
 ["eiffel","burj"],["burj","skytree"],["elizabeth","arch"],["eiffel","cntower"],
 ["taipei","eiffel"],["skytree","cntower"],["needle","eiffel"],["oneworld","burj"],
 ["shard","elizabeth"],["arch","needle"],["eiffel","pyramid"],["eiffel","arch"],
 ["shard","cntower"],["skytree","taipei"],["arch","shard"],["cntower","oneworld"],
 ["pyramid","needle"],["shard","eiffel"]
];
export const SCALE_ROUNDS=PAIRS.map(([ref,target],index)=>({
 id:"s"+index,mode:"scale",reference:OBJECTS[ref],target:OBJECTS[target],
 truth:OBJECTS[target].height/OBJECTS[ref].height
}));
export const PLACES={
 zurich:{name:"Zürich",lat:47.3769,lon:8.5417},
 bern:{name:"Bern",lat:46.948,lon:7.4474},
 geneva:{name:"Genf",lat:46.2044,lon:6.1432},
 london:{name:"London",lat:51.5074,lon:-.1278},
 paris:{name:"Paris",lat:48.8566,lon:2.3522},
 berlin:{name:"Berlin",lat:52.52,lon:13.405},
 prague:{name:"Prag",lat:50.0755,lon:14.4378},
 tokyo:{name:"Tokio",lat:35.6762,lon:139.6503},
 osaka:{name:"Osaka",lat:34.6937,lon:135.5023},
 seoul:{name:"Seoul",lat:37.5665,lon:126.978},
 nyc:{name:"New York",lat:40.7128,lon:-74.006},
 boston:{name:"Boston",lat:42.3601,lon:-71.0589},
 losangeles:{name:"Los Angeles",lat:34.0522,lon:-118.2437},
 sf:{name:"San Francisco",lat:37.7749,lon:-122.4194},
 rome:{name:"Rom",lat:41.9028,lon:12.4964},
 milan:{name:"Mailand",lat:45.4642,lon:9.19},
 madrid:{name:"Madrid",lat:40.4168,lon:-3.7038},
 lisbon:{name:"Lissabon",lat:38.7223,lon:-9.1393},
 reykjavik:{name:"Reykjavík",lat:64.1466,lon:-21.9426},
 oslo:{name:"Oslo",lat:59.9139,lon:10.7522},
 sydney:{name:"Sydney",lat:-33.8688,lon:151.2093},
 melbourne:{name:"Melbourne",lat:-37.8136,lon:144.9631},
 singapore:{name:"Singapur",lat:1.3521,lon:103.8198},
 capetown:{name:"Kapstadt",lat:-33.9249,lon:18.4241}
};
export function greatCircleKm(a,b){
 const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
 return 6371.0088*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
const ROUTES=[
 ["zurich","bern"],["london","paris"],["tokyo","osaka"],["nyc","boston"],
 ["berlin","prague"],["rome","milan"],["tokyo","seoul"],["reykjavik","oslo"],
 ["sf","losangeles"],["zurich","rome"],["sydney","melbourne"],["madrid","lisbon"],
 ["singapore","sydney"],["nyc","london"],["tokyo","losangeles"],["zurich","geneva"],
 ["paris","berlin"],["london","rome"],["nyc","sf"],["oslo","zurich"],
 ["lisbon","capetown"],["geneva","milan"]
];
export const DISTANCE_ROUNDS=ROUTES.map(([from,to],index)=>({
 id:"d"+index,mode:"distance",from:PLACES[from],to:PLACES[to],
 truth:greatCircleKm(PLACES[from],PLACES[to]),
 source:"https://www.openstreetmap.org/copyright"
}));
export const EVENTS=[
 ["Das erste moderne Olympia findet in Athen statt",1896,"https://olympics.com/en/olympic-games/athens-1896"],
 ["Der Eiffelturm wird eröffnet",1889,"https://www.toureiffel.paris/en/the-monument/history"],
 ["Erster motorisierter Flug der Gebrüder Wright",1903,"https://www.nasa.gov/aeronautics/first-flight/"],
 ["Die Titanic sinkt",1912,"https://www.britannica.com/topic/Titanic"],
 ["Die erste elektrische Glühlampe kommt auf den Markt",1879,"https://www.britannica.com/technology/incandescent-lamp"],
 ["Das Periodensystem wird erstmals veröffentlicht",1869,"https://www.britannica.com/science/periodic-table"],
 ["Der erste Mensch fliegt ins All",1961,"https://www.nasa.gov/history/"],
 ["Sputnik 1 startet ins All",1957,"https://science.nasa.gov/mission/sputnik-1/"],
 ["Die DNA-Doppelhelix wird beschrieben",1953,"https://www.nature.com/articles/171737a0"],
 ["Apollo 11 landet auf dem Mond",1969,"https://www.nasa.gov/mission/apollo-11/"],
 ["Voyager 1 startet",1977,"https://science.nasa.gov/mission/voyager/"],
 ["Der erste Star-Wars-Film erscheint",1977,"https://www.britannica.com/topic/Star-Wars-film-by-Lucas"],
 ["Der erste Macintosh wird vorgestellt",1984,"https://www.computerhistory.org/timeline/computers/"],
 ["Der Nintendo Game Boy kommt auf den Markt",1989,"https://www.nintendo.com/"],
 ["Die Berliner Mauer fällt",1989,"https://www.berlin.de/mauer/en/history/"],
 ["Das Hubble-Weltraumteleskop startet",1990,"https://science.nasa.gov/mission/hubble/"],
 ["Die erste Website geht online",1991,"https://home.cern/science/computing/birth-web"],
 ["Der Mars Pathfinder landet auf dem Mars",1997,"https://science.nasa.gov/mission/mars-pathfinder/"],
 ["Wikipedia wird gegründet",2001,"https://en.wikipedia.org/wiki/History_of_Wikipedia"],
 ["Das erste Video erscheint auf YouTube",2005,"https://en.wikipedia.org/wiki/Me_at_the_zoo"],
 ["Das erste iPhone erscheint",2007,"https://www.apple.com/newsroom/2007/06/18iPhone-Arrives-on-June-29/"],
 ["Der Large Hadron Collider startet den Betrieb",2008,"https://home.cern/science/accelerators/large-hadron-collider"],
 ["Der Curiosity-Rover landet auf dem Mars",2012,"https://science.nasa.gov/mission/msl-curiosity/"],
 ["Das James-Webb-Weltraumteleskop startet",2021,"https://science.nasa.gov/mission/webb/"]
];
export const TIME_ROUNDS=EVENTS.map(([label,truth,source],index)=>({id:"t"+index,mode:"time",label,truth,source}));
export const LIVE_CITIES=[
 ["Zürich","CH",47.3769,8.5417,"Europe/Zurich"],["Reykjavík","IS",64.1466,-21.9426,"Atlantic/Reykjavik"],
 ["Tokio","JP",35.6762,139.6503,"Asia/Tokyo"],["Sydney","AU",-33.8688,151.2093,"Australia/Sydney"],
 ["Kairo","EG",30.0444,31.2357,"Africa/Cairo"],["New York","US",40.7128,-74.006,"America/New_York"],
 ["Kapstadt","ZA",-33.9249,18.4241,"Africa/Johannesburg"],["Helsinki","FI",60.1699,24.9384,"Europe/Helsinki"],
 ["Singapur","SG",1.3521,103.8198,"Asia/Singapore"],["São Paulo","BR",-23.5505,-46.6333,"America/Sao_Paulo"],
 ["Oslo","NO",59.9139,10.7522,"Europe/Oslo"],["Dubai","AE",25.2048,55.2708,"Asia/Dubai"]
].map(([name,country,lat,lon,zone],i)=>({id:"w"+i,mode:"weather",city:{name,country,lat,lon,zone}}));
export const BANK={scale:SCALE_ROUNDS,distance:DISTANCE_ROUNDS,time:TIME_ROUNDS,weather:LIVE_CITIES};
export function normaliseModes(value){return Array.from(new Set((Array.isArray(value)?value:[]).filter(x=>Object.hasOwn(BANK,x))));}
export function buildDeck(modes,rounds=8,random=Math.random){
 const enabled=normaliseModes(modes);
 const pools=enabled.flatMap(mode=>BANK[mode]);
 if(!pools.length)return [];
 const deck=shuffle(pools,random);
 // Seed one of each selected mode before picking extras, then shuffle the finished game.
 const first=enabled.map(mode=>shuffle(BANK[mode],random)[0]);
 const chosen=[...first];const keys=new Set(first.map(x=>x.id));
 for(const q of deck){if(chosen.length>=rounds)break;if(keys.has(q.id))continue;chosen.push(q);keys.add(q.id);}
 return shuffle(chosen.slice(0,rounds),random);
}
export function shuffle(array,random=Math.random){const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1))));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function sliderToValue(t,min,max){const fraction=Math.min(1,Math.max(0,Number(t)/1000));return min*Math.exp(Math.log(max/min)*fraction);}
export function valueToSlider(value,min,max){return 1000*Math.min(1,Math.max(0,Math.log(value/min)/Math.log(max/min)));}
export function ratioScore(guess,truth){
 if(!Number.isFinite(guess)||!Number.isFinite(truth)||guess<=0||truth<=0)return 0;
 return Math.round(1000*Math.exp(-1.7*Math.abs(Math.log(guess/truth))));
}
export function linearScore(guess,truth,windowSize){
 if(!Number.isFinite(guess)||!Number.isFinite(truth))return 0;
 return Math.max(0,Math.round(1000*Math.exp(-Math.abs(guess-truth)/windowSize)));
}
export function pointsFor(mode,guess,truth,hinted=false){
 const score=mode==="scale"||mode==="distance"?ratioScore(guess,truth):linearScore(guess,truth,mode==="time"?28:9);
 return hinted?Math.round(score*.7):score;
}
export function formatNumber(value,digits=0){return new Intl.NumberFormat("de-CH",{maximumFractionDigits:digits}).format(value);}
export function formatValue(mode,value){
 if(mode==="scale")return formatNumber(value,2)+"×";
 if(mode==="distance")return formatNumber(Math.round(value))+" km";
 if(mode==="time")return String(Math.round(value));
 return formatNumber(value,1)+" °C";
}
export function percentError(guess,truth){return Math.abs(guess-truth)/truth*100;}
export function nextRange(mode){return mode==="scale"?{min:.25,max:3.3}:mode==="distance"?{min:40,max:18000}:mode==="time"?{min:1800,max:2026}:{min:-35,max:48};}
export function safeModeSettings(x){return {modes:normaliseModes(x?.modes).length?normaliseModes(x.modes):["scale","distance","time"],rounds:[5,8,12].includes(x?.rounds)?x.rounds:8};}
