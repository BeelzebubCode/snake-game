import { useI18n } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import type { GameEngine } from './engine';
import { CELL, CHESTS, COLS, ROWS } from './types';
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
            } else {
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
            for (let i = 0; i < 6; i++)
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
              if (name !== 'collect' || engine.state.settings.reducedMotion) return;
              const p = engine.state.snake[0],
                skin = SKINS[engine.state.settings.skin];
              for (let i = 0; i < 10; i++) {
                const a = (i / 10) * Math.PI * 2;
                this.particles.push({
                  x: (p.x + 0.5) * CELL,
                  y: (p.y + 0.5) * CELL,
                  vx: Math.cos(a) * 55,
                  vy: Math.sin(a) * 55,
                  life: 450,
                  color: i % 2 ? skin.head : 0xf1c40f,
                });
              }
            });
            this.events.once('shutdown', () => this.offSound?.());
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
            if (s.portal) {
              const x = (s.portal.x + 1) * CELL,
                y = (s.portal.y + 1) * CELL;
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
              this.labels[5]
                .setPosition(x, y + 43)
                .setText(
                  s.tutorial
                    ? t('board.practice')
                    : Math.max(0, Math.ceil((s.portal.expiresAt - s.elapsed) / 1000)) + 's',
                )
                .setColor('#b9ffde')
                .setFontSize(12)
                .setVisible(true);
            }
            s.letters.forEach((letter, index) => {
              const x = (letter.x + 0.5) * CELL,
                y = (letter.y + 0.5) * CELL,
                ratio = s.tutorial ? 1 : Math.max(0, (letter.expiresAt - s.elapsed) / 30_000);
              g.fillStyle(0xf1c40f, 0.1);
              g.fillCircle(x, y, 20);
              g.fillStyle(0xf1c40f);
              g.fillRoundedRect(x - 13, y - 14, 26, 26, 7);
              g.lineStyle(1, 0xffe9a8, 0.8);
              g.strokeRoundedRect(x - 13, y - 14, 26, 26, 7);
              g.fillStyle(ratio < 0.2 ? 0xff7187 : 0x2ee6a0, 0.9);
              g.fillRoundedRect(x - 11, y + 14, 22 * ratio, 2, 1);
              this.labels[index]
                .setPosition(x, y - 1)
                .setText(letter.letter)
                .setColor('#191820')
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
