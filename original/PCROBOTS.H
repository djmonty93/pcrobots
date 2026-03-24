/*$Header: c:/pcrobots/rcs/pcrobots.h 1.13 93/07/22 23:15:35 PDS_HOME Exp $*/

/* Revision Log */
/*$Log:	pcrobots.h $
 * Revision 1.13  93/07/22  23:15:35  PDS_HOME
 * Add function number constants
 * Add obstacle structures
 * Add datastruct for Reg_Data function
 * Add block data transmission structures and variables
 * 
 * Revision 1.12  93/07/19  22:30:10  PDS_HOME
 * Update version numbers
 * Add RobotColour to the task structure
 * Have variables to hold the maximum number of colours and whether
 * it's a Hercules monitor (the BIOS can't write text in Herc graphics
 * mode)
 * 
 * Revision 1.11  93/05/23  11:46:32  PDS_HOME
 * Just update version numbers..
 * 
 * Revision 1.10  92/11/07  00:39:17  PDS_HOME
 * Add Team.Survivors member variable
 * Add AliveTeams and LoneRobots extern variables
 * 
 * Revision 1.9  92/11/06  02:11:51  PDS_HOME
 * Change 'ticks' to 'Ticks' to use 'Ticks' from assembler module
 * 
 * Revision 1.8  92/11/06  01:31:10  PDS_HOME
 * extern variable definitions for interrupt vectors
 * 
 * Define tables for shell state records
 * 
 * Revision 1.7  92/10/29  16:08:09  ROOT_DOS
 * Teams
 * */

#include <alloc.h>
#include <conio.h>
#include <dos.h>
#include <float.h>
#ifndef BORING
#include <graphics.h>
#endif
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

typedef int      BOOL;
typedef unsigned char byte;
typedef byte     BYTE;
typedef unsigned int  word;
typedef word     WORD;
typedef unsigned long dword;
typedef dword    DWORD;

const	long trig_scale=100000L;
//const	double PI=3.14159265;

struct  RobotState;

#include "adlib.h"
#include "api.h"
#include "int21.h"

//#define VERSION "V1.43"
#define MajorVERS 1
#define MinorVERS 43

//If robot carcasses are to be picked up on scanners, set this to 1
#define	CARCASSES 0

const	FALSE=0;
const	TRUE=!FALSE;

const	ARENA_FREE=0;
const	ARENA_WALL=1;
const	ARENA_SLOW=2;
const	ARENA_DAMAGE=3;
const   ARENA_OBSTACLE=4;
const	ARENA_REFUEL=30;   	//->39

//Shell States
const	SHELL_MISSED=0;
const	SHELL_HIT_WALL=1;
const	SHELL_CLOSE_BLAST=2;
const	SHELL_NEAR_MISS=3;
const	SHELL_DIRECT_HIT=4;
const	SHELL_NOT_KNOWN=5;
const	SHELL_IN_FLIGHT=6;

//Causes of death
const   COLLISION=100;
const   SYSTEM_TIMEOUT=101;
const   ARENADAMAGE=102;
const   SYSTEM_VIOLATION=103;
const   SUICIDE=104;
const   SYSTEM_CTRLBRK=105;
const   SYSTEM_SET_E0=106;

//Scores
const   StartHomeKillScore=-500;
const   StartKillScore=100;
const   StartFalseScore=-10;

//Robot API Function Numbers
const   SWAPTASK=0x00;
const   MOVEMENT=0x01;
const   SCAN    =0x02;
const   SHOOT   =0x03;
const   GETXY   =0x10;
const   TRANSMIT=0x11;
const   RECEIVE =0x12;
const   DAMAGE  =0x13;
const   SPEED   =0x14;
const   BATTERY =0x15;
const   TICKS   =0x16;
const   L_SIN   =0x17;
const   L_COS   =0x18;
const   L_TAN   =0x19;
const   L_ATAN  =0x1A;
const   L_SQRT  =0x1B;
const   SETPATTN=0x1C;
const   DEBGFLAG=0x1D;
const   BUYARMOR=0x1E;
const   BUYSHELS=0x1F;
const   SHELSLFT=0x20;
const   GETLOCMP=0x21;
const   INVISIBL=0x22;
const   GTSHLSTT=0x23;
const   ISINVISB=0x24;
const   L_ATAN2 =0x25;
const   GETROBID=0x26;
const   REGIFF  =0x27;
const   CHECKIFF=0x28;
const   REGNAME =0x29;
const   FINDNAME=0x2A;
const   GETTMID =0x2B;
const   GTASHLST=0x2C;
const   REG_X   =0x2D;
const   REG_Y   =0x2E;
//V1.43
const   REG_DATA=0x2F;
const   FILTCOMM=0x30;
const   TXBLOCK =0x05;
const   RXBLOCK =0x32;
const   RXBLKINF=0x33;
const   DISCBLCK=0x34;
const   TXBLKFRE=0x35;
const   PICKOBST=0x36;
const   DROPOBST=0x37;
const   OBSTATE =0x38;
const   HOLDOBST=0x39;

const   CONFIG  =0x80;

//HQ API Function Numbers
//Make sure HQPoints is updated to keep track with these
const   HQSWPTSK=0x00;
const   HQTRANSM=0x01;
const   HQRECEIV=0x02;
const   HQTICKS =0x03;
const   HQL_SIN =0x04;
const   HQL_COS =0x05;
const   HQL_TAN =0x06;
const   HQL_ATAN=0x07;
const   HQL_SQRT=0x08;
const   HQGTLCMP=0x09;
const   HQLATAN2=0x0A;
const   HQGTTMID=0x0B;
const   HQFLTCOM=0x0C;
const   HQTXBLCK=0x0D;
const   HQRXBLCK=0x0E;
const   HQRXBKIN=0x0F;
const   HQDSCBLK=0x10;
const   HQTXBKFR=0x11;
const   HQGETMIS=0x12;
const   HQROBINF=0x13;
const   HQPEEK  =0x14;
const   HQSCORE =0x15;
const   HQMYXY  =0x16;
const   HQSTATUS=0x17;
const   HQCLAIM =0x18;

const	battery_realunit=10;

const	collision_damage=1;
const   BLOCKFREE=-1;
const   HQ_ID=100;

const	MaxRX=20;	//size of rx buffer
const   MaxHQRX=50;
const	max_resolution=45;
const	MaxRobots=20;
const   MaxTeams=3;
const   MaxObstacles=100;
const	shells_per_robot=7;
const	max_invisible_count=100;
const	max_refuel_charge=2000;
const	MaxShells=MaxRobots*shells_per_robot;
const	reload_time		=50;
const	long	cost_per_shell	=10*battery_realunit;
const	long	cost_per_armour_unit=50*battery_realunit;

const	long	battery_start	=1000*battery_realunit;	//starting charge of battery
const	word	battery_charge	=4*battery_realunit;	//charge per turn

typedef	char	arena_line[100];

struct	POINT
	{
	 int	x,
		y;
	};

struct  TXBlockStruct
        {
         BYTE   RXTask;
         BYTE   TXTask;
         WORD   Length;
         TXBlockStruct *NextBlock;
        };

const   TXDataBlock=1024;
const   MaxBlockTX=TXDataBlock-sizeof(TXBlockStruct);

enum    OBSTATE {NONE=0,CARRYING,HOLDING};

struct  DataStruct
        {
         word   StructLen,
                x,
                y,
                Armour,
                Speed,
                Angle,
                Invisible,
                LastShellState,
                Battery,
                ShellsLeft;
        };

const   HQTask=1;
const   RobotTask=2;

struct	TaskState
	{
         int    isA(int TestType)
                {return Type==TestType;}
	 word	ss,
		sp,
		bp,
		segment;
	 word   mem_type;
         WORD   EmsMap[8];
         WORD   FirstSegPtr;     //Pointer to First segment in 64k space
         WORD   PSP;
	 char	Name[10];
         DWORD  IntVecs[12];
	 int    Team;

	 WORD	Dead;
         int    CauseOfDeath;
         int    CauseData;

         TXBlockStruct *TXBlock;
         TXBlockStruct *RXPtr;
         TXBlockStruct *TXFree;
         BYTE   Filter[MaxRobots+MaxTeams];
	 WORD	*RX_Data;
	 BYTE	*RX_Sender;
	 BYTE   RX_Size;
         int    MaxRX_Size;
         int    ID;

        protected:
         int    Type;
        };

struct  RobotState;

struct  HQState:TaskState
        {
         HQState(void) {Type=HQTask;}

         RobotState *Robot[MaxRobots];
         int    NumRobots;
         int    PointsLeft;

        };

class   RobotState:public TaskState
        {
        public:
         RobotState(void) {Type=RobotTask;}
         void	ConfigureRobot(WORD bx,WORD cx);
         int    PickupObstacle(int Direction);
         int    DropObstacle(int Direction,int *ObstacleNo);
         int    HoldObstacle(BOOL Flag);
         int    ObstacleStatus(void) const
                {return ObstacleState;}

	 long	curr_x,
		curr_y;
	 int	iangle;
	 int	speed;
	 long	Battery;
	 int	shells;
	 word	shells_left;
	 int	armour;
	 int	max_armour;
	 dword	last_fire;
	 int	target_speed,
		max_speed,
		manouevre_speed,
		max_range,
		acceleration;
	 WORD	RX_Data[MaxRX];
	 BYTE	RX_Sender[MaxRX];
	 BYTE   RX_Size;
#ifndef BORING
	 void	*robot;
	 int	old_x,old_y;
         int    RobotColour;
#endif
	 char	invisible;
	 char	invisibility;
	 char	transported,
		slowed,
		recharging;
	 int	last_shell_state;
	 int 	invis_ctr;
//	 int 	dummy; // To get around bug in BC3.0!
         char   *IFF_String;
         char   *NameString;
         int    *xVar;
         int    *yVar;
         DataStruct *DataVar;
	 word	LastShells[10];
	 int	ShellStates[10];
	 BYTE	ShellPtr;
	 WORD	ShellCtr;
        protected:
         enum   OBSTATE ObstacleState;
         int    ObstacleNumber;
         HQState *HQ;
	};

struct	ShellState
	{
	 ShellState(void)
		{in_flight=0;}
	 int	in_flight;
	 long	curr_x,
		curr_y;
	 int	firer;
	 int	range;
	 int	iangle;
	 word	Ptr;
#ifndef BORING
	 int	old_x,
		old_y;
	 int	old_colour;
#endif
	};

struct	REFUEL
	{
	 REFUEL(void)
		{charge=1000;occupied=0;}
	 int	charge;
	 int	occupied;
	};


struct  MemBlock
        {
         byte Signature;
         word Owner;
         word Size;
         word Dummy1;
         byte Dummy2;
         char Name[8];
        };

struct  TEAM
        {
         TEAM(void)
                {StartX=-1;Score=0;Kills=0;HQ=NULL;Collected=0;}
         int    StartX;
         int    StartY;
         dword  Score;
	 int    Kills;
	 int	Survivors;
         int    Collected;
         HQState *HQ;
        };

struct  OBSTACLE
        {
         OBSTACLE(void)
                {State=NONE;}
         int    x,
                y;
         enum   OBSTATE State;
         int    HoldRobot;
        };

long	damage(int task,int damage,int Cause);
void	close_down(BOOL EscFlag);
void	draw_robot(char far *ptr);
extern "C" void	interrupt function(word bp,word di,word si,word ds,word es,word dx,word cx,word bx,word ax);
void	interrupt run(void);
void	start(const char *name,const int Team=-1);
void 	KillRobot(TaskState *robot);
void    DoHQFunction(void);


extern void interrupt (*f1)(...);
extern void interrupt (*int10vec)(...);
extern void interrupt (*inte2vec)(...);
extern void interrupt (*inte3vec)(...);
extern void interrupt (*oldtimerint)(...);
void   interrupt timer_tick(void);

extern long far int13vec;
extern long far int15vec;
extern long far int16vec;
extern long far int1avec;
extern long far int21vec;
extern long far int25vec;
extern long far int26vec;
extern long far int2fvec;
extern long far int67vec;
extern long far int1bvec;

extern "C" void killtask(int Data);


extern	TaskState	*ThisTask;
extern	RobotState	*Robot;
extern  HQState         *HQ;
//extern  RobotState      *ThisRobot;
//extern  HQState         *ThisHQ;

extern	ShellState	*Shell;

extern  long	*sint,
	        *cost;

extern long far InDos;

extern  BOOL	slowmode;
extern  BOOL	fastmode;
extern  BOOL    Verbose;
extern  BOOL	singlestep;
extern  int	alive_robots;
extern	int	AliveTeams;
extern	int	LoneRobots;
extern  int	delaytime;
extern  int	debug_mode;
extern  long	time_limit;

extern	int	maxx,
		maxy;

extern	int	NextTask,
                NumRobots,
                NumHQs;
//		MaxTask;=NumRobots now

extern	dword	far Ticks;

extern  REFUEL	refueler[];
extern  int	refuel_points;

extern  TEAM    Team[];
extern  int     NumTeams;

extern  OBSTACLE *Obstacle;
extern  int     NumObstacles;

extern  int     HomeKillScore;
extern  int     KillScore;
extern  int     FalseScore;

#ifndef BORING
extern  int     MaxColours;
extern  int     HercMode;
#endif

extern	arena_line *arena;

extern  BOOL    EmsUsable;
extern  word    EmsUsed,
                EmsAvailable,
                EmsHandle;
extern  void    far *EmsPageFrame;

inline	int	report(int arena_value)
{
 if (arena_value<ARENA_REFUEL)
  return arena_value;
 return (arena_value/10)*10;
}

template <class T>
inline T abs(T val)
{
 return (val<0)?-val:val;
}

template <class T>
inline T max(T x,T y)
{
  return (x>y)?x:y;
}

template <class T>
inline T min(T x,T y)
{
  return (x<y)?x:y;
}

//inline  void    MapEmsPage(int PhysPage,int VirtPage)
//{
//}

#define MapEms(PageMap) { \
                        void far *temp=PageMap; \
                        asm push si; \
                        asm push ds;  \
                        _SI=FP_OFF(temp); \
                        _AX=FP_SEG(temp); \
                        asm  mov dx,EmsHandle; \
                        asm  mov ds,ax; \
                        asm  mov ax,5000h;\
                        asm  mov cx,4; \
                        asm  int 67h; \
                        asm  pop ds; \
                        asm  pop si; \
                        }
