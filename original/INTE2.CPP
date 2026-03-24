#include "pcrobots.h"

#pragma hdrstop
#include <ctype.h>

//#define  USEBUFFER

const   BufferSize=80*25;

#ifdef USEBUFFER
char    Buffer[BufferSize];
#endif

word    CursorPos=0;
word    *MonoPtr=(word *)MK_FP(0xb000,0);

int     Mono=0;
int     DoOutput=0;

int     yTop;
int     Rows;

void    InitOutput(void)
{
#ifndef BORING
#ifdef USEBUFFER
 memset(Buffer,0,BufferSize);
#endif
 if (Mono)
 {
  _fmemset(MK_FP(0xb000,0),0,80*25*2);
 }
 Rows=*(char *)MK_FP(0x40,0x84);
 int z=maxy/(Rows+1);
 yTop=(NumRobots*15+z-1)/z;
#endif
}

#pragma argsused
void	interrupt MyIntE2(word bp,word di,word si,word ds,word es,
                          word dx,word cx,word bx,word ax)
{
#ifndef BORING
 static int EscMode=0;
 static int y=0;

 if (!DoOutput)
  return;
 char *ptr=(char *)MK_FP(ds,dx);
 for (int i=0;i<cx;i++)
 {
  char ch=*(ptr++);
  if (EscMode)
  {
   switch(EscMode)
   {
    case 1:if (ch!='Y')
            EscMode=0;
           else
            EscMode++;
           break;
    case 2:y=ch-' ';
           if ((y<1)||(y>25))
            EscMode=0;
           else
            EscMode++;
           break;
    case 3:int x=ch-' ';
           if ((x>=1)||(x<=80))
           {
            CursorPos=(y-1)*80+x-1;
            MonoPtr=(word *)MK_FP(0xb000,CursorPos*2);
           }
           EscMode=4;
           break;
   }
   if (EscMode==4)
   {
    EscMode=0;
    continue;
   }
  }
  if (EscMode==0)
  {
   if (isprint(ch))
   {
    if (Mono)
    {
     *(MonoPtr++)=0x700|ch;
    }
    else
    {
     int x=CursorPos%80;
     if (x<19)
     {
      int y=CursorPos/80+yTop;
      if (y<=Rows)
      {
       if (!HercMode)
       {
        _DH=y;
        _DL=x+61;
        _BH=0;
        _AH=2;
        geninterrupt(0xe3);
        _BX=15;
        _CX=1;
        _AL=ch;
        _AH=9;
        geninterrupt(0xe3);
       }
      }
//      st[0]=ch;
//      outtextxy(485+x*8,yTop+y*8,st);
     }
    }

#ifdef USEBUFFER
    Buffer[CursorPos++]=ch;
#else
    CursorPos++;
#endif
   }
   else
   {
    switch(ch)
    {
     case '\r':CursorPos-=CursorPos%80;
               break;
     case '\n':CursorPos+=80;
               break;
     case '\b':if (CursorPos>0)
                CursorPos--;
               break;
     case '\f':CursorPos=0;
               InitOutput();
               break;
     case '\x1b':EscMode=1;
               break;
    }
    MonoPtr=(word *)MK_FP(0xb000,CursorPos*2);
   }
  }
  while (CursorPos>=BufferSize)
  {
#ifdef USEBUFFER
   memmove(Buffer,Buffer+80,BufferSize-80);
   memset(Buffer+24*80,0,80);
#endif
   if (Mono)
   {
    movedata(0xb000,80*2,0xb000,0,80*24*2);
    _fmemset(MK_FP(0xb000,80*24*2),0,80*2);
    MonoPtr-=80;
   }
   else
   {
    if (!HercMode)
    {
     _DH=yTop+25;
     if (_DH>Rows)
      _DH=Rows;
     _DL=79;
     _CH=yTop;
     _CL=61;
     _BH=0;
     _AX=0x601;
     geninterrupt(0xe3);
    }
   }
   CursorPos-=80;
  }
 }
#endif
}
