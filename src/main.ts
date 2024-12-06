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
const TILESIZE = 0.0001;

const STARTPOS: LatLng = leaflet.latLng(36.98949379578401, -122.06277128548504);
let CurrentPos: LatLng = STARTPOS;

const CACHESPAWNRANGE = 8;

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

interface bCell {
  cell: Cell;
  bool: boolean;
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
interface CacheData {
  orginCell: Cell;
  serial: number;
  currentCell: Cell;
  bInInventory: boolean;
}
interface Cache {
  data: CacheData;
  toMomento(): string;
  fromMomento(momento: string): void;
}

function BuildCache(data: CacheData): Cache {
  return {
    data: data,
    toMomento(): string {
      return JSON.stringify(this.data);
    },
    fromMomento(momento: string) {
      this.data = JSON.parse(momento);
    },
  };
}

interface bCellCachData {
  caches: Cache[];
  bool: boolean; //if created new cache
}

interface bCellCache {
  caches: Cache[];
  bool: boolean; //if created new cache
}

interface CellCachePos {
  caches: Cache[];
  cell: Cell;
}

//toMomento(): string;
//fromMomento(momento: string): void;

const knownCaches: Map<string, CellCachePos> = new Map<string, CellCachePos>();

const rects: Map<string, leaflet.Rectangle[]> = new Map<
  string,
  leaflet.Rectangle[]
>();

const savedCaches: Map<string, string[]> = new Map<string, string[]>();

function getCellKey(cell: Cell) {
  const { i, j } = cell;
  return [i, j].toString();
}

function getCacheKey(cache: Cache) {
  const { orginCell, serial } = cache.data;
  return `${orginCell.i}:${orginCell.j}#${serial}`;
}

function getCellCaches(cell: Cell): bCellCache {
  const key = getCellKey(cell);
  const knownCachData = knownCaches.get(key);
  if (!knownCachData) {
    if (luck([cell.i, cell.j, SEEDCELL].toString()) < 0.1) {
      const CoinCount = Math.ceil(luck([cell.i, cell.j, SEED].toString()) * 5);
      knownCaches.set(key, { caches: [], cell: cell });
      for (let i = 0; i < CoinCount; i++) {
        knownCaches.get(key)?.caches.push(BuildCache({
          orginCell: { i: cell.i, j: cell.j },
          serial: i,
          currentCell: { i: cell.i, j: cell.j },
          bInInventory: false,
        }));
        if (knownCaches && knownCaches.get(key) && knownCaches.get(key)?.cell) {
          let tmp = knownCaches.get(key)?.cell;
          if (tmp) {
            tmp = cell;
          }
        }
      }
    }
    return { caches: knownCaches.get(key)?.caches!, bool: true };
  } else {
    const validCaches = knownCachData.caches.filter((cache) => {
      return (
        cache.data.currentCell.i === cell.i &&
        cache.data.currentCell.j === cell.j &&
        !cache.data.bInInventory
      );
    });
    knownCaches.set(key, { caches: validCaches, cell: cell });
    return { caches: validCaches, bool: false };
  }
}

function getCellsNearLatLng(latLng: LatLng): bCell[] {
  console.log(savedCaches.size);
  const resultCells: bCell[] = [];
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
      const tmpKey = getCellKey({ i: i, j: j });
      let bLoadedCaches = false;
      if (savedCaches.has(tmpKey) /* && !knownCaches.has(tmpKey)*/) {
        console.log("has save");
        const nearbyCaches = savedCaches.get(tmpKey);
        if (nearbyCaches && nearbyCaches.length > 0) {
          for (const str of nearbyCaches) {
            console.log("read string");
            const a: Cache = BuildCache({
              orginCell: { i: 0, j: 0 },
              serial: 0,
              currentCell: { i: 0, j: 0 },
              bInInventory: false,
            });
            a.fromMomento(str);
            //console.log(a);
            if (knownCaches.has(tmpKey)) {
              const tmpCacheArray: CellCachePos | undefined = knownCaches.get(
                tmpKey,
              );
              if (tmpCacheArray) {
                tmpCacheArray.caches.push(a);
                console.log("add to known cache");
              } else {
                knownCaches.set(tmpKey, { caches: [a], cell: { i: i, j: j } });
                console.log("add to known cache");
              }
            } else {
              knownCaches.set(tmpKey, { caches: [a], cell: { i: i, j: j } });
              console.log("add to known cache");
            }
          }
          savedCaches.delete(tmpKey);
          bLoadedCaches = true;
          console.log("read");
          resultCells.push({ cell: { i: i, j: j }, bool: true });
        }
      }
      if (!bLoadedCaches) {
        const nearbyCaches = getCellCaches({ i: i, j: j });
        if (nearbyCaches.caches) {
          resultCells.push({ cell: { i: i, j: j }, bool: nearbyCaches.bool });
        }
      }
    }
  }
  const keysToDelete: string[] = [];
  for (const tmpCaches of knownCaches.values()) {
    const cellKey = getCellKey(tmpCaches.cell);
    for (const tmpCache of tmpCaches.caches) {
      if (
        tmpCache.data.currentCell.i < OrginCell.i - CACHESPAWNRANGE ||
        tmpCache.data.currentCell.i > OrginCell.i + CACHESPAWNRANGE ||
        tmpCache.data.currentCell.j < OrginCell.j - CACHESPAWNRANGE ||
        tmpCache.data.currentCell.j > OrginCell.j + CACHESPAWNRANGE
      ) {
        if (!savedCaches.has(cellKey)) {
          savedCaches.set(cellKey, [tmpCache.toMomento()]);
        } else {
          savedCaches.get(cellKey)?.push(tmpCache.toMomento());
        }
        keysToDelete.push(cellKey);
      }
    }
    const tmpRect: leaflet.Rectangle | undefined = rects.get(cellKey);
    if (tmpRect) {
      tmpRect.closePopup();
      if (CurrentlyOpenCellRect === tmpRect) {
        CurrentlyOpenCellRect = undefined;
      }
      tmpRect.off();
      tmpRect.remove();
      rects.delete(cellKey);
    }
  }
  for (const key of keysToDelete) {
    knownCaches.delete(key);
  }
  return resultCells;
}

function collectCoin(cell: Cell, cacheIndex: number): boolean {
  const tmpCell: Cache[] | undefined = knownCaches.get(getCellKey(cell))
    ?.caches;
  if (tmpCell) {
    const cache = tmpCell[cacheIndex];
    if (
      cache.data.currentCell.i == cell.i &&
      cache.data.currentCell.j == cell.j &&
      !cache.data.bInInventory
    ) {
      tmpCell.splice(cacheIndex, 1);
      cache.data.bInInventory = true;
      cache.data.currentCell.i = 0;
      cache.data.currentCell.j = 0;
      CoinInventory.push(cache);
      return true;
    }
  }
  return false;
}

function dropCoin(cell: Cell, cacheIndex: number): boolean {
  if (CurrentlyOpenCellRect) {
    const tmpCell: Cache[] | undefined = knownCaches.get(getCellKey(cell))
      ?.caches;
    if (tmpCell) {
      const cache = CoinInventory[cacheIndex];
      if (cache.data.bInInventory) {
        CoinInventory.splice(cacheIndex, 1);
        cache.data.bInInventory = false;
        cache.data.currentCell.i = cell.i;
        cache.data.currentCell.j = cell.j;
        knownCaches.get(getCellKey(cell))?.caches.push(cache);
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

function updatePlayerPosition() {
  const tmpPos = Cell_To_LatLng(LatLng_To_Cell(CurrentPos));
  CurrentPos = {
    lat: tmpPos.lat + TILESIZE * 0.5,
    lng: tmpPos.lng + TILESIZE * 0.5,
  };
  playerMarker.setLatLng(CurrentPos);
  map.setView(CurrentPos, map.getZoom(), { animation: true });
  SpawnNearbyCaches();
}

AddHTMLElement(app, "button", [
  { propertyPath: ["innerHTML"], value: "⬆️" },
  {
    propertyPath: ["onclick"],
    value: () => {
      CurrentPos.lat += TILESIZE;
      updatePlayerPosition();
    },
  },
]);
AddHTMLElement(app, "button", [
  { propertyPath: ["innerHTML"], value: "⬇️" },
  {
    propertyPath: ["onclick"],
    value: () => {
      CurrentPos.lat -= TILESIZE;
      updatePlayerPosition();
    },
  },
]);
AddHTMLElement(app, "button", [
  { propertyPath: ["innerHTML"], value: "➡️" },
  {
    propertyPath: ["onclick"],
    value: () => {
      CurrentPos.lng += TILESIZE;
      updatePlayerPosition();
    },
  },
]);
AddHTMLElement(app, "button", [
  { propertyPath: ["innerHTML"], value: "⬅️" },
  {
    propertyPath: ["onclick"],
    value: () => {
      CurrentPos.lng -= TILESIZE;
      updatePlayerPosition();
    },
  },
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
  center: CurrentPos,
  zoom: STARTZOOM,
  minZoom: MINZOOM,
  maxZoom: MAXZOOM,
  zoomControl: true,
  scrollWheelZoom: true,
});

function createRectangle(cell: Cell) {
  const cellKey = getCellKey(cell);
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
  rects.set(cellKey, rect);
  return rect;
}

function createCache(cell: Cell) {
  const cellKey = getCellKey(cell);
  if (!rects.has(cellKey)) {
    const rect = createRectangle(cell);

    rect.cell = cell;
    rect.bindPopup(() => {
      CurrentlyOpenCellRect = rect;
      const popup = AddHTMLElement(app, "div", []);
      AddHTMLElement(popup, "div", []);
      updateCache();
      function updateCache() {
        popup.innerHTML = "Cache (" + cell.i + ", " + cell.j + "):";
        const cellCaches: Cache[] = knownCaches.get(getCellKey(cell))?.caches ||
          [];
        for (let i = 0; i < cellCaches.length; i++) {
          AddHTMLElement(popup, "button", [
            {
              propertyPath: ["innerHTML"],
              value: getCacheKey(cellCaches[i]),
            },
            { propertyPath: ["id"], value: "poke" },
            {
              propertyPath: ["onclick"],
              value: () => {
                console.log(collectCoin(cell, i));
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
      //let tmp: Cell = rect.cell;
    });
  }
}

leaflet.tileLayer(MAPIMAGE, { maxZoom: MAXZOOM, attribution: ATTRIBUTION })
  .addTo(map);

function SpawnNearbyCaches() {
  const NearbyCells = getCellsNearLatLng(CurrentPos);
  for (const cell of NearbyCells) {
    const cellKey = getCellKey(cell.cell);
    if (!rects.has(cellKey)) {
      createCache(cell.cell);
    }
  }
}

const playerMarker = leaflet.marker(CurrentPos);
playerMarker.bindTooltip("player position");
playerMarker.addTo(map);

updatePlayerPosition();

function updateCoins() {
  while (coinInventoryElement.firstChild) {
    coinInventoryElement.removeChild(coinInventoryElement.firstChild);
  }
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
