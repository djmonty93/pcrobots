/*$Header$*/

/*$Log$*/

#include "pcrobots.h"

#pragma hdrstop

const   int     HQPoints[]={ 0, 3, 0, 0, 0, 0, 0, 0,
                             0,20, 0, 0, 0, 5, 0, 0,
                             0, 0,50,100,5,10,10,10};

extern  word  ax1,
              bx1,
              cx1,
              dx1,
              si1,
              Swap;


void DoHQFunction(HQState *ThisHQ)
{
 switch(ax1)
 {
  case SWAPTASK:ThisHQ->Points=0;
                Swap=TRUE;
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
	        break;
  case SCAN    :ax1=scan(bx1,cx1,bx1);
                break;
  case SHOOT   :ax1=cannon(bx1,cx1);
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
  case PICKOBST:ax1=PickupObstacle(bx1);
                break;
  case DROPOBST:ax1=DropObstacle(NextTask,bx1);
                break;
  case OBSTATE :ax1=ThisRobot->ObstacleState;
                break;
  case HOLDOBST:ax1=HoldObstacle(NextTask,bx1);
                break;
  case CONFIG  :{		//configure robot
	         if (Ticks==0)
	         {
	          ax1=(MajorVERS<<8)|(MinorVERS);
	          configure_robot(bx1,cx1);
	         }
	         else
	          ax1=0;
	        }
	        break;
 }
}

