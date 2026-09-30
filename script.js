"use strict";

/* =========================================================
   Helpers
   ========================================================= */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

/* =========================================================
   Config and data
   ========================================================= */
const DEFAULT_API = "http://127.0.0.1:8000";
let apiBase = safeGet("roomTypeApiBase") || DEFAULT_API;

// Order matches model.classes_ (alphabetical), which is the order of predict_proba.
const CLASSES = [
  { key: "Entire home/apt", label: "Entire home or apartment", color: "var(--amber)", rgb: "255,180,84", icon: "home" },
  { key: "Private room", label: "Private room", color: "var(--teal)", rgb: "95,208,200", icon: "door" },
  { key: "Shared room", label: "Shared room", color: "var(--violet)", rgb: "167,139,250", icon: "shared" },
];

const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10M10 19.5v-5h4v5"/></svg>',
  door: '<svg viewBox="0 0 24 24"><path d="M6 20V4.5h12V20M4 20h16M14.5 12v.5"/></svg>',
  shared: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="2.5"/><circle cx="16.5" cy="10" r="2"/><path d="M3.5 19c.5-3.2 2.4-4.8 4.5-4.8s4 1.6 4.5 4.8M13.5 19c.3-2.3 1.6-3.6 3-3.6s2.7 1.3 3 3.6"/></svg>',
};

const HOODS = {
  "Bronx": ["Allerton", "Baychester", "Belmont", "Bronxdale", "Castle Hill", "City Island", "Claremont Village", "Clason Point", "Co-op City", "Concourse", "Concourse Village", "East Morrisania", "Eastchester", "Edenwald", "Fieldston", "Fordham", "Highbridge", "Hunts Point", "Kingsbridge", "Longwood", "Melrose", "Morris Heights", "Morris Park", "Morrisania", "Mott Haven", "Mount Eden", "Mount Hope", "North Riverdale", "Norwood", "Olinville", "Parkchester", "Pelham Bay", "Pelham Gardens", "Port Morris", "Riverdale", "Schuylerville", "Soundview", "Spuyten Duyvil", "Throgs Neck", "Tremont", "Unionport", "University Heights", "Van Nest", "Wakefield", "West Farms", "Westchester Square", "Williamsbridge", "Woodlawn"],
  "Brooklyn": ["Bath Beach", "Bay Ridge", "Bedford-Stuyvesant", "Bensonhurst", "Bergen Beach", "Boerum Hill", "Borough Park", "Brighton Beach", "Brooklyn Heights", "Brownsville", "Bushwick", "Canarsie", "Carroll Gardens", "Clinton Hill", "Cobble Hill", "Columbia St", "Coney Island", "Crown Heights", "Cypress Hills", "DUMBO", "Downtown Brooklyn", "Dyker Heights", "East Flatbush", "East New York", "Flatbush", "Flatlands", "Fort Greene", "Fort Hamilton", "Gowanus", "Gravesend", "Greenpoint", "Kensington", "Manhattan Beach", "Midwood", "Mill Basin", "Navy Yard", "Park Slope", "Prospect Heights", "Prospect-Lefferts Gardens", "Red Hook", "Sea Gate", "Sheepshead Bay", "South Slope", "Sunset Park", "Vinegar Hill", "Williamsburg", "Windsor Terrace"],
  "Manhattan": ["Battery Park City", "Chelsea", "Chinatown", "Civic Center", "East Harlem", "East Village", "Financial District", "Flatiron District", "Gramercy", "Greenwich Village", "Harlem", "Hell's Kitchen", "Inwood", "Kips Bay", "Little Italy", "Lower East Side", "Marble Hill", "Midtown", "Morningside Heights", "Murray Hill", "NoHo", "Nolita", "Roosevelt Island", "SoHo", "Stuyvesant Town", "Theater District", "Tribeca", "Two Bridges", "Upper East Side", "Upper West Side", "Washington Heights", "West Village"],
  "Queens": ["Arverne", "Astoria", "Bay Terrace", "Bayside", "Bayswater", "Belle Harbor", "Bellerose", "Breezy Point", "Briarwood", "Cambria Heights", "College Point", "Corona", "Ditmars Steinway", "Douglaston", "East Elmhurst", "Edgemere", "Elmhurst", "Far Rockaway", "Flushing", "Forest Hills", "Fresh Meadows", "Glendale", "Hollis", "Holliswood", "Howard Beach", "Jackson Heights", "Jamaica", "Jamaica Estates", "Jamaica Hills", "Kew Gardens", "Kew Gardens Hills", "Laurelton", "Little Neck", "Long Island City", "Maspeth", "Middle Village", "Neponsit", "Ozone Park", "Queens Village", "Rego Park", "Richmond Hill", "Ridgewood", "Rockaway Beach", "Rosedale", "South Ozone Park", "Springfield Gardens", "St. Albans", "Sunnyside", "Whitestone", "Woodhaven", "Woodside"],
  "Staten Island": ["Arden Heights", "Arrochar", "Bay Terrace, Staten Island", "Bull's Head", "Castleton Corners", "Clifton", "Concord", "Dongan Hills", "Eltingville", "Emerson Hill", "Graniteville", "Grant City", "Great Kills", "Grymes Hill", "Howland Hook", "Huguenot", "Mariners Harbor", "Midland Beach", "New Brighton", "New Dorp", "New Dorp Beach", "New Springville", "Oakwood", "Port Richmond", "Prince's Bay", "Randall Manor", "Rosebank", "Rossville", "Shore Acres", "Silver Lake", "South Beach", "St. George", "Stapleton", "Todt Hill", "Tompkinsville", "Tottenville", "West Brighton", "Westerleigh", "Willowbrook"],
};

const BORO_CENTER = {
  "Manhattan": [40.7831, -73.9712],
  "Brooklyn": [40.6782, -73.9442],
  "Queens": [40.7282, -73.7949],
  "Bronx": [40.8448, -73.8648],
  "Staten Island": [40.5795, -74.1502],
};

const PRESETS = {
  midtown: {
    neighbourhood_group: "Manhattan", neighbourhood: "Midtown",
    latitude: 40.7549, longitude: -73.984, price: 220, minimum_nights: 3,
    number_of_reviews: 45, reviews_per_month: 1.2, calculated_host_listings_count: 1, availability_365: 180,
  },
  bushwick: {
    neighbourhood_group: "Brooklyn", neighbourhood: "Bushwick",
    latitude: 40.6994, longitude: -73.9213, price: 65, minimum_nights: 2,
    number_of_reviews: 30, reviews_per_month: 0.9, calculated_host_listings_count: 2, availability_365: 250,
  },
  jamaica: {
    neighbourhood_group: "Queens", neighbourhood: "Jamaica",
    latitude: 40.7027, longitude: -73.789, price: 30, minimum_nights: 1,
    number_of_reviews: 10, reviews_per_month: 0.5, calculated_host_listings_count: 5, availability_365: 340,
  },
};

// Form fields in on-screen order (used for validation and focus).
const FIELD_ORDER = [
  "neighbourhood_group", "neighbourhood", "latitude", "longitude", "price",
  "minimum_nights", "availability_365", "number_of_reviews",
  "reviews_per_month", "calculated_host_listings_count",
];

const state = { borough: "" };
const sessionHistory = [];

/* =========================================================
   Skyline (header canvas)
   ========================================================= */
const Skyline = (() => {
  const canvas = $("#skyline");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, buildings = [], windows = [];
  let wave = null;
  let lastToggle = 0;

  function rng(seed) {
    let s = seed >>> 0;
    return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  }

  function build() {
    const rand = rng(11);
    buildings = [];
    windows = [];
    let x = -8;
    while (x < W) {
      const w = 30 + rand() * 48;
      const h = H * (0.22 + rand() * 0.36);
      buildings.push({ x, w, h });
      for (let wx = x + 6; wx < x + w - 8; wx += 10) {
        for (let wy = H - h + 10; wy < H - 8; wy += 13) {
          windows.push({ x: wx, y: wy, on: rand() < 0.3, cx: wx / W });
        }
      }
      x += w + rand() * 5;
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    draw(performance.now());
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    for (const b of buildings) {
      const g = ctx.createLinearGradient(0, H - b.h, 0, H);
      g.addColorStop(0, "#1a1f45");
      g.addColorStop(1, "#11152f");
      ctx.fillStyle = g;
      ctx.fillRect(b.x, H - b.h, b.w, b.h);
    }

    for (const w of windows) {
      let drawn = false;
      if (wave) {
        const lt = now - wave.start - w.cx * 900;
        if (lt > 0 && lt < 1800) {
          const k = Math.sin((Math.PI * lt) / 1800);
          ctx.fillStyle = `rgba(${wave.rgb},${0.25 + 0.75 * k})`;
          ctx.fillRect(w.x, w.y, 5, 7);
          drawn = true;
        }
      }
      if (!drawn && w.on) {
        ctx.fillStyle = "rgba(255,180,84,0.55)";
        ctx.fillRect(w.x, w.y, 5, 7);
      }
    }

    if (wave && now - wave.start > 2800) wave = null;
  }

  function tick(now) {
    if (now - lastToggle > 220) {
      lastToggle = now;
      for (let i = 0; i < 4; i++) {
        const w = windows[(Math.random() * windows.length) | 0];
        if (w) w.on = !w.on;
      }
    }
    draw(now);
    requestAnimationFrame(tick);
  }

  function lightUp(rgb) {
    if (reduceMotion) return;
    wave = { start: performance.now(), rgb };
  }

  function start() {
    resize();
    new ResizeObserver(resize).observe(canvas);
    if (!reduceMotion) requestAnimationFrame(tick);
  }

  return { start, lightUp };
})();

/* =========================================================
   Coordinate map
   ========================================================= */
const CoordMap = (() => {
  const canvas = $("#map");
  const ctx = canvas.getContext("2d");
  const readout = $("#mapReadout");
  const B = { latMin: 40.49, latMax: 40.92, lngMin: -74.27, lngMax: -73.69 };
  let W = 0, H = 0, hover = null, pulseStart = 0;

  const toXY = (lat, lng) => [
    ((lng - B.lngMin) / (B.lngMax - B.lngMin)) * W,
    ((B.latMax - lat) / (B.latMax - B.latMin)) * H,
  ];
  const toLatLng = (x, y) => [
    B.latMax - (y / H) * (B.latMax - B.latMin),
    B.lngMin + (x / W) * (B.lngMax - B.lngMin),
  ];

  function current() {
    const lat = parseFloat($("#latitude").value);
    const lng = parseFloat($("#longitude").value);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    if (lat < B.latMin || lat > B.latMax || lng < B.lngMin || lng > B.lngMax) return null;
    return [lat, lng];
  }

  function draw(now = performance.now()) {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(154,161,199,0.12)";
    ctx.lineWidth = 1;
    for (let lat = 40.5; lat <= B.latMax; lat += 0.1) {
      const [, y] = toXY(lat, B.lngMin);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let lng = -74.2; lng <= B.lngMax; lng += 0.1) {
      const [x] = toXY(B.latMin, lng);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }

    ctx.font = "11px Figtree, system-ui, sans-serif";
    ctx.textAlign = "center";
    for (const [name, [lat, lng]] of Object.entries(BORO_CENTER)) {
      const [x, y] = toXY(lat, lng);
      ctx.fillStyle = state.borough === name ? "rgba(255,180,84,0.9)" : "rgba(154,161,199,0.55)";
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillText(name, x, y - 9);
    }

    if (hover) {
      ctx.strokeStyle = "rgba(255,180,84,0.35)";
      ctx.beginPath(); ctx.moveTo(hover.x, 0); ctx.lineTo(hover.x, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, hover.y); ctx.lineTo(W, hover.y); ctx.stroke();
    }

    const pin = current();
    if (pin) {
      const [x, y] = toXY(pin[0], pin[1]);
      const t = (now - pulseStart) / 900;
      if (t >= 0 && t < 1) {
        ctx.strokeStyle = `rgba(255,180,84,${1 - t})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 6 + t * 26, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = "#ffb454";
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#0d1021";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function animatePulse() {
    pulseStart = performance.now();
    if (reduceMotion) { draw(); return; }
    const loop = (now) => {
      draw(now);
      if (now - pulseStart < 900) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener("mousemove", (e) => {
    hover = pointer(e);
    const [lat, lng] = toLatLng(hover.x, hover.y);
    readout.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    draw();
  });

  canvas.addEventListener("mouseleave", () => {
    hover = null;
    readout.textContent = "";
    draw();
  });

  canvas.addEventListener("click", (e) => {
    const p = pointer(e);
    const [lat, lng] = toLatLng(p.x, p.y);
    $("#latitude").value = lat.toFixed(5);
    $("#longitude").value = lng.toFixed(5);
    clearError("latitude");
    clearError("longitude");
    animatePulse();
  });

  new ResizeObserver(resize).observe(canvas);

  return { draw, pulse: animatePulse };
})();

/* =========================================================
   Form: sliders, steppers, borough chips, neighbourhood combobox
   ========================================================= */
function updateFill(range) {
  const min = Number(range.min), max = Number(range.max);
  const p = ((Number(range.value) - min) / (max - min)) * 100;
  range.style.setProperty("--p", `${Math.max(0, Math.min(100, p))}%`);
}

function bindPair(name) {
  const num = $(`#${name}`);
  const range = $(`#${name}_range`);
  if (!num || !range) return;
  range.addEventListener("input", () => {
    num.value = range.value;
    updateFill(range);
    clearError(name);
  });
  num.addEventListener("input", () => {
    if (num.value !== "") range.value = num.value; // the slider clamps to its own range
    updateFill(range);
  });
  updateFill(range);
}

function bindSteppers() {
  $$(".stepper button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = $(`#${btn.dataset.target}`);
      const step = Number(input.step) || 1;
      const min = input.min !== "" ? Number(input.min) : -Infinity;
      let v = (parseFloat(input.value) || 0) + Number(btn.dataset.dir) * step;
      v = Math.max(min, v);
      input.value = step < 1 ? v.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : String(Math.round(v));
      clearError(btn.dataset.target);
    });
  });
}

function setBorough(name) {
  state.borough = name || "";
  $$('input[name="borough"]').forEach((r) => { r.checked = r.value === name; });
  CoordMap.draw();
}

function bindBoroughs() {
  $$('input[name="borough"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      setBorough(radio.value);
      clearError("neighbourhood_group");

      const hood = $("#neighbourhood");
      if (hood.value && !HOODS[radio.value].includes(hood.value)) hood.value = "";

      const [lat, lng] = BORO_CENTER[radio.value];
      $("#latitude").value = lat.toFixed(5);
      $("#longitude").value = lng.toFixed(5);
      CoordMap.pulse();
    });
  });
}

function bindCombo() {
  const input = $("#neighbourhood");
  const list = $("#hoodList");
  const all = Object.entries(HOODS).flatMap(([borough, names]) => names.map((name) => ({ name, borough })));
  let items = [];
  let active = -1;

  const pool = () => (state.borough ? all.filter((o) => o.borough === state.borough) : all);

  function setActive(i) {
    active = i;
    $$("li", list).forEach((li, idx) => li.classList.toggle("active", idx === i));
    const el = $$("li", list)[i];
    if (el) {
      el.scrollIntoView({ block: "nearest" });
      input.setAttribute("aria-activedescendant", el.id);
    }
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    items = pool().filter((o) => o.name.toLowerCase().includes(q)).slice(0, 80);
    list.replaceChildren();
    if (!items.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = state.borough ? "No match in this borough" : "No match";
      list.append(li);
      active = -1;
      return;
    }
    items.forEach((o, i) => {
      const li = document.createElement("li");
      li.id = `hood-${i}`;
      li.setAttribute("role", "option");
      li.append(document.createTextNode(o.name));
      if (!state.borough) {
        const small = document.createElement("small");
        small.textContent = o.borough;
        li.append(small);
      }
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(i); });
      list.append(li);
    });
    setActive(0);
  }

  function open() {
    render();
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function choose(i) {
    const o = items[i];
    if (!o) return;
    input.value = o.name;
    if (state.borough !== o.borough) setBorough(o.borough);
    clearError("neighbourhood");
    clearError("neighbourhood_group");
    close();
  }

  input.addEventListener("focus", open);
  input.addEventListener("input", () => { clearError("neighbourhood"); open(); });
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (list.hidden) open(); else setActive(Math.min(active + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(Math.max(active - 1, 0));
    } else if (e.key === "Enter" && !list.hidden && active >= 0) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      close();
    }
  });
}

/* =========================================================
   Validation (mirrors the pydantic model)
   ========================================================= */
function fieldEl(name) { return $(`.field[data-field="${name}"]`); }

function setError(name, message) {
  const f = fieldEl(name);
  if (!f) return;
  f.classList.add("has-error");
  $(".err", f).textContent = message;
}

function clearError(name) {
  const f = fieldEl(name);
  if (!f) return;
  f.classList.remove("has-error");
  $(".err", f).textContent = "";
}

function clearAllErrors() { FIELD_ORDER.forEach(clearError); }

function num(id) {
  const raw = $(`#${id}`).value.trim();
  return raw === "" ? NaN : Number(raw);
}

function readValues() {
  return {
    latitude: num("latitude"),
    longitude: num("longitude"),
    price: num("price"),
    minimum_nights: num("minimum_nights"),
    number_of_reviews: num("number_of_reviews"),
    reviews_per_month: num("reviews_per_month"),
    calculated_host_listings_count: num("calculated_host_listings_count"),
    availability_365: num("availability_365"),
    neighbourhood_group: state.borough,
    neighbourhood: $("#neighbourhood").value.trim(),
  };
}

function validate(v) {
  const e = {};
  const isInt = Number.isInteger;

  if (!v.neighbourhood_group) e.neighbourhood_group = "Choose a borough.";

  if (!v.neighbourhood) {
    e.neighbourhood = "Choose a neighbourhood.";
  } else {
    const all = Object.values(HOODS).flat();
    const match = all.find((n) => n.toLowerCase() === v.neighbourhood.toLowerCase());
    if (!match) e.neighbourhood = "Pick a neighbourhood from the list.";
    else v.neighbourhood = match;
  }

  if (Number.isNaN(v.latitude)) e.latitude = "Enter a latitude.";
  else if (v.latitude < -90 || v.latitude > 90) e.latitude = "Latitude must be between -90 and 90.";

  if (Number.isNaN(v.longitude)) e.longitude = "Enter a longitude.";
  else if (v.longitude < -180 || v.longitude > 180) e.longitude = "Longitude must be between -180 and 180.";

  if (Number.isNaN(v.price)) e.price = "Enter a price per night.";
  else if (v.price <= 0) e.price = "Price must be greater than 0.";

  if (Number.isNaN(v.minimum_nights)) e.minimum_nights = "Enter the minimum nights.";
  else if (!isInt(v.minimum_nights) || v.minimum_nights < 1 || v.minimum_nights > 365) e.minimum_nights = "Use a whole number from 1 to 365.";

  if (Number.isNaN(v.availability_365)) e.availability_365 = "Enter the available days.";
  else if (!isInt(v.availability_365) || v.availability_365 < 0 || v.availability_365 > 365) e.availability_365 = "Use a whole number from 0 to 365.";

  if (Number.isNaN(v.number_of_reviews)) e.number_of_reviews = "Enter the review count.";
  else if (!isInt(v.number_of_reviews) || v.number_of_reviews < 0) e.number_of_reviews = "Use a whole number, 0 or more.";

  if (Number.isNaN(v.reviews_per_month)) e.reviews_per_month = "Enter reviews per month.";
  else if (v.reviews_per_month < 0) e.reviews_per_month = "Must be 0 or more.";

  if (Number.isNaN(v.calculated_host_listings_count)) e.calculated_host_listings_count = "Enter the listing count.";
  else if (!isInt(v.calculated_host_listings_count) || v.calculated_host_listings_count < 0) e.calculated_host_listings_count = "Use a whole number, 0 or more.";

  return e;
}

function showErrors(errors) {
  clearAllErrors();
  let first = null;
  for (const name of FIELD_ORDER) {
    if (errors[name]) {
      setError(name, errors[name]);
      const f = fieldEl(name);
      f.classList.remove("shake");
      void f.offsetWidth; // restart the animation
      f.classList.add("shake");
      if (!first) first = name;
    }
  }
  if (first) {
    const target = first === "neighbourhood_group" ? $('input[name="borough"]') : $(`#${first}`);
    target.focus({ preventScroll: false });
  }
}

/* =========================================================
   Applying values (presets and history)
   ========================================================= */
function applyValues(v) {
  setBorough(v.neighbourhood_group);
  $("#neighbourhood").value = v.neighbourhood;
  $("#latitude").value = v.latitude;
  $("#longitude").value = v.longitude;
  $("#price").value = v.price;
  $("#minimum_nights").value = v.minimum_nights;
  $("#availability_365").value = v.availability_365;
  $("#number_of_reviews").value = v.number_of_reviews;
  $("#reviews_per_month").value = v.reviews_per_month;
  $("#calculated_host_listings_count").value = v.calculated_host_listings_count;

  ["price", "minimum_nights", "availability_365"].forEach((n) => {
    const r = $(`#${n}_range`);
    r.value = $(`#${n}`).value;
    updateFill(r);
  });

  clearAllErrors();
  CoordMap.pulse();

  $$(".field").forEach((f) => {
    f.classList.remove("flash");
    void f.offsetWidth;
    f.classList.add("flash");
  });
}

/* =========================================================
   Result panel
   ========================================================= */
const resultEl = $("#result");

function setResultState(name) { resultEl.dataset.state = name; }

function buildBars() {
  const ul = $("#bars");
  ul.replaceChildren();
  CLASSES.forEach((c) => {
    const li = document.createElement("li");
    li.dataset.key = c.key;
    li.style.setProperty("--c", c.color);
    li.innerHTML = `
      <div class="bar-top">
        <span class="bar-name"><i></i>${c.label}</span>
        <span class="bar-pct">0.0%</span>
      </div>
      <div class="track"><div class="fill"></div></div>`;
    ul.append(li);
  });
}

function countUp(el, to, decimals, suffix = "", duration = 1100) {
  if (reduceMotion) { el.textContent = to.toFixed(decimals) + suffix; return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = (to * eased).toFixed(decimals) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function describe(sorted) {
  const [top, second] = sorted;
  const gap = top.p - second.p;
  if (top.p >= 0.8) return "A strong match. The other two types are unlikely.";
  if (gap < 0.15) return `A close call between ${top.cls.label.toLowerCase()} and ${second.cls.label.toLowerCase()}.`;
  return `A likely match, with ${second.cls.label.toLowerCase()} as the runner-up.`;
}

function showResult(data) {
  const probs = Array.isArray(data.probability) && Array.isArray(data.probability[0]) ? data.probability[0] : [];
  const entries = CLASSES.map((cls, i) => ({ cls, p: Number(probs[i]) || 0 }));
  const predicted = CLASSES.find((c) => c.key === data.predicted_room_type) || entries.slice().sort((a, b) => b.p - a.p)[0].cls;
  const sorted = entries.slice().sort((a, b) => b.p - a.p);
  const topP = entries.find((e) => e.cls === predicted).p;

  resultEl.style.setProperty("--accent", predicted.color);
  $("#verdictName").textContent = predicted.label;
  $("#verdictIcon").innerHTML = ICONS[predicted.icon];
  $("#verdictNote").textContent = describe(sorted);

  buildBars();
  const fill = $("#gaugeFill");
  fill.style.transition = "none";
  fill.style.strokeDashoffset = "377";
  $("#gaugePct").textContent = "0";

  setResultState("done");
  void fill.getBoundingClientRect(); // make sure the reset is applied before animating

  requestAnimationFrame(() => {
    fill.style.transition = "";
    fill.style.strokeDashoffset = String(377 * (1 - topP));
    countUp($("#gaugePct"), topP * 100, 0);

    $$("#bars li").forEach((li) => {
      const entry = entries.find((e) => e.cls.key === li.dataset.key);
      li.classList.toggle("is-top", entry.cls === predicted);
      $(".fill", li).style.width = `${(entry.p * 100).toFixed(1)}%`;
      countUp($(".bar-pct", li), entry.p * 100, 1, "%");
    });
  });


  Skyline.lightUp(predicted.rgb);
  return predicted;
}

function explainError(err) {
  if (err.name === "TimeoutError" || err.name === "AbortError") {
    return { title: "The API took too long", body: `No answer came back from ${apiBase} within 20 seconds.\nCheck that the server is running, then try again.` };
  }
  if (err instanceof ApiError) {
    if (err.status === 422 && err.data && Array.isArray(err.data.detail)) {
      const lines = [];
      err.data.detail.forEach((d) => {
        const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : "";
        if (FIELD_ORDER.includes(field)) setError(field, d.msg);
        lines.push(`${field}: ${d.msg}`);
      });
      return { title: "The API rejected some values", body: lines.join("\n") };
    }
    const detail = err.data && err.data.detail ? String(err.data.detail) : "No details were returned.";
    return { title: `The API returned an error (${err.status})`, body: detail };
  }
  return {
    title: "Can't reach the API",
    body: `Nothing is answering at ${apiBase}.\nStart the server with: uvicorn main:app --reload\nIf it runs on another address, change it with the status pill at the top.`,
  };
}

function showError(err) {
  const { title, body } = explainError(err);
  $("#errTitle").textContent = title;
  $("#errBody").textContent = body;
  setResultState("error");
}

/* =========================================================
   History
   ========================================================= */
function addHistory(values, cls) {
  sessionHistory.unshift({ values: { ...values }, cls });
  if (sessionHistory.length > 5) sessionHistory.pop();

  const list = $("#historyList");
  list.replaceChildren();
  sessionHistory.forEach((h) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.setProperty("--c", h.cls.color);
    btn.innerHTML = `<i></i>`;
    btn.append(document.createTextNode(h.cls.label));
    const meta = document.createElement("span");
    meta.textContent = `$${h.values.price} in ${h.values.neighbourhood}`;
    btn.append(meta);
    btn.addEventListener("click", () => applyValues(h.values));
    li.append(btn);
    list.append(li);
  });
  $("#history").hidden = false;
}

/* =========================================================
   API
   ========================================================= */
class ApiError extends Error {
  constructor(status, data) {
    super(`API error ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function checkApi() {
  const dot = $("#apiDot");
  const text = $("#apiText");
  dot.dataset.s = "checking";
  text.textContent = "Checking API";
  try {
    const res = await fetch(`${apiBase}/`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error("bad status");
    dot.dataset.s = "ok";
    text.textContent = "API online";
    return true;
  } catch {
    dot.dataset.s = "down";
    text.textContent = "API offline";
    return false;
  }
}

async function requestPrediction(values) {
  const res = await fetch(`${apiBase}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
    signal: AbortSignal.timeout(20000),
  });
  let data = null;
  try { data = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

/* =========================================================
   Wiring
   ========================================================= */
function addRipple(btn, e) {
  if (reduceMotion) return;
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const r = document.createElement("span");
  r.className = "ripple";
  r.style.width = r.style.height = `${size}px`;
  r.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left - size / 2}px`;
  r.style.top = `${(e.clientY || rect.top + rect.height / 2) - rect.top - size / 2}px`;
  btn.append(r);
  setTimeout(() => r.remove(), 650);
}

function init() {
  ["price", "minimum_nights", "availability_365"].forEach(bindPair);
  bindSteppers();
  bindBoroughs();
  bindCombo();

  // Clear the error on a field as soon as the person edits it.
  FIELD_ORDER.forEach((name) => {
    const el = $(`#${name}`);
    if (el) el.addEventListener("input", () => clearError(name));
  });
  ["latitude", "longitude"].forEach((id) => $(`#${id}`).addEventListener("input", () => CoordMap.draw()));

  $$(".preset").forEach((btn) => {
    btn.addEventListener("click", () => applyValues(PRESETS[btn.dataset.preset]));
  });

  const form = $("#form");
  const button = $("#predictBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const values = readValues();
    const errors = validate(values);
    showErrors(errors);
    if (Object.keys(errors).length) return;

    button.classList.add("busy");
    setResultState("loading");
    if (window.matchMedia("(max-width: 960px)").matches) {
      resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    try {
      // Hold the loading state briefly so the skeleton doesn't just flash.
      const [data] = await Promise.all([requestPrediction(values), sleep(500)]);
      const predicted = showResult(data);
      addHistory(values, predicted);
      $("#apiDot").dataset.s = "ok";
      $("#apiText").textContent = "API online";
    } catch (err) {
      showError(err);
      if (!(err instanceof ApiError)) {
        $("#apiDot").dataset.s = "down";
        $("#apiText").textContent = "API offline";
      }
    } finally {
      button.classList.remove("busy");
    }
  });

  button.addEventListener("mousedown", (e) => addRipple(button, e));

  // API address popover
  $("#apiUrl").value = apiBase;
  $("#apiSave").addEventListener("click", async () => {
    const value = $("#apiUrl").value.trim().replace(/\/+$/, "");
    if (!value) return;
    apiBase = value;
    safeSet("roomTypeApiBase", apiBase);
    await checkApi();
    $("#apiBox").open = false;
  });
  $("#errRetry").addEventListener("click", async () => {
    const ok = await checkApi();
    if (ok) setResultState("idle");
  });

  // Start with the Midtown example so the page never looks empty.
  applyValues(PRESETS.midtown);
  $$(".field").forEach((f) => f.classList.remove("flash"));

  Skyline.start();
  checkApi();
}

init();
