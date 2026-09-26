"""A resizable window presenting a fixed, aspect-correct game canvas."""

import pygame

from src.config import COLOR_BG, WINDOW_HEIGHT, WINDOW_WIDTH


class Viewport:
    def __init__(self):
        desktop = pygame.display.get_desktop_sizes()[0]
        scale = min(
            1.0, (desktop[0] - 64) / WINDOW_WIDTH, (desktop[1] - 100) / WINDOW_HEIGHT
        )
        size = (
            max(640, int(WINDOW_WIDTH * scale)),
            max(400, int(WINDOW_HEIGHT * scale)),
        )
        self.display = pygame.display.set_mode(size, pygame.RESIZABLE)
        self.canvas = pygame.Surface((WINDOW_WIDTH, WINDOW_HEIGHT))
        self.update_rect()

    def update_rect(self):
        width, height = self.display.get_size()
        scale = min(width / WINDOW_WIDTH, height / WINDOW_HEIGHT)
        size = (
            max(1, round(WINDOW_WIDTH * scale)),
            max(1, round(WINDOW_HEIGHT * scale)),
        )
        self.rect = pygame.Rect((width - size[0]) // 2, (height - size[1]) // 2, *size)

    def to_canvas(self, pos):
        return (
            int((pos[0] - self.rect.x) * WINDOW_WIDTH / self.rect.width),
            int((pos[1] - self.rect.y) * WINDOW_HEIGHT / self.rect.height),
        )

    def mouse_pos(self):
        return self.to_canvas(pygame.mouse.get_pos())

    def event(self, event):
        if hasattr(event, "pos"):
            attrs = dict(event.dict)
            attrs["pos"] = self.to_canvas(event.pos)
            return pygame.event.Event(event.type, attrs)
        return event

    def present(self):
        self.update_rect()
        self.display.fill(COLOR_BG)
        image = (
            self.canvas
            if self.rect.size == self.canvas.get_size()
            else pygame.transform.smoothscale(self.canvas, self.rect.size)
        )
        self.display.blit(image, self.rect)
        pygame.display.flip()
