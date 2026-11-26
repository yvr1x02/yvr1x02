"""Builds Yuyu's skateboard sprite sheet from his idleSide frames (NockDock's buddy.png), and the
run strips the contributions calendar plays, one frame per tick: tricks by day, cruising at
dusk, asleep on the board at night.
Usage: python3 scripts/yuyu-skate.py <buddy.png> <out-dir>"""
import json, math, sys
from PIL import Image, ImageDraw

SRC, OUT = sys.argv[1], sys.argv[2]
FW, FH = 72, 104         # frame size: room for the board, a push and some air
CX = 10                  # where the 48px body sits horizontally
GROUND = 99              # wheels touch this row
DECK = GROUND - 8        # deck surface row when the board is on the ground
FEET = DECK - 1          # Yuyu's soles rest on the row above
src = Image.open(SRC).convert("RGBA")
BODY = [src.crop(((8 + i) * 48, 0, (9 + i) * 48, 64)) for i in range(8)]
SLEEP = [src.crop(((60 + i) * 48, 0, (61 + i) * 48, 64)) for i in range(8)]

# --- palette -------------------------------------------------------------------
O = (20, 18, 28, 255)
GRIP, GRIP_L, GRIP_D = (38, 38, 46, 255), (64, 64, 74, 255), (28, 28, 34, 255)
WOOD, WOOD_D = (214, 170, 112, 255), (168, 124, 76, 255)
RED, RED_L, RED_D = (214, 40, 57, 255), (255, 107, 118, 255), (150, 28, 42, 255)
WHITE = (246, 244, 238, 255)
BOLT = (170, 170, 178, 255)
METAL, METAL_L, METAL_D = (150, 152, 164, 255), (206, 208, 218, 255), (92, 94, 108, 255)
BUSH = (240, 170, 60, 255)
WHEEL, WHEEL_L, WHEEL_D = (236, 232, 220, 255), (255, 255, 250, 255), (176, 170, 156, 255)
CORE, CORE_D = (214, 40, 57, 255), (120, 22, 34, 255)
LINE = (113, 113, 122, 150)
SHADOW = (0, 0, 0, 110)

L = 36  # board length; every board is drawn nose to the right


def outline(b, only=lambda x, y: True):
    """Adds a 1px outline around the pixels that pass `only`."""
    for (x, y) in list(b):
        if not only(x, y):
            continue
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            b.setdefault(n, O)
    return b


def deck_top(x):
    """The deck's top edge: flat in the middle, kicked up at tail and nose."""
    k = min(x, L - 1 - x)
    return 2 - round(max(0, 5 - k) ** 1.4 / 5 ** 1.4 * 2)


def side_board(phase=0):
    """A low board: thin deck (grip, wood, graphic), short trucks, small wheels."""
    b = {}
    for x in range(L):
        t = deck_top(x)
        end = x in (0, L - 1)
        b[(x, t - 1)] = O
        b[(x, t)] = O if end else GRIP
        b[(x, t + 1)] = O if end else (WOOD_D if min(x, L - 1 - x) < 5 else WOOD)
        b[(x, t + 2)] = O if end else (RED_L if x % 8 in (3, 4) else RED)
        b[(x, t + 3)] = O
    wheels = {}
    for cx in (8, L - 9):
        # Truck: a short hanger with its bushing.
        for x in range(cx - 2, cx + 3):
            b[(x, 6)] = METAL_L if x < cx else METAL
        b[(cx, 6)] = BUSH
        # Wheel: 3x3 urethane around a red core that blinks as it turns.
        for dx in (-1, 0, 1):
            for dy in (7, 8, 9):
                wheels[(cx + dx, dy)] = WHEEL_L if (dx == -1 or dy == 7) else WHEEL
        wheels[(cx, 8)] = CORE if phase % 2 == 0 else CORE_D
        wheels[(cx + (1 if phase % 4 < 2 else -1), 9)] = WHEEL_D
    b.update(wheels)
    outline(b, lambda x, y: y >= 6)
    return b


def under_board():
    """The graphic side, seen mid-kickflip: a YI monogram on red, trucks and wheels towards us."""
    rows = [
        "..oooooooooooooooooooooooooooooooo..",
        ".oRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRo.",
        "oRRRRRRRRRRRRRWRRRWRWWWRRRRRRRRRRRRo",
        "oRRRRRRRRRRRRRRWRWRRRWRRRRRRRRRRRRRo",
        "oRRRRRRRRRRRRRRRWRRRRWRRRRRRRRRRRRRo",
        "oRRRRRRRRRRRRRRRWRRRWWWRRRRRRRRRRRRo",
        "oDRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRDo",
        "..oooooooooooooooooooooooooooooooo..",
    ]
    key = {"o": O, "R": RED, "W": WHITE, "D": RED_D}
    b = {(x, y): key[c] for y, r in enumerate(rows) for x, c in enumerate(r) if c != "."}
    parts = {}
    for cx in (8, L - 9):
        # Baseplate and hanger seen from below, wheels sticking out past both edges.
        for x in range(cx - 1, cx + 2):
            for y in range(2, 6):
                parts[(x, y)] = METAL_D if y in (2, 5) else METAL
        parts[(cx, 4)] = BUSH
        for y in range(0, 8):
            parts.setdefault((cx, y), METAL_L)
        for y0 in (-3, 8):
            for dx in range(-1, 2):
                for dy in range(3):
                    parts[(cx + dx, y0 + dy)] = CORE if dx == 0 and dy == 1 else (WHEEL_L if dy == 0 else WHEEL)
    b.update(parts)
    outline(b, lambda x, y: (x, y) in parts)
    return b


def grip_board():
    """Grip tape on top: speckled, with the eight truck bolts, wheels peeking out beyond."""
    b = {}
    for cx in (8, L - 9):
        for dx in range(-1, 2):
            b[(cx + dx, 7)] = WHEEL_D
            b[(cx + dx, -1)] = WHEEL_D
    outline(b)
    for x in range(L):
        for y in range(7):
            if (x in (0, L - 1) and y in (0, 6)):
                continue
            if y in (0, 6) or x in (0, L - 1):
                b[(x, y)] = O
                continue
            n = (x * 37 + y * 91 + x * y * 13) % 11
            b[(x, y)] = GRIP_L if n == 0 else (GRIP_D if n in (3, 7) else GRIP)
    for cx in (8, L - 9):
        for dx in (-1, 1):
            for dy in (2, 4):
                b[(cx + dx, dy)] = BOLT
    return b


def flip_v(b):
    h = max(y for _, y in b)
    return {(x, h - y): c for (x, y), c in b.items()}


# The row of each board that lines up with the deck's resting row (and that it turns around).
PIVOT = {"side": 2, "under": 4, "grip": 3, "upside": 8}


def plot_board(img, kind, cx, row, angle=0.0, sx=1.0, mirror=False, phase=0, min_y=0):
    """Draws a board centred on cx with its pivot on `row`, rotated by `angle` degrees and
    squashed horizontally by sx (for the shove-it). Pixels are sampled backwards so a rotated
    board stays solid."""
    bmp = {"side": side_board(phase), "under": under_board(), "grip": grip_board(),
           "upside": flip_v(side_board(phase))}[kind]
    ox, oy = L / 2, PIVOT[kind]
    a = math.radians(angle)
    ca, sa = math.cos(a), math.sin(a)
    px = img.load()
    for X in range(FW):
        for Y in range(min_y, FH):
            dx, dy = X + 0.5 - cx, Y + 0.5 - row
            lx, ly = dx * ca + dy * sa, -dx * sa + dy * ca
            if sx < 0.999:
                lx /= sx
            if mirror:
                lx = -lx
            p = (math.floor(lx + ox), math.floor(ly + oy))
            if p in bmp:
                px[X, Y] = bmp[p]


def end_on(img, cx, row):
    """The shove-it's end-on moment: the deck's edge, the truck and two wheels side by side."""
    b = {}
    for x in range(-3, 3):
        b[(x, 0)] = GRIP
        b[(x, 1)] = WOOD
        b[(x, 2)] = RED
    for x in range(-5, 5):
        b[(x, 4)] = METAL_L if -4 < x < 3 else METAL
    b[(0, 4)] = BUSH
    for x0 in (-7, 4):
        for dx in range(3):
            for dy in range(4, 7):
                b[(x0 + dx, dy)] = CORE if dx == 1 and dy == 5 else (WHEEL_L if dy == 4 else WHEEL)
    outline(b)
    px = img.load()
    for (x, y), c in b.items():
        px[cx + x, row + y] = c


# --- Yuyu's body ------------------------------------------------------------------
def body(i=0, crouch=0, tuck=0, lean=0, head=0, push=None, sleep=False):
    """Yuyu's idleSide frame i, adjusted:
    crouch  head and torso sink into the legs (knees bend)
    tuck    legs pulled up under the hoodie, in the air
    lean    torso leans forward (+) or back (-), sheared a pixel at a time
    head    head bobs down (+) or up (-) against the torso
    push    (dx, dy): the back foot reaches down and back to push off the ground"""
    base = (SLEEP if sleep else BODY)[i % 8]
    b = base.copy()
    if push:
        dx, dy = push
        leg = base.crop((15, 53, 21, 59))
        foot = base.crop((16, 59, 23, 63))
        big = Image.new("RGBA", (48, 64 + dy))
        big.alpha_composite(b, (0, 0))
        big.paste(Image.new("RGBA", (6, 6)), (15, 53))
        big.paste(Image.new("RGBA", (7, 4)), (16, 59))
        # The leg stretches from the hip to the foot on the ground, one pants row at a time.
        n = 6 + dy
        for r in range(n):
            src_row = 0 if r == 0 else (5 if r == n - 1 else 2)
            big.alpha_composite(leg.crop((0, src_row, 6, src_row + 1)), (15 + round(dx * r / n), 53 + r))
        big.alpha_composite(foot, (16 + dx, 59 + dy))
        b = big
    h = b.height
    if lean:
        out = Image.new("RGBA", b.size)
        for y in range(h):
            s = round(lean * max(0, 52 - y) / 36) if y < 53 else 0
            out.alpha_composite(b.crop((0, y, 48, y + 1)), (max(0, s), y))
            if s < 0:
                out.alpha_composite(b.crop((-s, y, 48, y + 1)), (0, y))
        b = out
    if head:
        top, rest = b.crop((0, 0, 48, 34)), b.crop((0, 34, 48, h))
        out = Image.new("RGBA", (48, h))
        out.alpha_composite(rest, (0, 34))
        out.alpha_composite(top.crop((0, max(0, -head), 48, 34)), (0, max(0, head)))
        b = out
    if tuck or crouch:
        top, legs = b.crop((0, 0, 48, 53)), b.crop((0, 53, 48, h))
        nb = Image.new("RGBA", (48, h))
        if tuck:
            nb.alpha_composite(top, (0, 0))
            nb.alpha_composite(legs, (0, 53 - tuck))
        else:
            nb.alpha_composite(legs, (0, 53))
            nb.alpha_composite(top, (0, crouch))
        b = nb
    return b


# --- frames -----------------------------------------------------------------------
def frame(i=0, lift=0, board="side", b_lift=None, angle=0.0, sx=1.0, mirror=False,
          phase=0, lines=0, endon=False, **pose):
    """lift: how high Yuyu's soles are above their resting row; b_lift: the same for the deck."""
    img = Image.new("RGBA", (FW, FH))
    cx = CX + 25
    b_lift = lift if b_lift is None else b_lift
    # Shadow on the ground, smaller the higher the board goes.
    w = max(12, 34 - b_lift)
    ImageDraw.Draw(img).ellipse((cx - w / 2, GROUND - 1, cx + w / 2, GROUND + 2), fill=SHADOW)
    if lines:
        px = img.load()
        for k, (y, ln) in enumerate([(56, 6), (70, 10), (84, 5)]):
            off = (lines * 3 + k * 4) % 9
            for x in range(1 + off, 1 + off + ln):
                if x < CX + 10:
                    px[x, y - lift // 2] = LINE
    row = DECK - b_lift
    if endon:
        end_on(img, cx, row)
    elif board:
        plot_board(img, board, cx, row, angle, sx, mirror, phase)
    tuck = pose.get("tuck", 0)
    img.alpha_composite(body(i, **pose), (CX, FEET - 62 - lift + tuck))
    if pose.get("push") and board:
        # The pushing leg is the far one: the board passes in front of it.
        plot_board(img, board, cx, row, angle, sx, mirror, phase, min_y=row)
    return img


def ride():
    # Rolling: a soft bob, the head follows a beat later, the wheels turn.
    bob = [0, 0, 1, 1, 0, 0, 1, 1]
    hd = [0, 1, 1, 0, 0, 1, 1, 0]
    return [frame(i=k, phase=k, lines=k + 1, crouch=bob[k], head=hd[k], lean=1) for k in range(8)]


def push():
    # The back foot steps down, pushes back along the ground and comes up onto the tail again.
    steps = [(0, 0), (-1, 3), (-2, 6), (-4, 9), (-7, 9), (-10, 8), (-7, 5), (-3, 2), (0, 0), (0, 0)]
    out = []
    for k, (dx, dy) in enumerate(steps):
        c = 2 if 2 <= k <= 6 else (1 if k in (1, 7) else 0)
        out.append(frame(i=k, phase=k // 2, lines=(k + 1) if k > 3 else 0, push=(dx, dy) if dy else None,
                         crouch=c, lean=2 if 2 <= k <= 6 else 1, head=1 if k in (3, 4, 5) else 0))
    return out


def run(seq):
    return [frame(**f) for f in seq]


def ollie():
    return run([
        dict(crouch=3, lean=1, phase=0, lines=1, head=1),
        dict(crouch=4, phase=1, lines=2, head=1),
        dict(lift=4, b_lift=3, angle=-20, lean=-1, lines=3, head=-1),
        dict(lift=13, b_lift=11, angle=-10, tuck=2, lean=1, lines=4),
        dict(lift=19, b_lift=17, angle=-2, tuck=4, lean=1, lines=5),
        dict(lift=21, b_lift=19, angle=3, tuck=4, lean=1, lines=6, head=-1),
        dict(lift=17, b_lift=16, angle=2, tuck=3, lines=7),
        dict(lift=9, b_lift=9, tuck=1, lines=8),
        dict(crouch=4, phase=2, lines=1, head=2),
        dict(crouch=2, phase=3, lines=2, head=1),
        dict(crouch=1, phase=4, lines=3),
    ])


def kickflip():
    return run([
        dict(crouch=3, lean=1, lines=1, head=1),
        dict(crouch=4, lines=2, head=1),
        dict(lift=4, b_lift=3, angle=-20, lean=-1, lines=3, head=-1),
        dict(lift=14, b_lift=10, angle=-14, tuck=3, lean=2, lines=4),
        dict(lift=20, b_lift=13, board="under", angle=-4, tuck=5, lean=2, lines=5, head=1),
        dict(lift=23, b_lift=15, board="upside", tuck=5, lean=1, lines=6),
        dict(lift=23, b_lift=16, board="grip", angle=3, tuck=5, lean=1, lines=7, head=-1),
        dict(lift=20, b_lift=18, angle=3, tuck=3, lines=8),
        dict(lift=10, b_lift=10, tuck=1, lines=1),
        dict(crouch=4, phase=1, lines=2, head=2),
        dict(crouch=2, phase=2, lines=3, head=1),
        dict(crouch=1, phase=3, lines=4),
    ])


def shoveit():
    # The board turns half a circle flat under him: it shortens, goes end-on, comes back reversed.
    seq = [dict(crouch=3, lean=1, lines=1, head=1), dict(crouch=4, lines=2, head=1),
           dict(lift=4, b_lift=3, angle=-14, lean=-1, lines=3)]
    for k, s in enumerate([0.8, 0.45, 0.0, -0.45, -0.8, -1.0]):
        lift = [13, 18, 21, 21, 18, 14][k]
        f = dict(lift=lift, b_lift=lift - 5, tuck=[2, 4, 5, 5, 4, 3][k], lean=1, lines=4 + k,
                 head=-1 if k == 2 else 0)
        if s == 0.0:
            f["endon"] = True
        else:
            f.update(sx=abs(s), mirror=s < 0)
        seq.append(f)
    seq += [dict(lift=7, b_lift=7, tuck=1, lines=1), dict(crouch=4, phase=1, lines=2, head=2),
            dict(crouch=2, phase=2, lines=3, head=1), dict(crouch=1, phase=3, lines=4)]
    return run(seq)


def sleep():
    # Parked, asleep standing on the board, his Zzz floating up.
    return [frame(i=k, sleep=True) for k in range(8)]


ANIMS = {"sleep": (sleep(), 3, True), "ride": (ride(), 10, True), "push": (push(), 10, False), "ollie": (ollie(), 12, False),
         "kickflip": (kickflip(), 12, False), "shoveit": (shoveit(), 12, False)}

frames, meta, start = [], {}, 0
for name, (fs, fps, loop) in ANIMS.items():
    meta[name] = {"start": start, "count": len(fs), "fps": fps, "loop": loop}
    frames += fs
    start += len(fs)
sheet = Image.new("RGBA", (FW * len(frames), FH))
for k, f in enumerate(frames):
    sheet.paste(f, (k * FW, 0))
sheet.save(f"{OUT}/yuyu-skate.png", optimize=True)
json.dump({"frameWidth": FW, "frameHeight": FH, "animations": meta}, open(f"{OUT}/yuyu-skate.json", "w"), indent=2)
print(meta)

# The runs under the calendar, one per time of day. They share one crop so they line up.
def seq(name, k=None):
    a = meta[name]
    idx = [a["start"] + i for i in range(a["count"])]
    return idx if k is None else [idx[i % len(idx)] for i in range(k)]


RUNS = {
    # By day: push, ride, ollie, ride, kickflip, ride, push, ride, shove-it, ride.
    "day": (seq("push") + seq("ride", 14) + seq("ollie") + seq("ride", 16) + seq("kickflip") + seq("ride", 14)
            + seq("push") + seq("ride", 10) + seq("shoveit") + seq("ride", 20), 10),
    # At dusk: no tricks, just cruising and the odd push, a little slower.
    "dusk": (seq("push") + seq("ride", 60) + seq("push") + seq("ride", 70), 8),
    # At night: parked and asleep.
    "night": (seq("sleep"), 3),
}
top = min(frames[i].getbbox()[1] for run, _ in RUNS.values() for i in set(run))
for name, (run, fps) in RUNS.items():
    strip = Image.new("RGBA", (FW * len(run), FH - top))
    for k, i in enumerate(run):
        strip.paste(frames[i].crop((0, top, FW, FH)), (k * FW, 0))
    strip.save(f"{OUT}/yuyu-run-{name}.png", optimize=True)
    json.dump({"frameWidth": FW, "frameHeight": FH - top, "frames": len(run), "fps": fps,
               "boardCenterX": CX + 25, "groundY": GROUND - top, "headY": FEET - 62 + 16 - top,
               "bodyRight": CX + 40}, open(f"{OUT}/yuyu-run-{name}.json", "w"))
