/*$Header: c:/pcrobots/rcs/main.cpp 1.15 93/07/24 00:37:04 PDS_HOME Exp $*/

/* Revision Log */
/*$Log:	main.cpp $
Revision 1.15  93/07/24  00:37:04  PDS_HOME
Initialise obstacles
Allocate block data transfer buffers
Allow -Vn command line parameters, n sets the verbosity level
-v2 displays block data transfer map

Revision 1.14  93/07/19  22:35:42  PDS_HOME
Allow choice of graphics display
Set RobotColour depending on display

Revision 1.13  93/05/09  19:22:55  PDS_HOME
Tidy up the options message

Revision 1.12  93/05/09  18:09:10  PDS_HOME
Disable Ctrl-Break

Revision 1.11  92/11/07  00:38:06  PDS_HOME
Use Team.Survivors instead of counting survivors at the end

Revision 1.10  92/11/06  02:11:24  PDS_HOME
Change 'ticks' to 'Ticks', to use 'Ticks' from assembler module

Revision 1.9  92/11/06  01:30:06  PDS_HOME
Support -i command line parameter - for allowing more interrupts

Restore all the new interrupt vectors after the program is over

Revision 1.8  92/10/29  16:07:10  ROOT_DOS
Separate out 'Loadfile.cpp'
Teams and team scoring
*/

#include "pcrobots.h"

#pragma hdrstop
#include <ctype.h>
//#include <io.h>

static  void    Display(int i,TaskState &Task,int &WinRobot);
static  void    Output(FILE *logfile,TaskState &Task);

char	logfilename[100]="";
char    ArenaFilename[100]="pcrobots.rna";

int	debug_mode=0;
long	time_limit=0;

extern	byte far DebugFlag;
#ifndef BORING
int	maxx;
int	maxy;
int     MaxColours;
int     HercMode=0;
#endif

long	*sint,
	*cost;

arena_line *arena;

RobotState *Robot;
HQState    *HQ;
//task_state	*task;
TaskState  *ThisTask;
//RobotState *ThisRobot;
//HQState    *ThisHQ;

ShellState *Shell;

//POINT	transport[10][2];

REFUEL	refueler[10];
int	refuel_points=0;

TEAM    Team[MaxTeams];

int	NextTask=0,
        NumRobots=0,
        NumHQs=0;

OBSTACLE *Obstacle;
int     NumObstacles=0;

int	alive_robots=0;
int	LoneRobots=0;
//dword	ticks=0;
BOOL	slowmode=FALSE;
BOOL	fastmode=FALSE;
BOOL	singlestep=FALSE;
int	delaytime=100;
BOOL    Verbose=FALSE;
int     NumTeams=0;
int     HomeKillScore=StartHomeKillScore;
int     KillScore=StartKillScore;
int     FalseScore=StartFalseScore;


void interrupt (*f1)(...)=NULL;
void interrupt (*int10vec)(...)=NULL;
void interrupt (*inte1vec)(...)=NULL;
void interrupt (*inte2vec)(...)=NULL;
void interrupt (*inte3vec)(...)=NULL;
void interrupt (*oldtimerint)(...)=NULL;
long int1bvec=0;

static  void    PostMortem(FILE *File,TaskState &Task);
static  void    SetupEms(void);
static  void    TeamScore(FILE *File);

void    far *EmsPageFrame;
word    EmsAvailable,
        EmsUsed,
        EmsHandle;
BOOL    EmsUsable=FALSE;

void    ClearEms(void)
{
 if (EmsUsable)
 {
  _DX=EmsHandle;
  _AH=0x45;
  geninterrupt(0x67);
 }
}
#pragma exit ClearEms

BOOL    BreakFlag;

void	main(int argc,char *argv[])
{
#ifndef BORING
 int GDriver=DETECT;
#endif

 int RandSeed=-1;

 {
  _AX=0x3300;
  geninterrupt(0x21);
  BreakFlag=_DL;
  _DL=0;
  _AX=0x3301;
  geninterrupt(0x21);
 }

 {
  _AH=0x34;
  geninterrupt(0x21);
  word es=_ES;
  InDos=(long)MK_FP(es,_BX);
 }

 int	error=0;
 arena=(arena_line *)calloc(100,sizeof(arena_line));

 Robot=new RobotState[MaxRobots];
 HQ=new HQState[MaxTeams];
// Robot=(RobotState *)calloc(MaxRobots,sizeof(RobotState));

 Shell=new ShellState[MaxShells];

 if ((arena==NULL)||(Robot==NULL)||(Shell==NULL))
 {
  printf("Insufficient memory for PCROBOTS internal data structures\n\a");
  exit(-1);
 }

 sint=new long[360];
 cost=new long[360];

 for (int i=0;i<360;i++)
 {
  sint[i]=sin(i*3.14159265/180)*trig_scale;
  cost[i]=cos(i*3.14159265/180)*trig_scale;
 }

 Obstacle=new OBSTACLE[MaxObstacles];

 for (i=0;i<MaxRobots;i++)
 {
  TXBlockStruct *Ptr=(TXBlockStruct *)malloc(TXDataBlock);
  if (Ptr==NULL)
  {
   printf("Insufficient memory for Data Transfer Buffers\n\a");
   exit(-1);
  }
  Robot[i].TXBlock=Ptr;
  Ptr->RXRobot=BLOCKFREE;
  Ptr->Length=MaxBlockTX;
  Ptr->NextBlock=NULL;
 }
 for (i=0;i<MaxTeams;i++)
 {
  TXBlockStruct *Ptr=(TXBlockStruct *)malloc(TXDataBlock);
  if (Ptr==NULL)
  {
   printf("Insufficient memory for Data Transfer Buffers\n\a");
   exit(-1);
  }
  HQ[i].TXBlock=Ptr;
  Ptr->RXRobot=BLOCKFREE;
  Ptr->Length=MaxBlockTX;
  Ptr->NextBlock=NULL;
 }
/*
 for (i=0;i<10;i++)
 {
  transport[i][0].x=-1;
  transport[i][1].x=-1;
 }
*/

#ifdef BORING
 fastmode=TRUE;
#endif

//Read command line options (not robot names)
 for (i=1;i<argc;i++)
 {
  if (argv[i][0]=='-')
  {
   switch(tolower(argv[i][1]))
   {
    case 'l':time_limit=atol(argv[i]+2);
	     if (time_limit<0)
	      time_limit=0;
	     break;
    case 'f':strcpy(logfilename,argv[i]+2);
             if (logfilename[0]==0)
              strcpy(logfilename,"pcrobots.log");
	     break;
#ifndef BORING
    case 'd':debug_mode=1;
	     DebugFlag=1;
	     break;
    case 's':slowmode=TRUE;
	     DoOutput=1;
	     DebugFlag=1;
	     break;
    case 'm':Mono=1;
	     DoOutput=1;
	     DebugFlag=1;
	     break;
    case 'q':fastmode=TRUE;
	     break;
    case 'i':DebugFlag=1;
	     break;
    case 'g':if (stricmp(argv[i]+2,"VGA")==0)
              GDriver=VGA;
             if (stricmp(argv[i]+2,"EGA")==0)
              GDriver=EGA;
             if (stricmp(argv[i]+2,"CGA")==0)
              GDriver=CGA;
             if (stricmp(argv[i]+2,"HERC")==0)
              GDriver=HERCMONO;
             break;
#endif
    case 'a':strcpy(ArenaFilename,argv[i]+2);
	     break;
    case 'r':RandSeed=atoi(argv[i]+2);
	     break;
    case 'v':Verbose=TRUE;
             if (argv[i][2])
              Verbose=atoi(argv[i]+2);
	     break;
   }
  }
 }

 adlib=test_adlib();
 if (adlib)
 {
  setup_adlib();
 }

 SetupEms();

 {

  FILE *rna_file=fopen(ArenaFilename,"rt");
  if (rna_file!=NULL)
  {
   for (int i=0;i<100;i++)
   {
    char strg[300];
    if (fgets(strg,299,rna_file)==NULL)
     strg[0]=0;
    char *ptr=strchr(strg,'\n');
    if (ptr!=NULL)
     *ptr=0;
    for (int j=0;j<100;j++)
    {
     if (j>=strlen(strg))
      arena[i][j]=ARENA_FREE;
     else
     {
      switch(strg[j])
      {
       case '.':arena[i][j]=ARENA_FREE;
		break;
       case 'X':arena[i][j]=ARENA_WALL;
		break;
       case 'S':arena[i][j]=ARENA_SLOW;
		break;
       case 'D':arena[i][j]=ARENA_DAMAGE;
		break;

       case 'A'://Team Starting locations
       case 'B':
       case 'C':
                {
                 word TeamNo=strg[j]-'A';
		 if (Team[TeamNo].StartX!=-1)
                 {
                  printf("Duplicate starting point for team %c !\n",strg[j]);
                  error=1;
                 }
                 else
                 {
                  Team[TeamNo].StartX=j;
		  Team[TeamNo].StartY=i;
                 }
                }
		break;
       case 'R':{ //Refueling point
		 if (refuel_points==10)
		 {
		  printf("Too many refueling points - max 10 allowed!\n\a");
		  error=1;
		  break;
		 }
		 arena[i][j]=ARENA_REFUEL+(refuel_points++);
		}
		break;
       case '*':{ //Moveable Obstacle
                 if (NumObstacles==MaxObstacles)
                 {
		  printf("Too many moveable obstacles points - max %d allowed!\n\a",MaxObstacles);
		  error=1;
		  break;
                 }
                 arena[i][j]=ARENA_OBSTACLE;
                 Obstacle[NumObstacles].x=j;
                 Obstacle[NumObstacles++].y=i;
                }
                break;
       default:printf("Unknown character %c in Arena file\n",strg[j]);
               error=1;
               break;

      }
     }
    }
   }
   fclose(rna_file);
  }
 }
/*
 for (i=0;i<10;i++)
 {
  if ((transport[i][0].x!=-1) && (transport[i][1].x==-1))
  {
   printf("Transport no.%d only has one entrance!\n\a",i);
   error=1;
  }
 }
*/
 if (error)
  exit(-1);
 if (RandSeed>-1)
 {
  srand(RandSeed);
 }
 else
 {
  randomize();
  for (i=0;i<20;i++)
   rand();
 }

// Read robot names from command line
 for (i=1;i<argc;i++)
 {
  if (argv[i][0]!='-')
  {
//   char	name[100];
//   strcpy(name,argv[i]);
//   *strchr(name,'.')=0;
//   strcat(name);
   start(argv[i]);
  }
 }
 if (NumRobots==0)
 {
  printf("PCROBOTS %d.%d By P.D.Smith - psmithb@cix.compulink.co.uk\n",MajorVERS,MinorVERS);
#ifdef BORING
  printf("(BORING version)\n");
#endif
  printf("\nUse PCROBOTS [-options] <name1> <name2> .... \n");
  printf("Options are : -a<file>: use specified file as the arena\n");
#ifndef BORING
  printf("              -d      : run in debug mode - don't stop automatically\n");
#endif
  printf("              -f<file>: append result summary to the specified file\n");
  printf("                      : (if file is not specified, PCROBOTS.LOG is used\n");
  printf("              -l<n>   : set maximum number of ticks for game\n");
#ifndef BORING
  printf("              -m      : direct stdout output to mono monitor\n");
  printf("              -q      : run in quick mode\n");
  printf("              -s      : run in slow/single-step mode\n");
  printf("              -g<mode>: define graphics mode\n");
  printf("                        (mode='VGA','EGA','CGA' or 'HERC'\n");
#endif
  printf("              -r<numb>: set random number generator seed\n");
  printf("              -v      : verbose final output\n");
#ifndef BORING
  printf("              -i      : allow more DOS/BIOS functions - for debugging only\n");
  printf("                        (-d, -s and -m imply this automatically)\n");
#endif
  printf("\n");
  printf("Any output sent to STDOUT will only be displayed if the '-m' or '-s'\n");
  printf("options are selected\n");
  printf("\n");
  exit(-1);
 }

//Link Robots to HQs and vice-versa!!!
 for (i=0;i<NumRobots;i++)
 {
  HQState *HQPtr=NULL;
  if (Robot[i].Team>=0)
  {
   HQPtr=Team[Robot[i].Team].HQ;
   HQPtr->Robot[HQPtr->NumRobots++]=&Robot[i];
  }
  Robot[i].HQ=HQPtr;
 }


 if (Verbose)
 {
  printf("Press a key to continue\n");
  getch();
 }

#ifndef BORING
 int gm=0;
 if (GDriver==DETECT)
  detectgraph(&GDriver,&gm);
 if ((GDriver!=EGA)&&(GDriver!=VGA)&&(GDriver!=HERCMONO)&&(GDriver!=CGA))
 {
  printf("PCROBOTS %d.%d By P.D.Smith - psmithb@CIX\n",MajorVERS,MinorVERS);
  printf("\nThis program needs an VGA, EGA, CGA or Hercules monitor to work \n\n");
  exit(-1);
 }
 registerbgidriver(Herc_driver);
 registerbgidriver(EGAVGA_driver);
 registerbgidriver(CGA_driver);
 switch(GDriver)
 {
  case HERCMONO:gm=HERCMONOHI;
                break;
  case EGA     :gm=EGAHI;
                break;
  case CGA     :gm=CGAHI;
                break;
  case VGA     :gm=VGAHI;
                break;
 }
 if (GDriver==HERCMONO)
  HercMode=1;
 else
  HercMode=0;
 initgraph(&GDriver,&gm,"");
 int errorcode = graphresult();

 if (errorcode != grOk)
 {
   printf("Graphics error: %s\n", grapherrormsg(errorcode));
   exit(-1);
 }
 maxx=480;
 maxy=getmaxy()-1;
 MaxColours=getmaxcolor()+1;

// cleardevice();
 rectangle(0,0,481,maxy);
#endif

 f1=getvect(0xe0);
 setvect(0xe0,(void interrupt (*)(...))function);

 InitOutput();

#ifndef BORING
 int    NextColour=1;
 for (i=0;i<NumRobots;i++)
 {
  int y=i*15+1;

  Robot[i].RobotColour=NextColour++;
  NextColour%=MaxColours;
  if (NextColour==0)
   NextColour++;

  setcolor(Robot[i].RobotColour);
  line (500,y+10,500+Robot[i].armour/2,i*15+11);
  outtextxy(500,y,Robot[i].Name);
  Robot[i].robot=malloc(imagesize(0,0,4,4));
  setfillstyle(SOLID_FILL,Robot[i].RobotColour);
  bar(485,y,489,y+4);
  putpixel(486,y+1,BLACK);
  putpixel(488,y+1,BLACK);
  putpixel(486,y+3,BLACK);
  putpixel(487,y+3,BLACK);
  putpixel(488,y+3,BLACK);
  getimage(485,y,489,y+4,Robot[i].robot);

 }


 {
  setcolor(WHITE);
  for (int i=0;i<100;i++)
  {
   for (int j=0;j<100;j++)
   {
    if (arena[i][j])
    {
     int colour=WHITE;

     switch(arena[i][j])
     {
      case ARENA_WALL:	colour=WHITE;
			break;
      case ARENA_SLOW:	colour=YELLOW;
			break;
      case ARENA_DAMAGE:colour=RED;
			break;
      case ARENA_OBSTACLE:
			colour=MAGENTA;
			break;
      case ARENA_REFUEL:
      case ARENA_REFUEL+1:
      case ARENA_REFUEL+2:
      case ARENA_REFUEL+3:
      case ARENA_REFUEL+4:
      case ARENA_REFUEL+5:
      case ARENA_REFUEL+6:
      case ARENA_REFUEL+7:
      case ARENA_REFUEL+8:
      case ARENA_REFUEL+9:
			colour=GREEN;
			break;
     }
     if (colour>=MaxColours)
      colour=MaxColours-1;
     setfillstyle(SOLID_FILL,colour);
     long x=j*10l*maxx;
     long y=i*10l*maxy;
     bar3d(int(x/1000),int(y/1000),int((x+9l*maxx)/1000),int((y+9l*maxy)/1000),0,0);
    }
   }
  }
 }

 for (i=0;i<NumRobots;i++)
 {
  Robot[i].old_x=-1;
 }
#endif

 run();
 close_down(FALSE);
}

void close_down(BOOL EscFlag)
{
 int WinRobot=-1;

 disable();
 if (f1!=NULL)
  setvect(0xe0,f1);
 if (int10vec!=NULL)
  setvect(0x10,int10vec);
 if (int13vec!=NULL)
  setvect(0x13,(void interrupt (*)(...))int13vec);
 if (int15vec!=NULL)
  setvect(0x15,(void interrupt (*)(...))int15vec);
 if (int16vec!=NULL)
  setvect(0x16,(void interrupt (*)(...))int16vec);
 if (int1avec!=NULL)
  setvect(0x1a,(void interrupt (*)(...))int1avec);
 if (int21vec!=NULL)
  setvect(0x21,(void interrupt (*)(...))int21vec);
 if (int25vec!=NULL)
  setvect(0x25,(void interrupt (*)(...))int25vec);
 if (int26vec!=NULL)
  setvect(0x26,(void interrupt (*)(...))int26vec);
 if (int2fvec!=NULL)
  setvect(0x2f,(void interrupt (*)(...))int2fvec);
 if (int67vec!=NULL)
  setvect(0x67,(void interrupt (*)(...))int67vec);
 if (inte2vec!=NULL)
  setvect(0xe2,inte2vec);
 if (inte3vec!=NULL)
  setvect(0xe3,inte3vec);
 if (int1bvec!=NULL)
  setvect(0x1b,(void interrupt (*)(...))int1bvec);
 if (oldtimerint!=NULL)
  setvect(0x08,oldtimerint);
 _DL=BreakFlag;
 _AX=0x3301;
 geninterrupt(0x21);
 enable();
#ifndef BORING
 closegraph();
#endif
 cprintf("PCRobots By P.D.Smith\n\n\r");
 cprintf("%lu Ticks\n\n\r",Ticks);

 TeamScore(stdout);

 for (int i=0;i<NumRobots;i++)
  Display(i,Robot[i],WinRobot);
 for (i=0;i<NumHQs;i++)
  Display(i+MaxRobots,HQ[i],WinRobot);

 if (WinRobot==-1)
  WinRobot=101;
 if (logfilename[0])
 {
  FILE *logfile=fopen(logfilename,"at");
  if (logfile!=NULL)
  {
   fprintf(logfile,"\n%lu Ticks\n",Ticks);
   TeamScore(logfile);
   for (int i=0;i<NumRobots;i++)
    Output(logfile,Robot[i]);
   for (i=0;i<NumHQs;i++)
    Output(logfile,HQ[i]);
   fclose(logfile);
  }

 }
 if (EscFlag)
  WinRobot=200;
 exit(WinRobot);
}

void    Display(int i,TaskState &Task,int &WinRobot)
{
 if (!Task.Dead)
  textcolor(GREEN);
 else
  textcolor(LIGHTGRAY);
 cprintf("%2d) %-8s %c %-5s  ",i,Task.Name,
     (Task.Team==-1?' ':Task.Team+'A'),(Task.Dead?"Dead":"Alive"));
 if (Task.isA(HQTask))
  cprintf("HQ! ");
 else
  cprintf("%3d ",((RobotState *)&Task)->armour);

 PostMortem(stdout,Task);
 if ((!Task.Dead)&&(Task.isA(RobotTask)))
 {
  if (WinRobot==-1)
   WinRobot=i;
  else
   WinRobot=100;
 }
}

void    Output(FILE *logfile,TaskState &Task)
{
 fprintf(logfile,"%-8s  %-5s  ",Task.Name,(Task.Dead?"Dead":"Alive"));
 if (Task.isA(HQTask))
  fprintf(logfile,"HQ! ");
 else
  fprintf(logfile,"%3d ",((RobotState *)&Task)->armour);
 PostMortem(logfile,Task);
}

void    PostMortem(FILE *File,TaskState &Task)
{
 if (Task.Dead)
 {
  if (Task.CauseOfDeath<NumRobots)
  {
   int temp=Task.CauseOfDeath;
   fprintf(File,"- Killed by %s[%d]",Robot[temp].Name,temp);
   if (Robot[temp].Team>=0)
    fprintf(File," (Team %c)",Robot[temp].Team+'A');
  }
  else
  {
   if ((Task.CauseOfDeath==SYSTEM_VIOLATION)&&
       (Task.CauseData==0x25e0))
    Task.CauseOfDeath=SYSTEM_SET_E0;
   switch(Task.CauseOfDeath)
   {
    case COLLISION:fprintf(File,"- Killed by collision");
             break;
    case SYSTEM_TIMEOUT:fprintf(File,"- Killed by system (Timeout)");
             break;
    case ARENA_DAMAGE:fprintf(File,"- Killed by arena 'Damage' square");
             break;
    case SYSTEM_VIOLATION:fprintf(File," -Killed by system for violation %04X",Task.CauseData);
             break;
    case SUICIDE:fprintf(File,"- Committed Suicide!");
             break;
    case SYSTEM_CTRLBRK:fprintf(File,"- Killed by system (CTRL-BRK)");
             break;
    case SYSTEM_SET_E0:fprintf(File,"- Killed by system (Tampering with Int 0E0h)");
             break;
   }
  }
 }
 fprintf(File,"\n");

 if (Verbose)
 {
  if (Task.isA(RobotTask))
  {
   RobotState *RPtr=(RobotState *)&Task;
   fprintf(File,"Battery Level - %5ld       Shells Left - %4u   ",
          RPtr->Battery/battery_realunit,RPtr->shells_left);
   if (RPtr->invisible)
    fprintf(File,"**INVISIBLE**");
   fprintf(File,"\n");
  }

//print out memory block tables
  fprintf(File,"Memory Blocks\n");
  fprintf(File,"Addr Type Ownr Size Own Name\n");
  fprintf(File,"==== ==== ==== ==== ========\n");
  MemBlock far *Mem=(MemBlock far *)MK_FP(Task.FirstSegPtr,0);
  do
  {
   fprintf(File,"%04x  %02x  %04x %04x",FP_SEG(Mem),Mem->Signature,Mem->Owner,Mem->Size);
   char Name[9];
   strncpy(Name,Mem->Name,8);
   Name[8]=0;
   fprintf(File," %8s\n",Name);
   if (Mem->Signature==0x5a)
    break;
   Mem=(MemBlock far *)MK_FP(FP_SEG(Mem)+Mem->Size+1,0);
  }
  while (1);
// Print out TX Block map
  if (Verbose>=2)
  {
   fprintf(File,"\nTransmit Block Data Map\n");
   fprintf(File,"Address   TXRobot RXRobot Length NextBlock\n");
   fprintf(File,"========= ======= ======= ====== =========\n");

   TXBlockStruct *Ptr=Task.TXBlock;
   int   Length=0;
   while (Length<TXDataBlock)
   {
    fprintf(File,"%09p   %02x      %02x     %03x   %09p\n",
             Ptr,(WORD)Ptr->TXRobot,(WORD)Ptr->RXRobot,
             Ptr->Length,Ptr->NextBlock);
    Length+=sizeof(*Ptr)+Ptr->Length;
    Ptr=(TXBlockStruct *)(((char *)Ptr)+sizeof(*Ptr)+Ptr->Length);
   }
  }

  fprintf(File,"\n\n");


 }
}

void    TeamScore(FILE *File)
{
 for (int i=0;i<NumTeams;i++)
 {
  fprintf(File,"Team %c ~ Score %ld ~ Kills %d ~ Survivors %d\n",
     i+'A',Team[i].Score,Team[i].Kills,Team[i].Survivors);
 }
 if (NumTeams>0)
  fprintf(File,"\n");
}

const   char *EmsName="PCRobots";
void    SetupEms(void)
{
 EmsUsable=FALSE;
 EmsUsed=0;

 {
  void (*vec)(...) = (void (*)(...))getvect(0x67);
  if (vec!=NULL)
  {
   char far *ptr=(char far *)MK_FP(FP_SEG(vec),0x0a);
   if (strncmp(ptr,"EMMXXXX0",8)==0)
   {
    _AH=0x40;
    geninterrupt(0x67);
    if (_AH==0)
    {
     _AH=0x46;
     geninterrupt(0x67);
     if ((_AH==0)&&(_AL>=0x40))
     {
      _AH=0x41;
      geninterrupt(0x67);

      int fe=_BX;
      if (_AH==0)
      {
       EmsPageFrame=MK_FP(fe,0);
       _AH=0x42;
       geninterrupt(0x67);
       int PagesFree=_BX;
       if (_AH==0)
       {
        if (PagesFree>MaxRobots*4)
         PagesFree=MaxRobots*4;
        PagesFree-=(PagesFree%4);
        if (PagesFree>=4)
        {
         EmsAvailable=PagesFree;
         _BX=PagesFree;
         _AH=0x43;
         geninterrupt(0x67);
         if (_AH==0)
         {
	  EmsHandle=_DX;
          EmsUsable=TRUE;

          if (Verbose)
           printf("Allocated %ldk of EMS\n",EmsAvailable*16l);

   	  asm {
	  push si
	  push ds
          }
	  _SI=FP_OFF(EmsName);
	  _DS=FP_SEG(EmsName);
	  _DX=EmsHandle;
	  _AX=0x5301;
	  geninterrupt(0x67);
	  asm {
	  pop ds
	  pop si
	  }
         }
        }
       }
      }
     }
    }
   }
  }
 }
}
