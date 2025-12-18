'use strict';

/**
 * F1 2025 ダッシュボード（Chart.js）
 * - races_2025.json を読み込み、ドライバー別に可視化する
 * - 上部ヒーローは肖像を使わず、番号・メタ情報で表現する
 */

let rawData = [];
let currentRound = null;

let raceChart = null;
let pointsChart = null;

/* ----------------------------
   データURL（data/ 配下を優先し、無ければルートも試す）
   ---------------------------- */
const DATA_URL_CANDIDATES = ['./data/races_2025.json', './races_2025.json'];

/* ----------------------------
   ドライバープロフィール（ライセンス安全：非肖像）
   ---------------------------- */
const DRIVER_PROFILES = {
  'Lando Norris': {
    themeClass: 'theme-norris',
    number: '4',
    flag: '🇬🇧',
    team: 'McLaren',
    tagline: 'Precision under pressure · Late-race pace',
    color: '#FF9F1C',
  },
  'Max Verstappen': {
    themeClass: 'theme-verstappen',
    number: '33',
    flag: '🇳🇱',
    team: 'Red Bull Racing',
    tagline: 'Aggressive racecraft · Relentless speed',
    color: '#e10600',
  },
};

/* ----------------------------
   DOM参照（初期化後にセット）
   ---------------------------- */
const el = {
  driverSelect: null,
  roundSlider: null,
  roundValue: null,
  summary: null,
  heroName: null,
  heroSub: null,
  heroNumber: null,
  heroMeta: null,
};

/* ----------------------------
   初期化
   ---------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  bindDom();

  try {
    rawData = await loadRaceData(DATA_URL_CANDIDATES);
  } catch (err) {
    alert('レースデータの読み込みに失敗しました。ファイル配置とパスを確認してください。');
    console.error(err);
    return;
  }

  if (!rawData.length) {
    alert('データが空です（races_2025.json を確認してください）。');
    return;
  }

  initDriverSelector();
  initRoundSlider();

  const defaultDriver = getDrivers()[0];
  updateDashboard(defaultDriver);
});

/* ----------------------------
   DOM紐付け
   ---------------------------- */
function bindDom() {
  el.driverSelect = document.getElementById('driverSelect');
  el.roundSlider = document.getElementById('roundSlider');
  el.roundValue = document.getElementById('roundValue');
  el.summary = document.getElementById('summary');

  el.heroName = document.getElementById('heroName');
  el.heroSub = document.getElementById('heroSub');
  el.heroNumber = document.getElementById('heroNumber');
  el.heroMeta = document.getElementById('heroMeta');
}

/* ----------------------------
   データ読み込み
   - 複数候補を順番に試す（GitHub Pages/ローカル双方に強い）
   ---------------------------- */
async function loadRaceData(urlCandidates) {
  let lastError = null;

  for (const url of urlCandidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(`Invalid JSON array (${url})`);
      return data;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError ?? new Error('Failed to load data');
}

/* ----------------------------
   データ抽出ヘルパー
   ---------------------------- */
function getDrivers() {
  return [...new Set(rawData.map((d) => d.driver))];
}

function getRounds() {
  return [...new Set(rawData.map((d) => d.round))].sort((a, b) => a - b);
}

function raceNameByRound(round) {
  const row = rawData.find((d) => d.round === round);
  return row?.race ?? '';
}

function toRaceCode(raceName) {
  return raceName
    ? raceName.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3)
    : '';
}

/* ----------------------------
   テーマ適用（bodyにクラス付与）
   ---------------------------- */
function applyTheme(driverName) {
  document.body.classList.remove('theme-norris', 'theme-verstappen');

  const profile = DRIVER_PROFILES[driverName];
  if (profile?.themeClass) {
    document.body.classList.add(profile.themeClass);
  }
}

/* ----------------------------
   UI初期化：ドライバー選択
   ---------------------------- */
function initDriverSelector() {
  el.driverSelect.innerHTML = '';

  for (const d of getDrivers()) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    el.driverSelect.appendChild(opt);
  }

  el.driverSelect.addEventListener('change', (e) => {
    updateDashboard(e.target.value);
  });
}

/* ----------------------------
   UI初期化：ラウンドスライダー
   ---------------------------- */
function initRoundSlider() {
  const rounds = getRounds();

  currentRound = rounds.at(-1);
  el.roundSlider.min = String(rounds[0]);
  el.roundSlider.max = String(currentRound);
  el.roundSlider.value = String(currentRound);
  el.roundValue.textContent = String(currentRound);

  el.roundSlider.addEventListener('input', (e) => {
    currentRound = Number(e.target.value);
    el.roundValue.textContent = String(currentRound);

    // ヒーローの微小モーション（ラウンドに連動）
    updateHeroMotion();

    updateDashboard(el.driverSelect.value);
  });
}

/* ----------------------------
   画面更新（選択ドライバー + 現在ラウンドまで）
   ---------------------------- */
function updateDashboard(driverName) {
  applyTheme(driverName);

  const filtered = rawData
    .filter((d) => d.driver === driverName && d.round <= currentRound)
    .sort((a, b) => a.round - b.round);

  renderHero(driverName, filtered);
  updateSummary(filtered);
  drawRaceChart(filtered);
  drawCumulativeChart();
}

/* ----------------------------
   ヒーロー表示（番号・メタ情報）
   ---------------------------- */
function renderHero(driverName, data) {
  const profile = DRIVER_PROFILES[driverName];
  if (!profile) return;

  const total = data.reduce((s, d) => s + d.points, 0);
  const avg = data.length ? (total / data.length).toFixed(1) : '0.0';

  el.heroName.textContent = `${driverName} ${profile.flag}`;
  el.heroSub.textContent = profile.tagline;
  el.heroNumber.textContent = profile.number;

  // 表示は最小限にし、視認性を優先（面接でも説明しやすい）
  el.heroMeta.innerHTML = `
    <div class="driver-meta">
      <div class="driver-meta__k">Team</div>
      <div class="driver-meta__v">${escapeHtml(profile.team)}</div>
    </div>
    <div class="driver-meta">
      <div class="driver-meta__k">Rounds</div>
      <div class="driver-meta__v">${data.length}</div>
    </div>
    <div class="driver-meta">
      <div class="driver-meta__k">Points / Avg</div>
      <div class="driver-meta__v">${total} · ${avg}</div>
    </div>
  `;

  updateHeroMotion();
}

/* ----------------------------
   ヒーローの微小モーション（CSS変数を更新）
   ---------------------------- */
function updateHeroMotion() {
  const hero = document.querySelector('.driver-hero');
  if (!hero) return;

  const rounds = getRounds();
  const min = rounds[0];
  const max = rounds.at(-1);
  const t = (currentRound - min) / (max - min || 1);

  hero.style.setProperty('--heroShiftX', `${Math.round(-30 + t * 60)}px`);
  hero.style.setProperty('--heroShiftY', `${Math.round(-16 + t * 32)}px`);
  hero.style.setProperty('--heroGlow', (0.05 + t * 0.2).toFixed(3));
}

/* ----------------------------
   サマリー更新
   ---------------------------- */
function updateSummary(data) {
  if (!data.length) {
    el.summary.innerHTML = '';
    return;
  }

  const total = data.reduce((s, d) => s + d.points, 0);
  const avg = (total / data.length).toFixed(1);
  const best = Math.max(...data.map((d) => d.points));
  const worst = Math.min(...data.map((d) => d.points));

  el.summary.innerHTML = `
    <div><strong>Total Points</strong><br>${total}</div>
    <div><strong>Average</strong><br>${avg}</div>
    <div><strong>Best / Worst</strong><br>${best} / ${worst}</div>
  `;
}

/* ----------------------------
   Chart.js：共通設定（ツールチップを見やすく）
   ---------------------------- */
function createTooltip(titleBuilder) {
  return {
    backgroundColor: 'rgba(17,24,39,0.86)',
    borderColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    cornerRadius: 12,
    padding: 12,
    displayColors: true,
    titleFont: { size: 12, weight: '800' },
    bodyFont: { size: 12, weight: '600' },
    callbacks: {
      title: (items) => titleBuilder(items),
      labelColor: (ctx) => {
        const c = ctx.dataset.backgroundColor || ctx.dataset.borderColor || '#111';
        return { backgroundColor: c, borderColor: '#fff', borderWidth: 1 };
      },
      labelTextColor: () => '#F9FAFB',
      titleColor: () => '#F9FAFB',
    },
  };
}

function generateSolidLegendLabels(chart) {
  return chart.data.datasets.map((ds, i) => ({
    text: ds.label,
    fillStyle: ds.backgroundColor || ds.borderColor,
    strokeStyle: ds.borderColor,
    lineWidth: 1,
    hidden: !chart.isDatasetVisible(i),
    index: i,
  }));
}

/* ----------------------------
   グラフ：ラウンド別（ポイント + 順位）
   ---------------------------- */
function drawRaceChart(data) {
  const canvas = document.getElementById('raceChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (raceChart) raceChart.destroy();

  if (!data.length) {
    raceChart = null;
    return;
  }

  const driverName = data[0]?.driver;
  const color = DRIVER_PROFILES[driverName]?.color ?? '#2563eb';

  raceChart = new Chart(ctx, {
    data: {
      labels: data.map((d) => toRaceCode(d.race)),
      datasets: [
        {
          type: 'bar',
          label: 'Race Points',
          data: data.map((d) => d.points),
          backgroundColor: `${color}CC`,
          borderColor: color,
          borderWidth: 2,
          yAxisID: 'yPoints',
        },
        {
          type: 'line',
          label: 'Finish Position',
          data: data.map((d) => d.position),
          borderColor: '#111',
          borderWidth: 3,
          pointRadius: 4,
          tension: 0.25,
          yAxisID: 'yPos',
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            usePointStyle: false,
            generateLabels: generateSolidLegendLabels,
          },
        },
        tooltip: createTooltip((items) => {
          const idx = items[0].dataIndex;
          const row = data[idx];
          return `Round ${row.round} · ${row.race}`;
        }),
      },
      scales: {
        yPoints: { beginAtZero: true, position: 'left' },
        yPos: { reverse: true, position: 'right' },
      },
    },
  });
}

/* ----------------------------
   グラフ：累積ポイント（全ドライバー）
   ---------------------------- */
function drawCumulativeChart() {
  const canvas = document.getElementById('pointsChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (pointsChart) pointsChart.destroy();

  const rounds = getRounds().filter((r) => r <= currentRound);
  const drivers = getDrivers();

  const datasets = drivers.map((driverName) => {
    let sum = 0;
    const color = DRIVER_PROFILES[driverName]?.color ?? '#2563eb';

    return {
      label: driverName,
      data: rounds.map((r) => {
        const row = rawData.find((d) => d.driver === driverName && d.round === r);
        sum += row ? row.points : 0;
        return sum;
      }),
      borderColor: color,
      backgroundColor: color,
      borderWidth: 3,
      tension: 0.2,
      pointRadius: 0,
    };
  });

  pointsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rounds.map((r) => toRaceCode(raceNameByRound(r))),
      datasets,
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            usePointStyle: false,
            generateLabels: generateSolidLegendLabels,
          },
        },
        tooltip: createTooltip((items) => {
          const idx = items[0].dataIndex;
          const r = rounds[idx];
          return `Round ${r} · ${raceNameByRound(r)}`;
        }),
      },
    },
  });
}

/* ----------------------------
   安全対策：HTMLエスケープ
   ---------------------------- */
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
