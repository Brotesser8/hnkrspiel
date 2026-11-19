// 32 sources from the original request. "live" does NOT imply unlimited service capacity.
// "reference" = relevant official resource linked in the atlas but not automatically queried.
// "excluded" = fixed quota, documented traffic cap or mandatory key/free-tier constraints.
export const SOURCES=[
{title:"swisstopo / GeoAdmin",detail:"Schweizer Landeskarte und amtliche Kartendienste.",category:"Karten & Geologie",status:"live",url:"https://docs.geo.admin.ch/get-started/overview.html"},
{title:"GeoAdmin Geologiedaten",detail:"Geologische Themenkarte als zuschaltbarer Kartenlayer.",category:"Karten & Geologie",status:"live",url:"https://docs.geo.admin.ch/explore-data/get-layer-metadata.html"},
{title:"swisstopo Höhen-API",detail:"Amtliche Höhe der auf der Karte gewählten Position.",category:"Karten & Geologie",status:"live",url:"https://docs.geo.admin.ch/access-data/get-point-height.html"},
{title:"swisstopo Höhenprofile",detail:"Geländeprofil zwischen zwei Kartenpunkten.",category:"Karten & Geologie",status:"live",url:"https://docs.geo.admin.ch/access-data/get-elevation-profile.html"},
{title:"GeoAdmin WMS",detail:"Thematische Kartenebenen für Geologie und Landschaftsschutz.",category:"Karten & Geologie",status:"live",url:"https://docs.geo.admin.ch/visualize-data/wms.html"},
{title:"swisstopo STAC",detail:"Offener Katalog für Schweizer Geodaten-Downloads.",category:"Karten & Geologie",status:"reference",url:"https://data.geo.admin.ch/api/stac/v1/"},
{title:"OpenStreetMap Overpass",detail:"Öffentliche Instanzen haben Last- und Anfragebeschränkungen.",category:"Karten & Geologie",status:"excluded",url:"https://wiki.openstreetmap.org/wiki/Overpass_API"},
{title:"Nominatim",detail:"Öffentlicher Server begrenzt Anfragen; Ortssuche nutzt GeoAdmin.",category:"Karten & Geologie",status:"excluded",url:"https://operations.osmfoundation.org/policies/nominatim/"},
{title:"Sonnendach / GeoAdmin",detail:"Direktlink zum Solarpotenzial von Schweizer Dächern.",category:"Karten & Geologie",status:"reference",url:"https://www.uvek-gis.admin.ch/BFE/sonnendach/"},
{title:"MeteoSchweiz Open Data",detail:"Amtliche Stations- und Klimadatensätze im offenen Datenportal.",category:"Umwelt & Natur",status:"reference",url:"https://opendatadocs.meteoswiss.ch/"},
{title:"Open-Meteo",detail:"Nicht eingebunden: kostenloser Zugang mit Anfrage-Kontingent.",category:"Umwelt & Natur",status:"excluded",url:"https://open-meteo.com/en/docs"},
{title:"Open-Meteo Air Quality",detail:"Nicht eingebunden: kostenloser Zugang mit Anfrage-Kontingent.",category:"Umwelt & Natur",status:"excluded",url:"https://open-meteo.com/en/docs/air-quality-api"},
{title:"BAFU GraphQL",detail:"Amtliche offene Umwelt- und Gewässerdaten.",category:"Umwelt & Natur",status:"reference",url:"https://data.bafu.admin.ch/"},
{title:"Existenz.ch Hydro",detail:"Nicht eingebunden: private Gratisnutzung unter Zugriffsregeln.",category:"Umwelt & Natur",status:"excluded",url:"https://api.existenz.ch/"},
{title:"SLF Lawinenbulletin",detail:"Offizielle Schweizer Lawinenlage als weiterführender Dienst.",category:"Umwelt & Natur",status:"reference",url:"https://www.slf.ch/de/lawinenbulletin-und-schneesituation/"},
{title:"SLF Messdaten",detail:"Schneehöhen und alpine Messungen des SLF.",category:"Umwelt & Natur",status:"reference",url:"https://www.slf.ch/en/services-and-products/slf-data-service/"},
{title:"ETH / SED FDSN",detail:"Schweizer seismologische Originaldaten des Erdbebendienstes.",category:"Umwelt & Natur",status:"reference",url:"https://www.seismo.ethz.ch/de/earthquakes/switzerland/"},
{title:"USGS Earthquake",detail:"Erdbeben in und um die Schweiz aus dem globalen Ereigniskatalog.",category:"Umwelt & Natur",status:"live",url:"https://earthquake.usgs.gov/fdsnws/event/1/"},
{title:"Copernicus",detail:"Nicht eingebunden: Gratis-Kontingente für bestimmte Dienste.",category:"Umwelt & Natur",status:"excluded",url:"https://dataspace.copernicus.eu/analyse/apis"},
{title:"GBIF",detail:"Beobachtete Arten im Umfeld des ausgewählten Kartenpunkts.",category:"Umwelt & Natur",status:"live",url:"https://techdocs.gbif.org/en/openapi/"},
{title:"Transport API Schweiz",detail:"Nicht eingebunden: Fair-Use- und Abfrageregeln.",category:"Verkehr & Zahlen",status:"excluded",url:"https://transport.opendata.ch/docs.html"},
{title:"Open Transport Data Schweiz",detail:"Nicht eingebunden: API-Key sowie Nutzungslimits.",category:"Verkehr & Zahlen",status:"excluded",url:"https://opentransportdata.swiss/de/limits-and-costs/"},
{title:"Energiedashboard API",detail:"Offizielle Strom- und Energiedaten der Schweiz.",category:"Verkehr & Zahlen",status:"reference",url:"https://energiedashboard.ch/api/swagger-ui/index.html"},
{title:"Bundesamt für Statistik APIs",detail:"Amtliche Bevölkerungs- und Wirtschaftsstatistik.",category:"Verkehr & Zahlen",status:"reference",url:"https://www.bfs.admin.ch/"},
{title:"opendata.swiss CKAN",detail:"Suchportal für Datensätze aller Schweizer Verwaltungsebenen.",category:"Verkehr & Zahlen",status:"reference",url:"https://handbook.opendata.swiss/de/content/nutzen/api-nutzen.html"},
{title:"Nager.Date",detail:"Schweizer Feiertage aus der freien Community-API v4.",category:"Verkehr & Zahlen",status:"live",url:"https://nagerholidays.com/"},
{title:"Open Charge Map",detail:"Nicht eingebunden: API-Schlüssel und Nutzungsvorgaben.",category:"Verkehr & Zahlen",status:"excluded",url:"https://www.openchargemap.org/develop/api"},
{title:"Open Food Facts",detail:"Nicht eingebunden: verkehrsabhängige API-Limits.",category:"Wissen & Alltag",status:"excluded",url:"https://openfoodfacts.github.io/documentation/docs/"},
{title:"Open Library",detail:"Nicht eingebunden: dokumentierte Anfragegrenzen.",category:"Wissen & Alltag",status:"excluded",url:"https://openlibrary.org/developers"},
{title:"Wikimedia APIs",detail:"Ortswissen über Wikipedia-Geosuche in Deutsch.",category:"Wissen & Alltag",status:"live",url:"https://www.mediawiki.org/wiki/Wikimedia_APIs"},
{title:"MusicBrainz",detail:"Nicht eingebunden: öffentliche API limitiert Anfragerate.",category:"Wissen & Alltag",status:"excluded",url:"https://musicbrainz.org/doc/MusicBrainz_API"},
{title:"World Bank Indicators",detail:"Jüngster verfügbarer Bevölkerungswert der Schweiz.",category:"Wissen & Alltag",status:"live",url:"https://datahelpdesk.worldbank.org/knowledgebase/articles/889392"}
];
export const STATUS_NAMES={live:"Hier genutzt",reference:"Offenes Portal",excluded:"Mit Limit"};
export function matchingSources(items,{query="",filter="all"}={}){
  const q=query.trim().toLocaleLowerCase("de-CH");
  return items.filter(s=>(filter==="all"||s.status===filter)&&(!q||[s.title,s.detail,s.category].join(" ").toLocaleLowerCase("de-CH").includes(q)));
}
