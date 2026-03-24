#Check that all files which use BORING are redefined as g$<

.NOTABS=1

#		*Translator Definitions*
CFLAGS += +PCROBOTS.CFG -DBORING
LIBPATH = C:\BORLANDC\LIB
INCLUDEPATH = C:\BORLANDC\INCLUDE

INCLUDES = pcrobots.h api.h int21.h adlib.h

#		*List Macros*
Link_Include =  \
 adlib.obj \
 gapi.obj \
 int21.obj \
 ginte2.obj \
 gloadfil.obj \
 gmain.obj \
 mem.obj \
 gmove.obj \
 grun.obj \
 ..\borlandc\bgi\egavga.obj \
 ..\borlandc\bgi\herc.obj

#		*Explicit Rules*
boring.exe: pcrobots.cfg $(Link_Include)
	$(LD) /v/x/c/d/P-/L$(LIBPATH) @$(mktmp \
c0l.obj+ \n\
adlib.obj+ \n\
gapi.obj+ \n\
int21.obj+ \n\
ginte2.obj+ \n\
gloadfil.obj+ \n\
gmain.obj+ \n\
mem.obj+ \n\
gmove.obj+ \n\
grun.obj+ \n\
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

gapi.obj: pcrobots.cfg api.cpp $(INCLUDES)
  $(CC) $(CFLAGS) -o$@ -c api.cpp

int21.obj: pcrobots.cfg int21.asm
	$(AS) /MX /ZI /O INT21.ASM,INT21.OBJ /l

ginte2.obj: pcrobots.cfg inte2.cpp $(INCLUDES)
  $(CC) $(CFLAGS) -o$@ -c inte2.cpp

gloadfil.obj: pcrobots.cfg loadfile.cpp $(INCLUDES)
  $(CC) $(CFLAGS) -o$@ -c loadfile.cpp

gmain.obj: pcrobots.cfg main.cpp $(INCLUDES)
  $(CC) $(CFLAGS) -o$@ -c main.cpp

mem.obj: pcrobots.cfg mem.cpp $(INCLUDES)

gmove.obj: pcrobots.cfg move.cpp $(INCLUDES)
  $(CC) $(CFLAGS) -o$@ -c move.cpp

grun.obj: pcrobots.cfg run.cpp $(INCLUDES)
  $(CC) $(CFLAGS) -o$@ -c run.cpp

