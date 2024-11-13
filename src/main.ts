import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import "./style.css";
import "leaflet/dist/leaflet.css";

let CoinsCollected = 0;

const STARTPOS = leaflet.latLng(36.98949379578401, -122.06277128548504);
const CACHESPAWNRANGE = 8;
const TILESIZE = 0.0001;

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
): any {
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
const coinInventory = AddHTMLElement(app, "div", []);
updateCoins(0);
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

function createRectangle(x: number, y: number, origin: any) {
  const rectangleBounds = leaflet.latLngBounds([
    [origin.lat + x * TILESIZE, origin.lng + y * TILESIZE],
    [
      origin.lat + x * TILESIZE + TILESIZE,
      origin.lng + y * TILESIZE + TILESIZE,
    ],
  ]);
  const rect = leaflet.rectangle(rectangleBounds);
  rect.addTo(map);
  return rect;
}

function createCache(x: number, y: number, origin: any) {
  const rect = createRectangle(x, y, origin);
  rect.CoinCount = Math.ceil(luck([x, y, "seed"].toString()) * 5);
  rect.bindPopup(() => {
    const popup = AddHTMLElement(app, "div", []);
    AddHTMLElement(popup, "div", []);
    updateCache();
    function updateCache() {
      popup.innerHTML = "Cache (" + x + ", " + y + "): there are " +
        rect.CoinCount + " coins here";
      AddHTMLElement(popup, "button", [
        { propertyPath: ["innerHTML"], value: "collect coin" },
        { propertyPath: ["id"], value: "poke" },
        {
          propertyPath: ["onclick"],
          value: () => {
            if (rect.CoinCount > 0) {
              rect.CoinCount--;
              updateCoins(CoinsCollected + 1);
              updateCache();
            }
          },
        },
      ]);
      AddHTMLElement(popup, "button", [
        { propertyPath: ["innerHTML"], value: "deposit coin" },
        { propertyPath: ["id"], value: "poke" },
        {
          propertyPath: ["onclick"],
          value: () => {
            if (CoinsCollected > 0) {
              rect.CoinCount++;
              updateCoins(CoinsCollected - 1);
              updateCache();
            }
          },
        },
      ]);
    }
    return popup;
  }, { autoClose: false, closeOnClick: false });
}

leaflet.tileLayer(MAPIMAGE, { maxZoom: MAXZOOM, attribution: ATTRIBUTION })
  .addTo(map);
for (let x = -CACHESPAWNRANGE; x < CACHESPAWNRANGE; x++) {
  for (let y = -CACHESPAWNRANGE; y < CACHESPAWNRANGE; y++) {
    if (luck([x, y].toString()) < 0.1) {
      createCache(x, y, STARTPOS);
    }
  }
}

const playerMarker = leaflet.marker(STARTPOS);
playerMarker.bindTooltip("player position");
playerMarker.addTo(map);

function updateCoins(num: number) {
  CoinsCollected = num;
  if (CoinsCollected === 0) {
    coinInventory.innerHTML = "you have no coins";
  } else if (CoinsCollected === 1) {
    coinInventory.innerHTML = "you have 1 coin";
  } else {
    coinInventory.innerHTML = "you have " + CoinsCollected + " coins";
  }
}
