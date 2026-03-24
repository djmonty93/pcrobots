.AUTODEPEND

#		*Translator Definitions*
CC = bcc +PCROBOTS.CFG
TASM = TASM
TLIB = tlib
TLINK = tlink
LIBPATH = C:\BORLANDC\LIB
INCLUDEPATH = C:\BORLANDC\INCLUDE


#		*Implicit Rules*
.c.obj:
  $(CC) -c {$< }

.cpp.obj:
  $(CC) -c {$< }

#		*List Macros*
Link_Exclude =  \
 maintodo.obj \
 todo.obj

Link_Include =  \
 adlib.obj \
 api.obj \
 int21.obj \
 inte2.obj \
 loadfile.obj \
 main.obj \
 mem.obj \
 move.obj \
 run.obj \
 ..\borlandc\bgi\egavga.obj \
 ..\borlandc\bgi\herc.obj

#		*Explicit Rules*
pcrobots.exe: pcrobots.cfg $(Link_Include) $(Link_Exclude)
  $(TLINK) /v/x/c/d/P-/L$(LIBPATH) @&&|
c0l.obj+
adlib.obj+
api.obj+
int21.obj+
inte2.obj+
loadfile.obj+
main.obj+
mem.obj+
move.obj+
run.obj+
..\borlandc\bgi\egavga.obj+
..\borlandc\bgi\herc.obj
pcrobots
		# no map file
graphics.lib+
emu.lib+
mathl.lib+
cl.lib
|


#		*Individual File Dependencies*
adlib.obj: pcrobots.cfg adlib.cpp 

api.obj: pcrobots.cfg api.cpp 

int21.obj: pcrobots.cfg int21.asm 
        $(TASM) /MX /ZI /O INT21.ASM,INT21.OBJ /l

inte2.obj: pcrobots.cfg inte2.cpp 

loadfile.obj: pcrobots.cfg loadfile.cpp 

main.obj: pcrobots.cfg main.cpp 

mem.obj: pcrobots.cfg mem.cpp 

move.obj: pcrobots.cfg move.cpp 

run.obj: pcrobots.cfg run.cpp 

maintodo.obj: pcrobots.cfg maintodo.txt 
	C:\BORLANDC\BIN\NULLPROG.BAT MAINTODO.OBJ 

todo.obj: pcrobots.cfg lib\todo.txt 
	C:\BORLANDC\BIN\NULLPROG.BAT TODO.OBJ 

#		*Compiler Configuration File*
pcrobots.cfg: pcrobots.mak
  copy &&|
-ml
-C
-w+
-v
-G
-O
-Og
-Om
-Ol
-Ob
-Oi
-Z
-d
-H=PCROBOTS.SYM
-I$(INCLUDEPATH)
-L$(LIBPATH)
| pcrobots.cfg


