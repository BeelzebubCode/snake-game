import { useI18n } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from './engine';
import { CELL, CHESTS, COLS, OBSTACLE_LIFETIME, ROWS } from './types';
import {
  DIRECTION_LABELS,
  countdownArrow,
  SKINS,
  hex,
  mapFor,
  mixColor,
  sampleCenterline,
  snakeCenterline,
} from './appearance';
import type * as PhaserType from 'phaser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: number;
}
export default function PhaserBoard({ engine }: { engine: GameEngine }) {
  const { t } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let game: PhaserType.Game | undefined,
      disposed = false;
    void Promise.all([import('phaser'), document.fonts.load('700 20px Noto')])
      .then(([module]) => {
        if (disposed || !host.current) return;
        const Phaser = module.default;
        class GardenScene extends Phaser.Scene {
          private ink!: PhaserType.GameObjects.Graphics;
          private floor?: PhaserType.GameObjects.Graphics;
          private floorKey = '';
          private labels: PhaserType.GameObjects.Text[] = [];
          private particles: Particle[] = [];
          private offSound?: () => void;
          private headAngle = 0;
          constructor() {
            super('garden');
          }
          private stroke(
            graphics: PhaserType.GameObjects.Graphics,
            points: { x: number; y: number }[],
          ) {
            if (!points.length) return;
            graphics.beginPath();
            graphics.moveTo(points[0].x, points[0].y);
            for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
            graphics.strokePath();
          }
          // A rounded tile drawn in 1px slices. As time runs out its colour fades to slate from the
          // top down, with a soft edge, so the remaining time reads as the colour left at the bottom.
          private fadeTile(
            g: PhaserType.GameObjects.Graphics,
            cx: number,
            cy: number,
            size: number,
            radius: number,
            color: number,
            ratio: number,
          ) {
            const faded = 1 - Math.max(0, Math.min(1, ratio)),
              top = cy - size / 2;
            for (let i = 0; i < size; i++) {
              const t = (i + 0.5) / size,
                amount = Math.max(0, Math.min(1, (faded * 1.35 - t) / 0.35)),
                edge = Math.min(i + 0.5, size - i - 0.5),
                inset =
                  edge < radius ? radius - Math.sqrt(radius * radius - (radius - edge) ** 2) : 0;
              g.fillStyle(mixColor(color, 0x3a4254, amount * 0.9));
              g.fillRect(cx - size / 2 + inset, top + i, size - inset * 2, 1);
            }
          }
          private drawFloor() {
            const s = engine.state,
              map = mapFor(s.mapStage, s.settings.map);
            const key = map.id + ':' + s.settings.showGrid;
            if (this.floorKey === key) return;
            const previous = this.floor;
            const floor = this.add.graphics().setDepth(-2);
            const width = COLS * CELL,
              height = ROWS * CELL;
            floor.fillStyle(map.background);
            floor.fillRect(0, 0, width, height);
            // Map details are scenery only: they never add collision cells.
            if (map.id === 'midnight') {
              for (let i = 0; i < 75; i++) {
                const x = (i * 211 + 21) % width,
                  y = (i * 137 + 39) % height;
                floor.fillStyle(i % 3 ? map.secondary : map.accent, 0.13);
                floor.fillCircle(x, y, i % 4 === 0 ? 2 : 1);
              }
              floor.lineStyle(2, map.secondary, 0.09);
              for (let i = 0; i < 6; i++) {
                const x = 80 + i * 211;
                this.stroke(floor, [
                  { x, y: 0 },
                  { x, y: 80 + i * 30 },
                  { x: x + 90, y: 170 + i * 30 },
                  { x: x + 90, y: height },
                ]);
              }
            } else if (map.id === 'forest') {
              for (let i = 0; i < 30; i++) {
                const x = (i * 211 + 15) % width,
                  y = (i * 137 + 23) % height;
                floor.fillStyle(map.accent, 0.025);
                floor.fillCircle(x, y, 35);
                floor.fillStyle(map.secondary, 0.12);
                floor.fillEllipse(x - 6, y, 7, 20);
                floor.fillEllipse(x + 4, y + 7, 17, 6);
                floor.fillStyle(map.accent, 0.24);
                floor.fillCircle(x + 9, y - 14, 1.5);
              }
            } else if (map.id === 'ocean') {
              floor.lineStyle(2, map.secondary, 0.09);
              for (let row = 0; row < 9; row++) {
                const points = Array.from({ length: 65 }, (_, i) => ({
                  x: i * 20,
                  y: 35 + row * 80 + Math.sin(i / 5 + row) * 20,
                }));
                this.stroke(floor, points);
              }
              for (let i = 0; i < 30; i++) {
                floor.lineStyle(1, map.accent, 0.12);
                floor.strokeCircle((i * 191 + 80) % width, (i * 137 + 45) % height, 3 + (i % 5));
              }
            } else if (map.id === 'volcano') {
              for (let i = 0; i < 10; i++) {
                const x = (i * 143 + 34) % width,
                  y = (i * 97 + 34) % height;
                floor.lineStyle(2, map.secondary, 0.14);
                this.stroke(floor, [
                  { x, y },
                  { x: x + 25, y: y + 30 },
                  { x: x + 8, y: y + 52 },
                  { x: x + 47, y: y + 81 },
                ]);
                floor.fillStyle(map.accent, 0.09);
                floor.fillCircle(x + 30, y + 30, 24);
              }
            } else if (map.id === 'desert') {
              // Stars in the night sky (top half)
              for (let i = 0; i < 80; i++) {
                const sx = (i * 197 + 31) % width,
                  sy = (i * 113 + 17) % (height * 0.55);
                floor.fillStyle(0xfff3c4, i % 5 === 0 ? 0.55 : 0.2);
                floor.fillCircle(sx, sy, i % 7 === 0 ? 1.5 : 0.8);
              }
              // Dune horizon silhouette
              floor.fillStyle(0x2a1e06, 0.85);
              const dunePoints = [{ x: 0, y: height * 0.72 }];
              for (let i = 0; i <= 20; i++) {
                dunePoints.push({
                  x: (i / 20) * width,
                  y:
                    height * 0.72 -
                    Math.sin((i / 20) * Math.PI * 3.5) * 28 -
                    (i % 3 === 0 ? 18 : 0),
                });
              }
              dunePoints.push(
                { x: width, y: height * 0.72 },
                { x: width, y: height },
                { x: 0, y: height },
              );
              floor.beginPath();
              dunePoints.forEach((p, idx) =>
                idx === 0 ? floor.moveTo(p.x, p.y) : floor.lineTo(p.x, p.y),
              );
              floor.closePath();
              floor.fillPath();
              // Pyramid silhouettes — 3 at different depths
              const pyramids = [
                { cx: width * 0.22, base: 140, h: 95, alpha: 0.7 },
                { cx: width * 0.62, base: 200, h: 135, alpha: 0.55 },
                { cx: width * 0.82, base: 90, h: 58, alpha: 0.45 },
              ];
              for (const { cx, base, h, alpha } of pyramids) {
                const py = height * 0.72;
                floor.fillStyle(0x1a1008, alpha);
                floor.beginPath();
                floor.moveTo(cx, py - h);
                floor.lineTo(cx + base / 2, py);
                floor.lineTo(cx - base / 2, py);
                floor.closePath();
                floor.fillPath();
                // Edge highlight
                floor.lineStyle(1, map.accent, alpha * 0.4);
                floor.lineBetween(cx, py - h, cx + base / 2, py);
                floor.lineBetween(cx, py - h, cx - base / 2, py);
              }
            } else if (map.id === 'space') {
              // Dense star field — seeded positions for reproducibility
              for (let i = 0; i < 200; i++) {
                const sx = (i * 293 + 47) % width,
                  sy = (i * 179 + 83) % height;
                const brightness = i % 10 === 0 ? 0.9 : i % 4 === 0 ? 0.5 : 0.25;
                const size = i % 15 === 0 ? 2 : i % 5 === 0 ? 1.4 : 0.7;
                floor.fillStyle(i % 3 === 0 ? map.secondary : 0xffffff, brightness);
                floor.fillCircle(sx, sy, size);
              }
              // Nebula clouds — soft layered circles
              const nebulaSeeds = [
                { x: width * 0.2, y: height * 0.3, r: 95, color: map.accent, a: 0.06 },
                { x: width * 0.7, y: height * 0.6, r: 120, color: map.secondary, a: 0.05 },
                { x: width * 0.5, y: height * 0.15, r: 80, color: map.accent, a: 0.04 },
                { x: width * 0.85, y: height * 0.8, r: 70, color: map.secondary, a: 0.07 },
              ];
              for (const nb of nebulaSeeds) {
                for (let layer = 3; layer >= 1; layer--) {
                  floor.fillStyle(nb.color, nb.a * layer);
                  floor.fillCircle(nb.x, nb.y, nb.r * layer * 0.5);
                }
              }
              // Galaxy spiral arm (faint)
              floor.lineStyle(1, map.accent, 0.07);
              const armPoints = Array.from({ length: 80 }, (_, i) => {
                const t = i / 79,
                  angle = t * Math.PI * 4,
                  r = t * width * 0.35;
                return {
                  x: width * 0.45 + Math.cos(angle) * r,
                  y: height * 0.45 + Math.sin(angle) * r * 0.55,
                };
              });
              this.stroke(floor, armPoints);
            } else if (map.id === 'city') {
              // Moon
              floor.fillStyle(0xfff8dc, 0.18);
              floor.fillCircle(width * 0.85, height * 0.12, 22);
              floor.fillStyle(0x070d1a, 1);
              floor.fillCircle(width * 0.85 - 10, height * 0.12 - 6, 18);
              // Stars
              for (let i = 0; i < 50; i++) {
                const sx = (i * 241 + 17) % width,
                  sy = (i * 137 + 9) % (height * 0.55);
                floor.fillStyle(0xffffff, 0.18);
                floor.fillCircle(sx, sy, 0.8);
              }
              // City skyline silhouette — buildings at the bottom
              const buildings = [
                { x: 0, w: 60, h: 90 },
                { x: 55, w: 40, h: 140 },
                { x: 90, w: 55, h: 75 },
                { x: 140, w: 35, h: 170 },
                { x: 170, w: 50, h: 120 },
                { x: 215, w: 30, h: 195 },
                { x: 240, w: 65, h: 100 },
                { x: 300, w: 28, h: 155 },
                { x: 323, w: 55, h: 85 },
                { x: 373, w: 40, h: 180 },
                { x: 408, w: 70, h: 110 },
                { x: 473, w: 35, h: 145 },
                { x: 503, w: 55, h: 95 },
                { x: 553, w: 42, h: 165 },
                { x: 590, w: 60, h: 80 },
                { x: 645, w: 48, h: 175 },
                { x: 688, w: 35, h: 120 },
                { x: 718, w: 65, h: 90 },
                { x: 778, w: 40, h: 155 },
                { x: 813, w: 55, h: 105 },
                { x: 863, w: 30, h: 185 },
                { x: 888, w: 70, h: 70 },
                { x: 953, w: 45, h: 140 },
                { x: 993, w: 55, h: 95 },
                { x: 1043, w: 40, h: 160 },
                { x: 1078, w: 60, h: 85 },
                { x: 1133, w: 35, h: 125 },
                { x: 1163, w: 55, h: 100 },
                { x: 1213, w: 47, h: 170 },
                { x: 1255, w: 25, h: 115 },
              ];
              for (const b of buildings) {
                const by = height - b.h;
                floor.fillStyle(0x0a1428, 0.92);
                floor.fillRect(b.x, by, b.w, b.h);
                // Windows: random lit squares
                for (let wy = by + 8; wy < height - 6; wy += 14) {
                  for (let wx = b.x + 5; wx < b.x + b.w - 8; wx += 11) {
                    const lit = (wx * 13 + wy * 7 + b.h) % 17 < 9;
                    if (lit) {
                      floor.fillStyle(map.accent, 0.45 + ((wx + wy) % 7) * 0.04);
                      floor.fillRect(wx, wy, 6, 8);
                    }
                  }
                }
                // Antenna on tall buildings
                if (b.h > 150) {
                  floor.lineStyle(1, map.secondary, 0.5);
                  floor.lineBetween(b.x + b.w / 2, by, b.x + b.w / 2, by - 15);
                  floor.fillStyle(map.secondary, 0.8);
                  floor.fillCircle(b.x + b.w / 2, by - 16, 2);
                }
              }
            } else if (map.id === 'beach') {
              // Night sky + stars
              for (let i = 0; i < 70; i++) {
                const sx = (i * 223 + 41) % width,
                  sy = (i * 157 + 13) % (height * 0.5);
                floor.fillStyle(0xffffff, i % 8 === 0 ? 0.55 : 0.2);
                floor.fillCircle(sx, sy, i % 9 === 0 ? 1.5 : 0.7);
              }
              // Crescent moon
              floor.fillStyle(0xfff9e0, 0.22);
              floor.fillCircle(width * 0.78, height * 0.1, 18);
              floor.fillStyle(0x061424, 1);
              floor.fillCircle(width * 0.78 + 9, height * 0.1 - 5, 14);
              // Ocean waves (sine stripes in upper ~55%)
              for (let row = 0; row < 5; row++) {
                const baseY = height * 0.38 + row * 24;
                const pts = Array.from({ length: width + 1 }, (_, xi) => ({
                  x: xi,
                  y: baseY + Math.sin(xi / 55 + row * 1.2) * 9,
                }));
                floor.lineStyle(1, map.accent, 0.08 + row * 0.015);
                this.stroke(floor, pts);
              }
              // Sandy shore gradient (bottom 45%)
              for (let layer = 0; layer < 8; layer++) {
                const sy2 = height * 0.55 + layer * ((height * 0.45) / 8);
                floor.fillStyle(0x7a5c2a, 0.04 + layer * 0.01);
                floor.fillRect(0, sy2, width, (height * 0.45) / 8 + 1);
              }
              // Palm tree silhouette at left edge
              const tx = 48,
                ty = height * 0.56;
              floor.lineStyle(4, 0x2a1a06, 0.75);
              // Trunk (curved)
              this.stroke(floor, [
                { x: tx, y: ty + 2 },
                { x: tx + 4, y: ty - 28 },
                { x: tx + 10, y: ty - 60 },
                { x: tx + 8, y: ty - 85 },
              ]);
              // Fronds
              const fronds = [
                [
                  { x: tx + 8, y: ty - 85 },
                  { x: tx - 30, y: ty - 105 },
                ],
                [
                  { x: tx + 8, y: ty - 85 },
                  { x: tx + 38, y: ty - 108 },
                ],
                [
                  { x: tx + 8, y: ty - 85 },
                  { x: tx - 10, y: ty - 118 },
                ],
                [
                  { x: tx + 8, y: ty - 85 },
                  { x: tx + 22, y: ty - 120 },
                ],
                [
                  { x: tx + 8, y: ty - 85 },
                  { x: tx + 5, y: ty - 122 },
                ],
              ];
              floor.lineStyle(3, 0x1e4a10, 0.65);
              fronds.forEach((pts) => this.stroke(floor, pts));
              // Moon reflection in water
              for (let rl = 0; rl < 4; rl++) {
                floor.fillStyle(0xfff9e0, 0.04 - rl * 0.008);
                floor.fillRect(width * 0.74, height * 0.42 + rl * 5, 30 - rl * 5, 2);
              }
            }
            if (s.settings.showGrid) {
              floor.lineStyle(1, map.grid, 0.75);
              for (let x = 0; x <= COLS; x++) floor.lineBetween(x * CELL, 0, x * CELL, height);
              for (let y = 0; y <= ROWS; y++) floor.lineBetween(0, y * CELL, width, y * CELL);
            }
            floor.lineStyle(2, map.accent, 0.3);
            floor.strokeRoundedRect(2, 2, width - 4, height - 4, 10);
            floor.lineStyle(3, map.accent, 0.8);
            for (const [x, y, sx, sy] of [
              [12, 12, 1, 1],
              [width - 12, 12, -1, 1],
              [12, height - 12, 1, -1],
              [width - 12, height - 12, -1, -1],
            ]) {
              floor.lineBetween(x, y, x + sx * 26, y);
              floor.lineBetween(x, y, x, y + sy * 26);
            }
            this.cameras.main.setBackgroundColor(map.background);
            this.floor = floor;
            this.floorKey = key;
            if (previous) {
              if (s.settings.reducedMotion) previous.destroy();
              else {
                floor.setAlpha(0);
                this.tweens.add({
                  targets: floor,
                  alpha: 1,
                  duration: 700,
                  onComplete: () => previous.destroy(),
                });
              }
            }
            this.game.canvas.dataset.map = map.id;
            this.game.canvas.dataset.grid = String(s.settings.showGrid);
          }
          create() {
            this.drawFloor();
            this.ink = this.add.graphics();
            for (let i = 0; i < 8; i++)
              this.labels.push(
                this.add
                  .text(0, 0, '', {
                    fontFamily: 'Noto, sans-serif',
                    fontSize: '21px',
                    fontStyle: 'bold',
                    color: '#edf6ff',
                  })
                  .setOrigin(0.5),
              );
            this.offSound = engine.onSound((name) => {
              if ((name !== 'collect' && name !== 'smash') || engine.state.settings.reducedMotion)
                return;
              const p = engine.state.snake[0],
                skin = SKINS[engine.state.settings.skin],
                smash = name === 'smash',
                count = smash ? 16 : 10;
              for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2,
                  speed = smash ? 70 + (i % 3) * 35 : 55;
                this.particles.push({
                  x: (p.x + 0.5) * CELL,
                  y: (p.y + 0.5) * CELL,
                  vx: Math.cos(a) * speed,
                  vy: Math.sin(a) * speed,
                  life: smash ? 600 : 450,
                  color: smash ? (i % 2 ? 0xd6453a : 0x7a231b) : i % 2 ? skin.head : 0xf1c40f,
                });
              }
            });
            this.events.once('shutdown', () => this.offSound?.());
            // When Phaser detects the window/tab lost focus it pauses its own
            // render loop before window.blur can reach App.tsx's handler.
            // Forwarding the Phaser BLUR event to engine.pause() ensures the
            // Pause modal always appears instead of the game freezing silently.
            this.game.events.on(Phaser.Core.Events.BLUR, () => {
              engine.pause();
            });
            this.events.once('shutdown', () => this.game.events.off(Phaser.Core.Events.BLUR));
            this.game.canvas.setAttribute('aria-label', t('board.accessible'));
            this.game.canvas.setAttribute('role', 'img');
          }
          update(time: number, delta: number) {
            engine.advance(delta);
            const s = engine.state,
              g = this.ink;
            if (!g) return;
            this.drawFloor();
            g.clear();
            this.labels.forEach((label) => label.setVisible(false));
            const skin = SKINS[s.settings.skin],
              reduced = s.settings.reducedMotion || s.phase !== 'playing';
            const pulse = reduced ? 0 : Math.sin(time / 700) * 2;
            this.game.canvas.dataset.skin = s.settings.skin;
            s.portals.forEach((portal, idx) => {
              const x = (portal.x + 1) * CELL,
                y = (portal.y + 1) * CELL;
              g.fillStyle(0x2ecc71, 0.1);
              g.fillCircle(x, y, 44 + pulse);
              g.lineStyle(2, 0x2ecc71, 0.7);
              g.strokeCircle(x, y, 35 + pulse);
              g.fillStyle(0x17463d);
              g.fillRoundedRect(x - 25, y - 29, 50, 58, { tl: 23, tr: 23, bl: 6, br: 6 });
              g.lineStyle(2, 0x2ee6a0, 0.9);
              g.strokeRoundedRect(x - 25, y - 29, 50, 58, { tl: 23, tr: 23, bl: 6, br: 6 });
              g.fillStyle(0x167b63, 0.8);
              g.fillRoundedRect(x - 18, y - 23, 36, 48, { tl: 18, tr: 18, bl: 3, br: 3 });
              g.fillStyle(0xb1ffe5);
              g.fillCircle(x + 5, y - 4, 3);
              g.fillCircle(x - 8, y + 12, 2);
              
              if (5 + idx < this.labels.length) {
                this.labels[5 + idx]
                  .setPosition(x, y + 43)
                  .setText(
                    s.tutorial
                      ? t('board.practice')
                      : Math.max(0, Math.ceil((portal.expiresAt - s.elapsed) / 1000)) + 's',
                  )
                  .setColor('#b9ffde')
                  .setFontSize(12)
                  .setVisible(true);
              }
            });
            if (s.spawnPortal) {
              const x = (s.spawnPortal.x + 0.5) * CELL,
                y = (s.spawnPortal.y + 0.5) * CELL;

              if (s.spawnPortal.type === 'revive') {
                // Angel Wings (Flapping)
                const flap = Math.sin(time / 200) * 8;
                g.fillStyle(0xd6f1ff, 0.6);
                // Left wing feathers
                g.fillTriangle(x - 15, y - 5, x - 50, y - 25 - flap, x - 15, y + 15);
                g.fillTriangle(x - 15, y - 5, x - 45, y - 5 - flap * 0.6, x - 15, y + 15);
                g.fillTriangle(x - 15, y - 5, x - 35, y + 15 - flap * 0.2, x - 15, y + 15);
                // Right wing feathers
                g.fillTriangle(x + 15, y - 5, x + 50, y - 25 - flap, x + 15, y + 15);
                g.fillTriangle(x + 15, y - 5, x + 45, y - 5 - flap * 0.6, x + 15, y + 15);
                g.fillTriangle(x + 15, y - 5, x + 35, y + 15 - flap * 0.2, x + 15, y + 15);

                g.fillStyle(0x3498db, 0.1);
                g.fillCircle(x, y, 44 + pulse);
                g.lineStyle(2, 0x3498db, 0.7);
                g.strokeCircle(x, y, 35 + pulse);
                g.fillStyle(0x1a4060);
                g.fillRoundedRect(x - 25, y - 29, 50, 58, { tl: 23, tr: 23, bl: 6, br: 6 });
                g.lineStyle(2, 0x5bc0eb, 0.9);
                g.strokeRoundedRect(x - 25, y - 29, 50, 58, { tl: 23, tr: 23, bl: 6, br: 6 });
                g.fillStyle(0x1f5c87, 0.8);
                g.fillRoundedRect(x - 18, y - 23, 36, 48, { tl: 18, tr: 18, bl: 3, br: 3 });
                g.fillStyle(0xd6f1ff);
                g.fillCircle(x + 5, y - 4, 3);
                g.fillCircle(x - 8, y + 12, 2);
              } else {
                // Galaxy Start Portal
                const spin = time / 500;
                g.fillStyle(0x9b59b6, 0.15); // purple aura
                g.fillCircle(x, y, 40 + pulse * 1.5);
                g.lineStyle(3, 0x8e44ad, 0.8);
                g.strokeCircle(x, y, 30 + pulse);

                // Rotating star / galaxy core
                g.fillStyle(0xe056fd, 0.6);
                g.fillTriangle(
                  x + Math.cos(spin) * 35,
                  y + Math.sin(spin) * 35,
                  x + Math.cos(spin + 2) * 10,
                  y + Math.sin(spin + 2) * 10,
                  x + Math.cos(spin - 2) * 10,
                  y + Math.sin(spin - 2) * 10,
                );
                g.fillTriangle(
                  x + Math.cos(spin + Math.PI) * 35,
                  y + Math.sin(spin + Math.PI) * 35,
                  x + Math.cos(spin + Math.PI + 2) * 10,
                  y + Math.sin(spin + Math.PI + 2) * 10,
                  x + Math.cos(spin + Math.PI - 2) * 10,
                  y + Math.sin(spin + Math.PI - 2) * 10,
                );

                // Core
                g.fillStyle(0xf1c40f, 0.9);
                g.fillCircle(x, y, 10);
                g.fillStyle(0xffffff, 1);
                g.fillCircle(x, y, 5);
              }
            }
            s.obstacles.forEach((brick) => {
              const x = (brick.x + 0.5) * CELL,
                y = (brick.y + 0.5) * CELL,
                ratio = s.tutorial
                  ? 1
                  : Math.max(0, Math.min(1, (brick.expiresAt - s.elapsed) / OBSTACLE_LIFETIME));
              g.fillStyle(0xff3b30, 0.1);
              g.fillCircle(x, y, 21);
              this.fadeTile(g, x, y, 28, 6, 0xd6453a, ratio);
              // Brick courses: three rows of mortar with staggered joints.
              g.lineStyle(2, 0x5e1a14, 0.9);
              for (const row of [-4.5, 4.5]) g.lineBetween(x - 14, y + row, x + 14, y + row);
              g.lineBetween(x, y - 14, x, y - 4.5);
              g.lineBetween(x - 7, y - 4.5, x - 7, y + 4.5);
              g.lineBetween(x + 7, y - 4.5, x + 7, y + 4.5);
              g.lineBetween(x, y + 4.5, x, y + 14);
              if (ratio < 0.2 && Math.floor(time / 180) % 2 === 0) {
                g.lineStyle(2, 0xffd1d6, 0.9);
                g.strokeRoundedRect(x - 14, y - 14, 28, 28, 6);
              }
            });
            s.letters.forEach((letter, index) => {
              const x = (letter.x + 0.5) * CELL,
                y = (letter.y + 0.5) * CELL,
                ratio = s.tutorial ? 1 : Math.max(0, (letter.expiresAt - s.elapsed) / 30_000);
              g.fillStyle(0xf1c40f, 0.1);
              g.fillCircle(x, y, 20);
              this.fadeTile(g, x, y - 1, 26, 7, 0xf1c40f, ratio);
              if (ratio < 0.2 && Math.floor(time / 180) % 2 === 0) {
                g.lineStyle(2, 0xff7187, 0.95);
                g.strokeRoundedRect(x - 13, y - 14, 26, 26, 7);
              }
              this.labels[index]
                .setPosition(x, y - 1)
                .setText(letter.letter)
                .setColor(1 - ratio > 0.55 ? '#f4f7ff' : '#191820')
                .setFontSize(20)
                .setVisible(true);
            });
            if (s.chest) {
              const x = (s.chest.x + 0.5) * CELL,
                y = (s.chest.y + 0.5) * CELL,
                color = Number.parseInt(CHESTS[s.chest.kind].color.slice(1), 16);
              g.fillStyle(color, 0.14);
              g.fillCircle(x, y, 24 + pulse);
              g.fillStyle(color);
              g.fillRoundedRect(x - 15, y - 13, 30, 25, 5);
              g.lineStyle(2, 0xffffff, 0.85);
              g.lineBetween(x - 14, y - 3, x + 14, y - 3);
              g.fillStyle(0xffefbc);
              g.fillRoundedRect(x - 3, y - 6, 6, 9, 2);
              this.labels[4]
                .setPosition(x, y + 22)
                .setText('+' + CHESTS[s.chest.kind].count)
                .setColor('#edf6ff')
                .setFontSize(11)
                .setVisible(true);
            }
            // Essential locomotion remains smooth even when optional effects are reduced.
            const line = snakeCenterline(s, engine.interpolation),
              samples = sampleCenterline(line, 4);
            if (samples.length) {
              if (!s.settings.reducedMotion) {
                g.lineStyle(33, skin.head, 0.08);
                this.stroke(g, line);
                for (const p of line) g.fillStyle(skin.head, 0.04).fillCircle(p.x, p.y, 17);
              }
              for (let i = samples.length - 1; i >= 0; i--) {
                const p = samples[i],
                  ratio = i / Math.max(1, samples.length - 1);
                g.fillStyle(mixColor(skin.head, skin.tail, ratio));
                g.fillCircle(p.x, p.y, 12);
              }
              if (s.settings.snakeStyle === 'classic') {
                const positions = s.snake.map((cell, i) => {
                  const old = s.previousSnake[i] ?? cell,
                    t = engine.interpolation;
                  return {
                    x: (old.x + (cell.x - old.x) * t + 0.5) * CELL,
                    y: (old.y + (cell.y - old.y) * t + 0.5) * CELL,
                  };
                });
                for (let i = positions.length - 1; i > 0; i--) {
                  const p = positions[i],
                    color = mixColor(skin.head, skin.tail, i / Math.max(1, positions.length - 1));
                  g.fillStyle(color);
                  g.fillRoundedRect(p.x - 13, p.y - 13, 26, 26, 8);
                  g.lineStyle(1, 0xffffff, 0.14);
                  g.strokeRoundedRect(p.x - 13, p.y - 13, 26, 26, 8);
                }
              }
              const head = line[0],
                target = DIRECTION_LABELS[s.direction].angle;
              const difference = Math.atan2(
                Math.sin(target - this.headAngle),
                Math.cos(target - this.headAngle),
              );
              this.headAngle += difference * Math.min(1, delta / 65);
              const dx = Math.cos(this.headAngle),
                dy = Math.sin(this.headAngle);
              g.fillStyle(skin.head);
              g.fillCircle(head.x, head.y, 14);
              g.lineStyle(1, 0xd8fff6, 0.7);
              g.strokeCircle(head.x, head.y, 14);
              for (const side of [-1, 1]) {
                const x = head.x + dx * 6 + dy * side * 7,
                  y = head.y + dy * 6 - dx * side * 7;
                g.fillStyle(0xffffff);
                g.fillCircle(x, y, 4.3);
                g.fillStyle(0x10121b);
                g.fillCircle(x + dx, y + dy, 2.2);
              }
              if (s.phase === 'countdown') {
                const a = DIRECTION_LABELS[s.nextDirection].angle,
                  ux = Math.cos(a),
                  uy = Math.sin(a);
                const { x, y } = countdownArrow(head, s.nextDirection);
                // A compact arrow with an outline; no disc covering the head.
                for (const [width, color] of [
                  [7, 0x101720],
                  [3, skin.head],
                ]) {
                  g.lineStyle(width, color, 1);
                  g.lineBetween(x - ux * 10, y - uy * 10, x + ux * 10, y + uy * 10);
                  this.stroke(g, [
                    { x: x + ux * 2 - uy * 7, y: y + uy * 2 + ux * 7 },
                    { x: x + ux * 10, y: y + uy * 10 },
                    { x: x + ux * 2 + uy * 7, y: y + uy * 2 - ux * 7 },
                  ]);
                }
              }
            }
            if (!reduced) {
              this.particles = this.particles.filter((p) => p.life > 0);
              for (const p of this.particles) {
                p.life -= delta;
                p.x += (p.vx * delta) / 1000;
                p.y += (p.vy * delta) / 1000;
                g.fillStyle(p.color, Math.max(0, p.life / 450));
                g.fillCircle(p.x, p.y, 3);
              }
            } else this.particles = [];
          }
        }
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host.current,
          width: COLS * CELL,
          height: ROWS * CELL,
          backgroundColor: '#12121c',
          antialias: true,
          roundPixels: false,
          scene: GardenScene,
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          input: { keyboard: false },
          audio: { noAudio: true },
          banner: false,
        });
      })
      .catch(() => {
        if (!disposed) setError(true);
      });
    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, [engine, t]);
  return (
    <div className="canvas-host" ref={host} data-testid="game-board">
      {error && (
        <p className="render-error" role="alert">
          {' '}
          {t('board.error')}{' '}
        </p>
      )}
    </div>
  );
}
