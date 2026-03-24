/*$Header: c:/pcrobots/rcs/api.h 1.5 93/07/25 12:34:16 PDS_HOME Exp $*/

/* Revision Log */
/*$Log:	api.h $
 * Revision 1.5  93/07/25  12:34:16  PDS_HOME
 * Do some capitalisation of Identifiers
 * 
 * Revision 1.4.1.1  93/07/25  12:25:29  PDS_HOME
 * Do some capitalisation of identifiers
 * 
 * Revision 1.4  93/07/24  00:38:14  PDS_HOME
 * Add function prototypes for FilterComms, Block Transfer functions, and
 * obstacle manipulation functions
 * 
 * Revision 1.3  92/11/06  22:09:49  PDS_HOME
 * Add RCS header
 * Add 'get_shell_state' prototype
 * */

void	move(void);
int	scan(word angle,word res,word &range);
int	cannon(word angle,word range);
int	Transmit(WORD Target,WORD Data);
int	receive		(word &source,word &data);
void	configure_robot	(RobotState *ThisRobot,word bx1,word cx1);
void	buy_armour(int bx1);
void	buy_shells	(word number_shells);
void	get_local_map	(void far *map_store);
void    get_remote_map(void far *map_store1,int x,int y);
int	get_shell_state(word shell_id);
int     FilterComms(int RobotId,BOOL Flag);
int     TransmitBlock(WORD Target,char *DataPtr,WORD Length);
int     ReceiveBlock(WORD BlockNo,char *DataPtr,WORD Length);
void    DiscardBlock(WORD BlockNo);
int     TransmitFree(void);
int     ReceiveInfo(WORD BlockNo,WORD &TXRobot,WORD &Length);
//int     PickupObstacle(int Direction);
//int     DropObstacle(int TaskNo,int Direction,int *ObstacleNo=NULL);
//int     HoldObstacle(int TaskNo,BOOL Flag);
