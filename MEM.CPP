#include "pcrobots.h"

#pragma hdrstop
extern "C" void	_loadds _saveregs C_SetBlock(void);
extern  byte far InSystem;

#define MyReturn(x) asm{mov word ptr[bp+18],x};return

#pragma argsused
void	_loadds _saveregs C_SetBlock(void)
{
 word  my_es;
 word  my_bx;
 word  Available;
 asm {
 mov my_es,es
 mov my_bx,bx
 }
 InSystem++;
 MemBlock far *Mem=(MemBlock far *)MK_FP(my_es-1,0);
 if ((Mem->Signature!=0x4d)&&(Mem->Signature!=0x5a))
 {
  InSystem--;
  MyReturn(7);
 }

 if (my_bx==Mem->Size)
 {
  InSystem--;
  MyReturn(0);
 }
 if (my_bx>Mem->Size)
 {//Enlarge Block
//if This block is the last one in the list, then no more memory
  if (Mem->Signature==0x5a)
   Available=Mem->Size;
  else
  {
   MemBlock far *NewMem=(MemBlock far *)MK_FP(my_es+Mem->Size,0);
   if (NewMem->Owner)
    Available=Mem->Size;
   else
   {
    word NeedSize=my_bx-Mem->Size;
    if ((NewMem->Size+1)>=NeedSize)
    {
     word NewFree=Mem->Size+NewMem->Size+1-my_bx;
     byte LastSig=NewMem->Signature;

//The next block *just* supplies the required memory
     if (NewFree==0)
      Mem->Signature=LastSig;
     else
     {
      NewMem=(MemBlock far *)MK_FP(my_es+my_bx,0);
      NewMem->Signature=LastSig;
      NewMem->Owner=ThisTask->PSP;
      NewMem->Size=NewFree-1;
      memcpy(NewMem->Name,ThisTask->Name,8);
     }
     Mem->Size=my_bx;
     MyReturn(0);
    }
    else
    {
//A free block, but it isn't big enough
     Available=Mem->Size+NewMem->Size+1;
    }
   }
  }
  asm{
  mov ax,Available
  mov word ptr[bp+12],ax
  }
  InSystem--;
  MyReturn(8);
 }
 else
 {//Shrink Block
  word NewFree=Mem->Size-my_bx-1;
  MemBlock far *NewMem=(MemBlock far *)MK_FP(my_es+my_bx,0);
  NewMem->Signature=Mem->Signature;
  Mem->Signature=0x4d;
  NewMem->Owner=0;
  NewMem->Size=NewFree;
  Mem->Size=my_bx;
  memcpy(NewMem->Name,"<FREE>  ",8);

//If there are contiguous free blocks, merge them
  if (NewMem->Signature!=0x5a)
  {
   MemBlock far *TempMem=(MemBlock far *)MK_FP(FP_SEG(NewMem)+NewFree+1,0);
   if (TempMem->Owner==0)
   {
    NewMem->Signature=TempMem->Signature;
    NewMem->Size=NewFree+=TempMem->Size+1;
   }
  }
 }
 InSystem--;
 MyReturn(0);
}
