# PCRobots Original Source

This directory contains the original PCRobots 1.43 DOS source code by P. D. Smith.

The code here is the game engine source, not a full bot-author SDK. Bots are expected to be separate DOS `.COM` or `.EXE` programs that PCRobots loads and runs inside its own scheduler.

## What This Tree Contains

- `MAIN.CPP`, `MOVE.CPP`, `RUN.CPP`, `LOADFILE.CPP`: engine startup, game loop, robot scheduler, and loader
- `API.CPP`, `API.H`, `PCROBOTS.H`: engine-side API definitions and constants
- `PCROBOTS.MK`: builds the normal graphics version, `PCROBOTS.EXE`
- `BORING.MK`: builds the reduced `BORING.EXE` variant
- `PCROBOTS.RNA`: default arena file
- `PCROBOTS.CFG`: Borland compiler flags

## Build Environment

This source targets Borland C++ 3.1 and real-mode DOS. The official source page also says it should compile with Borland C++ 3.1.

Practical assumptions from the makefiles:

- Borland C++ is installed at `C:\BORLANDC`
- source files live in a flat DOS directory such as `C:\PCROBOTS`
- BGI objects are reachable as `..\BORLANDC\BGI\EGAVGA.OBJ` and `..\BORLANDC\BGI\HERC.OBJ`

Because this repository stores the original files under `original\`, the easiest way to build the untouched source is:

1. Copy the contents of `original\` into a DOS working directory such as `C:\PCROBOTS`.
2. Install Borland C++ 3.1 at `C:\BORLANDC`.
3. Build from that DOS working directory.

A typical DOSBox-style build session looks like this:

```bat
SET PATH=C:\BORLANDC\BIN
SET INCLUDE=C:\BORLANDC\INCLUDE
SET LIB=C:\BORLANDC\LIB
CD \PCROBOTS
MAKE -F PCROBOTS.MK
```

To build the reduced variant instead:

```bat
MAKE -F BORING.MK
```

Notes:

- `PCROBOTS.MK` builds `PCROBOTS.EXE`.
- `BORING.MK` builds `BORING.EXE`.
- The game uses Borland's large memory model and old DOS/graphics libraries from `PCROBOTS.CFG`.

## Running A Match

The program expects bot names on the command line:

```bat
PCROBOTS mybot enemy1 enemy2
```

If a name has no extension, the loader tries:

1. `<name>.COM`
2. `<name>.EXE`

Important runtime limits from the source:

- maximum robots: `20`
- maximum teams: `3`
- bot address space: one 64 KiB DOS task image per bot
- bot names are truncated to 8 characters for display/logging

### Command-Line Options

From `MAIN.CPP`:

- `-a<file>`: use a specific arena file instead of `PCROBOTS.RNA`
- `-f<file>`: append final results to a log file
- `-l<n>`: maximum tick count, `0` means no limit
- `-r<n>`: fixed random seed
- `-v` or `-v2`: verbose results, `-v2` also dumps block-transfer state

Normal graphics build only:

- `-d`: debug mode, do not stop automatically
- `-s`: slow / single-step style run
- `-m`: send stdout text to mono monitor
- `-q`: quick mode
- `-gVGA`, `-gEGA`, `-gCGA`, `-gHERC`: select graphics mode
- `-i`: allow more DOS/BIOS functions, intended for debugging

The source also explicitly warns that bot stdout is only visible when `-m` or `-s` is used.

## Arena Files

Arena files are plain text, read as a `100 x 100` grid. Missing characters are padded as empty space.

Recognized characters from `MAIN.CPP`:

- `.`: empty
- `X`: wall
- `S`: slow square
- `D`: damage square
- `R`: refuel square
- `*`: movable obstacle
- `A`, `B`, `C`: team starting locations

The default arena is [`PCROBOTS.RNA`](./PCROBOTS.RNA).

## Team Files

If an argument ends in `.TM`, PCRobots treats it as a team file and loads each non-empty line from that file as another entry. Team start positions come from `A`, `B`, and `C` in the arena.

Example `ALPHA.TM`:

```text
robot1
robot2
robot3
```

Known caveat in this snapshot:

- `LOADFILE.CPP` contains `IsRobot==FALSE;` where it should almost certainly assign `FALSE` when a name starts with `+`. That means HQ loading appears broken in the source as checked in here. Team files are still useful for grouping normal robots onto the same team start square.

## Writing Bots

### What A Bot Must Be

A bot is a DOS `.COM` or `.EXE` program that PCRobots loads into a 64 KiB task image and runs cooperatively.

Practical constraints visible in `LOADFILE.CPP` and `RUN.CPP`:

- keep the program small enough to fit in one 64 KiB DOS segment
- do not hook or replace interrupt `0xE0`
- do not spin forever without yielding, or the engine kills the bot for timeout

There is no ready-to-link client library in this tree. `API.H` and `API.CPP` are engine-side pieces. For bot code, the stable interface is the interrupt API exposed by the engine.

### Interrupt API Contract

Bots call interrupt `0xE0`.

- `AX`: function number
- `BX`, `CX`, `DX`, `SI`: arguments, depending on the function
- return values come back in `AX` and sometimes `BX` / `CX`

The scheduler is cooperative. Some calls consume the bot's turn and switch to the next task. Others are immediate. From `RUN.CPP`, these calls yield the turn:

- `MOVEMENT`
- `SCAN`
- `SHOOT`
- `TXBLOCK`
- `SWAPTASK`

If a bot only calls non-yielding functions in a loop, it will eventually be killed by the timeout logic in `RUN.CPP`.

### Coordinates And Units

The arena is `100 x 100` cells, but the API exposes finer units:

- internal position uses `1000` units per arena square
- `GETXY` and scan/cannon ranges use `1/10` of a square (`curr_x / 100`, `curr_y / 100`)

So:

- arena square `(12, 7)` spans approximately API coordinates `x = 120..129`, `y = 70..79`
- the default range configuration value `700` means about `70` arena squares

### Configuration At Startup

`CONFIG` only works when `Ticks == 0`, so call it once at bot startup before the main loop.

Bit layout from `RobotState::ConfigureRobot` in `API.CPP`:

- `BX bits 0..2`: max speed
- `BX bits 4..6`: manoeuvre speed
- `BX bits 8..10`: cannon range
- `BX bits 12..14`: max armour
- `CX bits 0..2`: acceleration
- `CX bit 3`: invisibility

Each bot gets a 10-point budget. Tables used by the engine:

- speed: `50, 75, 100, 150, 200`
- manoeuvre speed: `20%, 35%, 50%, 75%, 100%` of max speed
- range: `300, 500, 700, 1000, 1500`
- armour: `50, 75, 100, 150, 200`
- acceleration: `5, 6, 10, 15, 20`

Invisibility reduces starting shell stock by 100 shots.

### Useful Robot Functions

Function numbers come from `PCROBOTS.H`.

- `CONFIG (0x80)`: initialize robot stats at startup; returns version in `AX`
- `MOVEMENT (0x01)`: `BX = target_speed`, `CX = angle_degrees`; yields
- `SCAN (0x02)`: `BX = angle`, `CX = resolution`; returns robot id in `AX`, range in `BX`; yields
- `SHOOT (0x03)`: `BX = angle`, `CX = range`; returns shell id in `AX`; yields
- `GETXY (0x10)`: returns `BX = x`, `CX = y`
- `DAMAGE (0x13)`: returns current armour in `BX`
- `SPEED (0x14)`: returns current speed in `BX`
- `BATTERY (0x15)`: returns battery level in `BX`
- `TICKS (0x16)`: returns tick counter in `BX:CX`
- `GETLOCMP (0x21)`: fills a `9 x 9` local map buffer
- `INVISIBL (0x22)`: toggle invisibility if the bot bought it
- `GTSHLSTT (0x23)`: last shell result in `BX`
- `GETROBID (0x26)`: current robot id in `AX`
- `REGIFF (0x27)`, `CHECKIFF (0x28)`: identify friend-or-foe strings
- `REGNAME (0x29)`, `FINDNAME (0x2A)`: register and search robot names
- `GETTMID (0x2B)`: current team id in `AX`
- `GTASHLST (0x2C)`: query a previous shell id
- `REG_X (0x2D)`, `REG_Y (0x2E)`, `REG_DATA (0x2F)`: register bot memory locations that the engine refreshes when your turn starts
- `TRANSMIT (0x11)` / `RECEIVE (0x12)`: small-message comms
- `TXBLOCK (0x05)` / `RXBLOCK (0x32)`: block comms
- `PICKOBST (0x36)`, `DROPOBST (0x37)`, `OBSTATE (0x38)`, `HOLDOBST (0x39)`: obstacle handling

Map values returned by `GETLOCMP` are based on `report()` in `PCROBOTS.H`:

- `0`: free
- `1`: wall
- `2`: slow
- `3`: damage
- `4`: obstacle
- `30`: any refuel square

### Minimal Bot Skeleton

This is the simplest practical pattern for a Borland C/C++ bot. It uses `int86` directly because this repository does not contain a separate bot SDK:

```cpp
#include <dos.h>

static unsigned pc_call(unsigned ax_in, unsigned *bx_io, unsigned *cx_io,
                        unsigned dx_in, unsigned si_in)
{
    union REGS r;
    r.x.ax = ax_in;
    r.x.bx = *bx_io;
    r.x.cx = *cx_io;
    r.x.dx = dx_in;
    r.x.si = si_in;
    int86(0xE0, &r, &r);
    *bx_io = r.x.bx;
    *cx_io = r.x.cx;
    return r.x.ax;
}

int main(void)
{
    unsigned bx, cx, range;

    /* Example config: balanced bot */
    bx = 2 | (2 << 4) | (2 << 8) | (2 << 12);
    cx = 2;
    pc_call(0x80, &bx, &cx, 0, 0);

    for (;;)
    {
        bx = 0;      /* angle */
        cx = 10;     /* scan resolution */
        if ((int)pc_call(0x02, &bx, &cx, 0, 0) >= 0)
        {
            range = bx;
            bx = 0;
            cx = range;
            pc_call(0x03, &bx, &cx, 0, 0);
        }
        else
        {
            bx = 50;  /* target speed */
            cx = 0;   /* heading */
            pc_call(0x01, &bx, &cx, 0, 0);
        }
    }
}
```

That is not a good bot. It is the minimum shape of a valid one:

- configure once
- keep each turn short
- end each loop with a yielding action such as move, scan, shoot, or swap task

## Known Quirks In This Source Snapshot

- HQ loading appears broken because of the `IsRobot==FALSE;` typo in [`LOADFILE.CPP`](./LOADFILE.CPP).
- The repository layout is modernized, but the makefiles assume the original flat DOS layout.
- `API.H` is not a complete stand-alone bot library even though its name suggests it.

## Suggested First Test

After you have two bot binaries built for DOS:

```bat
PCROBOTS -r1 -v mybot enemybot
```

Then add:

- `-aarena.rna` to try a custom arena
- `-l5000` to cap match length
- `-fresults.log` to keep summaries
- `-s` or `-m` when you want to see bot stdout
