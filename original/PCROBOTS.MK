.NOTABS=1

#		*Translator Definitions*
CFLAGS += +PCROBOTS.CFG
LIBPATH = C:\BORLANDC\LIB
INCLUDEPATH = C:\BORLANDC\INCLUDE

INCLUDES = pcrobots.h api.h int21.h adlib.h

#		*Implicit Rules*


#		*List Macros*
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
pcrobots.exe: pcrobots.cfg $(Link_Include)
	$(LD) /v/x/c/d/P-/L$(LIBPATH) @$(mktmp \
c0l.obj+ \n\
adlib.obj+ \n\
api.obj+ \n\
int21.obj+ \n\
inte2.obj+ \n\
loadfile.obj+ \n\
main.obj+ \n\
mem.obj+ \n\
move.obj+ \n\
run.obj+ \n\
..\\borlandc\\bgi\\egavga.obj+ \n\
..\\borlandc\\bgi\\herc.obj \n\
pcrobots \n\
\n\
graphics.lib+ \n\
emu.lib+ \n\
mathl.lib+ \n\
cl.lib \n\
)


#		*Individual File Dependencies*
adlib.obj: pcrobots.cfg adlib.cpp $(INCLUDES)

api.obj: pcrobots.cfg api.cpp $(INCLUDES)

int21.obj: pcrobots.cfg int21.asm 
	$(AS) /MX /ZI /O INT21.ASM,INT21.OBJ /l

inte2.obj: pcrobots.cfg inte2.cpp $(INCLUDES)

loadfile.obj: pcrobots.cfg loadfile.cpp $(INCLUDES)

main.obj: pcrobots.cfg main.cpp $(INCLUDES)

mem.obj: pcrobots.cfg mem.cpp $(INCLUDES)

move.obj: pcrobots.cfg move.cpp $(INCLUDES)

run.obj: pcrobots.cfg run.cpp $(INCLUDES)

