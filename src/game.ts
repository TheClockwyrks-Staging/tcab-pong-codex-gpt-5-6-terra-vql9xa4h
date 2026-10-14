import type { Game, InitApi } from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as K from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
}
type R = { x: number; y: number; w: number; h: number };
export interface CaromDebugApi {
  readonly version: number;
  clearWorld(s: DeepReadonly<CaromState>): CaromState;
  spawnBall(s: DeepReadonly<CaromState>): CaromState;
  spawnObstacle(s: DeepReadonly<CaromState>, i: number): CaromState;
  reset(s: DeepReadonly<CaromState>): CaromState;
  reconcile(s: DeepReadonly<CaromState>): CaromState;
  setScreen(s: DeepReadonly<CaromState>, v: Screen): CaromState;
  setMode(s: DeepReadonly<CaromState>, v: Mode): CaromState;
  setMenuIndex(s: DeepReadonly<CaromState>, v: number): CaromState;
  setTitleIndex(s: DeepReadonly<CaromState>, v: number): CaromState;
  setResumeScreen(
    s: DeepReadonly<CaromState>,
    v: "countdown" | "playing",
  ): CaromState;
  setScore(s: DeepReadonly<CaromState>, a: number, b: number): CaromState;
  setWinner(s: DeepReadonly<CaromState>, v: Side | null): CaromState;
  setReceiver(s: DeepReadonly<CaromState>, v: Side): CaromState;
  setPaddleCy(s: DeepReadonly<CaromState>, v: Side, n: number): CaromState;
  setPaddleVy(s: DeepReadonly<CaromState>, v: Side, n: number): CaromState;
  setPaddleDriven(s: DeepReadonly<CaromState>, v: Side, n: boolean): CaromState;
  setBallPosition(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallVelocity(
    s: DeepReadonly<CaromState>,
    x: number,
    y: number,
  ): CaromState;
  setBallSpin(s: DeepReadonly<CaromState>, n: number): CaromState;
  setBallHeld(s: DeepReadonly<CaromState>, n: boolean): CaromState;
  setBallHoldTimer(s: DeepReadonly<CaromState>, n: number): CaromState;
  setBallServeSign(s: DeepReadonly<CaromState>, n: 1 | -1): CaromState;
  drawBallServeSign(s: DeepReadonly<CaromState>): CaromState;
  setAiTracking(s: DeepReadonly<CaromState>, n: boolean): CaromState;
  setAiMovement(s: DeepReadonly<CaromState>, n: boolean): CaromState;
  setMuted(s: DeepReadonly<CaromState>, n: boolean): CaromState;
  snapshot(s: DeepReadonly<CaromState>): object;
  menuItemRect(s: DeepReadonly<CaromState>, i: number): R | null;
}
export const BACKGROUND = "#07111d";
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const rnd = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const ball = (): BallState => ({
  x: K.FIELD_CX,
  y: K.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: K.HOLD_TIME,
  serveSign: rnd(),
  trail: [],
});
const obs = () =>
  K.OBSTACLE_CENTERS.map((p, index) => ({ index, cx: p.x, cy: p.y }));
const make = (muted = false, time = 0, titleIndex = 0): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: titleIndex,
  titleIndex,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: {
    left: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    right: { cy: K.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
  },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: ball(),
  obstacles: obs(),
  simTime: time,
  muted,
});
const items = (x: Screen): readonly string[] =>
  x === "title"
    ? K.TITLE_ITEMS
    : x === "paused"
      ? K.PAUSE_ITEMS
      : x === "matchover"
        ? K.MATCHOVER_ITEMS
        : x === "howto"
          ? ["BACK TO TITLE"]
          : [];
const menuRect = (s: DeepReadonly<CaromState>, i: number): R | null =>
  i < 0 || i >= items(s.screen).length
    ? null
    : { x: 420, y: 365 + i * 58, w: 440, h: 46 };
const paddle = (
  s: DeepReadonly<CaromState>,
  side: Side,
  p: PaddleState,
): CaromState => ({ ...s, paddles: { ...s.paddles, [side]: p } });
const required = (s: DeepReadonly<CaromState>): BallState => {
  if (!s.ball) throw new Error("Carom: no ball is present");
  return s.ball as BallState;
};
const move = (p: PaddleState, vy: number, dt: number): PaddleState => {
  const cy = clamp(p.cy + vy * dt, K.PADDLE_MIN_CY, K.PADDLE_MAX_CY);
  return { ...p, cy, vy: dt && cy !== p.cy + vy * dt ? (cy - p.cy) / dt : vy };
};
const match = (s: DeepReadonly<CaromState>, mode = s.mode): CaromState => ({
  ...s,
  mode,
  screen: "countdown",
  resumeScreen: "playing",
  menuIndex: 0,
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: ball(),
  paddles: {
    left: { ...s.paddles.left, cy: K.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: K.FIELD_CY, vy: 0 },
  },
});
const home = (s: DeepReadonly<CaromState>) =>
  make(s.muted, s.simTime, s.titleIndex);
type Face = "left" | "right" | "top" | "bottom";
function hit(
  b: BallState,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): [BallState, Face | null] {
  if (!(
    b.x > x0 - K.BALL_R &&
    b.x < x1 + K.BALL_R &&
    b.y > y0 - K.BALL_R &&
    b.y < y1 + K.BALL_R
  ))
    return [b, null];
  const a: [Face, number][] = [
    ["left", b.x - x0 + K.BALL_R],
    ["right", x1 + K.BALL_R - b.x],
    ["top", b.y - y0 + K.BALL_R],
    ["bottom", y1 + K.BALL_R - b.y],
  ];
  const f = a.reduce((q, z) => (z[1] < q[1] ? z : q))[0];
  if (f === "left")
    return [{ ...b, x: x0 - K.BALL_R, vx: b.vx > 0 ? -b.vx : b.vx }, f];
  if (f === "right")
    return [{ ...b, x: x1 + K.BALL_R, vx: b.vx < 0 ? -b.vx : b.vx }, f];
  if (f === "top")
    return [{ ...b, y: y0 - K.BALL_R, vy: b.vy > 0 ? -b.vy : b.vy }, f];
  return [{ ...b, y: y1 + K.BALL_R, vy: b.vy < 0 ? -b.vy : b.vy }, f];
}
function physics(
  ball0: BallState,
  s: DeepReadonly<CaromState>,
  dt: number,
  sound: (x: string) => void,
) {
  let b = { ...ball0 };
  const n = Math.max(
    1,
    Math.ceil((Math.hypot(b.vx, b.vy) * dt) / K.MAX_SUBSTEP),
  );
  for (let i = 0; i < n; i++) {
    const h = dt / n,
      sp = Math.hypot(b.vx, b.vy);
    if (sp) {
      const q = (b.spin / sp) * h,
        co = Math.cos(q),
        si = Math.sin(q);
      b = { ...b, vx: b.vx * co - b.vy * si, vy: b.vx * si + b.vy * co };
    }
    b = {
      ...b,
      spin: b.spin * Math.pow(0.5, h / K.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - K.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: K.BALL_R, vy: -b.vy };
      sound(K.CUES.wallBounce);
    } else if (b.y + K.BALL_R > K.FIELD_H && b.vy > 0) {
      b = { ...b, y: K.FIELD_H - K.BALL_R, vy: -b.vy };
      sound(K.CUES.wallBounce);
    }
    for (const [side, p, x0, x1] of [
      ["left", s.paddles.left, K.P1_X0, K.P1_X1],
      ["right", s.paddles.right, K.P2_X0, K.P2_X1],
    ] as const) {
      const [z, f] = hit(b, x0, x1, p.cy - K.PADDLE_HALF, p.cy + K.PADDLE_HALF);
      b = z;
      if (f === "left" || f === "right") {
        const v = Math.min(Math.hypot(b.vx, b.vy) * K.SPEED_MULT, K.SPEED_CAP),
          ang = clamp((b.y - p.cy) / K.PADDLE_HALF, -1, 1) * K.MAX_BOUNCE_ANGLE,
          d = side === "left" ? 1 : -1;
        b = {
          ...b,
          x: side === "left" ? K.P1_X1 + K.BALL_R : K.P2_X0 - K.BALL_R,
          vx: d * v * Math.cos(ang),
          vy: v * Math.sin(ang),
          spin: clamp(
            b.spin + p.vy * K.SPIN_FROM_PADDLE,
            -K.SPIN_CLAMP,
            K.SPIN_CLAMP,
          ),
        };
        sound(K.CUES.paddleHit);
      } else if (f) sound(K.CUES.wallBounce);
    }
    for (const o of s.obstacles) {
      const [z, f] = hit(b, o.cx - 10, o.cx + 10, o.cy - 70, o.cy + 70);
      b = z;
      if (f) sound(K.CUES.obstacleBounce);
    }
  }
  return b;
}
export const game: Game<CaromState, CaromDebugApi> = {
  initialize(api: InitApi<CaromState>) {
    K.ACTIONS.forEach((a) =>
      api.input.register(a, { keys: [...K.BINDINGS[a]] }),
    );
    api.audio.define(K.CUES.paddleHit, {
      wave: "square",
      freq: 360,
      freqTo: 560,
      gain: 0.12,
      durationMs: 45,
    });
    api.audio.define(K.CUES.wallBounce, {
      wave: "triangle",
      freq: 180,
      freqTo: 130,
      gain: 0.1,
      durationMs: 55,
    });
    api.audio.define(K.CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 250,
      freqTo: 170,
      gain: 0.08,
      durationMs: 55,
    });
    api.audio.define(K.CUES.score, {
      freq: 500,
      freqTo: 850,
      gain: 0.16,
      durationMs: 180,
    });
    [
      ["screen", (s: CaromState) => s.screen],
      ["mode", (s: CaromState) => s.mode],
      ["score", (s: CaromState) => `${s.score.p1}-${s.score.p2}`],
      [
        "ball",
        (s: CaromState) =>
          s.ball ? `${s.ball.x.toFixed(0)},${s.ball.y.toFixed(0)}` : "none",
      ],
      [
        "speed",
        (s: CaromState) => (s.ball ? Math.hypot(s.ball.vx, s.ball.vy) : 0),
      ],
      ["spin", (s: CaromState) => s.ball?.spin ?? 0],
    ].forEach(([n, f]) =>
      api.diagnostics.register(
        n as string,
        f as (s: DeepReadonly<CaromState>) => string | number | boolean,
      ),
    );
    const debug: CaromDebugApi = {
      version: K.CAROM_DEBUG_VERSION,
      clearWorld: (s) => ({ ...s, ball: null, obstacles: [] }),
      spawnBall: (s) => ({ ...s, ball: ball() }),
      spawnObstacle: (s, i) => {
        const p = K.OBSTACLE_CENTERS[i];
        if (!p) throw new Error("Carom: invalid obstacle");
        return {
          ...s,
          obstacles: [
            ...s.obstacles.filter((o) => o.index !== i),
            { index: i, cx: p.x, cy: p.y },
          ].sort((a, b) => a.index - b.index),
        };
      },
      reset: (s) => make(s.muted),
      reconcile: (s) => ({ ...s }),
      setScreen: (s, v) => ({ ...s, screen: v }),
      setMode: (s, v) => ({ ...s, mode: v }),
      setMenuIndex: (s, v) => ({ ...s, menuIndex: v }),
      setTitleIndex: (s, v) => ({ ...s, titleIndex: v }),
      setResumeScreen: (s, v) => ({ ...s, resumeScreen: v }),
      setScore: (s, a, b) => ({ ...s, score: { p1: a, p2: b } }),
      setWinner: (s, v) => ({ ...s, winner: v }),
      setReceiver: (s, v) => ({ ...s, receiver: v }),
      setPaddleCy: (s, v, n) => paddle(s, v, { ...s.paddles[v], cy: n }),
      setPaddleVy: (s, v, n) => paddle(s, v, { ...s.paddles[v], drivenVy: n }),
      setPaddleDriven: (s, v, n) =>
        paddle(s, v, { ...s.paddles[v], driven: n }),
      setBallPosition: (s, x, y) => ({ ...s, ball: { ...required(s), x, y } }),
      setBallVelocity: (s, x, y) => ({
        ...s,
        ball: { ...required(s), vx: x, vy: y },
      }),
      setBallSpin: (s, n) => ({ ...s, ball: { ...required(s), spin: n } }),
      setBallHeld: (s, n) => ({ ...s, ball: { ...required(s), held: n } }),
      setBallHoldTimer: (s, n) => ({
        ...s,
        ball: { ...required(s), holdTimer: n },
      }),
      setBallServeSign: (s, n) => ({
        ...s,
        ball: { ...required(s), serveSign: n },
      }),
      drawBallServeSign: (s) => ({
        ...s,
        ball: { ...required(s), serveSign: rnd() },
      }),
      setAiTracking: (s, n) => ({ ...s, ai: { ...s.ai, tracking: n } }),
      setAiMovement: (s, n) => ({ ...s, ai: { ...s.ai, movement: n } }),
      setMuted: (s, n) => ({ ...s, muted: n }),
      snapshot: (s) => ({
        version: K.CAROM_DEBUG_VERSION,
        ...s,
        ball: s.ball && { ...s.ball, speed: Math.hypot(s.ball.vx, s.ball.vy) },
      }),
      menuItemRect: menuRect,
    };
    return [make(), debug];
  },
  update(state, api, dt) {
    if (api.input.pressed("mute")) api.audio.setMuted(!api.audio.muted());
    let s: CaromState = {
      ...state,
      simTime: state.simTime + dt,
      muted: api.audio.muted(),
    };
    const up = api.input.pressed("p1-up") || api.input.pressed("p2-up"),
      down = api.input.pressed("p1-down") || api.input.pressed("p2-down"),
      ok = api.input.pressed("confirm");
    const activate = () => {
      if (s.screen === "title") {
        s = { ...s, titleIndex: s.menuIndex };
        s =
          s.menuIndex < 2
            ? match(s, s.menuIndex ? "versus" : "solo")
            : { ...s, screen: "howto", menuIndex: 0 };
      } else if (s.screen === "howto") s = home(s);
      else if (s.screen === "paused")
        s =
          s.menuIndex === 0
            ? { ...s, screen: s.resumeScreen }
            : s.menuIndex === 1
              ? match(s)
              : home(s);
      else if (s.screen === "matchover")
        s = s.menuIndex === 0 ? match(s) : home(s);
    };
    if (["title", "howto", "paused", "matchover"].includes(s.screen)) {
      const list = items(s.screen);
      if (s.screen === "howto") {
        if (ok || api.input.pressed("back")) s = home(s);
      } else {
        if (up)
          s = {
            ...s,
            menuIndex: (s.menuIndex + list.length - 1) % list.length,
          };
        else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % list.length };
        else if (ok) activate();
        const p = api.input.pointer(),
          i = list.findIndex((_, z) => {
            const r = menuRect(s, z)!;
            return (
              p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
            );
          });
        if (i >= 0) {
          s = { ...s, menuIndex: i };
          if (api.input.pointerReleased()) activate();
        }
        if (s.screen === "matchover" && api.input.pressed("back")) s = home(s);
      }
      return s;
    }
    if (
      (s.screen === "playing" || s.screen === "countdown") &&
      api.input.pressed("pause")
    )
      return { ...s, resumeScreen: s.screen, screen: "paused", menuIndex: 0 };
    if (s.screen !== "playing" && s.screen !== "countdown") return s;
    const velocity = (side: Side) => {
      const p = s.paddles[side];
      if (p.driven) return p.drivenVy;
      if (s.mode === "versus" || side === "left") {
        if (s.mode === "solo" && side === "left")
          return (
            (api.input.value("p1-down") +
              api.input.value("p2-down") -
              api.input.value("p1-up") -
              api.input.value("p2-up")) *
            K.PADDLE_SPEED
          );
        return (
          (api.input.value(side === "left" ? "p1-down" : "p2-down") -
            api.input.value(side === "left" ? "p1-up" : "p2-up")) *
          K.PADDLE_SPEED
        );
      }
      if (!s.ai.movement) return 0;
      const defend =
          s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0,
        target = defend ? s.ball!.y - s.ball!.vy * K.AI_REACT : K.AI_HOME_Y,
        dz = defend ? K.AI_DEADZONE : K.AI_HOME_DEADZONE,
        d = target - p.cy;
      return Math.abs(d) <= dz
        ? 0
        : Math.sign(d) * Math.min(K.AI_SPEED, Math.abs(d) / Math.max(dt, 1e-9));
    };
    s = {
      ...s,
      paddles: {
        left: move(s.paddles.left, velocity("left"), dt),
        right: move(s.paddles.right, velocity("right"), dt),
      },
    };
    if (!s.ball) return s;
    let b = s.ball;
    if (s.screen === "countdown") {
      const h = b.holdTimer - dt;
      if (h <= 0) {
        const d = s.receiver === "left" ? -1 : 1;
        b = {
          ...b,
          held: false,
          holdTimer: 0,
          vx: d * K.SERVE_SPEED * Math.cos(K.SERVE_ANGLE),
          vy: b.serveSign * K.SERVE_SPEED * Math.sin(K.SERVE_ANGLE),
          trail: [],
        };
        return { ...s, screen: "playing", ball: b };
      }
      return {
        ...s,
        ball: {
          ...b,
          holdTimer: h,
          trail: [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
            (z) => z.t >= s.simTime - K.TRAIL_TIME,
          ),
        },
      };
    }
    b = physics(b, s, dt, (x) => api.audio.play(x));
    const trail = [...b.trail, { x: b.x, y: b.y, t: s.simTime }].filter(
      (z) => z.t >= s.simTime - K.TRAIL_TIME,
    );
    if (b.x - K.BALL_R > K.FIELD_W || b.x + K.BALL_R < 0) {
      const l = b.x - K.BALL_R > K.FIELD_W,
        score = { p1: s.score.p1 + (l ? 1 : 0), p2: s.score.p2 + (l ? 0 : 1) },
        winner =
          score.p1 >= K.WIN_SCORE && score.p1 - score.p2 >= K.WIN_LEAD
            ? "left"
            : score.p2 >= K.WIN_SCORE && score.p2 - score.p1 >= K.WIN_LEAD
              ? "right"
              : null;
      api.audio.play(K.CUES.score);
      return winner
        ? {
            ...s,
            score,
            winner,
            screen: "matchover",
            menuIndex: 0,
            ball: { ...b, trail },
          }
        : {
            ...s,
            score,
            receiver: l ? "right" : "left",
            screen: "countdown",
            ball: ball(),
          };
    }
    return { ...s, ball: { ...b, trail } };
  },
  render(s, api) {
    const c = api.ctx;
    c.fillStyle = BACKGROUND;
    c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
    c.strokeStyle = "#1b3651";
    c.lineWidth = 2;
    c.setLineDash([10, 12]);
    c.beginPath();
    c.moveTo(K.FIELD_CX, 30);
    c.lineTo(K.FIELD_CX, K.FIELD_H - 30);
    c.stroke();
    c.setLineDash([]);
    const bar = (x: number, y: number, w: number, h: number, z: string) => {
      c.fillStyle = z;
      c.beginPath();
      c.roundRect(x, y, w, h, 8);
      c.fill();
    };
    s.obstacles.forEach((o) => bar(o.cx - 10, o.cy - 70, 20, 140, "#f3a940"));
    bar(
      K.P1_X0,
      s.paddles.left.cy - K.PADDLE_HALF,
      K.PADDLE_W,
      K.PADDLE_H,
      "#43d8ff",
    );
    bar(
      K.P2_X0,
      s.paddles.right.cy - K.PADDLE_HALF,
      K.PADDLE_W,
      K.PADDLE_H,
      "#ff5d9d",
    );
    if (s.ball) {
      const t = s.ball.trail;
      c.strokeStyle = "#dff9ff";
      c.lineWidth = 5;
      if (t.length > 1) {
        c.beginPath();
        c.moveTo(t[0].x, t[0].y);
        t.slice(1).forEach((p) => c.lineTo(p.x, p.y));
        c.stroke();
      }
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(s.ball.x, s.ball.y, K.BALL_R, 0, Math.PI * 2);
      c.fill();
    }
    c.textAlign = "center";
    c.font = "700 38px system-ui";
    c.fillStyle = "#dcecff";
    c.fillText(String(s.score.p1), 500, 72);
    c.fillText(String(s.score.p2), 780, 72);
    c.font = "600 15px system-ui";
    c.fillStyle = "#7da1c4";
    c.fillText(
      s.mode === "solo" ? "SOLO // CURVE THE RALLY" : "VERSUS // FIRST TO 11",
      640,
      42,
    );
    if (s.screen === "countdown") {
      c.font = "700 28px system-ui";
      c.fillStyle = "#fff";
      c.fillText("SERVE IN " + Math.ceil(s.ball?.holdTimer ?? 0), 640, 315);
    }
    if (["title", "howto", "paused", "matchover"].includes(s.screen)) {
      c.fillStyle = "rgba(4,12,22,.78)";
      c.fillRect(0, 0, K.FIELD_W, K.FIELD_H);
      c.fillStyle = "#ecf7ff";
      c.font = "800 68px system-ui";
      c.fillText(
        s.screen === "title"
          ? K.TITLE_TEXT
          : s.screen === "howto"
            ? "HOW TO PLAY"
            : s.screen === "paused"
              ? "PAUSED"
              : `${s.winner === "left" ? "LEFT" : "RIGHT"} WINS`,
        640,
        210,
      );
      if (s.screen === "howto") {
        c.font = "500 21px system-ui";
        c.fillStyle = "#b9d2e8";
        [
          "Move: W/S or ↑/↓",
          "Strike while moving to bend the ball's flight.",
          "Bank shots off the amber obstacles. First to 11, win by 2.",
        ].forEach((x, i) => c.fillText(x, 640, 285 + i * 38));
      }
      items(s.screen).forEach((x, i) => {
        const r = menuRect(s, i)!;
        bar(r.x, r.y, r.w, r.h, i === s.menuIndex ? "#2e86b9" : "#132943");
        c.font = "700 22px system-ui";
        c.fillStyle = "#fff";
        c.fillText(x, 640, r.y + 31);
      });
    }
  },
};
