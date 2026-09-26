"""
Procedural Sound Effects Engine & Chiptune BGM Generator using Pygame Mixer
"""

import pygame
import math
import struct
from typing import Optional

class SoundManager:
    def __init__(self):
        self.enabled = True
        self.bgm_enabled = True
        self.mixer_initialized = False

        try:
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=1, buffer=512)
            self.mixer_initialized = True
        except Exception as e:
            print(f"Audio init warning: {e}")
            self.mixer_initialized = False

        self.sound_eat: Optional[pygame.mixer.Sound] = None
        self.sound_portal: Optional[pygame.mixer.Sound] = None
        self.sound_victory: Optional[pygame.mixer.Sound] = None
        self.sound_defeat: Optional[pygame.mixer.Sound] = None
        self.sound_click: Optional[pygame.mixer.Sound] = None

        if self.mixer_initialized:
            self._generate_synth_sounds()

    def _create_tone(self, freq_list: list, duration_ms: int, wave_type: str = "sine", volume: float = 0.3) -> Optional[pygame.mixer.Sound]:
        if not self.mixer_initialized:
            return None

        sample_rate = 44100
        total_samples = int(sample_rate * (duration_ms / 1000.0))
        raw_data = bytearray()

        num_freqs = len(freq_list)
        samples_per_freq = total_samples // max(1, num_freqs)

        for idx, freq in enumerate(freq_list):
            for i in range(samples_per_freq):
                t = float(i) / sample_rate
                
                if wave_type == "sine":
                    val = math.sin(2.0 * math.pi * freq * t)
                elif wave_type == "square":
                    val = 1.0 if math.sin(2.0 * math.pi * freq * t) >= 0 else -1.0
                elif wave_type == "triangle":
                    val = 2.0 * abs(2.0 * (t * freq - math.floor(t * freq + 0.5))) - 1.0
                else:
                    val = math.sin(2.0 * math.pi * freq * t)

                # Apply envelope decay
                decay = 1.0 - (i / samples_per_freq)
                sample_val = int(val * 32767 * volume * decay)
                sample_val = max(-32768, min(32767, sample_val))
                raw_data.extend(struct.pack("<h", sample_val))

        try:
            return pygame.mixer.Sound(buffer=bytes(raw_data))
        except Exception as e:
            print(f"Sound creation error: {e}")
            return None

    def _generate_synth_sounds(self):
        # 1. Eat Letter Chime (C5 -> E5)
        self.sound_eat = self._create_tone([523, 659], duration_ms=100, wave_type="sine", volume=0.25)
        
        # 2. Portal Enter Vortex Sweep (300 -> 500 -> 800 Hz)
        self.sound_portal = self._create_tone([300, 450, 600, 800, 1000], duration_ms=250, wave_type="triangle", volume=0.3)
        
        # 3. Victory Fanfare (C5 -> E5 -> G5 -> C6)
        self.sound_victory = self._create_tone([523, 659, 784, 1046], duration_ms=400, wave_type="square", volume=0.2)

        # 4. Defeat Low Buzz (300 -> 200 -> 120 Hz)
        self.sound_defeat = self._create_tone([300, 220, 140, 90], duration_ms=350, wave_type="sawtooth" if False else "square", volume=0.25)

        # 5. UI Button Click
        self.sound_click = self._create_tone([800], duration_ms=30, wave_type="sine", volume=0.15)

    def play_eat(self):
        if self.enabled and self.sound_eat:
            self.sound_eat.play()

    def play_portal(self):
        if self.enabled and self.sound_portal:
            self.sound_portal.play()

    def play_victory(self):
        if self.enabled and self.sound_victory:
            self.sound_victory.play()

    def play_defeat(self):
        if self.enabled and self.sound_defeat:
            self.sound_defeat.play()

    def play_click(self):
        if self.enabled and self.sound_click:
            self.sound_click.play()
