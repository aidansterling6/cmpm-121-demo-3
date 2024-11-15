import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import "./style.css";
import "leaflet/dist/leaflet.css";

//let CoinsCollected = 0;
const CoinInventory: Cache[] = [];
let CurrentlyOpenCellRect: any;

const SEED = "seed: 6478365827";
const SEEDCELL = "seed: 625764525765";

const ORGIN = leaflet.latLng(0, 0);
const STARTPOS: LatLng = leaflet.latLng(36.98949379578401, -122.06277128548504);
const CACHESPAWNRANGE = 8;
const TILESIZE = 0.0001;

const MINZOOM = 15;
const MAXZOOM = 19;
const STARTZOOM = 19;

const MAPIMAGE = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';

interface LatLng {
  lat: number;
  lng: number;
}

interface Cell {
  i: number;
  j: number;
}

function LatLng_To_Cell(latlng: LatLng): Cell {
  return {
    i: Math.floor((latlng.lat - ORGIN.lat) / TILESIZE),
    j: Math.floor((latlng.lng - ORGIN.lng) / TILESIZE),
  };
}

function Cell_To_LatLng(cell: Cell): LatLng {
  return {
    lat: ORGIN.lat + cell.i * TILESIZE,
    lng: ORGIN.lng + cell.j * TILESIZE,
  };
}

interface Cache {
  orginCell: Cell;
  serial: number;
  currentCell: Cell;
  bInInventory: boolean;
}

const knownCaches: Map<string, Cache[]> = new Map<string, Cache[]>();

function getCellKey(cell: Cell) {
  const { i, j } = cell;
  return [i, j].toString();
}

function getCacheKey(cache: Cache) {
  const { orginCell, serial } = cache;
  return `${orginCell.i}:${orginCell.j}#${serial}`;
}

function getCellCaches(cell: Cell): Cache[] {
  const key = getCellKey(cell);
  const knownCachData = knownCaches.get(key);
  if (!knownCachData) {
    if (luck([cell.i, cell.j, SEEDCELL].toString()) < 0.1) {
      const CoinCount = Math.ceil(luck([cell.i, cell.j, SEED].toString()) * 5);
      knownCaches.set(key, []);
      for (let i = 0; i < CoinCount; i++) {
        knownCaches.get(key)?.push({
          orginCell: { i: cell.i, j: cell.j },
          serial: i,
          currentCell: { i: cell.i, j: cell.j },
          bInInventory: false,
        });
      }
    }
    return knownCaches.get(key)!;
  } else {
    const cellCaches: Cache[] = [];
    for (const cache of knownCachData) {
      if (
        cache.currentCell.i == cell.i && cache.currentCell.j == cell.j &&
        !cache.bInInventory
      ) {
        cellCaches.push(cache);
      }
    }
    knownCaches.set(key, cellCaches);
    return cellCaches;
  }
}

function getCellsNearLatLng(latLng: LatLng): Cell[] {
  const resultCells: Cell[] = [];
  const OrginCell: Cell = LatLng_To_Cell(latLng);
  for (
    let i = OrginCell.i - CACHESPAWNRANGE;
    i <= OrginCell.i + CACHESPAWNRANGE;
    i++
  ) {
    for (
      let j = OrginCell.j - CACHESPAWNRANGE;
      j <= OrginCell.j + CACHESPAWNRANGE;
      j++
    ) {
      if (getCellCaches({ i: i, j: j })) {
        resultCells.push({ i: i, j: j });
      }
    }
  }
  return resultCells;
}

function collectCoin(cell: Cell, cacheIndex: number): boolean {
  const tmpCell: Cache[] | undefined = knownCaches.get(getCellKey(cell));
  if (tmpCell) {
    const cache = tmpCell[cacheIndex];
    if (
      cache.currentCell.i == cell.i && cache.currentCell.j == cell.j &&
      !cache.bInInventory
    ) {
      tmpCell.splice(cacheIndex, 1);
      cache.bInInventory = true;
      cache.currentCell.i = 0;
      cache.currentCell.j = 0;
      CoinInventory.push(cache);
      return true;
    }
  }
  return false;
}

function dropCoin(cell: Cell, cacheIndex: number): boolean {
  if (CurrentlyOpenCellRect) {
    const tmpCell: Cache[] | undefined = knownCaches.get(getCellKey(cell));
    if (tmpCell) {
      const cache = CoinInventory[cacheIndex];
      if (cache.bInInventory) {
        CoinInventory.splice(cacheIndex, 1);
        cache.bInInventory = false;
        cache.currentCell.i = cell.i;
        cache.currentCell.j = cell.j;
        knownCaches.get(getCellKey(cell))?.push(cache);
        return true;
      }
    }
  }
  return false;
}

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
const coinInventoryElement = AddHTMLElement(app, "div", []);
updateCoins();
const mapElement = AddHTMLElement(app, "div", [
  { propertyPath: ["id"], value: "map" },
]);

const map = leaflet.map(mapElement, {
  center: STARTPOS,
  zoom: STARTZOOM,
  minZoom: MINZOOM,
  maxZoom: MAXZOOM,
  zoomControl: true,
  scrollWheelZoom: true,
});

function createRectangle(cell: Cell) {
  const latLng = Cell_To_LatLng(cell);
  const rectangleBounds = leaflet.latLngBounds([
    [latLng.lat, latLng.lng],
    [
      latLng.lat + TILESIZE,
      latLng.lng + TILESIZE,
    ],
  ]);
  const rect = leaflet.rectangle(rectangleBounds);
  rect.addTo(map);
  return rect;
}

function createCache(cell: Cell) {
  const rect = createRectangle(cell);
  const cellCaches = getCellCaches(cell);

  rect.cell = cell;
  rect.cellCaches = cellCaches;
  rect.bindPopup(() => {
    CurrentlyOpenCellRect = rect;
    const popup = AddHTMLElement(app, "div", []);
    AddHTMLElement(popup, "div", []);
    updateCache();
    function updateCache() {
      popup.innerHTML = "Cache (" + cell.i + ", " + cell.j + "):";
      for (let i = 0; i < rect.cellCaches.length; i++) {
        AddHTMLElement(popup, "button", [
          {
            propertyPath: ["innerHTML"],
            value: getCacheKey(rect.cellCaches[i]),
          },
          { propertyPath: ["id"], value: "poke" },
          {
            propertyPath: ["onclick"],
            value: () => {
              console.log(collectCoin(rect.cell, i));
              updateCoins();
              updateCache();
            },
          },
        ]);
      }
    }
    return popup;
  }, { autoClose: true, closeOnClick: false });
  rect.on("popupclose", function () {
    if (CurrentlyOpenCellRect === rect) {
      CurrentlyOpenCellRect = undefined;
    }
  });
}

leaflet.tileLayer(MAPIMAGE, { maxZoom: MAXZOOM, attribution: ATTRIBUTION })
  .addTo(map);
const NearbyCells = getCellsNearLatLng(STARTPOS);
for (const cell of NearbyCells) {
  createCache(cell);
}

const playerMarker = leaflet.marker(STARTPOS);
playerMarker.bindTooltip("player position");
playerMarker.addTo(map);

function updateCoins() {
  if (CoinInventory.length === 0) {
    coinInventoryElement.innerHTML = "you have no coins";
  } else if (CoinInventory.length === 1) {
    coinInventoryElement.innerHTML = "you have 1 coin";
  } else {
    coinInventoryElement.innerHTML = "you have " + CoinInventory.length +
      " coins";
  }
  for (let i = 0; i < CoinInventory.length; i++) {
    AddHTMLElement(coinInventoryElement, "button", [
      { propertyPath: ["innerHTML"], value: getCacheKey(CoinInventory[i]) },
      { propertyPath: ["id"], value: "poke" },
      {
        propertyPath: ["onclick"],
        value: () => {
          if (CurrentlyOpenCellRect && CurrentlyOpenCellRect.cell) {
            dropCoin(CurrentlyOpenCellRect.cell, i);
            while (coinInventoryElement.hasChildNodes()) {
              coinInventoryElement.removeChild(coinInventoryElement.firstChild);
            }
            CurrentlyOpenCellRect.openPopup();
          }
          updateCoins();
        },
      },
    ]);
  }
}
