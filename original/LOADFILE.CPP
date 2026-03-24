/*$Header: c:/pcrobots/rcs/loadfile.cpp 1.5 93/07/24 00:35:12 PDS_HOME Exp Locker: PDS_HOME $*/

/* Revision Log */
/*$Log:	loadfile.cpp $
Revision 1.5  93/07/24  00:35:12  PDS_HOME
Set DataVar pointer to NULL
Set block data transmission pointers
Clear robot filters

Revision 1.4  93/07/19  22:29:04  PDS_HOME
If it's not BORING.EXE, then initialise the RobotColour entry of the
task structure when a robot is loaded

Revision 1.3  92/11/07  00:34:57  PDS_HOME
Add recording of Team.Survivors and LoneRobots

Revision 1.2  92/11/06  01:26:59  PDS_HOME
Initialise tables for last 10 shell states, and associated pointers
*/

#include "pcrobots.h"

#pragma hdrstop
#include <io.h>

void	load_COM(char *name,void far *fn)
{
 FILE *fl=fopen(name,"rb");
 if (fl==NULL)
 {
  printf("Unable to load %s - Aborting\n",name);
  exit(-1);
 }
 void *fptr1=MK_FP(FP_SEG(fn),0x100);
 fread(fptr1,1,16384-0x100,fl);
 for (int i=1;i<4;i++)
 {
  fptr1=MK_FP(FP_SEG(fn),0x4000*i);
  fread(fptr1,1,16384,fl);
 }
 fclose(fl);
 // Make PSP
 {
  char *psp=(char *)fn;
  *(psp++)=0xcd;
  *(psp++)=0x20;
  word fn_end=FP_SEG(fn)+0x0fff;
  *(psp++)=fn_end&0xff;
  *(psp++)=fn_end>>8;
  psp=((char *)fn)+0x0a;
  *(void **)psp=(void *)getvect(0x22);
  psp+=4;
  *(void **)psp=(void *)getvect(0x23);
  psp+=4;
  *(void **)psp=(void *)getvect(0x24);
  psp=((char *)fn)+0x2c;
  fn_end=FP_SEG(fn)+0x9;
  *(psp++)=fn_end&0xff;
  *(psp)=fn_end>>8;
  psp=((char *)fn)+0x80;
  *(psp++)=0;
  *(psp++)=0xd;
  *(psp)=0;
  psp=((char *)fn)+0x90;
  *(psp++)=0;
  *(psp)=0;
 }

 unsigned *ptr=(unsigned *)MK_FP(FP_SEG(fn),0xffee);
 *(--ptr)=_FLAGS;
 *(--ptr)=FP_SEG(fn);	//CS
 *(--ptr)=0x100;	//IP
 *(--ptr)=0;		//AX
 *(--ptr)=0;		//BX
 *(--ptr)=0;		//CX
 *(--ptr)=0;		//DX
 *(--ptr)=FP_SEG(fn);	//ES
 *(--ptr)=FP_SEG(fn);	//DS
 *(--ptr)=0;		//SI
 *(--ptr)=0;		//DI
 *(--ptr)=0;		//BP
 ThisTask->ss=FP_SEG(ptr);
 ThisTask->sp=FP_OFF(ptr);
 ThisTask->bp=FP_OFF(ptr);
 ThisTask->segment=FP_SEG(fn);
}


void	load_EXE(char *name,void far *fn)
{
 struct {
	 word sig;
	 word len_mod512;
	 word len_div512;
	 word reloc_items;
	 word hdr_size;
	 word min_memory;
	 word max_memory;
	 word start_ss;
	 word start_sp;
	 word checksum;
	 word start_ip;
	 word start_cs;
	 word reloc_start;

	} exe_hdr;

 FILE *fl=fopen(name,"rb");
 if (fl==NULL)
 {
  printf("Unable to load %s - Aborting\n",name);
  exit(-1);
 }

 void *fptr1=MK_FP(FP_SEG(fn),0x100);

 fread(&exe_hdr,1,sizeof(exe_hdr),fl);
 if (exe_hdr.sig!=0x5a4d)
 {
  fclose(fl);
  printf("Invalid .EXE file - %s - Aborting\n",name);
  exit(-1);
 }

 word	prog_seg=FP_SEG(fn)+0x10;

 dword	prog_size=exe_hdr.len_div512*512l;
 if (exe_hdr.len_mod512!=0)
  prog_size=prog_size-512+exe_hdr.len_mod512;

 word header_size=0x10 * exe_hdr.hdr_size;

 if (prog_size-header_size +exe_hdr.min_memory*0x10+0x100>65536L)
 {
  printf("Too much memory is needed to load %s - Aborting\n",name);
  exit(-1);
 }

 fseek(fl,header_size,SEEK_SET);

 if (prog_size>=16384)
 {
  fread(fptr1,1,16384,fl);
  fptr1=MK_FP(FP_SEG(fptr1)+0x400,FP_OFF(fptr1));
  prog_size-=16384;
 }
 if (prog_size)
 {
  fread(fptr1,1,(word)prog_size,fl);
 }

 fseek(fl,exe_hdr.reloc_start,SEEK_SET);

 for (int i=0;i<exe_hdr.reloc_items;i++)
 {
  struct {
	  word off;
	  word seg;
	 }reloc;
  fread(&reloc,1,sizeof(reloc),fl);
  word far *fptr=(word far *)MK_FP(FP_SEG(fn)+0x10+reloc.seg,FP_OFF(fn)+reloc.off);

  *fptr=(*fptr)+prog_seg;
 }

 fclose(fl);


 // Make PSP
 {
  char *psp=(char *)fn;
  *(psp++)=0xcd;
  *(psp++)=0x20;
  word fn_end=FP_SEG(fn)+0x0fff;
  *(psp++)=fn_end&0xff;
  *(psp++)=fn_end>>8;
  psp=((char *)fn)+0x0a;
  *(void **)psp=(void *)getvect(0x22);
  psp+=4;
  *(void **)psp=(void *)getvect(0x23);
  psp+=4;
  *(void **)psp=(void *)getvect(0x24);
  psp=((char *)fn)+0x2c;
  fn_end=FP_SEG(fn)+0x9;
  *(psp++)=fn_end&0xff;
  *(psp)=fn_end>>8;
  psp=((char *)fn)+0x80;
  *(psp++)=0;
  *(psp++)=0xd;
  *(psp)=0;
  psp=((char *)fn)+0x90;
  *(psp++)=0;
  *(psp)=0;
 }

 if (exe_hdr.start_sp==0)
 {
  printf("%s has no stack allocated!\n",name);
  exit(-1);
 }

 unsigned *ptr=(unsigned *)MK_FP(exe_hdr.start_ss+prog_seg,exe_hdr.start_sp);
 *(--ptr)=_FLAGS;
 *(--ptr)=exe_hdr.start_cs+prog_seg;	//CS
 *(--ptr)=exe_hdr.start_ip;		//IP
 *(--ptr)=0;
 *(--ptr)=0;
 *(--ptr)=0;
 *(--ptr)=0;
 *(--ptr)=FP_SEG(fn);
 *(--ptr)=FP_SEG(fn);
 *(--ptr)=0;
 *(--ptr)=0;
 *(--ptr)=0;
 ThisTask->ss=FP_SEG(ptr);
 ThisTask->sp=FP_OFF(ptr);
 ThisTask->bp=FP_OFF(ptr);
 ThisTask->segment=FP_SEG(fn);
}

void	start(const char *name,const int TeamNo)
{
 BOOL IsRobot=TRUE;
 if (name[0]=='+')
 {
  IsRobot==FALSE;
  name++;
 }
 if ((IsRobot)&&(NumRobots>=MaxRobots))
 {
  printf("Too many robots - maximum is %d - Aborting\n",MaxRobots);
  exit(-1);
 }

 if (TeamNo>=MaxTeams)
 {
  printf("Too many teams - maximum is %d - Aborting\n",MaxTeams);
  exit(-1);
 }

 if (!IsRobot)
 {
  if (TeamNo==-1)
  {
   printf("A HQ needs to be in a team! - Aborting\n");
   exit(-1);
  }
  if (Team[TeamNo].HQ!=NULL)
  {
   printf("Team %c has more than one HQ - Aborting\n",TeamNo+'A');
   exit(-1);
  }
 }

//Check for a team name - must end in .TM
 {
  char *Ptr=strchr(name,'.');
  if (Ptr!=NULL)
  {
   if (stricmp(Ptr,".TM")==0)
   {
    int ThisTeam=TeamNo;
    char Temp[100];

    if (ThisTeam==-1)
     (ThisTeam=NumTeams++);
    FILE *TeamFile=fopen(name,"rt");
    if (TeamFile==NULL)
    {
     printf("Unable to open Team file %s\n",name);
     exit(-1);
    }

    while(fgets(Temp,99,TeamFile)!=NULL)
    {
     int z=strlen(Temp);
     while ((Temp[z-1]<' ')&&(z>0))
      Temp[--z]=0;

     if (Temp[0])
      start(Temp,ThisTeam);
    }
    fclose(TeamFile);
    return;
   }
  }
 }

 if (IsRobot)
 {
  ThisRobot=&Robot[NumRobots++];
  ThisTask=ThisRobot;
  ThisHQ=NULL;
 }
 else
 {
  ThisHQ=&HQ[NumHQs++];
  ThisTask=ThisHQ;
  ThisRobot=NULL;
  Team[TeamNo].HQ=ThisHQ;
 }

 void far *StartAddress=farmalloc(65536L+16);
 if (StartAddress==NULL)
 {
  if (EmsUsable)
  {
   if (EmsUsed<EmsAvailable)
   {
    ThisTask->mem_type=0;
    if (Verbose)
     printf("Loading %s into EMS - %d",name,EmsUsed);
    for (int i=0;i<4;i++)
    {
     ThisTask->EmsMap[i*2]=EmsUsed++;
     ThisTask->EmsMap[i*2+1]=i;
    }
    MapEms(ThisTask->EmsMap);
    StartAddress=EmsPageFrame;
   }
  }
  if (StartAddress==NULL)
  {
   printf("Insufficient memory to load %s - Aborting\n",name);
   exit(-1);
  }
 }
 else
 {
//Ensure it's aligned on a paragraph boundary
  StartAddress=MK_FP(FP_SEG(StartAddress)+1,0);
  if (Verbose)
   printf("Loading %s into conventional memory",name);
  ThisTask->mem_type=0xffff;
 }


 {
  void far *fn=MK_FP(FP_SEG(StartAddress)+1,0);
  char temp[100];
  strcpy(temp,name);
  if (strchr(temp,'.')==NULL)
  {
   sprintf(temp,"%s.COM",name);
   if (access(temp,0)!=0)
    sprintf(temp,"%s.EXE",name);
  }

  FILE *TempFile=fopen(temp,"rb");
  BOOL ComFile=FALSE;
  if (TempFile!=NULL)
  {
   char Buf[2];
   fread(Buf,2,1,TempFile);
   fclose(TempFile);
   if (memcmp(Buf,"MZ",2)!=0)
    ComFile=TRUE;
  }
  if (ComFile)
  {
   if (Verbose)
    printf("  (COM file)\n");
   load_COM(temp,fn);
  }
  else
  {
   if (Verbose)
    printf("  (EXE file)\n");
   load_EXE(temp,fn);
  }
 }

 if (ThisTask->isA(RobotTask))
 {
  if ((TeamNo==-1)||(Team[TeamNo].StartX==-1))
  {
   int 	attempt=0;
   int	x1,
	 y1;
   do
   {
    ThisRobot->curr_x=random(1000)*100l;
    ThisRobot->curr_y=random(1000)*100l;
 // Corrected on 26/9/92
    x1=int(ThisRobot->curr_x/1000l);
    y1=int(ThisRobot->curr_y/1000l);
 //
    attempt++;
    if (attempt>1000)
    {
     printf("Couldn't place Robot %s due to obstacles\n",name);
     exit(-1);
    }
   }
   while (arena[y1][x1]!=ARENA_FREE);
  }
  else
  {
   ThisRobot->curr_x=Team[TeamNo].StartX*1000l+random(1000);
   ThisRobot->curr_y=Team[TeamNo].StartY*1000l+random(1000);
  }
 }

 ThisTask->Dead            =FALSE;
 ThisTask->CauseOfDeath    =0;
 ThisTask->FirstSegPtr     =FP_SEG(StartAddress);
 ThisTask->PSP             =ThisTask->FirstSegPtr+1;
 ThisTask->Team            =TeamNo;
 ThisTask->RXPtr           =NULL;
 ThisTask->TXFree          =ThisTask->TXBlock;
 for (int i=0;i<MaxRobots+MaxTeams;i++)
  ThisTask->Filter[i]=0;

 if (ThisTask->isA(RobotTask))
 { //Robot Specific initialisation
  ThisRobot->target_speed	=0;
  ThisRobot->speed		=0;
  ThisRobot->shells		=0;
  ThisRobot->armour		=100;
  ThisRobot->max_armour	        =100;
  ThisRobot->max_speed	        =100;
  ThisRobot->manouevre_speed	=50;
  ThisRobot->max_range	        =700;
  ThisRobot->acceleration	=10;
  ThisRobot->Battery		=battery_start;
  ThisRobot->shells_left	=1000;
  ThisRobot->last_fire          =0;
  ThisRobot->invisibility	=FALSE;
  ThisRobot->invisible	        =FALSE;
  ThisRobot->transported	=FALSE;
  ThisRobot->slowed		=FALSE;
  ThisRobot->recharging	        =FALSE;
  ThisRobot->last_shell_state   =SHELL_HIT_WALL;
  ThisRobot->IFF_String         =NULL;
  ThisRobot->NameString         =NULL;
  ThisRobot->xVar               =NULL;
  ThisRobot->yVar               =NULL;
  ThisRobot->DataVar            =NULL;
  ThisRobot->ObstacleState      =NONE;
  ThisRobot->HQ                 =NULL;
  ThisRobot->ID                 =NumRobots-1;
  ThisRobot->MaxRX_Size         =MaxRX;
 #ifndef BORING
  ThisRobot->RobotColour        =0;
 #endif

  if (TeamNo>=0)
   Team[TeamNo].Survivors++;
  else
   LoneRobots++;

  for (i=0;i<10;i++)
   ThisRobot->LastShells[i]=0;
  ThisRobot->ShellPtr	=0;
  ThisRobot->ShellCtr	=1;
 }
 else
 { //HQ Specific initialisation
  ThisHQ->NumRobots             =0;
  ThisHQ->PointsLeft            =0;
  ThisHQ->MaxRX_Size            =MaxHQRX;
  ThisHQ->ID                    =MaxRobots+NumHQs-1;
 }

 ThisTask->RX_Data=malloc(sizeof(*RX_Data)*ThisTask->MaxRX_Size);
 ThisTask->RX_Sender=malloc(sizeof(*RX_Sender)*ThisTask->MaxRX_Size);
 ThisTask->RX_Size=0;

 char strg[100];
 const char *ptr1=strrchr(name,'\\');
 if (ptr1==NULL)
  ptr1=name;
 else
  ptr1++;
 strcpy(strg,ptr1);
 char *ptr2=strchr(strg,'.');
 if (ptr2!=NULL)
  *ptr2=0;
 strg[8]=0;
 strcpy(ThisTask->Name,strg);

 {
  MemBlock far *Mem=(MemBlock far *)StartAddress;
  Mem->Signature=0x5a;
  Mem->Owner=ThisTask->PSP;
  Mem->Size=0xfff;
  memcpy(Mem->Name,ThisTask->Name,8);
 }

// max_task++;
 alive_robots++;
}


