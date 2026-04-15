import { computed, onUnmounted, ref } from "vue";

export const COLS = 8;
export const ROWS = 8;
export const CELL = 44;

const PAD = 14;
const TRAY_H = 170;
const SLOT_GAP = 12;
const HI_KEY = "cosmicBlockBlastHi";
const PIECES_PER_TRAY = 3;

/** Saturated, varied palette for a more colourful look */
const PALETTE = [
  "#ff2d95",
  "#00f5ff",
  "#ffd166",
  "#a78bfa",
  "#00ffa3",
  "#ff4b81",
  "#38bdf8",
  "#fb7185",
  "#f59e0b",
  "#22d3ee",
  "#c084fc",
  "#f472b6",
  "#4ade80",
];

const SHAPES: number[][][] = [
  [[1]],
  [[1, 1]],
  [[1], [1]],
  [
    [1, 1],
    [1, 1],
  ],
  [[1, 1, 1]],
  [[1], [1], [1]],
  [[1, 1, 1, 1]],
  [[1], [1], [1], [1]],
  [
    [1, 0],
    [1, 1],
  ],
  [
    [0, 1],
    [1, 1],
  ],
  [
    [1, 1],
    [1, 0],
  ],
  [
    [1, 1],
    [0, 1],
  ],
  [
    [1, 1, 1],
    [0, 1, 0],
  ],
];

type BlockPiece = { shape: number[][]; color: string; colorId: number };

type DragState = {
  index: number;
  grabCr: number;
  grabCc: number;
  /** Pixel offset from piece bbox top-left to pointer, in tray cell scale (same as origin.cell) */
  grabOffsetX: number;
  grabOffsetY: number;
  /** Tray cell size at drag start; floating draw uses CELL, so offsets must scale by CELL/trayCellAtGrab */
  trayCellAtGrab: number;
  x: number;
  y: number;
};

type ClearAnimState = {
  rows: number[];
  cols: number[];
  /** 0..1 */
  t: number;
  /** Grid snapshot after place, before lines cleared */
  grid: number[][];
  pendingScore: number;
  trayIndex: number;
};

function emptyGrid(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function cloneShape(shape: number[][]): number[][] {
  return shape.map((row) => [...row]);
}

function randomPiece(): BlockPiece {
  const i = Math.floor(Math.random() * SHAPES.length);
  const colorId = 1 + Math.floor(Math.random() * PALETTE.length);
  return {
    shape: cloneShape(SHAPES[i]),
    color: PALETTE[(colorId - 1) % PALETTE.length],
    colorId,
  };
}

function canPlaceAt(grid: number[][], shape: number[][], br: number, bc: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const gr = br + r;
      const gc = bc + c;
      if (gr < 0 || gr >= ROWS || gc < 0 || gc >= COLS) return false;
      if (grid[gr][gc] !== 0) return false;
    }
  }
  return true;
}

function place(grid: number[][], shape: number[][], br: number, bc: number, colorId: number): void {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      grid[br + r][bc + c] = colorId;
    }
  }
}

function findFullRowsAndCols(grid: number[][]): { rows: number[]; cols: number[] } {
  const rowsToClear: number[] = [];
  const colsToClear: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (grid[r].every((v) => v > 0)) rowsToClear.push(r);
  }
  for (let c = 0; c < COLS; c++) {
    let full = true;
    for (let r = 0; r < ROWS; r++) {
      if (grid[r][c] === 0) {
        full = false;
        break;
      }
    }
    if (full) colsToClear.push(c);
  }
  return { rows: rowsToClear, cols: colsToClear };
}

function applyClears(grid: number[][], rows: number[], cols: number[]): void {
  for (const r of rows) {
    for (let c = 0; c < COLS; c++) grid[r][c] = 0;
  }
  for (const c of cols) {
    for (let r = 0; r < ROWS; r++) grid[r][c] = 0;
  }
}

function hasAnyPlacement(grid: number[][], shape: number[][]): boolean {
  for (let br = 0; br < ROWS; br++) {
    for (let bc = 0; bc < COLS; bc++) {
      if (canPlaceAt(grid, shape, br, bc)) return true;
    }
  }
  return false;
}

function nearestFilledCell(shape: number[][], cr: number, cc: number): { cr: number; cc: number } {
  if (shape[cr]?.[cc]) return { cr, cc };
  let best = { cr: 0, cc: 0, d: Number.MAX_SAFE_INTEGER };
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const d = Math.abs(r - cr) + Math.abs(c - cc);
      if (d < best.d) best = { cr: r, cc: c, d };
    }
  }
  return { cr: best.cr, cc: best.cc };
}

function drawCellVibrant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  alpha = 1,
) {
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(x, y, x + size, y + size);
  g.addColorStop(0, color);
  g.addColorStop(1, shadeColor(color, -0.25));
  ctx.fillStyle = g;
  ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
  ctx.globalAlpha = 1;
}

function shadeColor(hex: string, amount: number): string {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.round(Math.min(255, Math.max(0, r + amount * 255)));
  g = Math.round(Math.min(255, Math.max(0, g + amount * 255)));
  b = Math.round(Math.min(255, Math.max(0, b + amount * 255)));
  return `rgb(${r},${g},${b})`;
}

export function useTetrisDrag() {
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const grid = ref<number[][]>(emptyGrid());
  const tray = ref<(BlockPiece | null)[]>(Array.from({ length: PIECES_PER_TRAY }, () => randomPiece()));

  const score = ref(0);
  const bestScore = ref(0);
  const running = ref(true);
  const paused = ref(false);
  const gameOver = ref(false);

  const drag = ref<DragState | null>(null);
  const ghost = ref<{ br: number; bc: number; valid: boolean } | null>(null);
  const clearAnim = ref<ClearAnimState | null>(null);

  let raf = 0;
  let animRaf = 0;

  let boardX = PAD;
  let trayY = 0;
  let trayCell = 20;
  let slotW = 0;
  let slotH = 0;

  const stateLabel = computed(() => (gameOver.value ? "No moves" : "Playing"));

  function loadHi() {
    try {
      const n = Number(localStorage.getItem(HI_KEY));
      if (!Number.isNaN(n)) bestScore.value = n;
    } catch {}
  }

  function saveHi() {
    try {
      if (score.value > bestScore.value) {
        bestScore.value = score.value;
        localStorage.setItem(HI_KEY, String(bestScore.value));
      }
    } catch {}
  }

  function refillTrayIfNeeded() {
    if (tray.value.every((p) => p === null)) {
      tray.value = Array.from({ length: PIECES_PER_TRAY }, () => randomPiece());
    }
  }

  function checkGameOver() {
    const remaining = tray.value.filter((p): p is BlockPiece => !!p);
    gameOver.value = remaining.length > 0 && !remaining.some((p) => hasAnyPlacement(grid.value, p.shape));
    if (gameOver.value) saveHi();
  }

  function recalcMetrics() {
    trayY = PAD + ROWS * CELL + 14;
    slotW = Math.floor((COLS * CELL - SLOT_GAP * 2) / 3);
    slotH = TRAY_H - 36;
    trayCell = Math.max(14, Math.min(22, Math.floor(slotW / 4)));
  }

  function slotRect(i: number): { x: number; y: number; w: number; h: number } {
    return {
      x: boardX + i * (slotW + SLOT_GAP),
      y: trayY + 20,
      w: slotW,
      h: slotH,
    };
  }

  function pieceInSlot(i: number): { x: number; y: number; cell: number } | null {
    const piece = tray.value[i];
    if (!piece) return null;
    const rect = slotRect(i);
    const pw = piece.shape[0].length * trayCell;
    const ph = piece.shape.length * trayCell;
    return {
      x: rect.x + (rect.w - pw) / 2,
      y: rect.y + (rect.h - ph) / 2,
      cell: trayCell,
    };
  }

  function canvasToLogical(clientX: number, clientY: number): { x: number; y: number } {
    const canvas = canvasRef.value;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cssW = parseFloat(canvas.style.width) || rect.width;
    const cssH = parseFloat(canvas.style.height) || rect.height;
    return {
      x: ((clientX - rect.left) / rect.width) * cssW,
      y: ((clientY - rect.top) / rect.height) * cssH,
    };
  }

  function boardCellFromPoint(x: number, y: number): { br: number; bc: number } | null {
    if (x < boardX || x >= boardX + COLS * CELL || y < PAD || y >= PAD + ROWS * CELL) return null;
    return {
      br: Math.floor((y - PAD) / CELL),
      bc: Math.floor((x - boardX) / CELL),
    };
  }

  function updateGhostForDrag(x: number, y: number) {
    const d = drag.value;
    if (!d) return;
    const piece = tray.value[d.index];
    if (!piece) return;
    const cell = boardCellFromPoint(x, y);
    if (!cell) {
      ghost.value = null;
      return;
    }
    const br = cell.br - d.grabCr;
    const bc = cell.bc - d.grabCc;
    ghost.value = { br, bc, valid: canPlaceAt(grid.value, piece.shape, br, bc) };
  }

  function finalizeClearAnim() {
    const anim = clearAnim.value;
    if (!anim) return;
    const g = anim.grid.map((row) => [...row]);
    applyClears(g, anim.rows, anim.cols);
    grid.value = g;
    score.value += anim.pendingScore;
    saveHi();
    tray.value[anim.trayIndex] = null;
    clearAnim.value = null;
    refillTrayIfNeeded();
    checkGameOver();
    draw();
  }

  function runClearAnimation() {
    const anim = clearAnim.value;
    if (!anim) return;
    const start = performance.now();
    const duration = 520;

    function frame(now: number) {
      const a = clearAnim.value;
      if (!a) return;
      a.t = Math.min(1, (now - start) / duration);
      if (a.t >= 1) {
        finalizeClearAnim();
        return;
      }
      draw();
      animRaf = requestAnimationFrame(frame);
    }
    cancelAnimationFrame(animRaf);
    draw();
    animRaf = requestAnimationFrame(frame);
  }

  function placeDraggedIfValid() {
    const d = drag.value;
    if (!d) return;
    const piece = tray.value[d.index];
    const g = ghost.value;
    if (!piece || !g?.valid) {
      ghost.value = null;
      return;
    }

    const nextGrid = grid.value.map((r) => [...r]);
    place(nextGrid, piece.shape, g.br, g.bc, piece.colorId);
    const { rows, cols } = findFullRowsAndCols(nextGrid);
    const basePoints = piece.shape.flat().filter(Boolean).length * 10;
    const clearBonus = (rows.length + cols.length) * 80;
    const pendingScore = basePoints + clearBonus;

    if (rows.length === 0 && cols.length === 0) {
      grid.value = nextGrid;
      tray.value[d.index] = null;
      refillTrayIfNeeded();
      checkGameOver();
      score.value += pendingScore;
      saveHi();
      draw();
      return;
    }

    clearAnim.value = {
      rows,
      cols,
      t: 0,
      grid: nextGrid,
      pendingScore,
      trayIndex: d.index,
    };
    runClearAnimation();
  }

  function start() {
    cancelAnimationFrame(animRaf);
    clearAnim.value = null;
    grid.value = emptyGrid();
    tray.value = Array.from({ length: PIECES_PER_TRAY }, () => randomPiece());
    score.value = 0;
    gameOver.value = false;
    paused.value = false;
    running.value = true;
    drag.value = null;
    ghost.value = null;
    draw();
  }

  function togglePause() {}

  function rotateCurrent() {}

  function onPointerDown(e: PointerEvent) {
    if (gameOver.value || clearAnim.value) return;
    const { x, y } = canvasToLogical(e.clientX, e.clientY);
    for (let i = 0; i < PIECES_PER_TRAY; i++) {
      const piece = tray.value[i];
      const origin = pieceInSlot(i);
      if (!piece || !origin) continue;
      const lx = x - origin.x;
      const ly = y - origin.y;
      if (lx < 0 || ly < 0 || lx >= piece.shape[0].length * origin.cell || ly >= piece.shape.length * origin.cell) continue;

      const roughCr = Math.max(0, Math.min(piece.shape.length - 1, Math.floor(ly / origin.cell)));
      const roughCc = Math.max(0, Math.min(piece.shape[0].length - 1, Math.floor(lx / origin.cell)));
      const grab = nearestFilledCell(piece.shape, roughCr, roughCc);
      const grabOffsetX = x - origin.x;
      const grabOffsetY = y - origin.y;
      drag.value = {
        index: i,
        grabCr: grab.cr,
        grabCc: grab.cc,
        grabOffsetX,
        grabOffsetY,
        trayCellAtGrab: origin.cell,
        x,
        y,
      };
      updateGhostForDrag(x, y);
      e.preventDefault();
      canvasRef.value?.setPointerCapture(e.pointerId);
      scheduleDraw();
      return;
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag.value || clearAnim.value) return;
    const { x, y } = canvasToLogical(e.clientX, e.clientY);
    drag.value = { ...drag.value, x, y };
    updateGhostForDrag(x, y);
    e.preventDefault();
    scheduleDraw();
  }

  function onPointerUp(e: PointerEvent) {
    placeDraggedIfValid();
    drag.value = null;
    ghost.value = null;
    try {
      canvasRef.value?.releasePointerCapture(e.pointerId);
    } catch {}
    if (!clearAnim.value) draw();
  }

  function onPointerLeave() {
    if (!drag.value) {
      ghost.value = null;
      draw();
    }
  }

  function drawPiece(
    ctx: CanvasRenderingContext2D,
    shape: number[][],
    x: number,
    y: number,
    cellSize: number,
    color: string,
    alpha = 1,
    vibrant = false,
  ) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const px = x + c * cellSize;
        const py = y + r * cellSize;
        if (vibrant) drawCellVibrant(ctx, px, py, cellSize, color, alpha);
        else {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function draw() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    recalcMetrics();
    const w = PAD * 2 + COLS * CELL;
    const h = trayY + TRAY_H + PAD;

    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, "#0a0e27");
    bgGrad.addColorStop(0.5, "#120a2e");
    bgGrad.addColorStop(1, "#050816");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const boardGrad = ctx.createLinearGradient(boardX, PAD, boardX + COLS * CELL, PAD + ROWS * CELL);
    boardGrad.addColorStop(0, "rgba(30,27,75,0.95)");
    boardGrad.addColorStop(1, "rgba(15,23,42,0.98)");
    ctx.fillStyle = boardGrad;
    ctx.fillRect(boardX, PAD, COLS * CELL, ROWS * CELL);

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(boardX + x * CELL, PAD);
      ctx.lineTo(boardX + x * CELL, PAD + ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(boardX, PAD + y * CELL);
      ctx.lineTo(boardX + COLS * CELL, PAD + y * CELL);
      ctx.stroke();
    }

    const gridSource = clearAnim.value?.grid ?? grid.value;
    const pulse = clearAnim.value ? 0.5 + 0.5 * Math.sin(clearAnim.value.t * Math.PI * 6) : 0;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = gridSource[r][c];
        if (!v) continue;
        const inClear =
          clearAnim.value &&
          (clearAnim.value.rows.includes(r) || clearAnim.value.cols.includes(c));
        const alpha = inClear ? 0.45 + 0.55 * pulse : 1;
        drawCellVibrant(
          ctx,
          boardX + c * CELL,
          PAD + r * CELL,
          CELL,
          PALETTE[(v - 1) % PALETTE.length],
          alpha,
        );
      }
    }

    if (ghost.value && drag.value && !clearAnim.value) {
      const piece = tray.value[drag.value.index];
      if (piece) {
        const ghostColor = ghost.value.valid ? "rgba(0,255,170,0.75)" : "rgba(255,80,120,0.7)";
        drawPiece(
          ctx,
          piece.shape,
          boardX + ghost.value.bc * CELL,
          PAD + ghost.value.br * CELL,
          CELL,
          ghostColor,
          0.85,
          true,
        );
      }
    }

    ctx.font = "12px system-ui,sans-serif";
    ctx.fillStyle = "rgba(224,250,255,0.85)";
    ctx.fillText("Blocks", boardX, trayY + 14);

    for (let i = 0; i < PIECES_PER_TRAY; i++) {
      const rect = slotRect(i);
      const piece = tray.value[i];
      ctx.strokeStyle = "rgba(0,255,255,0.28)";
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

      if (!piece) continue;
      if (clearAnim.value?.trayIndex === i) continue;
      if (drag.value?.index === i) {
        const d = drag.value;
        const scale = CELL / d.trayCellAtGrab;
        const dropX = d.x - d.grabOffsetX * scale;
        const dropY = d.y - d.grabOffsetY * scale;
        drawPiece(ctx, piece.shape, dropX, dropY, CELL, piece.color, 0.95, true);
      } else {
        const origin = pieceInSlot(i);
        if (origin) drawPiece(ctx, piece.shape, origin.x, origin.y, origin.cell, piece.color, 1, true);
      }
    }

    if (gameOver.value) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(boardX, PAD, COLS * CELL, ROWS * CELL);
      ctx.fillStyle = "#e0faff";
      ctx.font = "16px system-ui,sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No moves left", boardX + (COLS * CELL) / 2, PAD + (ROWS * CELL) / 2 - 8);
      ctx.font = "13px system-ui,sans-serif";
      ctx.fillText("Press Restart", boardX + (COLS * CELL) / 2, PAD + (ROWS * CELL) / 2 + 12);
      ctx.textAlign = "start";
    }
  }

  function scheduleDraw() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }

  function mount() {
    loadHi();
    draw();
  }

  function unmount() {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(animRaf);
  }

  onUnmounted(unmount);

  return {
    canvasRef,
    COLS,
    ROWS,
    CELL,
    grid,
    score,
    bestScore,
    gameOver,
    paused,
    running,
    stateLabel,
    start,
    togglePause,
    rotateCurrent,
    draw,
    mount,
    unmount,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  };
}
