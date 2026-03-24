/*$Header: c:/pcrobots/rcs/api.cpp 1.8 93/07/24 14:35:04 PDS_HOME Exp $*/

/*$Log:	api.cpp $
Revision 1.8  93/07/24  14:35:04  PDS_HOME
Add Comms Filter
Add Obstacle Handling routines
Add Block Transfer comms routines

Revision 1.7  93/07/19  22:27:58  PDS_HOME
Store the robot colour in the task information structure, to allow
two colour displays, and to prevent black on black

Revision 1.6  92/11/06  22:09:05  PDS_HOME
Add 'get_shell_state' function to perform 'get_ashell_state' robot
API interface.

Modify 'shoot' to return the fired shell's Id value.

Revision 1.5  92/11/06  02:10:05  PDS_HOME
Change 'ticks' to 'Ticks' (to use Ticks in assembler module)

Revision 1.4  92/11/06  01:26:23  PDS_HOME
Support the recording of the last 10 shell states
*/

#include "pcrobots.h"

struct  {
         int x,
             y;
        }
        ObstacleDirection[8]={{1,0},{1,1},{0,1},{-1,1},
                              {-1,0},{-1,-1},{0,-1},{1,-1}};



void	RobotState::ConfigureRobot(WORD bx,WORD cx)
{
 const	word	MaxSpeedTable[5]={50,75,100,150,200},
		ManSpeedTable[5]={20,35,50,75,100},
		MaxRangeTable[5]={300,500,700,1000,1500},
		ArmourTable  [5]={50,75,100,150,200},
		AccelTable   [5]={5,6,10,15,20};

 word	ConfigSpeed    =(bx&0x0007),
	ConfigManouevre=(bx&0x0070)>>4,
	ConfigRange    =(bx&0x0700)>>8,
	ConfigMaxArmour=(bx&0x7000)>>12,
	ConfigAccelerat=(cx&0x0007),
	ConfigInvisibility=(cx&0x0008)>>3;

 word	points=10;

 ConfigSpeed=min(ConfigSpeed,(WORD)4);
 max_speed=MaxSpeedTable[ConfigSpeed];
 points-=ConfigSpeed;

 ConfigManouevre=min(ConfigManouevre,(WORD)4);
 manouevre_speed=int(long(max_speed)*ManSpeedTable[ConfigManouevre]/100);
 points-=ConfigManouevre;

 ConfigRange=min(min(ConfigRange,(WORD)4),points);
 max_range=MaxRangeTable[ConfigRange];
 points-=ConfigRange;

 ConfigMaxArmour=min(min(ConfigMaxArmour,(WORD)4),points);
 armour=ArmourTable[ConfigMaxArmour];
 max_armour=armour;
 points-=ConfigMaxArmour;

#ifndef BORING
 setcolor(BLACK);
 line (500,ID*15+11,600,ID*15+11);
 setcolor(RobotColour);
 line (500,ID*15+11,500+armour/2,ID*15+11);
#endif

 ConfigAccelerat=min(min(ConfigAccelerat,(WORD)4),points);
 acceleration=AccelTable[ConfigAccelerat];
 points-=ConfigAccelerat;

 int num_shells=10;

 if (ConfigInvisibility)
 {
  invisibility=1;
  num_shells--;
 }

 shells_left=num_shells*100;

}

int     RobotState::PickupObstacle(int Direction)
{
 if (ObstacleState==CARRYING)
  return 0;
// If we're currently holding obstacles, drop them before picking up one of them
 if (ObstacleState==HOLDING)
  HoldObstacle(NextTask,FALSE);

 Direction%=8;
 int x_square=int(curr_x/1000);
 int y_square=int(curr_y/1000);

 x_square+=ObstacleDirection[Direction].x;
 y_square+=ObstacleDirection[Direction].y;

 if ((x_square<0)||(x_square>=100)||(y_square<0)||(y_square>=100))
  return 0;

 if (arena[y_square][x_square]!=ARENA_OBSTACLE)
  return 0;

 for (int i=0;i<NumObstacles;i++)
 {
  if (Obstacle[i].State==NONE)
  {
   if ((Obstacle[i].x==x_square)&&(Obstacle[i].y==y_square))
   {
    Obstacle[i].State=CARRYING;
    ObstacleState=CARRYING;
    ObstacleNumber=i;
    speed/=2;
    target_speed/=2;
    arena[y_square][x_square]=ARENA_FREE;
#ifndef BORING
    setfillstyle(SOLID_FILL,BLACK);
    long x=x_square*10l*maxx;
    long y=y_square*10l*maxy;
    bar(int(x/1000),int(y/1000),int((x+9l*maxx)/1000),int((y+9l*maxy)/1000));
#endif
    return 1;
   }
  }
 }
 return 0;
}

int     RobotState::DropObstacle(/*int TaskNo,*/int Direction,int *ObstacleNo)
{
 if (ObstacleState!=CARRYING)
  return 0;

 Direction%=8;
 int x_square=int(ThisRobot.curr_x/1000);
 int y_square=int(ThisRobot.curr_y/1000);

 x_square+=ObstacleDirection[Direction].x;
 y_square+=ObstacleDirection[Direction].y;

 if ((x_square<0)||(x_square>=100)||(y_square<0)||(y_square>=100))
  return 0;

 if (arena[y_square][x_square]!=ARENA_FREE)
  return 0;

 int i=ObstacleNumber;
 if (ObstacleNo!=NULL)
  *ObstacleNo=i;
 Obstacle[i].State=NONE;
 Obstacle[i].x=x_square;
 Obstacle[i].y=y_square;
 ObstacleState=NONE;
 arena[y_square][x_square]=ARENA_OBSTACLE;
#ifndef BORING
 if (MAGENTA>=MaxColours)
  setfillstyle(SOLID_FILL,MaxColours-1);
 else
  setfillstyle(SOLID_FILL,MAGENTA);
 setcolor(WHITE);
 long x=x_square*10l*maxx;
 long y=y_square*10l*maxy;
 bar3d(int(x/1000),int(y/1000),int((x+9l*maxx)/1000),int((y+9l*maxy)/1000),0,0);
#endif
 return 1;
}

int     RobotState::HoldObstacle(/*int TaskNo,*/BOOL Flag)
{
// RobotState &ThisRobot=Robot[TaskNo];
 if (ObstacleState==CARRYING)
  return 0;

 if ((!Flag)&&(ObstacleState!=HOLDING))
  return 0;

 int x_square=int(curr_x/1000);
 int y_square=int(curr_y/1000);

 int ObstacleCount=0;
 for (int i=0;i<NumObstacles;i++)
 {
  if (Obstacle[i].State==HOLDING)
  {
   if (Obstacle[i].HoldRobot==TaskNo)
   {
    if (Flag)
     ObstacleCount++;
    else
     Obstacle[i].State=NONE;
   }
   continue;
  }

  if ((Obstacle[i].State==NONE)&&(Flag))
  {
   int x1=abs(Obstacle[i].x-x_square),
       y1=abs(Obstacle[i].y-y_square);
   if ((x1<=1)&&(y1<=1))
   {
    Obstacle[i].State=HOLDING;
    Obstacle[i].HoldRobot=TaskNo;
    ObstacleCount++;
   }
  }
 }
 if (ObstacleCount)
 {
  ObstacleState=HOLDING;
  speed=0;
  target_speed=0;
 }
 else
  ObstacleState=NONE;
 return ObstacleCount;
}

void	buy_shells(RobotState *ThisRobot,word number_shells)
{
 if (!ThisRobot->recharging)
 {
  dword	price=number_shells*cost_per_shell;

  if (price>ThisRobot->Battery)
  {
   number_shells=word(ThisRobot->Battery/cost_per_shell);
   price=number_shells*cost_per_shell;
  }
  ThisRobot->shells_left+=number_shells;
  ThisRobot->Battery-=price;
 }
}

void	buy_armour(RobotState *ThisRobot,int number_units)
{
 if (!ThisRobot->recharging)
 {
  long	price=number_units*cost_per_armour_unit;

  if (price>ThisRobot->Battery)
  {
   number_units=int(ThisRobot->Battery/cost_per_armour_unit);
   price=number_units*cost_per_armour_unit;
  }
  long temp_armour=ThisRobot->armour+=number_units;
  if (temp_armour>ThisRobot->max_armour)
   temp_armour=ThisRobot->max_armour;

  damage(NextTask,ThisRobot->armour-int(temp_armour),SUICIDE);

  ThisRobot->Battery-=price;
 }
}

int	cannon(RobotState *ThisRobot,word angle,word range)
{
 angle%=360;
 if (range>ThisRobot->max_range)
  range=ThisRobot->max_range;
 if (ThisRobot->shells>=shells_per_robot)
  return 0;
 if ((ThisRobot->shells_left==0)||(ThisRobot->invisible))
  return 0;
 if (ThisRobot->last_fire+reload_time>Ticks)
  return 0;
 for (int i=0;i<MaxShells;i++)
 {
  if (!Shell[i].in_flight)
  {
   Shell[i].curr_x=ThisRobot->curr_x;
   Shell[i].curr_y=ThisRobot->curr_y;
#ifndef BORING
   Shell[i].old_x=int((Shell[i].curr_x*maxx)/100000l);
   Shell[i].old_y=int((Shell[i].curr_y*maxy)/100000l);
   Shell[i].old_colour=getpixel(Shell[i].old_x,Shell[i].old_y);
#endif
   Shell[i].firer=NextTask;
   Shell[i].iangle=angle;
   Shell[i].in_flight=1;
   Shell[i].range=range;
   ThisRobot->shells++;
   ThisRobot->last_fire=Ticks;
   ThisRobot->shells_left--;
   Shell[i].Ptr=ThisRobot->ShellPtr;
   ThisRobot->LastShells[ThisRobot->ShellPtr]=ThisRobot->ShellCtr;
   ThisRobot->ShellStates[ThisRobot->ShellPtr]=SHELL_IN_FLIGHT;
   ThisRobot->ShellPtr++;
   if (ThisRobot->ShellPtr==10)
    ThisRobot->ShellPtr=0;

   break;
  }
 }
 return ThisRobot->ShellCtr++;
 
}

int	scan(RobotState *ThisRobot,word angle,word res,word &ret_range)
{
 if (ThisRobot->invisible)
  return -1;

 angle%=360;
 if (res>max_resolution)
  res=max_resolution;
 int	min_angle=angle-res;
 int	max_angle=angle+res;

 long    nearest_dist=1000000l;
 int nearest_thing=-1;

 long	ithis_x=ThisRobot->curr_x,
	ithis_y=ThisRobot->curr_y;

// _fpreset();
 for (int i=0;i<NumRobots;i++)
 {
  RobotState &RPtr=Robot[i];
  if (i==NextTask)
   continue;
  if (RPtr.invisible)
   continue;
  if ((CARCASSES==0)&&(RPtr.Dead))
   continue;
  long xdiff=RPtr.curr_x-ithis_x;
  long ydiff=RPtr.curr_y-ithis_y;
  float	this_angle;
  if ((xdiff==0)&&(ydiff==0))
  {
   this_angle=0;
  }
  else
  {
   this_angle=atan2(ydiff,xdiff)*180/3.14159265;
   if (this_angle<0)
    this_angle+=360;
  }
  if (((this_angle>min_angle)&&(this_angle<max_angle))||
	((this_angle>min_angle+360)&&(this_angle<max_angle+360)))
  {
   float range=sqrt(float(xdiff)*xdiff+float(ydiff)*ydiff);
   if (range<=nearest_dist)
   {
    nearest_thing=i;
    nearest_dist=range;
   }
  }

 }
 ret_range=int(nearest_dist/100l);
 return nearest_thing;

}

void	get_local_map(RobotState *ThisRobot,void far *map_store1)
{
 get_remote_map(map_store1,(int)(ThisRobot->curr_x/1000),(int)(ThisRobot->curr_y/1000));
}

void    get_remote_map(void far *map_store1,int x,int y)
{
 char far *map_store=(char far *)map_store1;

 x-=4;
 y-=4;

 for (int i=0;i<9;i++)
 {
  for (int j=0;j<9;j++)
  {
   if ((x<0)||(y<0)||(x>=100)||(y>=100))
    *(map_store++)=1;
   else
    *(map_store++)=report(arena[y][x]);
   x++;
  }
  y++;
  x-=9;
 }
}

int	get_shell_state(RobotState *ThisRobot,word shell_id)
{
 if (shell_id==0)
  return SHELL_NOT_KNOWN;
 for (int i=0;i<10;i++)
 {
  if (ThisRobot->LastShells[i]==shell_id)
  {
   return ThisRobot->ShellStates[i];
  }
 }
 return SHELL_NOT_KNOWN;
}

int	Transmit(WORD Target,WORD Data)
{
 TaskState *TargetTask;
 if (ThisTask->isA(RobotTask))
 {
  if (Target==HQ_ID)
   TargetTask=((RobotState *)ThisTask)->HQ;
  else
  {
   if (Target>=NumRobots)
    return 1;
   TargetTask=&Robot[Target];
  }
 }
 else
 {
  if (Target>=HQ_ID)
  {
   if (Target-HQ_ID>=NumTeams)
    return 1;
   TargetTask=Team[Target-HQ_ID].HQ;
  }
  else
  {
   if (Target>=((HQState *)ThisTask)->NumRobots)
    return 1;
   TargetTask=((HQState *)ThisTask)->Robot[Target];
  }
 }
 if (TargetTask==NULL)
  return 1;
 if (TargetTask->Dead)
  return 1;
 if (TargetTask->RX_Size>=TargetTask->MaxRX_Size)
  return 0;

 if (!TargetTask->Filter[NextTask])
 {
  TargetTask->RX_Data[TargetTask->RX_Size]=Data;
  int Sender;
  Sender=(NextTask<MaxRobots)?NextTask:NextTask-MaxRobots+HQ_ID;
  TargetTask->RX_Sender[TargetTask->RX_Size++]=Sender;
 }
 if (ThisTask->isA(RobotTask))
  ((RobotState *)ThisTask)->Battery--;
 return 1;
}

int	receive(word &source,word &data)
{
 if (ThisTask->RX_Size==0)
  return 0;
 source=ThisTask->RX_Sender[0];
 if (source>=HQ_ID)
 {
  if (ThisTask->isA(RobotTask))
   source=HQ_ID;
  else
   source=HQ[source-HQ_ID].ID+HQ_ID;
 }
 data=ThisTask->RX_Data[0];
 memmove(ThisTask->RX_Sender,ThisTask->RX_Sender+1,
                sizeof(ThisTask->RX_Sender[0])*(ThisTask->MaxRX_Size-1));
 memmove(ThisTask->RX_Data,ThisTask->RX_Data+1,
                sizeof(ThisTask->RX_Data[0])*(ThisTask->MaxRX_Size-1));
 ThisTask->RX_Size--;
 return 1;
}

int     FilterComms(int RobotId,BOOL Flag)
{
 if (RobotId==-1)
 {
  if (ThisTask->isA(RobotTask))
  {
   for (int i=0;i<MaxRobots;i++)
    ThisTask->Filter[i]=Flag;
  }
  else
  {
   for (int i=0;i<MaxTeams;i++)
    ThisTask->Filter[i+MaxRobots]=Flag;
  }
 }
 else
 {
  if (ThisTask->isA(RobotTask))
  { //Robots can only filter out other robots
   if ((RobotId<MaxRobots)&&(RobotId>=0))
    ThisTask->Filter[RobotId]=Flag;
   else
    return 0;
  }
  else
  { //HQs can only filter out other HQs
   if ((RobotId>=HQ_ID)&&(RobotId<MaxTeams))
   {
    int FilterNo=RobotId-HQ_ID+MaxRobots;
    if (Team[FilterNo].HQ==NULL)
     return 1;
    FilterNo=(Team[FilterNo].HQ)->ID;
    ThisTask->Filter[FilterNo]=Flag;
   }
   else
    return 0;
  }
 }
 return 1;
}

int     TransmitBlock(WORD Target,char *DataPtr,WORD Length)
{
// Is there enough free space in the transmit area
 if ((Length==0)||(Length>MaxBlockTX))
  return 0;
 TaskState *TargetTask;
 if (ThisTask->isA(RobotTask))
 {
  if (Target==HQ_ID)
   TargetTask=((RobotState *)ThisTask)->HQ;
  else
  {
   if (Target>=NumRobots)
    return 0;
   TargetTask=&Robot[Target];
  }
 }
 else
 {
  if (Target>=HQ_ID)
  {
   if (Target-HQ_ID>=NumTeams)
    return 0;
   TargetTask=Team[Target-HQ_ID].HQ;
  }
  else
  {
   if (Target>=((HQState *)ThisTask)->NumRobots)
    return 0;
   TargetTask=((HQState *)ThisTask)->Robot[Target];
  }
 }
 if (TargetTask==NULL)
  return 0;

 TXBlockStruct *Ptr=ThisTask->TXFree;
 TXBlockStruct *PrevPtr=NULL;
 TXBlockStruct *BestFreeBlock=NULL;
 TXBlockStruct *BestPrevPtr=NULL;
 WORD BestLength=65535U;
 while (Ptr!=NULL)
 {
  if ((Ptr->Length>=Length)&&(Ptr->Length<BestLength))
  {
   BestLength=Ptr->Length;
   BestFreeBlock=Ptr;
   BestPrevPtr=PrevPtr;
  }
  PrevPtr=Ptr;
  Ptr=Ptr->NextBlock;
 }
 if (BestFreeBlock==NULL)
  return 0;

// Remove the used block from the free list
 if (BestPrevPtr==NULL)
  ThisTask->TXFree=BestFreeBlock->NextBlock;
 else
  BestPrevPtr->NextBlock=BestFreeBlock->NextBlock;

// If the used block is too big, then split it, and add the spare to the
// free list
 if (BestFreeBlock->Length>(Length+sizeof(TXBlockStruct)))
 {
  TXBlockStruct *NewFreeBlock=(TXBlockStruct *)(((char *)BestFreeBlock)+Length+sizeof(TXBlockStruct));
  NewFreeBlock->Length=BestFreeBlock->Length-Length-sizeof(TXBlockStruct);
  NewFreeBlock->RXTask=BLOCKFREE;
  NewFreeBlock->NextBlock=ThisTask->TXFree;
  BestFreeBlock->Length=Length;
  ThisTask->TXFree=NewFreeBlock;
 }

//Copy data to the used block
 memcpy(BestFreeBlock+1,DataPtr,Length);

 BestFreeBlock->RXTask=Target;
 int Sender;
 Sender=(NextTask<MaxRobots)?NextTask:NextTask-MaxRobots+HQ_ID;
 BestFreeBlock->TXTask=Sender;
 BestFreeBlock->NextBlock=NULL;

//If the Receiver has a filter on this robot, then lose the block
// otherwise join it to the Receiver's list
 if (!TargetTask->Filter[NextTask])
 {
  Ptr=TargetTask->RXPtr;
  if (Ptr==NULL)
   TargetTask->RXPtr=BestFreeBlock;
  else
  {
   while (Ptr->NextBlock!=NULL)
    Ptr=Ptr->NextBlock;
   Ptr->NextBlock=BestFreeBlock;
  }
 }

 return 1;
}

int     ReceiveBlock(WORD BlockNo,char *DataPtr,WORD Length)
{
 BOOL AutoErase=FALSE;
 if ((Length==0)||(Length>MaxBlockTX))
  return 0;
 TXBlockStruct *Ptr=ThisTask->RXPtr;
 if (BlockNo&0x8000)
 {
  AutoErase=TRUE;
  BlockNo&=0x7fff;
 }
 for (int i=0;(i<BlockNo)&&(Ptr!=NULL);i++)
  Ptr=Ptr->NextBlock;

 WORD ThisLength=0;
 if (Ptr==NULL)
  return 0;
 else
 {
  ThisLength=min(Length,Ptr->Length);
  memcpy(DataPtr,Ptr+1,ThisLength);
 }
 if (AutoErase)
  DiscardBlock(BlockNo);

 return ThisLength;
}

void    DiscardBlock(WORD BlockNo)
{
 TXBlockStruct *Ptr=ThisTask->RXPtr;
 TXBlockStruct *LastPtr=NULL;
 for (int i=0;(i<BlockNo)&&(Ptr!=NULL);i++)
 {
  LastPtr=Ptr;
  Ptr=Ptr->NextBlock;
 }

 if (Ptr==NULL)
  return;

// Take the discarded block out of the Receiver's list
 if (LastPtr==NULL)
 {
  ThisTask->RXPtr=Ptr->NextBlock;
 }
 else
 {
  LastPtr->NextBlock=Ptr->NextBlock;
 }

// Add the discarded block to the Transmitter's free list
 TaskState *TXTask;
 if (Ptr->TXTask>=HQ_ID)
  TXTask=&HQ[Ptr->TXTask-HQ_ID];
 else
  TXTask=&Robot[Ptr->TXTask];

// First, trace through the TXTask's free list and see if the discarded
// block can merge with a current free block.
 TXBlockStruct *FreePtr=TXTask->TXFree;

// First check for a current free block just before the discarded block
// Then check for a current free block just after the discarded block
 BOOL Merged=FALSE;
 while (FreePtr!=NULL)
 {
  char *Temp=(char *)FreePtr;
  Temp+=sizeof(*FreePtr)+FreePtr->Length;
  if (Temp==(char *)Ptr)
  {
   FreePtr->Length+=sizeof(*Ptr)+Ptr->Length;
   Ptr=FreePtr;
   Merged=TRUE;
   break;
  }
  FreePtr=FreePtr->NextBlock;
 }

 FreePtr=TXTask->TXFree;
 LastPtr=NULL;
 while (FreePtr!=NULL)
 {
  char *Temp=(char *)Ptr;
  Temp+=sizeof(*Ptr)+Ptr->Length;
  if ((char *)FreePtr==Temp)
  {
   if (Merged)
   {
    if (LastPtr==NULL)
     TXTask->TXFree=FreePtr->NextBlock;
    else
     LastPtr->NextBlock=FreePtr->NextBlock;
   }
   else
   {
    if (LastPtr==NULL)
     TXTask->TXFree=Ptr;
    else
     LastPtr->NextBlock=Ptr;
    Ptr->NextBlock=FreePtr->NextBlock;
   }

   Ptr->Length+=sizeof(*FreePtr)+FreePtr->Length;
   Merged=TRUE;
   break;
  }
  LastPtr=FreePtr;
  FreePtr=FreePtr->NextBlock;
 }

 Ptr->RXTask=BLOCKFREE;
 if (!Merged)
 {
  Ptr->NextBlock=TXTask->TXFree;
  TXTask->TXFree=Ptr;
 }
}

int     TransmitFree(void)
{
 TXBlockStruct *Ptr=ThisTask->TXFree;
 int           LargestBlock=0;

 while (Ptr!=NULL)
 {
  if (Ptr->Length>LargestBlock)
   LargestBlock=Ptr->Length;
  Ptr=Ptr->NextBlock;
 }
 return LargestBlock;
}

int     ReceiveInfo(WORD BlockNo,WORD &TXTask,WORD &Length)
{
 int    NumBlocks=0;
 TXBlockStruct *Ptr=ThisTask->RXPtr;
 TXTask=BLOCKFREE;
 Length=0;

 while (Ptr!=NULL)
 {
  if (NumBlocks==BlockNo)
  {
   TXTask =Ptr->TXTask;
   Length =Ptr->Length;
  }

  NumBlocks++;
  Ptr=Ptr->NextBlock;
 }
 if (TXTask>=HQ_ID)
 {
  if (ThisTask->isA(RobotTask))
   TXTask=HQ_ID;
  else
   TXTask=HQ[TXTask-HQ_ID].ID+HQ_ID;
 }
 return NumBlocks;
}

