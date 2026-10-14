import { describe, expect, it } from "vitest";
import { game } from "./game";
import type { InitApi } from "@clockwyrks/simple-2d";

function initialized() {
  const api = {
    input: { register: () => undefined, layout: () => null },
    audio: { define: () => undefined, load: async () => undefined },
    diagnostics: { register: () => undefined },
    assets: {},
    events: { on: () => () => undefined },
    viewport: () => ({
      width: 1280,
      height: 720,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    }),
  };
  return game.initialize(api as InitApi<import("./game").CaromState>);
}

describe("Carom state", () => {
  it("starts at the title with a parked ball", () => {
    const [state, debug] = initialized();
    expect(state.screen).toBe("title");
    expect(debug.snapshot(state)).toMatchObject({
      score: { p1: 0, p2: 0 },
      ball: { held: true, speed: 0 },
    });
  });

  it("poses and clears the world without mutating the prior state", () => {
    const [state, debug] = initialized();
    const moved = debug.setBallVelocity(state, 500, -25);
    expect(debug.snapshot(moved)).toMatchObject({
      ball: { speed: expect.any(Number) },
    });
    expect(state.ball?.vx).toBe(0);
    expect(debug.clearWorld(moved).ball).toBeNull();
  });
});
