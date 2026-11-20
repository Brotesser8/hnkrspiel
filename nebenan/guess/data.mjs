// MIXUP data: curated, non-sponsored question banks. Users can add custom topics.
const rows=[
["animals","Tiere","🐾","Von niedlich bis ziemlich seltsam","wiki",[
"Panda|Giant panda|🐼","Axolotl|Axolotl|🦎","Flamingo|Flamingo|🦩","Pfau|Peafowl|🦚",
"Koala|Koala|🐨","Eisbär|Polar bear|🐻‍❄️","Erdmännchen|Meerkat|🦫","Chamäleon|Chameleon|🦎",
"Oktopus|Octopus|🐙","Giraffe|Giraffe|🦒","Nilpferd|Hippopotamus|🦛","Pinguin|Penguin|🐧",
"Schneeleopard|Snow leopard|🐆","Igel|Hedgehog|🦔","Kolibri|Hummingbird|🐦","Kiwi-Vogel|Kiwi (bird)|🐦",
"Rotfuchs|Red fox|🦊","Orang-Utan|Orangutan|🦧","Walhai|Whale shark|🦈","Seepferdchen|Seahorse|🐠"
]],
["food","Food & Drinks","🍜","Von Sushi bis Sauerteig","wiki",[
"Pizza|Pizza|🍕","Sushi|Sushi|🍣","Croissant|Croissant|🥐","Ramen|Ramen|🍜","Taco|Taco|🌮",
"Avocado|Avocado|🥑","Paella|Paella|🥘","Macaron|Macaron|🍪","Burger|Hamburger|🍔",
"Kimchi|Kimchi|🥬","Fondue|Fondue|🫕","Doughnut|Doughnut|🍩","Waffel|Waffle|🧇",
"Lasagne|Lasagna|🍝","Burrito|Burrito|🌯","Brezel|Pretzel|🥨","Mochi|Mochi|🍡",
"Bubble Tea|Bubble tea|🧋","Falafel|Falafel|🧆","Pommes frites|French fries|🍟"
]],
["flags","Flaggen","🏳️","Erkennst du die Länder?","flag",[
"Schweiz|ch|🇨🇭","Japan|jp|🇯🇵","Brasilien|br|🇧🇷","Kanada|ca|🇨🇦","Island|is|🇮🇸",
"Südafrika|za|🇿🇦","Südkorea|kr|🇰🇷","Australien|au|🇦🇺","Schweden|se|🇸🇪",
"Frankreich|fr|🇫🇷","Deutschland|de|🇩🇪","Italien|it|🇮🇹","Indien|in|🇮🇳",
"Mexiko|mx|🇲🇽","Norwegen|no|🇳🇴","Neuseeland|nz|🇳🇿","Argentinien|ar|🇦🇷",
"Portugal|pt|🇵🇹","Finnland|fi|🇫🇮","Vereinigtes Königreich|gb|🇬🇧"
]],
["places","Bauwerke","🗼","Ikonen aus aller Welt","wiki",[
"Eiffelturm|Eiffel Tower|🗼","Taj Mahal|Taj Mahal|🕌","Kolosseum|Colosseum|🏛️",
"Freiheitsstatue|Statue of Liberty|🗽","Chinesische Mauer|Great Wall of China|🧱",
"Schiefer Turm von Pisa|Leaning Tower of Pisa|🏛️","Opernhaus Sydney|Sydney Opera House|🎭",
"Big Ben|Elizabeth Tower|🕰️","Sagrada Família|Sagrada Família|⛪",
"Burj Khalifa|Burj Khalifa|🏙️","Christusstatue Rio|Christ the Redeemer (statue)|🗿",
"Golden Gate Bridge|Golden Gate Bridge|🌉","Machu Picchu|Machu Picchu|⛰️",
"Petra|Petra|🏜️","Brandenburger Tor|Brandenburg Gate|🏛️",
"Schloss Neuschwanstein|Neuschwanstein Castle|🏰","Mont Saint-Michel|Mont-Saint-Michel|🏰"
]],
["space","Weltraum","🪐","Planeten, Nebel und Raumschiffe","wiki",[
"Saturn|Saturn|🪐","Mars|Mars|🔴","Jupiter|Jupiter|🪐","Erde|Earth|🌍",
"Mond|Moon|🌕","Venus|Venus|🟡","Neptun|Neptune|🔵","Sonne|Sun|☀️",
"Milchstrasse|Milky Way|🌌","Andromedagalaxie|Andromeda Galaxy|🌌",
"Internationale Raumstation|International Space Station|🛰️",
"Hubble-Weltraumteleskop|Hubble Space Telescope|🔭",
"Orionnebel|Orion Nebula|🌠","Saturn V|Saturn V|🚀","Sternschnuppe|Meteor|☄️"
]],
["vehicles","Fahrzeuge","🚀","Alles, was Räder oder Flügel hat","wiki",[
"Dampflokomotive|Steam locomotive|🚂","Helikopter|Helicopter|🚁",
"Segelboot|Sailboat|⛵","U-Boot|Submarine|🚢","Fahrrad|Bicycle|🚲",
"Heissluftballon|Hot air balloon|🎈","Tram|Tram|🚊","Motorrad|Motorcycle|🏍️",
"Rennwagen|Formula One car|🏎️","Doppeldeckerbus|Double-decker bus|🚌",
"Hovercraft|Hovercraft|🚤","Spaceshuttle|Space Shuttle|🚀",
"Feuerwehrauto|Fire engine|🚒","Bulldozer|Bulldozer|🚜","Zeppelin|Airship|🎈"
]],
["tech","Retro & Tech","💾","Technik, die Geschichte schrieb","wiki",[
"Schreibmaschine|Typewriter|⌨️","Diskette|Floppy disk|💾","Kassette|Compact Cassette|📼",
"Game Boy|Game Boy|🎮","Mikroskop|Microscope|🔬","Fernseher|Television|📺",
"Polaroidkamera|Polaroid camera|📷","Faxgerät|Fax|📠","Drucker|Printer (computing)|🖨️",
"Roboter|Robot|🤖","Tastatur|Computer keyboard|⌨️","Vinylplatte|Phonograph record|💿",
"Abakus|Abacus|🧮","Teleskop|Telescope|🔭","Smartphone|Smartphone|📱",
"Joysticks|Joystick|🕹️"
]],
["sport","Sportarten","🏀","Von Court bis Welle","wiki",[
"Basketball|Basketball|🏀","Tennis|Tennis|🎾","Surfen|Surfing|🏄",
"Skateboarding|Skateboarding|🛹","Eishockey|Ice hockey|🏒","Badminton|Badminton|🏸",
"Bogenschießen|Archery|🏹","Boxen|Boxing|🥊","Snowboard|Snowboarding|🏂",
"Golf|Golf|⛳","Volleyball|Volleyball|🏐","Fechten|Fencing|🤺",
"Rudern|Rowing (sport)|🚣","Baseball|Baseball|⚾","Curling|Curling|🥌"
]],
["music","Instrumente","🎷","Musik zum Anschauen","wiki",[
"Gitarre|Guitar|🎸","Geige|Violin|🎻","Klavier|Piano|🎹","Trompete|Trumpet|🎺",
"Saxofon|Saxophone|🎷","Harfe|Harp|🪕","Akkordeon|Accordion|🪗",
"Schlagzeug|Drum kit|🥁","Flöte|Flute|🪈","Dudelsack|Bagpipes|🪗",
"Cello|Cello|🎻","Ukulele|Ukulele|🎸","Banjo|Banjo|🪕","Tuba|Tuba|🎺",
"Mundharmonika|Harmonica|🎼","Xylofon|Xylophone|🎶"
]],
["nature","Naturwunder","🌋","Die Erde in Bestform","wiki",[
"Vulkan|Volcano|🌋","Wasserfall|Waterfall|💦","Gletscher|Glacier|🧊",
"Tornado|Tornado|🌪️","Eisberg|Iceberg|🧊","Polarlicht|Aurora|🌌",
"Wüste|Desert|🏜️","Schlucht|Canyon|🏞️","Korallenriff|Coral reef|🪸",
"Regenbogen|Rainbow|🌈","Tropischer Regenwald|Tropical rainforest|🌳",
"Stalaktit|Stalactite|🪨","Geysir|Geyser|♨️","Düne|Dune|🏜️",
"Blitz|Lightning|⚡"
]],
["plants","Pflanzen","🌻","Grüne Überraschungen","wiki",[
"Sonnenblume|Common sunflower|🌻","Rose|Rose|🌹","Kaktus|Cactus|🌵",
"Kirschblüte|Cherry blossom|🌸","Bambus|Bamboo|🎋","Orchidee|Orchidaceae|🌺",
"Tulpe|Tulip|🌷","Lotus|Nelumbo nucifera|🪷","Lavendel|Lavandula|🪻",
"Bonsai|Bonsai|🌳","Venusfliegenfalle|Venus flytrap|🪴",
"Ahorn|Maple|🍁","Palme|Arecaceae|🌴","Baobab|Adansonia|🌳","Monstera|Monstera deliciosa|🪴"
]],
["art","Berühmte Kunst","🎨","Klassiker & Meisterwerke","art",[
"Mona Lisa|Mona Lisa|🎨","Sternennacht|The Starry Night|🌌",
"Der Schrei|The Scream|😱","Die grosse Welle|The Great Wave off Kanagawa|🌊",
"Mädchen mit dem Perlenohrring|Girl with a Pearl Earring|👧",
"Die Erschaffung Adams|The Creation of Adam|✋","Guernica|Guernica (Picasso)|🖼️",
"Die Geburt der Venus|The Birth of Venus|🖼️","Der Kuss|The Kiss (Klimt)|💋",
"American Gothic|American Gothic|🖼️","Die Beständigkeit der Erinnerung|The Persistence of Memory|🕰️",
"Die Nachtwache|The Night Watch|🌙","Das letzte Abendmahl|The Last Supper (Leonardo)|🖼️"
]],
["books","Buchcover","📚","Rate den Titel","book",[
"Der Hobbit|The Hobbit|📕","Der kleine Prinz|The Little Prince|👑",
"Harry Potter und der Stein der Weisen|Harry Potter and the Philosopher's Stone|🪄",
"1984|Nineteen Eighty-Four|📙","Frankenstein|Frankenstein|👾",
"Alice im Wunderland|Alice's Adventures in Wonderland|🐇",
"Der Herr der Ringe|The Lord of the Rings|💍","Stolz und Vorurteil|Pride and Prejudice|📖",
"Die Tribute von Panem|The Hunger Games|🏹","Der grosse Gatsby|The Great Gatsby|🥂",
"Moby-Dick|Moby-Dick|🐳","Die unendliche Geschichte|The Neverending Story|🐉",
"Die Verwandlung|The Metamorphosis|🪳","Dune|Dune (novel)|🏜️",
"Der Alchimist|The Alchemist (novel)|⚗️"
]],
["dinosaurs","Dinosaurier","🦕","Urzeit in allen Formen","wiki",[
"Tyrannosaurus rex|Tyrannosaurus|🦖","Triceratops|Triceratops|🦕",
"Stegosaurus|Stegosaurus|🦕","Velociraptor|Velociraptor|🦖",
"Brachiosaurus|Brachiosaurus|🦕","Ankylosaurus|Ankylosaurus|🦕",
"Diplodocus|Diplodocus|🦕","Spinosaurus|Spinosaurus|🦖",
"Parasaurolophus|Parasaurolophus|🦕","Allosaurus|Allosaurus|🦖",
"Iguanodon|Iguanodon|🦕","Pteranodon|Pteranodon|🦇","Pachycephalosaurus|Pachycephalosaurus|🦕"
]]
];
export const CATEGORIES=Object.freeze(rows.map(([id,name,icon,description,kind,items])=>({
 id,name,icon,description,kind,
 items:items.map((line,index)=>{
  const [answer,page,emoji]=line.split("|");
  return {id:id+"-"+(index+1),category:id,categoryName:name,answer,page,emoji,kind};
 })
})));
export function allQuestions(topics=CATEGORIES){return topics.flatMap(c=>c.items);}
export function normalizeAnswer(value){return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/ß/g,"ss").replace(/&/g," und ").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();}
export function acceptAnswer(input,answer,aliases=[]){const n=normalizeAnswer(input);return !!n&&[answer,...aliases].some(a=>normalizeAnswer(a)===n);}
export function shuffle(array,rand=Math.random){const list=[...array];for(let i=list.length-1;i>0;i--){const j=Math.min(i,Math.floor(rand()*(i+1)));[list[i],list[j]]=[list[j],list[i]];}return list;}
export function createDeck(topics,rounds=10,random=Math.random){
 const seen=new Set(),questions=allQuestions(topics).filter(q=>{const key=normalizeAnswer(q.answer);if(!key||seen.has(key))return false;seen.add(key);return true;});
 return shuffle(questions,random).slice(0,Math.max(0,Math.min(20,Math.floor(rounds))));
}
export function answersFor(question,bank,random=Math.random){
 const seen=new Set([normalizeAnswer(question.answer)]);
 const others=shuffle(bank,random).filter(q=>{const n=normalizeAnswer(q.answer);if(!n||seen.has(n))return false;seen.add(n);return true;}).slice(0,3).map(q=>q.answer);
 return shuffle([question.answer,...others],random);
}
export function parseCustomLines(input){
 return String(input||"").split(/\r?\n/).map(s=>s.trim()).filter(Boolean).slice(0,40).map((line,i)=>{
  const [answer,page,optionalImage]=line.split("|").map(s=>s.trim());
  if(!answer||answer.length>90)throw Error("Zeile "+(i+1)+": Der Begriff muss 1–90 Zeichen haben.");
  if(page&&page.length>130)throw Error("Zeile "+(i+1)+": Wikipedia-Titel zu lang.");
  if(optionalImage&&(!/^https:\/\//.test(optionalImage)||optionalImage.length>500))throw Error("Zeile "+(i+1)+": Bild-URL muss mit https:// beginnen.");
  return {answer,page:page||answer,image:optionalImage||null};
 });
}
export function customTopic(id,name,items){
 const cleaned=String(name||"").trim();
 if(cleaned.length<2||cleaned.length>42)throw Error("Themenname: 2–42 Zeichen.");
 if(items.length<4||items.length>40)throw Error("Ein eigenes Thema braucht mindestens 4 und höchstens 40 Begriffe.");
 const keys=new Set();
 for(const x of items){const n=normalizeAnswer(x.answer);if(keys.has(n))throw Error("Doppelte Begriffe bitte entfernen: "+x.answer);keys.add(n);}
 return {id:"custom-"+id,name:cleaned,icon:"✳️",description:"Dein eigenes Thema",kind:"custom",
 items:items.map((q,i)=>({...q,id:"custom-"+id+"-"+i,category:"custom-"+id,categoryName:cleaned,emoji:"❔",kind:q.image?"direct":"wiki"}))};
}
export function safeTopics(raw){
 if(!Array.isArray(raw))return [];
 return raw.slice(0,12).flatMap(t=>{try{
  if(!t||typeof t.name!=="string"||!Array.isArray(t.items)||!/^[a-z0-9-]{1,40}$/.test(String(t.id||"")))return [];
  const items=t.items.slice(0,40).map(x=>({answer:String(x.answer||""),page:String(x.page||""),image:x.image||null}));
  if(items.some(x=>x.image&&!/^https:\/\/.{1,500}$/.test(x.image)))return [];
  return [customTopic(t.id,t.name,items)];
 }catch{return []}});
}
export function formatTime(seconds){const s=Math.max(0,Math.ceil(seconds));return String(s).padStart(2,"0");}
export function pointsFor({correct,hints=0,mode="choice",secondsRemaining=null}){
 if(!correct)return 0;
 const base=mode==="type"?150:100;
 const penalty=Math.max(0,Math.min(2,hints))*25;
 const bonus=secondsRemaining===null?0:Math.min(20,Math.max(0,Math.floor(secondsRemaining/2)));
 return Math.max(30,base-penalty+bonus);
}
