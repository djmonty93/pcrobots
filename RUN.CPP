/*$Header: c:/pcrobots/rcs/run.cpp 1.12 93/07/24 00:30:56 PDS_HOME Exp $*/

/* Revision Log */
/*$Log:	run.cpp $
Revision 1.12  93/07/24  00:30:56  PDS_HOME
Store DataVar in robot's workspace if necessary
Chance case statements to use function constants rather than numbers
Obstacle carrying/holding penalties for the MOVEMENT function
Comms filter
Block data transmission/reception routines
Obstacle routines

Revision 1.11  93/07/19  22:32:57  PDS_HOME
Use RobotColour when drawing flags in status display

Revision 1.10  92/12/05  23:48:57  PDS_HOME
Removed 'get_remote_map' function

Revision 1.9  92/11/07  00:39:47  PDS_HOME
Make KillRobot function

Call KillRobot if a robot is terminated by the system

Revision 1.8  92/11/06  22:10:18  PDS_HOME
Add 'get_ashell_state' API routine

Add 'register_x' and 'register_y' API routines

Revision 1.7  92/11/06  02:10:59  PDS_HOME
Change 'ticks' to 'Ticks', to use 'Ticks' from assembler module

Revision 1.6  92/11/06  01:28:44  PDS_HOME
Chain into interrupts 13h, 15h, 16h, 1ah, 25h, 26h, 2fh and 67h for
a more secure system (hopefully).

Revision 1.5  92/10/30  14:33:36  ROOT_DOS
Corrections to Find_Name and Check_Iff (AX register is used for 
the function number, so it can't be a parameter as well).

Revision 1.4  92/10/29  16:05:48  ROOT_DOS
Get_Team_Number function
*/

#include "pcrobots.h"

#pragma hdrstop

word	ss_master,
	sp_master,
	bp_master;

word    Timeout;
word    RobotTimeout=50;

extern  byte far InSystem;
extern  byte far KillFlag;

const	double PI=3.14159265358979;

void interrupt test_timer(void);
extern "C" void killrun(void);
extern "C" void _loadds _saveregs C_setvect(int no,dword addr);

dword  SysVecs[12];

int	AliveTeams;

word  ax1,	//global to allow them to be accessed, whatever the
      bx1,      //current stack is pointing to.
      cx1,
      dx1,
      si1,
      Swap;

static  void do_function(RobotState *ThisRobot);

void	interrupt run(void)
{
 for (int j=0;j<NumRobots;j++)
 {
  _fmemcpy(Robot[j].IntVecs,MK_FP(0,0x34*4),12*4);
 }
 for (j=0;j<NumHQs;j++)
 {
  _fmemcpy(HQ[j].IntVecs,MK_FP(0,0x34*4),12*4);
 }
 _fmemcpy(SysVecs,MK_FP(0,0x34*4),12*4);

 AliveTeams=NumTeams;
 disable();
 InSystem=1;
 int13vec=(long)getvect(0x13);
 int15vec=(long)getvect(0x15);
 int16vec=(long)getvect(0x16);
 int1avec=(long)getvect(0x1a);
 int21vec=(long)getvect(0x21);
 int25vec=(long)getvect(0x25);
 int26vec=(long)getvect(0x26);
 int2fvec=(long)getvect(0x2f);
 int67vec=(long)getvect(0x67);
 oldtimerint=getvect(0x8);
 int10vec=getvect(0x10);
 int1bvec=(long)getvect(0x1b);
 inte2vec=getvect(0xe2);
 inte3vec=getvect(0xe3);
 setvect(0x13,(void interrupt (*)(...))MyInt13);
 setvect(0x15,(void interrupt (*)(...))MyInt15);
 setvect(0x16,(void interrupt (*)(...))MyInt16);
 setvect(0x1a,(void interrupt (*)(...))MyInt1a);
 setvect(0x21,(void interrupt (*)(...))MyInt21);
 setvect(0x25,(void interrupt (*)(...))MyInt25);
 setvect(0x26,(void interrupt (*)(...))MyInt26);
 setvect(0x2f,(void interrupt (*)(...))MyInt2f);
 setvect(0x67,(void interrupt (*)(...))MyInt67);
 setvect(0xe3,int10vec);
 setvect(0x10,(void interrupt (*)(...))MyInt10);
 setvect(0xe2,(void interrupt (*)(...))MyIntE2);
 setvect(0x8,(void interrupt (*)(...))test_timer);
 setvect(0x1b,(void interrupt (*)(...))MyInt1b);
 Timeout=0;
 enable();
 for (long i=0;Timeout<5;i++)
 {}
 disable();
 RobotTimeout=(word)(14000000L/i);
 setvect(0x8,(void interrupt (*)(...))timer_tick);
 Timeout=RobotTimeout;
 ss_master=_SS;
 sp_master=_SP;
 bp_master=_BP;
// ThisRobot=&Robot[NextTask];
 ThisTask=&Robot[NextTask];
// ThisHQ=NULL;
 if (!ThisTask->mem_type)
  MapEms(ThisTask->EmsMap);
 _SS=ThisTask->ss;
 _SP=ThisTask->sp;
 _BP=ThisTask->bp;
 enable();
 InSystem=0;
}

void interrupt test_timer(void)
{
 oldtimerint();
 Timeout++;
}

void interrupt timer_tick(void)
{
 oldtimerint();
 if ((!slowmode)&&(Timeout-- ==0))
 {
  if (*(byte far *)InDos)
   Timeout++;
  else
   killtask(-1);
 }
 if (KillFlag)
 {
  if (*(byte far *)InDos==0)
   killrun();
 }
}

void    _loadds killtask(int Data)
{
 if (Data==-1)
  ThisTask->CauseOfDeath=SYSTEM_TIMEOUT;
 else
 {
  ThisTask->CauseOfDeath=SYSTEM_VIOLATION;
  ThisTask->CauseData=Data;
 }
 KillRobot(ThisTask);
 asm {
 mov ax,0       /*swaptask*/
 mov word ptr [bp+2],offset(function)
 mov word ptr [bp+4],seg(function)
 }

}

void    killrun(void)
{
 for (int i=0;i<NumRobots;i++)
 {
  if (!Robot[i].Dead)
  {
   Robot[i].Dead=TRUE;
   Robot[i].CauseOfDeath=SYSTEM_CTRLBRK;
  }
 }
 for (i=0;i<NumHQs;i++)
 {
  if (!HQ[i].Dead)
  {
   HQ[i].Dead=TRUE;
   HQ[i].CauseOfDeath=SYSTEM_CTRLBRK;
  }
 }
 alive_robots=0;
 asm {
 mov ax,0       /*swaptask*/
 mov word ptr [bp+2],offset(function)
 mov word ptr [bp+4],seg(function)
 }

}

void _loadds _saveregs C_setvect(int no,dword addr)
{
 ThisTask->IntVecs[(no&0xff)-0x34]=addr;
}

#pragma argsused
void	interrupt function(word bp,word di,word si,word ds,word es,word dx,word cx,word bx,word ax)
{
 volatile word newax=ax;	//volatile to force it onto the stack, instead of
			// into a register

 InSystem=1;
 ax1=ax;
 bx1=bx;
 cx1=cx;
 dx1=dx;
 si1=si;

 disable();
 ThisTask->ss=_SS;
 ThisTask->sp=_SP;
 ThisTask->bp=_BP;
 _SS=ss_master;
 _SP=sp_master;
 _BP=bp_master;
 enable();

//Check the INT E0 Vector
 {
  dword Temp=*(dword far *)MK_FP(0,0xe0*4);
  if (Temp!=(dword)function)
  {
   *(dword far *)MK_FP(0,0xe0*4)=(dword)function;
   ThisTask->Dead=TRUE;
   ThisTask->CauseOfDeath=SYSTEM_SET_E0;
   if (ThisTask->isA(RobotTask))
    alive_robots--;
  }
 }

 _fmemcpy(ThisTask->IntVecs,MK_FP(0,0x34*4),12*4);
 _fmemcpy(MK_FP(0,0x34*4),SysVecs,12*4);


 Swap=FALSE;
 if (NextTask<MaxRobots)
  do_function((RobotState*)ThisTask);
 else
  DoHQFunction();

 disable();
 _SS=ThisTask->ss;
 _SP=ThisTask->sp;
 _BP=ThisTask->bp;
 enable();

 newax=ax1;
 bx=bx1;
 cx=cx1;

 if (Swap)
 {
  Timeout=RobotTimeout;
  disable();
  ThisTask->ss=_SS;
  ThisTask->sp=_SP;
  ThisTask->bp=_BP;
  _SS=ss_master;
  _SP=sp_master;
  _BP=bp_master;
  do
  {
   NextTask++;
   if (NextTask==NumRobots)
    NextTask=MaxRobots;
   if (NextTask>=MaxRobots)
   {
    if (NextTask==MaxRobots+NumHQs)
    {
     NextTask=0;
     enable();
     move();
     disable();
     ThisTask=&Robot[NextTask];
    }
    else
     ThisTask=&HQ[NextTask-MaxRobots];
   }
   else
    ThisTask=&Robot[NextTask];
  }
  while (ThisTask->Dead);

  if (!ThisTask->mem_type)
   MapEms(ThisTask->EmsMap);
  disable();
  _SS=ThisTask->ss;
  _SP=ThisTask->sp;
  _BP=ThisTask->bp;
  enable();

  if (ThisTask->isA(RobotTask))
  {
// ThisRobot=(RobotState *)ThisTask;
   RobotState *ThisRobot=(RobotState *)ThisTask;
//   ThisHQ=NULL;

   if (ThisRobot->xVar!=NULL)
    *(ThisRobot->xVar)=(int)(ThisRobot->curr_x/100);
   if (ThisRobot->yVar!=NULL)
    *(ThisRobot->yVar)=(int)(ThisRobot->curr_y/100);
   if (ThisRobot->DataVar!=NULL)
   {
    DataStruct *Ptr=ThisRobot->DataVar;
    word Len=Ptr->StructLen;
    if (Len>0)
    {
     Ptr->x=word(ThisRobot->curr_x/100);
     Ptr->y=word(ThisRobot->curr_y/100);
     Ptr->Armour=ThisRobot->armour;
     Ptr->Speed=ThisRobot->speed;
     Ptr->Angle=ThisRobot->iangle;
     Ptr->Invisible=ThisRobot->invisible;
     Ptr->LastShellState=ThisRobot->last_shell_state;
     Ptr->Battery=(word)(ThisRobot->Battery/battery_realunit);
     Ptr->ShellsLeft=ThisRobot->shells_left;
    }
   }
  }
  else
  {
//   ThisRobot=NULL;
//   ThisHQ=(HQState *)ThisTask;
  }
 }
 ax=newax;
// _fmemcpy(SysVecs,MK_FP(0,0x34*4),SysVecs,12*4); (redundant)
 _fmemcpy(MK_FP(0,0x34*4),ThisTask->IntVecs,12*4);
 InSystem=0;
}

void do_function(RobotState *ThisRobot)
{
 switch(ax1)
 {
  case SWAPTASK:Swap=TRUE;
                break;
  case MOVEMENT:cx1%=360;
                switch(ThisRobot->ObstacleState)
                {
                 case NONE:if (bx1>ThisRobot->max_speed)
	                    bx1=ThisRobot->max_speed;
	                   if (ThisRobot->speed<=ThisRobot->manouevre_speed)
	                    ThisRobot->iangle=cx1;
                           break;
                 case CARRYING: //Half speed
                           if (bx1>ThisRobot->max_speed/2)
                            bx1=ThisRobot->max_speed/2;
	                   if (ThisRobot->speed<=ThisRobot->manouevre_speed/2)
	                    ThisRobot->iangle=cx1;
                           break;
                 case HOLDING: //Immobile
                           bx1=0;
                           break;
                }
	        ThisRobot->target_speed=bx1;
                Swap=TRUE;
	        break;
  case SCAN    :ax1=scan(bx1,cx1,bx1);
                Swap=TRUE;
                break;
  case SHOOT   :ax1=cannon(bx1,cx1);
                Swap=TRUE;
	        break;
//  case 0x04:get_remote_map(MK_FP(bx1,cx1),(dx1>>8)&0xff,(dx1&0xff));
//            break;
  case GETXY   :bx1=int(ThisRobot->curr_x/100l);
	        cx1=int(ThisRobot->curr_y/100l);
	        break;
  case TRANSMIT:ax1=Transmit(bx1,cx1);
                break;
  case RECEIVE :ax1=receive(bx1,cx1);
	        break;
  case DAMAGE  :bx1=ThisRobot->armour;
	        break;
  case SPEED   :bx1=ThisRobot->speed;
	        break;
  case BATTERY :bx1=int(ThisRobot->Battery/battery_realunit);
	        break;
  case TICKS   :bx1=(word)(Ticks>>16);
	        cx1=(word)(Ticks&0xffff);
	        break;
  case L_SIN   :{
	         bx1%=360;
	         long answer=sint[bx1];
	         bx1=(word)(answer>>16);
	         cx1=(word)(answer&0xffff);
	        }
	        break;
  case L_COS   :{
	         bx1%=360;
	         long answer=cost[bx1];
	         bx1=(word)(answer>>16);
	         cx1=(word)(answer&0xffff);
	        }
	        break;
  case L_TAN   :{
	         bx1%=360;
	         long answer=tan(bx1*PI/180)*trig_scale;
	         bx1=(word)(answer>>16);
	         cx1=(word)(answer&0xffff);
	        }
	        break;
  case L_ATAN  :{
	         long answer=(long(bx1)<<16)+cx1;
	         ax1=atan((double)answer/trig_scale)*180/PI;
	        }
	        break;
  case L_SQRT  :{
	         long x=(long(bx1)<<16)+cx1;
	         if (x<0)
	          x=-x;
	         x=sqrt(x)+0.5;
	         bx1=(word)(x>>16);
	         cx1=(word)(x&0xffff);
	        }
	        break;
  case SETPATTN:{		//Change robot picture
#ifndef BORING
	         char far *ptr=(char far *)MK_FP(bx1,cx1);
	         draw_robot(ptr);
#endif
	        }
	        break;
  case DEBGFLAG:{		//Debug flag display
#ifndef BORING
	         setcolor((cx1)?ThisRobot->RobotColour:BLACK);
	         outtextxy(570+(bx1&1)*10,NextTask*15+1,"#");
#endif
	        }
	        break;
  case BUYARMOR:{
	         buy_armour(bx1);
	        }
	        break;
  case BUYSHELS:{
	         buy_shells(bx1);
	        }
	        break;
  case SHELSLFT:bx1=ThisRobot->shells_left;
                break;
  case GETLOCMP:get_local_map(MK_FP(bx1,cx1));
	        break;
  case INVISIBL:{
	         if (ThisRobot->invisibility)
	         {
	          if ((bx1)&&(!ThisRobot->invisible))
	          {
	           if (ThisRobot->invis_ctr>0)
		   bx1=FALSE;
	          }
	          ThisRobot->invisible=bx1;
#ifndef BORING
	          setcolor((bx1)?ThisRobot->RobotColour:BLACK);
	          outtextxy(590,NextTask*15+1,"I");
#endif
	         }
	        }
	        break;
  case GTSHLSTT:bx1=ThisRobot->last_shell_state;
                break;
  case ISINVISB:bx1=ThisRobot->invisible;
	        break;
  case L_ATAN2 :{
	         if ((bx1==0)&&(cx1==0))
	          ax1=0;
	         else
	          ax1=atan2((int)bx1,(int)cx1)*180/PI;
	        }
	        break;
  case GETROBID: //Get_Robot_Id
                ax1=NextTask;
                break;
  case REGIFF  :{ //Register_IFF_String
                 if (ThisRobot->IFF_String==NULL)
                 {
                  ThisRobot->IFF_String=_fstrdup((char *)MK_FP(bx1,cx1));
                 }
                }
                break;
  case CHECKIFF:{ //Check_IFF
                 if (ThisRobot->IFF_String==NULL)
                  ax1=0;
                 else
                 {
                  if (bx1>=NumRobots)
                   ax1=0;
                  else
                  {
                   RobotState &RobotPtr=Robot[bx1];
                   if (RobotPtr.Dead)
                    ax1=0;
                   else
                   {
                    if (strcmp(ThisRobot->IFF_String,RobotPtr.IFF_String)==0)
                     ax1=1;
                    else
                     ax1=0;
                   }
                  }
                 }
                }
                break;
  case REGNAME :{ //Register_Name_String
                 if (ThisRobot->NameString==NULL)
                 {
                  ThisRobot->NameString=_fstrdup((char *)MK_FP(bx1,cx1));
                 }
                }
                break;
  case FINDNAME:{ //Find_Name
                 char far *Ptr=(char far *)MK_FP(bx1,cx1);
                 if (Ptr==NULL)
                  ax1=-1;
                 else
                 {
                  int found=-1;
                  for (int i=dx1;i<NumRobots;i++)
                  {
                   if (i==NextTask)
                    continue;
                   RobotState &RobotPtr=Robot[i];
                   if (RobotPtr.NameString==NULL)
                    continue;
                   if (strcmp(Ptr,RobotPtr.NameString)==0)
                   {
                    found=i;
                    break;
                   }
                  }
                  ax1=found;
                 }
                }
                break;
  case GETTMID :   //Get My team ID
                ax1=ThisRobot->Team;
	        break;
  case GTASHLST:   //Get specified shell state
                ax1=get_shell_state(bx1);
	        break;
  case REG_X   :{		//Register_x_var
	         dword temp=((dword)bx1<<4)|cx1;
	         dword temp2=((dword)ThisRobot->segment)<<4;
	         if ((temp<temp2)||(temp>temp2+(65536L-sizeof(*(ThisRobot->xVar)))))
	         {
	          ax1=0;
	         }
	         else
	         {
	          ThisRobot->xVar=(int far *)MK_FP(bx1,cx1);
	          ax1=1;
	         }
	        }
	        break;
  case REG_Y   :{		//Register_y_var
	         dword temp=((dword)bx1<<4)|cx1;
	         dword temp2=((dword)ThisRobot->segment)<<4;
	         if ((temp<temp2)||(temp>temp2+(65536L-sizeof(*(ThisRobot->yVar)))))
	         {
	          ax1=0;
	         }
	         else
	         {
	          ThisRobot->yVar=(int far *)MK_FP(bx1,cx1);
	          ax1=1;
	         }
	        }
	        break;
  case REG_DATA:{
	         dword temp=((dword)bx1<<4)|cx1;
	         dword temp2=((dword)ThisRobot->segment)<<4;
	         if ((temp<temp2)||(temp>temp2+(65536L-sizeof(*(ThisRobot->DataVar)))))
	         {
	          ax1=0;
	         }
	         else
	         {
	          ThisRobot->DataVar=(DataStruct far *)MK_FP(bx1,cx1);
	          ax1=1;
	         }
                }
                break;
  case FILTCOMM:ax1=FilterComms(ax1,bx1);
                break;
  case TXBLOCK :{   //Transmit a block of data
	         dword temp=((dword)bx1<<4)|cx1;
	         dword temp2=((dword)ThisRobot->segment)<<4;
	         if ((temp<temp2)||(temp>temp2+(65536L-dx1)))
	         {
	          ax1=0;
	         }
                 else
                 {
                  ax1=TransmitBlock(si1,(char *)MK_FP(bx1,cx1),dx1);
                 }
                }
                Swap=TRUE;
                break;
  case RXBLOCK :{   //Receive a block of data
	         dword temp=((dword)bx1<<4)|cx1;
	         dword temp2=((dword)ThisRobot->segment)<<4;
	         if ((temp<temp2)||(temp>temp2+(65536L-dx1)))
	         {
	          ax1=0;
	         }
                 else
                 {
                  ax1=ReceiveBlock(si1,(char *)MK_FP(bx1,cx1),dx1);
                 }
                }
                break;
  case DISCBLCK:DiscardBlock(bx1);
                break;
  case TXBLKFRE:ax1=TransmitFree();
                break;
  case RXBLKINF:ax1=ReceiveInfo(bx1,bx1,cx1);
                break;
  case PICKOBST://ax1=PickupObstacle(bx1);
                ax1=ThisRobot->PickupObstacle(bx1);
                break;
  case DROPOBST://ax1=DropObstacle(NextTask,bx1);
                ax1=ThisRobot->DropObstacle(bx1);
                break;
  case OBSTATE :ax1=ThisRobot->ObstacleStatus();
                break;
  case HOLDOBST:ax1=ThisRobot->HoldObstacle(bx1);
//       ax1=HoldObstacle(NextTask,bx1);
                break;
  case CONFIG  :{		//configure robot
	         if (Ticks==0)
	         {
	          ax1=(MajorVERS<<8)|(MinorVERS);
                  ThisRobot->ConfigureRobot(bx1,cx1);
	         }
	         else
	          ax1=0;
	        }
	        break;
 }
}

void KillRobot(TaskState *Task)
{
 Task->Dead=TRUE;
 if (Task->isA(RobotTask))
 {
  if (Task->Team>=0)
  {
   if ( (--Team[Task->Team].Survivors) ==0)
    AliveTeams--;
  }
  else
   LoneRobots--;
  alive_robots--;
 }
}
