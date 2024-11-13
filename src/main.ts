import leaflet from "leaflet";
import "./leafletWorkaround.ts";
//import luck from "./luck.ts";//to be used later
import "./style.css";
import "leaflet/dist/leaflet.css";

//let Points = 0;//to be used later

const STARTPOS = leaflet.latLng(36.98949379578401, -122.06277128548504);
const MINZOOM = 15;
const MAXZOOM = 19;
const ZOOM = 19;

const MAPIMAGE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const app: HTMLDivElement = document.querySelector("#app")!;

interface CSSPropertyData {
  propertyPath: string[];
  value: string | (() => void);
}

function setNestedValue(obj: any, pathArray: string[], value: any) {
  pathArray.reduce((current, key, index) => {
    if (index === pathArray.length - 1) {
      current[key] = value;
    } else {
      if (!current[key] || typeof current[key] !== "object") {
        current[key] = {};
      }
    }
    return current[key];
  }, obj);
}

function AddHTMLElement(
  parent: any,
  type: string,
  properties: CSSPropertyData[],
) {
  const tmpElement = document.createElement(type);
  parent.append(tmpElement);
  if (properties !== null) {
    for (let i = 0; i < properties.length; i++) {
      setNestedValue(
        tmpElement,
        properties[i].propertyPath,
        properties[i].value,
      );
    }
  }
  return tmpElement;
}
//<div id="controlPanel">
const controlPanel = AddHTMLElement(app, "div", [
  { propertyPath: ["id"], value: "controlPanel" },
]);
AddHTMLElement(controlPanel, "button", [
  { propertyPath: ["innerHTML"], value: "test" },
  {
    propertyPath: ["onclick"],
    value: () => {
      alert("you clicked the button!");
    },
  },
]);
AddHTMLElement(app, "div", [
  { propertyPath: ["id"], value: "statusPanel" },
  { propertyPath: ["innerHTML"], value: "No Points" },
]);
const mapElement = AddHTMLElement(app, "div", [
  { propertyPath: ["id"], value: "map" },
]);

const map = leaflet.map(mapElement, {
  center: STARTPOS,
  zoom: ZOOM,
  minZoom: MINZOOM,
  maxZoom: MAXZOOM,
  zoomControl: true,
  scrollWheelZoom: true,
});

leaflet.tileLayer(MAPIMAGE, { maxZoom: MAXZOOM, attribution: ATTRIBUTION })
  .addTo(map);

const playerMarker = leaflet.marker(STARTPOS);
playerMarker.bindTooltip("player position");
playerMarker.addTo(map);
