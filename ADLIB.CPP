#include "pcrobots.h"

word	adlib=0;

void	sound_explosion()
{
 if (!adlib)
  return;
 setfm(0xb0,0x12);
 setfm(0xb0,0x12+0x20);
}

void	sound_direct_hit()
{
 if (!adlib)
  return;
 setfm(0xb1,0x12);
 setfm(0xb1,0x12+0x20);
}

void	setup_adlib(void)
{
 setfm(1,0);
 setfm(4,0xe0);
 setfm(8,0);

// Set up 'explosion' sound, on FM channel 0
 setfm(0x23,0);		//Carrier Multiple = 0.5
 setfm(0x20,0);		//Modulator Multiple =0.5
 setfm(0x43,0);		//Carrier Level =0dB
 setfm(0x40,0);		//Modulator Level =0dB
 setfm(0x63,0xf4);	//Carrier attack/decay
 setfm(0x60,0xf0);	//Modulator attack/decay
 setfm(0x83,0x44);	//Carrier sus/rel
 setfm(0x80,0x44);	//Modulator sus/rel
 setfm(0xa0,65);	//lower byte of fnumber
 setfm(0xc0,14);	//feedback setting
 setfm(0xe0,0);		//Set up wave shapes, just in case
 setfm(0xe3,0);

// Set up 'direct hit' sound, on FM channel 1
 setfm(0x24,0);		//Carrier Multiple = 0.5
 setfm(0x21,0);		//Modulator Multiple =0.5
 setfm(0x44,0);		//Carrier Level =0dB
 setfm(0x41,7);		//Modulator Level =5.25dB
 setfm(0x64,0xf2);	//Carrier attack/decay
 setfm(0x61,0xf5);	//Modulator attack/decay
 setfm(0x84,0x44);	//Carrier sus/rel
 setfm(0x81,0xd0);	//Modulator sus/rel
 setfm(0xa1,65);	//lower byte of fnumber
 setfm(0xc1,0);		//feedback setting
 setfm(0xe1,0);		//Set up wave shapes, just in case
 setfm(0xe4,0);
}

int	test_adlib(void)
{
 setfm(4,0xa0);
 setfm(2,250);
 setfm(8,0);
 byte status=inportb(0x388);
 setfm(4,0x01);
 for (int i=0;i<1000;i++)
 {
  if ((status=inportb(0x388))&0x40)
   break;
 }
 setfm(4,0xe0);
 if (status&0x40)
  return 1;
 else
  return 0;

}

void	setfm(byte reg,byte data)
{
 outportb(0x388,reg);
 for (int i=0;i<10;i++);
 outportb(0x389,data);
 for (i=0;i<100;i++);
}

