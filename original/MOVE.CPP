/*$Header: c:/pcrobots/rcs/move.cpp 1.10 93/07/24 00:33:44 PDS_HOME Exp $*/

/* Revision Log */
/*$Log:	move.cpp $
Revision 1.10  93/07/24  00:33:44  PDS_HOME
Draw dropped obstacles after clearing up explosions
Acceleration penalty when carrying an obstacle
Stop if robot hits an obstacle
Obstacle shielding
Chance of dropping an obstacle if damaged
Drop/unhold all obstacles if a robot is killed

Revision 1.9  93/07/19  22:31:57  PDS_HOME
Use RobotColour when drawing the robots
Use ThisTask rather than Task[next_task] in certain places

Revision 1.8  93/05/09  19:14:26  PDS_HOME
Fix bug with shell status

Revision 1.7  92/11/07  00:38:44  PDS_HOME
Call KillRobot when a robot dies
Terminate correctly for team games

Revision 1.6  92/11/06  02:10:34  PDS_HOME
Change 'ticks' to 'Ticks', to use 'Ticks' from assembler module

Revision 1.5  92/11/06  01:29:32  PDS_HOME
Keep track of last 10 shell states
*/

#include "pcrobots.h"

#pragma hdrstop
#include <bios.h>

static void	SetTaskShell(RobotState &ThisRobot,word Ptr,int State);

#ifndef BORING
void	put_robot(int x,int y,void *map);

struct	{
	 int x1,y1;
	 void *image;
	} old_images[MaxShells];
int	num_images=0;

int     DroppedObjects[MaxRobots];
int     NumDroppedObjects=0;
#endif

int	draw_ctr=0;

void	move(void)
{
 int i;

 Ticks++;
#ifndef BORING
 for (i=MaxShells-1;i>=0;i--)
 {
  if (Shell[i].in_flight)
   putpixel(Shell[i].old_x,Shell[i].old_y,Shell[i].old_colour);
 }

 if (!fastmode)
 {
  for (i=num_images-1;i>=0;i--)
  {
   putimage(old_images[i].x1,old_images[i].y1,old_images[i].image,COPY_PUT);
   free(old_images[i].image);
  }
  num_images=0;
  for (int i=0;i<NumDroppedObjects;i++)
  {
   if (MAGENTA>=MaxColours)
    setfillstyle(SOLID_FILL,MaxColours-1);
   else
    setfillstyle(SOLID_FILL,MAGENTA);
   setcolor(WHITE);
   long x=Obstacle[DroppedObjects[i]].x*10l*maxx;
   long y=Obstacle[DroppedObjects[i]].y*10l*maxy;
   bar3d(int(x/1000),int(y/1000),int((x+9l*maxx)/1000),int((y+9l*maxy)/1000),0,0);
  }
  NumDroppedObjects=0;
 }
#endif

 for (i=0;i<NumRobots;i++)
 {
  ThisRobot=&Robot[i];
  if (!ThisRobot->Dead)
  {
   if (!ThisRobot->invisible)
   {
    ThisRobot->Battery+=battery_charge;
    if (ThisRobot->invis_ctr>0)
     ThisRobot->invis_ctr--;
   }
   else
   {
    if ((++ThisRobot->invis_ctr)>max_invisible_count)
    {
     ThisRobot->invisible=FALSE;
#ifndef BORING
     setcolor(BLACK);
     outtextxy(590,i*15+1,"I");
#endif
    }
   }
   ThisRobot->Battery=min(ThisRobot->Battery,(long)battery_start);

   int	iangle=ThisRobot->iangle;
   int &ispeed=ThisRobot->speed;
   ThisRobot->Battery-=ispeed;
   if (ThisRobot->Battery<0)
   {
    ThisRobot->target_speed=0;
    ispeed=0;
   }
#ifndef BORING
/* Draw Battery charge line */
   setcolor(BLACK);
   line (500,i*15+13,600,i*15+13);
   setcolor(ThisRobot->RobotColour);
   line (500,i*15+13,500+min(100,(int)(ThisRobot->Battery/(battery_realunit*20))),i*15+13);
#endif
   int	speed_diff=ThisRobot->target_speed-ispeed;
   if (speed_diff)
   {
    int  accel=ThisRobot->acceleration>>ThisRobot->ObstacleState;
    if ((speed_diff<0)&&(speed_diff<-accel))
     speed_diff=-accel;
    if ((speed_diff>0)&&(speed_diff>accel))
     speed_diff=accel;
    ispeed+=speed_diff;
   }
   long old_x=ThisRobot->curr_x;
   long old_y=ThisRobot->curr_y;
   ThisRobot->curr_x+=(cost[iangle]*ispeed)/trig_scale;
   ThisRobot->curr_y+=(sint[iangle]*ispeed)/trig_scale;

   int x_square=int(ThisRobot->curr_x/1000);
   int y_square=int(ThisRobot->curr_y/1000);

   if ((x_square>=100)||(y_square>=100)||(ThisRobot->curr_x<0)||
	(ThisRobot->curr_y<0))
   {
    ispeed=0;
    ThisRobot->target_speed=0;
    damage(i,collision_damage,COLLISION);
    ThisRobot->curr_x=old_x;
    ThisRobot->curr_y=old_y;
   }
   else
   {
    switch(arena[y_square][x_square])
    {
     case ARENA_WALL:
     case ARENA_OBSTACLE:ispeed=0;
                         ThisRobot->target_speed=0;
                         damage(i,collision_damage,COLLISION);
                         ThisRobot->curr_x=old_x;
                         ThisRobot->curr_y=old_y;
                         break;
     case ARENA_FREE:ThisRobot->transported=FALSE;
		     ThisRobot->slowed=FALSE;
		     ThisRobot->recharging=FALSE;
		     break;
     case ARENA_DAMAGE:damage(i,collision_damage,ARENADAMAGE);
		     break;
     case ARENA_SLOW:if (!ThisRobot->slowed)
		      ispeed/=2;
		     ThisRobot->slowed=TRUE;
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
			if (ispeed==0)
			{
			 int refuel_no=arena[y_square][x_square]-ARENA_REFUEL;
			 refueler[refuel_no].occupied=TRUE;
			 int new_charge=min(10,refueler[refuel_no].charge);
			 ThisRobot->Battery+=new_charge*battery_realunit;

			 ThisRobot->Battery=min((const long)ThisRobot->Battery,battery_start);

			 refueler[refuel_no].charge-=new_charge;
			 ThisRobot->recharging=TRUE;
			}
			break;
    }
   }
#ifndef BORING
   if (draw_ctr==0)
   {
    int x=int((ThisRobot->curr_x*maxx)/100000l);
    int y=int((ThisRobot->curr_y*maxy)/100000l);
    int &old_x=ThisRobot->old_x,
	&old_y=ThisRobot->old_y;
    if ((old_x!=x-2)||(old_y!=y-2))
    {
     if (old_x>=0)
      put_robot(old_x,old_y,ThisRobot->robot);
     old_x=x-2;
     old_y=y-2;
     put_robot(old_x,old_y,ThisRobot->robot);
    }
   }
#endif
  }
 }
 draw_ctr=(draw_ctr==0)?5:draw_ctr-1;

 for (i=0;i<MaxShells;i++)
 {
  if (Shell[i].in_flight)
  {
   int iangle=Shell[i].iangle;
   long x=Shell[i].curr_x+=(cost[iangle]*400l)/trig_scale;
   long y=Shell[i].curr_y+=(sint[iangle]*400l)/trig_scale;
   Shell[i].range-=4;
//   putpixel(Shell[i].old_x,Shell[i].old_y,Shell[i].old_colour);
   int x_square=int(x/1000);
   int y_square=int(y/1000);

   if ((arena[y_square][x_square]==ARENA_WALL)||(Shell[i].range<=0)||
       (arena[y_square][x_square]==ARENA_OBSTACLE)||
       (x_square>=100)||(y_square>=100)||(x<0)||(y<0))
   {
    Shell[i].in_flight=0;
    int firer=Shell[i].firer;

    RobotState &FirerRobot=Robot[firer];
    FirerRobot.shells--;
    if (Shell[i].range<=0)
    {
#ifndef BORING
     if (!fastmode)
     {
      int xblast=int((x*maxx)/100000l);
      int yblast=int((y*maxy)/100000l);

      int xsize=maxx/(1000/100)+3;
      int ysize=maxy/(1000/100)+3;

      void *temp_image=malloc(imagesize(0,0,xsize,ysize));

      int x1=int(((x-5000)*maxx)/100000l)-1;
      int y1=int(((y-5000)*maxy)/100000l)-1;
      int x2=int(((x+5000)*maxx)/100000l)+1;
      int y2=int(((y+5000)*maxy)/100000l)+1;

      if (x1<0) x1=0;
      if (y1<0) y1=0;
 //     if (x2>=maxx) x2=maxx-1;
 //     if (y2>=maxy) y2=maxy-1;

      getimage(x1,y1,x2,y2,temp_image);

      old_images[num_images].x1=x1;
      old_images[num_images].y1=y1;
      old_images[num_images++].image=temp_image;

      setcolor(RED);
      setfillstyle(SOLID_FILL,RED);
      fillellipse(xblast,yblast,int((maxx)/(1000/50)),int((maxy)/(1000/50)));
      setcolor(YELLOW);
      setfillstyle(SOLID_FILL,YELLOW);
      fillellipse(xblast,yblast,int((maxx)/(1000/25)),int((maxy)/(1000/25)));
      setcolor(WHITE);
      setfillstyle(SOLID_FILL,WHITE);
      fillellipse(xblast,yblast,int((maxx)/(1000/5)),int((maxy)/(1000/5)));
     }
#endif

//     _fpreset();
     int ShellState=SHELL_MISSED;
     for (int j=0;j<NumRobots;j++)
     {
      RobotState &RPtr=Robot[j];
      if (!RPtr.Dead)
      {
       int Multiplier=1;
// 25% chance of a carried obstacle catching the shot
       if (RPtr.ObstacleState==CARRYING)
       {
        if (random(4)==0)
         Multiplier=0;
       }

       long xdiff=RPtr.curr_x-x;
       long ydiff=RPtr.curr_y-y;
       float dist=sqrt(float(xdiff)*xdiff+float(ydiff)*ydiff);
       if (dist<5000)
       {
	if (dist<2500)
	{
	 if (dist<500)
	 {
	  FirerRobot.Battery+=damage(j,25*Multiplier,firer);
	  if (!fastmode)
	   sound_direct_hit();
          if (ShellState<SHELL_DIRECT_HIT)
           ShellState=SHELL_DIRECT_HIT;
	 }
	 else
	 {
	  FirerRobot.Battery+=damage(j,8*Multiplier,firer);
          if (ShellState<SHELL_NEAR_MISS)
           ShellState=SHELL_NEAR_MISS;
	 }
	}
	else
	{
	 FirerRobot.Battery+=damage(j,2*Multiplier,firer);
         if (ShellState<SHELL_CLOSE_BLAST)
          ShellState=SHELL_CLOSE_BLAST;
	}
       }
      }
     }
     SetTaskShell(FirerRobot,Shell[i].Ptr,ShellState);
     FirerRobot.last_shell_state=ShellState;
    }
    else
    {
     SetTaskShell(FirerRobot,Shell[i].Ptr,SHELL_HIT_WALL);
     FirerRobot.last_shell_state=SHELL_HIT_WALL;
    }
   }
   else
   {
#ifndef BORING
    Shell[i].old_x=int(x)=int((x*maxx)/100000l);
    Shell[i].old_y=int(y)=int((y*maxy)/100000l);
#endif
   }
  }
 }
#ifndef BORING
 for (i=0;i<MaxShells;i++)
 {
  if (Shell[i].in_flight)
  {
   Shell[i].old_colour=getpixel(Shell[i].old_x,Shell[i].old_y);
   putpixel(Shell[i].old_x,Shell[i].old_y,15);
  }
 }
#endif
 int ch=0;
 if (bioskey(1)>0)
 {
  if ((ch=getch())==27)
   close_down(TRUE);
 }

 if (slowmode)
 {
  if (singlestep)
  {
   do
   {
    ch=getch();
    if (ch==27)
     close_down(TRUE);
    if (ch==' ')
     singlestep=!singlestep;
   }
   while (singlestep&&(ch!=13));
  }
  else
  {
   delay(delaytime);
   if ((ch>='0')&&(ch<='9'))
    delaytime=(ch-'0')*25;
   if (ch==' ')
    singlestep=!singlestep;
  }
 }

 if (!debug_mode)
 {
  if (alive_robots<=1)
   close_down(FALSE);
  if ((NumTeams>0)&&(AliveTeams<=1)&&(LoneRobots==0))
   close_down(FALSE);
 }

 if ((time_limit)&&(time_limit<=Ticks))
  close_down(FALSE);

 for (i=0;i<refuel_points;i++)
 {
  if (!refueler[i].occupied)
  {
   refueler[i].charge+=5;
   refueler[i].charge=min(max_refuel_charge,refueler[i].charge);
  }
  else
   refueler[i].occupied=FALSE;
 }
}

long	damage(int TaskNo,int damage,int Cause)
{
 RobotState &RPtr=Robot[TaskNo];

 if (RPtr.ObstacleState==CARRYING)
 {
  int No;
  int x=random(30);
  if (x<damage)
  {
   if (DropObstacle(TaskNo,random(8),&No))
    DroppedObjects[NumDroppedObjects++]=No;
  }
 }

 if (RPtr.ObstacleState==HOLDING)
 {
  int x=random(300);
  if (x<damage)
   HoldObstacle(TaskNo,FALSE);
 }

 RPtr.armour-=damage;
 if (RPtr.armour<0)
  RPtr.armour=0;

#ifndef BORING
 setcolor(BLACK);
 line (500,TaskNo*15+11,600,TaskNo*15+11);
 setcolor(RPtr.RobotColour);
 line (500,TaskNo*15+11,500+RPtr.armour/2,TaskNo*15+11);
#endif
 if ((RPtr.armour<=0)&&(!RPtr.Dead))
 {
  RPtr.CauseOfDeath=Cause;

// If a robot is killed, try to drop any obstacle it's carrying
  int Try=0;
  while ((RPtr.ObstacleState==CARRYING)&&(Try<10))
  {
   int No;
   if (DropObstacle(TaskNo,random(8),&No))
    DroppedObjects[NumDroppedObjects++]=No;
   Try++;
  }
// If a robot is killed, Release any obstacles it's carrying
  if (RPtr.ObstacleState==HOLDING)
   HoldObstacle(TaskNo,FALSE);

  KillRobot(&Robot[TaskNo]);

//Team scoring
  if (Cause<MaxRobots)
  {
   int ThisTeam;
   if ((ThisTeam=Robot[Cause].Team)>=0)
   {
    Team[ThisTeam].Kills++;
    if (Robot[TaskNo].Team==ThisTeam)
     Team[ThisTeam].Score+=HomeKillScore;
    else
     Team[ThisTeam].Score+=KillScore;
   }
  }

#ifndef BORING
  if (!fastmode)
   sound_explosion();
#endif
  return RPtr.Battery;
 }

 return 0;
}

void	SetTaskShell(RobotState &ThisRobot,word Ptr,int State)
{
 ThisRobot.ShellStates[Ptr]=State;
 ThisRobot.last_shell_state=State;
}

#ifndef BORING
void	put_robot(int x,int y,void *map)
{
 putimage(x,y,map,XOR_PUT);
}

void	draw_robot(char far *ptr)
{
 int y=NextTask*15+1;
 for (int i=0;i<5;i++)
 {
  unsigned char ch=(*(ptr++))<<3;
  for (int j=0;j<5;j++)
  {
   if (ch&128)
    putpixel(485+j,y,ThisRobot->RobotColour);
   else
    putpixel(485+j,y,0);
   ch<<=1;
  }
  y++;
 }
 y=NextTask*15+1;
 int &old_x=ThisRobot->old_x,
     &old_y=ThisRobot->old_y;
 if (old_x>=0)
  put_robot(old_x,old_y,ThisRobot->robot);
 getimage(485,y,489,y+4,ThisRobot->robot);
 if (old_x>=0)
  put_robot(old_x,old_y,ThisRobot->robot);
}
#endif
