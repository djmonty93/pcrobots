	ifndef	??version
?debug	macro
	endm
publicdll macro	name
	public	name
	endm
	endif
	?debug	V 300h
	?debug	S "RUN.CPP"
	?debug	C E9367CF91A0752554E2E435050
	?debug	C E95A7CF91A0A5043524F424F54532E48
	?debug	C E94019CA181B433A5C424F524C414E44435C494E434C5544455C41+
	?debug	C 4C4C4F432E48
	?debug	C E94019CA181B433A5C424F524C414E44435C494E434C5544455C5F+
	?debug	C 444546532E48
	?debug	C E94019CA181B433A5C424F524C414E44435C494E434C5544455C5F+
	?debug	C 4E554C4C2E48
	?debug	C E94019CA181B433A5C424F524C414E44435C494E434C5544455C43+
	?debug	C 4F4E494F2E48
	?debug	C E94019CA1819433A5C424F524C414E44435C494E434C5544455C44+
	?debug	C 4F532E48
	?debug	C E94019CA181B433A5C424F524C414E44435C494E434C5544455C46+
	?debug	C 4C4F41542E48
	?debug	C E94019CA181E433A5C424F524C414E44435C494E434C5544455C47+
	?debug	C 524150484943532E48
	?debug	C E94019CA181A433A5C424F524C414E44435C494E434C5544455C4D+
	?debug	C 4154482E48
	?debug	C E94019CA181B433A5C424F524C414E44435C494E434C5544455C53+
	?debug	C 5444494F2E48
	?debug	C E94019CA181C433A5C424F524C414E44435C494E434C5544455C5F+
	?debug	C 4E46494C452E48
	?debug	C E94019CA181C433A5C424F524C414E44435C494E434C5544455C53+
	?debug	C 54444C49422E48
	?debug	C E94019CA181C433A5C424F524C414E44435C494E434C5544455C53+
	?debug	C 5452494E472E48
	?debug	C E94019CA181A433A5C424F524C414E44435C494E434C5544455C54+
	?debug	C 494D452E48
	?debug	C E96084F81A0741444C49422E48
	?debug	C E9427CF91A054150492E48
	?debug	C E96184F81A07494E5432312E48
RUN_TEXT	segment byte public 'CODE'
RUN_TEXT	ends
DGROUP	group	_DATA,_BSS
	assume	cs:RUN_TEXT,ds:DGROUP
_DATA	segment word public 'DATA'
d@	label	byte
d@w	label	word
_DATA	ends
_BSS	segment word public 'BSS'
b@	label	byte
b@w	label	word
_ss_master	label	word
	db	2 dup (?)
_sp_master	label	word
	db	2 dup (?)
_bp_master	label	word
	db	2 dup (?)
_Timeout	label	word
	db	2 dup (?)
_BSS	ends
_DATA	segment word public 'DATA'
_RobotTimeout	label	word
	db	50
	db	0
PI	label	qword
	db	17
	db	45
	db	68
	db	84
	db	251
	db	33
	db	9
	db	64
_DATA	ends
_BSS	segment word public 'BSS'
_SysVecs	label	word
	db	48 dup (?)
_AliveTeams	label	word
	db	2 dup (?)
_ax1	label	word
	db	2 dup (?)
_bx1	label	word
	db	2 dup (?)
_cx1	label	word
	db	2 dup (?)
_dx1	label	word
	db	2 dup (?)
_si1	label	word
	db	2 dup (?)
_Swap	label	word
	db	2 dup (?)
_BSS	ends
RUN_TEXT	segment byte public 'CODE'
	?debug	C E8010752554E2E435050367CF91A
   ;	
   ;	void	interrupt run(void)
   ;	
	?debug	L 77
	assume	cs:RUN_TEXT
@run$qv	proc	far
	?debug	B
	push	ax
	push	bx
	push	cx
	push	dx
	push	es
	push	ds
	push	si
	push	di
	push	bp
	mov	bp,DGROUP
	mov	ds,bp
	mov	bp,sp
	sub	sp,8
	?debug	B
   ;	
   ;	{
   ;	 for (int j=0;j<NumRobots;j++)
   ;	
	?debug	L 79
	xor	di,di
	cmp	di,word ptr DGROUP:_NumRobots
	jge	short @1@170
@1@86:
   ;	
   ;	 {
   ;	  _fmemcpy(Robot[j].IntVecs,MK_FP(0,0x34*4),12*4);
   ;	
	?debug	L 81
	mov	ax,48
	push	ax
	xor	ax,ax
	mov	dx,208
	push	ax
	push	dx
	mov	ax,di
	mov	dx,335
	imul	dx
	mov	dx,word ptr DGROUP:_Robot
	add	dx,ax
	add	dx,40
	push	word ptr DGROUP:_Robot+2
	push	dx
	call	far ptr __fmemcpy
	add	sp,10
	?debug	L 79
	inc	di
	cmp	di,word ptr DGROUP:_NumRobots
	jl	short @1@86
@1@170:
   ;	
   ;	 }
   ;	 for (j=0;j<NumHQs;j++)
   ;	
	?debug	L 83
	xor	di,di
	cmp	di,word ptr DGROUP:_NumHQs
	jge	short @1@310
@1@226:
   ;	
   ;	 {
   ;	  _fmemcpy(HQ[j].IntVecs,MK_FP(0,0x34*4),12*4);
   ;	
	?debug	L 85
	mov	ax,48
	push	ax
	xor	ax,ax
	mov	dx,208
	push	ax
	push	dx
	mov	ax,di
	mov	dx,230
	imul	dx
	mov	dx,word ptr DGROUP:_HQ
	add	dx,ax
	add	dx,40
	push	word ptr DGROUP:_HQ+2
	push	dx
	call	far ptr __fmemcpy
	add	sp,10
	?debug	L 83
	inc	di
	cmp	di,word ptr DGROUP:_NumHQs
	jl	short @1@226
@1@310:
   ;	
   ;	 }
   ;	 _fmemcpy(SysVecs,MK_FP(0,0x34*4),12*4);
   ;	
	?debug	L 87
	mov	ax,48
	push	ax
	xor	ax,ax
	mov	dx,208
	push	ax
	push	dx
	push	ds
	mov	ax,offset DGROUP:_SysVecs
	push	ax
	call	far ptr __fmemcpy
	add	sp,10
   ;	
   ;	
   ;	 AliveTeams=NumTeams;
   ;	
	?debug	L 89
	mov	ax,word ptr DGROUP:_NumTeams
	mov	word ptr DGROUP:_AliveTeams,ax
   ;	
   ;	 disable();
   ;	
	?debug	L 90
	db	250
   ;	
   ;	 InSystem=1;
   ;	
	?debug	L 91
	mov	ax,seg _InSystem
	mov	es,ax
	mov	byte ptr es:_InSystem,1
   ;	
   ;	 int13vec=(long)getvect(0x13);
   ;	
	?debug	L 92
	mov	ax,19
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int13vec
	mov	es,bx
	mov	word ptr es:_int13vec+2,dx
	mov	word ptr es:_int13vec,ax
   ;	
   ;	 int15vec=(long)getvect(0x15);
   ;	
	?debug	L 93
	mov	ax,21
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int15vec
	mov	es,bx
	mov	word ptr es:_int15vec+2,dx
	mov	word ptr es:_int15vec,ax
   ;	
   ;	 int16vec=(long)getvect(0x16);
   ;	
	?debug	L 94
	mov	ax,22
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int16vec
	mov	es,bx
	mov	word ptr es:_int16vec+2,dx
	mov	word ptr es:_int16vec,ax
   ;	
   ;	 int1avec=(long)getvect(0x1a);
   ;	
	?debug	L 95
	mov	ax,26
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int1avec
	mov	es,bx
	mov	word ptr es:_int1avec+2,dx
	mov	word ptr es:_int1avec,ax
   ;	
   ;	 int21vec=(long)getvect(0x21);
   ;	
	?debug	L 96
	mov	ax,33
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int21vec
	mov	es,bx
	mov	word ptr es:_int21vec+2,dx
	mov	word ptr es:_int21vec,ax
   ;	
   ;	 int25vec=(long)getvect(0x25);
   ;	
	?debug	L 97
	mov	ax,37
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int25vec
	mov	es,bx
	mov	word ptr es:_int25vec+2,dx
	mov	word ptr es:_int25vec,ax
   ;	
   ;	 int26vec=(long)getvect(0x26);
   ;	
	?debug	L 98
	mov	ax,38
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int26vec
	mov	es,bx
	mov	word ptr es:_int26vec+2,dx
	mov	word ptr es:_int26vec,ax
   ;	
   ;	 int2fvec=(long)getvect(0x2f);
   ;	
	?debug	L 99
	mov	ax,47
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int2fvec
	mov	es,bx
	mov	word ptr es:_int2fvec+2,dx
	mov	word ptr es:_int2fvec,ax
   ;	
   ;	 int67vec=(long)getvect(0x67);
   ;	
	?debug	L 100
	mov	ax,103
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int67vec
	mov	es,bx
	mov	word ptr es:_int67vec+2,dx
	mov	word ptr es:_int67vec,ax
   ;	
   ;	 oldtimerint=getvect(0x8);
   ;	
	?debug	L 101
	mov	ax,8
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	word ptr DGROUP:_oldtimerint+2,dx
	mov	word ptr DGROUP:_oldtimerint,ax
   ;	
   ;	 int10vec=getvect(0x10);
   ;	
	?debug	L 102
	mov	ax,16
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	word ptr DGROUP:_int10vec+2,dx
	mov	word ptr DGROUP:_int10vec,ax
   ;	
   ;	 int1bvec=(long)getvect(0x1b);
   ;	
	?debug	L 103
	mov	ax,27
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	bx,seg _int1bvec
	mov	es,bx
	mov	word ptr es:_int1bvec+2,dx
	mov	word ptr es:_int1bvec,ax
   ;	
   ;	 inte2vec=getvect(0xe2);
   ;	
	?debug	L 104
	mov	ax,226
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	word ptr DGROUP:_inte2vec+2,dx
	mov	word ptr DGROUP:_inte2vec,ax
   ;	
   ;	 inte3vec=getvect(0xe3);
   ;	
	?debug	L 105
	mov	ax,227
	push	ax
	call	far ptr _getvect
	add	sp,2
	mov	word ptr DGROUP:_inte3vec+2,dx
	mov	word ptr DGROUP:_inte3vec,ax
   ;	
   ;	 setvect(0x13,(void interrupt (*)(...))MyInt13);
   ;	
	?debug	L 106
	mov	ax,seg _MyInt13
	push	ax
	mov	ax,offset _MyInt13
	push	ax
	mov	ax,19
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x15,(void interrupt (*)(...))MyInt15);
   ;	
	?debug	L 107
	mov	ax,seg _MyInt15
	push	ax
	mov	ax,offset _MyInt15
	push	ax
	mov	ax,21
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x16,(void interrupt (*)(...))MyInt16);
   ;	
	?debug	L 108
	mov	ax,seg _MyInt16
	push	ax
	mov	ax,offset _MyInt16
	push	ax
	mov	ax,22
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x1a,(void interrupt (*)(...))MyInt1a);
   ;	
	?debug	L 109
	mov	ax,seg _MyInt1a
	push	ax
	mov	ax,offset _MyInt1a
	push	ax
	mov	ax,26
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x21,(void interrupt (*)(...))MyInt21);
   ;	
	?debug	L 110
	mov	ax,seg _MyInt21
	push	ax
	mov	ax,offset _MyInt21
	push	ax
	mov	ax,33
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x25,(void interrupt (*)(...))MyInt25);
   ;	
	?debug	L 111
	mov	ax,seg _MyInt25
	push	ax
	mov	ax,offset _MyInt25
	push	ax
	mov	ax,37
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x26,(void interrupt (*)(...))MyInt26);
   ;	
	?debug	L 112
	mov	ax,seg _MyInt26
	push	ax
	mov	ax,offset _MyInt26
	push	ax
	mov	ax,38
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x2f,(void interrupt (*)(...))MyInt2f);
   ;	
	?debug	L 113
	mov	ax,seg _MyInt2f
	push	ax
	mov	ax,offset _MyInt2f
	push	ax
	mov	ax,47
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x67,(void interrupt (*)(...))MyInt67);
   ;	
	?debug	L 114
	mov	ax,seg _MyInt67
	push	ax
	mov	ax,offset _MyInt67
	push	ax
	mov	ax,103
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0xe3,int10vec);
   ;	
	?debug	L 115
	push	word ptr DGROUP:_int10vec+2
	push	word ptr DGROUP:_int10vec
	mov	ax,227
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x10,(void interrupt (*)(...))MyInt10);
   ;	
	?debug	L 116
	mov	ax,seg _MyInt10
	push	ax
	mov	ax,offset _MyInt10
	push	ax
	mov	ax,16
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0xe2,(void interrupt (*)(...))MyIntE2);
   ;	
	?debug	L 117
	mov	ax,seg @MyIntE2$quiuiuiuiuiuiuiuiui
	push	ax
	mov	ax,offset @MyIntE2$quiuiuiuiuiuiuiuiui
	push	ax
	mov	ax,226
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x8,(void interrupt (*)(...))test_timer);
   ;	
	?debug	L 118
	mov	ax,seg @test_timer$qv
	push	ax
	mov	ax,offset @test_timer$qv
	push	ax
	mov	ax,8
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 setvect(0x1b,(void interrupt (*)(...))MyInt1b);
   ;	
	?debug	L 119
	mov	ax,seg _MyInt1b
	push	ax
	mov	ax,offset _MyInt1b
	push	ax
	mov	ax,27
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 Timeout=0;
   ;	
	?debug	L 120
	mov	word ptr DGROUP:_Timeout,0
   ;	
   ;	 enable();
   ;	
	?debug	L 121
	db	251
   ;	
   ;	 for (long i=0;Timeout<5;i++)
   ;	
	?debug	L 122
	mov	word ptr [bp-2],0
	mov	word ptr [bp-4],0
	jmp	short @1@366
@1@338:
	add	word ptr [bp-4],1
	adc	word ptr [bp-2],0
@1@366:
	cmp	word ptr DGROUP:_Timeout,5
	jb	short @1@338
   ;	
   ;	 {}
   ;	 disable();
   ;	
	?debug	L 124
	db	250
   ;	
   ;	 RobotTimeout=(word)(14000000L/i);
   ;	
	?debug	L 125
	push	word ptr [bp-2]
	push	word ptr [bp-4]
	mov	ax,213
	mov	dx,-24704
	push	ax
	push	dx
	call	far ptr F_LDIV@
	mov	word ptr DGROUP:_RobotTimeout,ax
   ;	
   ;	 setvect(0x8,(void interrupt (*)(...))timer_tick);
   ;	
	?debug	L 126
	mov	ax,seg @timer_tick$qv
	push	ax
	mov	ax,offset @timer_tick$qv
	push	ax
	mov	ax,8
	push	ax
	call	far ptr _setvect
	add	sp,6
   ;	
   ;	 Timeout=RobotTimeout;
   ;	
	?debug	L 127
	mov	ax,word ptr DGROUP:_RobotTimeout
	mov	word ptr DGROUP:_Timeout,ax
   ;	
   ;	 ss_master=_SS;
   ;	
	?debug	L 128
	mov	word ptr DGROUP:_ss_master,ss
   ;	
   ;	 sp_master=_SP;
   ;	
	?debug	L 129
	mov	word ptr DGROUP:_sp_master,sp
   ;	
   ;	 bp_master=_BP;
   ;	
	?debug	L 130
	mov	word ptr DGROUP:_bp_master,bp
   ;	
   ;	// ThisRobot=&Robot[NextTask];
   ;	 ThisTask=&Robot[NextTask];
   ;	
	?debug	L 132
	mov	ax,word ptr DGROUP:_NextTask
	mov	dx,335
	imul	dx
	mov	dx,word ptr DGROUP:_Robot+2
	mov	bx,word ptr DGROUP:_Robot
	add	bx,ax
	mov	word ptr DGROUP:_ThisTask+2,dx
	mov	word ptr DGROUP:_ThisTask,bx
   ;	
   ;	// ThisHQ=NULL;
   ;	 if (!ThisTask->mem_type)
   ;	
	?debug	L 134
	mov	es,word ptr DGROUP:_ThisTask+2
	cmp	word ptr es:[bx+8],0
	jne	short @1@730
	?debug	B
   ;	
   ;	  MapEms(ThisTask->EmsMap);
   ;	
	?debug	L 135
	mov	ax,word ptr DGROUP:_ThisTask+2
	mov	dx,word ptr DGROUP:_ThisTask
	add	dx,10
	mov	word ptr [bp-6],ax
	mov	word ptr [bp-8],dx
 	push	 si
 	push	 ds
	mov	si,word ptr [bp-8]
	mov	ax,word ptr [bp-6]
 	mov	 dx,_EmsHandle
 	mov	 ds,ax
 	mov	 ax,5000h
 	mov	 cx,4
 	int	 67h
 	pop	 ds
 	pop	 si
@1@730:
	?debug	C E318000400160100
	?debug	C E60474656D701802F8FF00
	?debug	E
   ;	
   ;	 _SS=ThisTask->ss;
   ;	
	?debug	L 136
	les	bx,dword ptr DGROUP:_ThisTask
	mov	ss,word ptr es:[bx]
   ;	
   ;	 _SP=ThisTask->sp;
   ;	
	?debug	L 137
	mov	sp,word ptr es:[bx+2]
   ;	
   ;	 _BP=ThisTask->bp;
   ;	
	?debug	L 138
	mov	bp,word ptr es:[bx+4]
   ;	
   ;	 enable();
   ;	
	?debug	L 139
	db	251
   ;	
   ;	 InSystem=0;
   ;	
	?debug	L 140
	mov	ax,seg _InSystem
	mov	es,ax
	mov	byte ptr es:_InSystem,0
   ;	
   ;	}
   ;	
	?debug	L 141
	mov	sp,bp
	pop	bp
	pop	di
	pop	si
	pop	ds
	pop	es
	pop	dx
	pop	cx
	pop	bx
	pop	ax
	iret	
	?debug	C E601690602FCFF00016A04040700
	?debug	E
	?debug	E
@run$qv	endp
   ;	
   ;	void interrupt test_timer(void)
   ;	
	?debug	L 143
	assume	cs:RUN_TEXT
@test_timer$qv	proc	far
	?debug	B
	push	ax
	push	bx
	push	cx
	push	dx
	push	es
	push	ds
	push	si
	push	di
	push	bp
	mov	bp,DGROUP
	mov	ds,bp
	mov	bp,sp
	?debug	B
   ;	
   ;	{
   ;	 oldtimerint();
   ;	
	?debug	L 145
	pushf	
	call	dword ptr DGROUP:_oldtimerint
   ;	
   ;	 Timeout++;
   ;	
	?debug	L 146
	inc	word ptr DGROUP:_Timeout
   ;	
   ;	}
   ;	
	?debug	L 147
	pop	bp
	pop	di
	pop	si
	pop	ds
	pop	es
	pop	dx
	pop	cx
	pop	bx
	pop	ax
	iret	
	?debug	E
	?debug	E
@test_timer$qv	endp
   ;	
   ;	void interrupt timer_tick(void)
   ;	
	?debug	L 149
	assume	cs:RUN_TEXT
@timer_tick$qv	proc	far
	?debug	B
	push	ax
	push	bx
	push	cx
	push	dx
	push	es
	push	ds
	push	si
	push	di
	push	bp
	mov	bp,DGROUP
	mov	ds,bp
	mov	bp,sp
	?debug	B
   ;	
   ;	{
   ;	 oldtimerint();
   ;	
	?debug	L 151
	pushf	
	call	dword ptr DGROUP:_oldtimerint
   ;	
   ;	 if ((!slowmode)&&(Timeout-- ==0))
   ;	
	?debug	L 152
	cmp	word ptr DGROUP:_slowmode,0
	jne	short @3@170
	mov	ax,word ptr DGROUP:_Timeout
	dec	word ptr DGROUP:_Timeout
	or	ax,ax
	jne	short @3@170
   ;	
   ;	 {
   ;	  if (*(byte far *)InDos)
   ;	
	?debug	L 154
	mov	ax,seg _InDos
	mov	es,ax
	les	bx,dword ptr es:_InDos
	cmp	byte ptr es:[bx],0
	je	short @3@142
   ;	
   ;	   Timeout++;
   ;	
	?debug	L 155
	inc	word ptr DGROUP:_Timeout
	jmp	short @3@170
@3@142:
   ;	
   ;	  else
   ;	   killtask(-1);
   ;	
	?debug	L 157
	mov	ax,-1
	push	ax
	call	far ptr _killtask
	add	sp,2
@3@170:
   ;	
   ;	 }
   ;	 if (KillFlag)
   ;	
	?debug	L 159
	mov	ax,seg _KillFlag
	mov	es,ax
	cmp	byte ptr es:_KillFlag,0
	je	short @3@254
   ;	
   ;	 {
   ;	  if (*(byte far *)InDos==0)
   ;	
	?debug	L 161
	mov	ax,seg _InDos
	mov	es,ax
	les	bx,dword ptr es:_InDos
	cmp	byte ptr es:[bx],0
	jne	short @3@254
   ;	
   ;	   killrun();
   ;	
	?debug	L 162
	call	far ptr _killrun
@3@254:
   ;	
   ;	 }
   ;	}
   ;	
	?debug	L 164
	pop	bp
	pop	di
	pop	si
	pop	ds
	pop	es
	pop	dx
	pop	cx
	pop	bx
	pop	ax
	iret	
	?debug	E
	?debug	E
@timer_tick$qv	endp
   ;	
   ;	void    _loadds killtask(int Data)
   ;	
	?debug	L 166
	assume	cs:RUN_TEXT
_killtask	proc	far
	?debug	B
	push	bp
	mov	bp,sp
	push	si
	push	ds
	mov	ax,DGROUP
	mov	ds,ax
	?debug	C E60444617461040A060000
	mov	si,word ptr [bp+6]
	?debug	B
   ;	
   ;	{
   ;	 if (Data==-1)
   ;	
	?debug	L 168
	cmp	si,-1
	jne	short @4@86
   ;	
   ;	  ThisTask->CauseOfDeath=SYSTEM_TIMEOUT;
   ;	
	?debug	L 169
	les	bx,dword ptr DGROUP:_ThisTask
	mov	word ptr es:[bx+92],101
	jmp	short @4@114
@4@86:
   ;	
   ;	 else
   ;	 {
   ;	  ThisTask->CauseOfDeath=SYSTEM_VIOLATION;
   ;	
	?debug	L 172
	les	bx,dword ptr DGROUP:_ThisTask
	mov	word ptr es:[bx+92],103
   ;	
   ;	  ThisTask->CauseData=Data;
   ;	
	?debug	L 173
	mov	word ptr es:[bx+94],si
@4@114:
   ;	
   ;	 }
   ;	 KillRobot(ThisTask);
   ;	
	?debug	L 175
	push	word ptr DGROUP:_ThisTask+2
	push	word ptr DGROUP:_ThisTask
	call	far ptr @KillRobot$qn9TaskState
	add	sp,4
   ;	
   ;	 asm {
   ;	 mov ax,0       /*swaptask*/
   ;	
	?debug	L 177
	mov	 ax,0       
   ;	
   ;	 mov word ptr [bp+2],offset(function)
   ;	
	?debug	L 178
	mov	 word ptr [bp+2],offset(_function)
   ;	
   ;	 mov word ptr [bp+4],seg(function)
   ;	
	?debug	L 179
	mov	 word ptr [bp+4],seg(_function)
   ;	
   ;	 }
   ;	
   ;	}
   ;	
	?debug	L 182
	pop	ds
	pop	si
	pop	bp
	ret	
	?debug	C E60444617461040C0600
	?debug	E
	?debug	E
_killtask	endp
   ;	
   ;	void    killrun(void)
   ;	
	?debug	L 184
	assume	cs:RUN_TEXT
_killrun	proc	far
	?debug	B
	push	bp
	mov	bp,sp
	sub	sp,4
	push	si
	push	di
	?debug	B
   ;	
   ;	{
   ;	 for (int i=0;i<NumRobots;i++)
   ;	
	?debug	L 186
	xor	cx,cx
	cmp	cx,word ptr DGROUP:_NumRobots
	jge	short @5@198
@5@86:
   ;	
   ;	 {
   ;	  if (!Robot[i].Dead)
   ;	
	?debug	L 188
	mov	ax,cx
	mov	dx,335
	imul	dx
	mov	word ptr [bp-2],ax
	les	bx,dword ptr DGROUP:_Robot
	add	bx,ax
	mov	si,bx
	cmp	word ptr es:[bx+90],0
	jne	short @5@142
   ;	
   ;	  {
   ;	   Robot[i].Dead=TRUE;
   ;	
	?debug	L 190
	mov	word ptr es:[si+90],1
   ;	
   ;	   Robot[i].CauseOfDeath=SYSTEM_CTRLBRK;
   ;	
	?debug	L 191
	mov	bx,word ptr DGROUP:_Robot
	add	bx,word ptr [bp-2]
	mov	si,bx
	mov	word ptr es:[bx+92],105
@5@142:
	?debug	L 186
	inc	cx
	cmp	cx,word ptr DGROUP:_NumRobots
	jl	short @5@86
@5@198:
   ;	
   ;	  }
   ;	 }
   ;	 for (i=0;i<NumHQs;i++)
   ;	
	?debug	L 194
	xor	cx,cx
	cmp	cx,word ptr DGROUP:_NumHQs
	jge	short @5@366
@5@254:
   ;	
   ;	 {
   ;	  if (!HQ[i].Dead)
   ;	
	?debug	L 196
	mov	ax,cx
	mov	dx,230
	imul	dx
	mov	word ptr [bp-4],ax
	les	bx,dword ptr DGROUP:_HQ
	add	bx,ax
	mov	di,bx
	cmp	word ptr es:[bx+90],0
	jne	short @5@310
   ;	
   ;	  {
   ;	   HQ[i].Dead=TRUE;
   ;	
	?debug	L 198
	mov	word ptr es:[di+90],1
   ;	
   ;	   HQ[i].CauseOfDeath=SYSTEM_CTRLBRK;
   ;	
	?debug	L 199
	mov	bx,word ptr DGROUP:_HQ
	add	bx,word ptr [bp-4]
	mov	di,bx
	mov	word ptr es:[bx+92],105
@5@310:
	?debug	L 194
	inc	cx
	cmp	cx,word ptr DGROUP:_NumHQs
	jl	short @5@254
@5@366:
   ;	
   ;	  }
   ;	 }
   ;	 alive_robots=0;
   ;	
	?debug	L 202
	mov	word ptr DGROUP:_alive_robots,0
   ;	
   ;	 asm {
   ;	 mov ax,0       /*swaptask*/
   ;	
	?debug	L 204
	mov	 ax,0       
   ;	
   ;	 mov word ptr [bp+2],offset(function)
   ;	
	?debug	L 205
	mov	 word ptr [bp+2],offset(_function)
   ;	
   ;	 mov word ptr [bp+4],seg(function)
   ;	
	?debug	L 206
	mov	 word ptr [bp+4],seg(_function)
   ;	
   ;	 }
   ;	
   ;	}
   ;	
	?debug	L 209
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
	?debug	C E6016904040100
	?debug	E
	?debug	E
_killrun	endp
   ;	
   ;	void _loadds _saveregs C_setvect(int no,dword addr)
   ;	
	?debug	L 211
	assume	cs:RUN_TEXT
_C_setvect	proc	far
	?debug	B
	push	ax
	push	cx
	push	dx
	push	bx
	push	sp
	push	bp
	push	si
	push	di
	push	ds
	push	es
	mov	bp,DGROUP
	mov	ds,bp
	mov	bp,sp
	?debug	C E604616464720C0A1A0000026E6F040A180000
	?debug	B
   ;	
   ;	{
   ;	 ThisTask->IntVecs[(no&0xff)-0x34]=addr;
   ;	
	?debug	L 213
	mov	ax,word ptr [bp+24]
	and	ax,255
	mov	cl,2
	shl	ax,cl
	les	bx,dword ptr DGROUP:_ThisTask
	add	bx,ax
	mov	ax,word ptr [bp+28]
	mov	dx,word ptr [bp+26]
	mov	word ptr es:[bx-166],ax
	mov	word ptr es:[bx-168],dx
   ;	
   ;	}
   ;	
	?debug	L 214
	mov	sp,bp
	pop	es
	pop	ds
	pop	di
	pop	si
	pop	bp
	pop	bx
	pop	bx
	pop	dx
	pop	cx
	pop	ax
	ret	
	?debug	C E6026E6F040A18000004616464720C0A1A0000
	?debug	E
	?debug	E
_C_setvect	endp
   ;	
   ;	void	interrupt function(word bp,word di,word si,word ds,word es,word dx,word cx,word bx,word ax)
   ;	
	?debug	L 217
	assume	cs:RUN_TEXT
_function	proc	far
	?debug	B
	push	ax
	push	bx
	push	cx
	push	dx
	push	es
	push	ds
	push	si
	push	di
	push	bp
	mov	bp,DGROUP
	mov	ds,bp
	mov	bp,sp
	sub	sp,12
	?debug	C E60261780A0A1000000262780A0A0E0000026378+
	?debug	C 0A0A0C00000264780A0A0A00000265730A0A0800+
	?debug	C 000264730A0A0600000273690A0A040000026469+
	?debug	C 0A0A0200000262700A0A000000
	?debug	B
   ;	
   ;	{
   ;	 volatile word newax=ax;	//volatile to force it onto the stack, instead of
   ;	
	?debug	L 219
	mov	ax,word ptr [bp+16]
	mov	word ptr [bp-2],ax
   ;	
   ;				// into a register
   ;	
   ;	 InSystem=1;
   ;	
	?debug	L 222
	mov	ax,seg _InSystem
	mov	es,ax
	mov	byte ptr es:_InSystem,1
   ;	
   ;	 ax1=ax;
   ;	
	?debug	L 223
	mov	ax,word ptr [bp+16]
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	 bx1=bx;
   ;	
	?debug	L 224
	mov	ax,word ptr [bp+14]
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;	 cx1=cx;
   ;	
	?debug	L 225
	mov	ax,word ptr [bp+12]
	mov	word ptr DGROUP:_cx1,ax
   ;	
   ;	 dx1=dx;
   ;	
	?debug	L 226
	mov	ax,word ptr [bp+10]
	mov	word ptr DGROUP:_dx1,ax
   ;	
   ;	 si1=si;
   ;	
	?debug	L 227
	mov	ax,word ptr [bp+4]
	mov	word ptr DGROUP:_si1,ax
   ;	
   ;	
   ;	 disable();
   ;	
	?debug	L 229
	db	250
   ;	
   ;	 ThisTask->ss=_SS;
   ;	
	?debug	L 230
	les	bx,dword ptr DGROUP:_ThisTask
	mov	word ptr es:[bx],ss
   ;	
   ;	 ThisTask->sp=_SP;
   ;	
	?debug	L 231
	mov	word ptr es:[bx+2],sp
   ;	
   ;	 ThisTask->bp=_BP;
   ;	
	?debug	L 232
	mov	word ptr es:[bx+4],bp
   ;	
   ;	 _SS=ss_master;
   ;	
	?debug	L 233
	mov	ss,word ptr DGROUP:_ss_master
   ;	
   ;	 _SP=sp_master;
   ;	
	?debug	L 234
	mov	sp,word ptr DGROUP:_sp_master
   ;	
   ;	 _BP=bp_master;
   ;	
	?debug	L 235
	mov	bp,word ptr DGROUP:_bp_master
   ;	
   ;	 enable();
   ;	
	?debug	L 236
	db	251
	?debug	B
   ;	
   ;	
   ;	//Check the INT E0 Vector
   ;	 {
   ;	  dword Temp=*(dword far *)MK_FP(0,0xe0*4);
   ;	
	?debug	L 240
	xor	ax,ax
	mov	es,ax
	mov	ax,word ptr es:[898]
	mov	dx,word ptr es:[896]
	mov	word ptr [bp-4],ax
	mov	word ptr [bp-6],dx
   ;	
   ;	  if (Temp!=(dword)function)
   ;	
	?debug	L 241
	cmp	word ptr [bp-4],seg _function
	jne	short @7@114
	cmp	word ptr [bp-6],offset _function
	je	short @7@254
@7@114:
   ;	
   ;	  {
   ;	   *(dword far *)MK_FP(0,0xe0*4)=(dword)function;
   ;	
	?debug	L 243
	xor	ax,ax
	mov	es,ax
	mov	word ptr es:[898],seg _function
	mov	word ptr es:[896],offset _function
   ;	
   ;	   ThisTask->Dead=TRUE;
   ;	
	?debug	L 244
	les	bx,dword ptr DGROUP:_ThisTask
	mov	word ptr es:[bx+90],1
   ;	
   ;	   ThisTask->CauseOfDeath=SYSTEM_SET_E0;
   ;	
	?debug	L 245
	mov	word ptr es:[bx+92],106
   ;	
   ;	   if (ThisTask->isA(RobotTask))
   ;	
	?debug	L 246
	cmp	word ptr es:[bx+144],2
	jne	short @7@170
	mov	ax,1
	jmp	short @7@198
@7@170:
	xor	ax,ax
@7@198:
	or	ax,ax
	je	short @7@254
   ;	
   ;	    alive_robots--;
   ;	
	?debug	L 247
	dec	word ptr DGROUP:_alive_robots
@7@254:
	?debug	C E60454656D700C02FAFF00
	?debug	E
   ;	
   ;	  }
   ;	 }
   ;	
   ;	 _fmemcpy(ThisTask->IntVecs,MK_FP(0,0x34*4),12*4);
   ;	
	?debug	L 251
	mov	ax,48
	push	ax
	xor	ax,ax
	mov	dx,208
	push	ax
	push	dx
	mov	ax,word ptr DGROUP:_ThisTask
	add	ax,40
	push	word ptr DGROUP:_ThisTask+2
	push	ax
	call	far ptr __fmemcpy
	add	sp,10
   ;	
   ;	 _fmemcpy(MK_FP(0,0x34*4),SysVecs,12*4);
   ;	
	?debug	L 252
	mov	ax,48
	push	ax
	push	ds
	mov	ax,offset DGROUP:_SysVecs
	push	ax
	xor	ax,ax
	mov	dx,208
	push	ax
	push	dx
	call	far ptr __fmemcpy
	add	sp,10
   ;	
   ;	
   ;	
   ;	 Swap=FALSE;
   ;	
	?debug	L 255
	mov	word ptr DGROUP:_Swap,0
   ;	
   ;	 if (NextTask<MaxRobots)
   ;	
	?debug	L 256
	cmp	word ptr DGROUP:_NextTask,20
	jge	short @7@310
   ;	
   ;	  do_function((RobotState*)ThisTask);
   ;	
	?debug	L 257
	push	word ptr DGROUP:_ThisTask+2
	push	word ptr DGROUP:_ThisTask
	call	far ptr @do_function$qn10RobotState
	add	sp,4
	jmp	short @7@338
@7@310:
   ;	
   ;	 else
   ;	  DoHQFunction();
   ;	
	?debug	L 259
	call	far ptr @DoHQFunction$qv
@7@338:
   ;	
   ;	
   ;	 disable();
   ;	
	?debug	L 261
	db	250
   ;	
   ;	 _SS=ThisTask->ss;
   ;	
	?debug	L 262
	les	bx,dword ptr DGROUP:_ThisTask
	mov	ss,word ptr es:[bx]
   ;	
   ;	 _SP=ThisTask->sp;
   ;	
	?debug	L 263
	mov	sp,word ptr es:[bx+2]
   ;	
   ;	 _BP=ThisTask->bp;
   ;	
	?debug	L 264
	mov	bp,word ptr es:[bx+4]
   ;	
   ;	 enable();
   ;	
	?debug	L 265
	db	251
   ;	
   ;	
   ;	 newax=ax1;
   ;	
	?debug	L 267
	mov	ax,word ptr DGROUP:_ax1
	mov	word ptr [bp-2],ax
   ;	
   ;	 bx=bx1;
   ;	
	?debug	L 268
	mov	ax,word ptr DGROUP:_bx1
	mov	word ptr [bp+14],ax
   ;	
   ;	 cx=cx1;
   ;	
	?debug	L 269
	mov	ax,word ptr DGROUP:_cx1
	mov	word ptr [bp+12],ax
   ;	
   ;	
   ;	 if (Swap)
   ;	
	?debug	L 271
	cmp	word ptr DGROUP:_Swap,0
	jne	@@0
	jmp	@7@1262
@@0:
   ;	
   ;	 {
   ;	  Timeout=RobotTimeout;
   ;	
	?debug	L 273
	mov	ax,word ptr DGROUP:_RobotTimeout
	mov	word ptr DGROUP:_Timeout,ax
   ;	
   ;	  disable();
   ;	
	?debug	L 274
	db	250
   ;	
   ;	  ThisTask->ss=_SS;
   ;	
	?debug	L 275
	mov	word ptr es:[bx],ss
   ;	
   ;	  ThisTask->sp=_SP;
   ;	
	?debug	L 276
	mov	word ptr es:[bx+2],sp
   ;	
   ;	  ThisTask->bp=_BP;
   ;	
	?debug	L 277
	mov	word ptr es:[bx+4],bp
   ;	
   ;	  _SS=ss_master;
   ;	
	?debug	L 278
	mov	ss,word ptr DGROUP:_ss_master
   ;	
   ;	  _SP=sp_master;
   ;	
	?debug	L 279
	mov	sp,word ptr DGROUP:_sp_master
   ;	
   ;	  _BP=bp_master;
   ;	
	?debug	L 280
	mov	bp,word ptr DGROUP:_bp_master
@7@394:
   ;	
   ;	  do
   ;	  {
   ;	   NextTask++;
   ;	
	?debug	L 283
	inc	word ptr DGROUP:_NextTask
   ;	
   ;	   if (NextTask==NumRobots)
   ;	
	?debug	L 284
	mov	ax,word ptr DGROUP:_NextTask
	cmp	ax,word ptr DGROUP:_NumRobots
	jne	short @7@450
   ;	
   ;	    NextTask=MaxRobots;
   ;	
	?debug	L 285
	mov	word ptr DGROUP:_NextTask,20
@7@450:
   ;	
   ;	   if (NextTask>=MaxRobots)
   ;	
	?debug	L 286
	cmp	word ptr DGROUP:_NextTask,20
	jl	short @7@562
   ;	
   ;	   {
   ;	    if (NextTask==MaxRobots+NumHQs)
   ;	
	?debug	L 288
	mov	ax,word ptr DGROUP:_NumHQs
	add	ax,20
	cmp	ax,word ptr DGROUP:_NextTask
	jne	short @7@534
   ;	
   ;	    {
   ;	     NextTask=0;
   ;	
	?debug	L 290
	mov	word ptr DGROUP:_NextTask,0
   ;	
   ;	     enable();
   ;	
	?debug	L 291
	db	251
   ;	
   ;	     move();
   ;	
	?debug	L 292
	call	far ptr @move$qv
   ;	
   ;	     disable();
   ;	
	?debug	L 293
	db	250
   ;	
   ;	     ThisTask=&Robot[NextTask];
   ;	
	?debug	L 294
	mov	ax,word ptr DGROUP:_NextTask
	mov	dx,335
	imul	dx
	mov	dx,word ptr DGROUP:_Robot+2
	mov	bx,word ptr DGROUP:_Robot
	add	bx,ax
	mov	word ptr DGROUP:_ThisTask+2,dx
	mov	word ptr DGROUP:_ThisTask,bx
   ;	
   ;	    }
   ;	
	?debug	L 295
	jmp	short @7@590
@7@534:
   ;	
   ;	    else
   ;	     ThisTask=&HQ[NextTask-MaxRobots];
   ;	
	?debug	L 297
	mov	ax,word ptr DGROUP:_NextTask
	mov	dx,230
	imul	dx
	mov	dx,word ptr DGROUP:_HQ+2
	add	ax,word ptr DGROUP:_HQ
	add	ax,-4600
	mov	word ptr DGROUP:_ThisTask+2,dx
	mov	word ptr DGROUP:_ThisTask,ax
	jmp	short @7@590
@7@562:
   ;	
   ;	   }
   ;	   else
   ;	    ThisTask=&Robot[NextTask];
   ;	
	?debug	L 300
	mov	ax,word ptr DGROUP:_NextTask
	mov	dx,335
	imul	dx
	mov	dx,word ptr DGROUP:_Robot+2
	mov	bx,word ptr DGROUP:_Robot
	add	bx,ax
	mov	word ptr DGROUP:_ThisTask+2,dx
	mov	word ptr DGROUP:_ThisTask,bx
@7@590:
   ;	
   ;	  }
   ;	  while (ThisTask->Dead);
   ;	
	?debug	L 302
	les	bx,dword ptr DGROUP:_ThisTask
	cmp	word ptr es:[bx+90],0
	je	@@1
	jmp	@7@394
@@1:
   ;	
   ;	
   ;	  if (!ThisTask->mem_type)
   ;	
	?debug	L 304
	cmp	word ptr es:[bx+8],0
	jne	short @7@954
	?debug	B
   ;	
   ;	   MapEms(ThisTask->EmsMap);
   ;	
	?debug	L 305
	mov	ax,word ptr DGROUP:_ThisTask+2
	mov	dx,word ptr DGROUP:_ThisTask
	add	dx,10
	mov	word ptr [bp-4],ax
	mov	word ptr [bp-6],dx
 	push	 si
 	push	 ds
	mov	si,word ptr [bp-6]
	mov	ax,word ptr [bp-4]
 	mov	 dx,_EmsHandle
 	mov	 ds,ax
 	mov	 ax,5000h
 	mov	 cx,4
 	int	 67h
 	pop	 ds
 	pop	 si
@7@954:
	?debug	C E60474656D701802FAFF00
	?debug	E
   ;	
   ;	  disable();
   ;	
	?debug	L 306
	db	250
   ;	
   ;	  _SS=ThisTask->ss;
   ;	
	?debug	L 307
	les	bx,dword ptr DGROUP:_ThisTask
	mov	ss,word ptr es:[bx]
   ;	
   ;	  _SP=ThisTask->sp;
   ;	
	?debug	L 308
	mov	sp,word ptr es:[bx+2]
   ;	
   ;	  _BP=ThisTask->bp;
   ;	
	?debug	L 309
	mov	bp,word ptr es:[bx+4]
   ;	
   ;	  enable();
   ;	
	?debug	L 310
	db	251
   ;	
   ;	
   ;	  if (ThisTask->isA(RobotTask))
   ;	
	?debug	L 312
	cmp	word ptr es:[bx+144],2
	jne	short @7@1010
	mov	ax,1
	jmp	short @7@1038
@7@1010:
	xor	ax,ax
@7@1038:
	or	ax,ax
	jne	@@2
	jmp	@7@1262
@@2:
	?debug	B
   ;	
   ;	  {
   ;	// ThisRobot=(RobotState *)ThisTask;
   ;	   RobotState *ThisRobot=(RobotState *)ThisTask;
   ;	
	?debug	L 315
	mov	ax,word ptr DGROUP:_ThisTask+2
	mov	dx,word ptr DGROUP:_ThisTask
	mov	word ptr [bp-4],ax
	mov	word ptr [bp-6],dx
   ;	
   ;	//   ThisHQ=NULL;
   ;	
   ;	   if (ThisRobot->xVar!=NULL)
   ;	
	?debug	L 318
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+272]
	or	ax,word ptr es:[bx+274]
	je	short @7@1122
   ;	
   ;	    *(ThisRobot->xVar)=(int)(ThisRobot->curr_x/100);
   ;	
	?debug	L 319
	xor	ax,ax
	mov	dx,100
	push	ax
	push	dx
	push	word ptr es:[bx+148]
	push	word ptr es:[bx+146]
	call	far ptr F_LDIV@
	les	bx,dword ptr [bp-6]
	les	bx,dword ptr es:[bx+272]
	mov	word ptr es:[bx],ax
@7@1122:
   ;	
   ;	   if (ThisRobot->yVar!=NULL)
   ;	
	?debug	L 320
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+276]
	or	ax,word ptr es:[bx+278]
	je	short @7@1178
   ;	
   ;	    *(ThisRobot->yVar)=(int)(ThisRobot->curr_y/100);
   ;	
	?debug	L 321
	xor	ax,ax
	mov	dx,100
	push	ax
	push	dx
	push	word ptr es:[bx+152]
	push	word ptr es:[bx+150]
	call	far ptr F_LDIV@
	les	bx,dword ptr [bp-6]
	les	bx,dword ptr es:[bx+276]
	mov	word ptr es:[bx],ax
@7@1178:
   ;	
   ;	   if (ThisRobot->DataVar!=NULL)
   ;	
	?debug	L 322
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+280]
	or	ax,word ptr es:[bx+282]
	jne	@@3
	jmp	@7@1262
@@3:
	?debug	B
   ;	
   ;	   {
   ;	    DataStruct *Ptr=ThisRobot->DataVar;
   ;	
	?debug	L 324
	mov	ax,word ptr es:[bx+282]
	mov	dx,word ptr es:[bx+280]
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;	    word Len=Ptr->StructLen;
   ;	
	?debug	L 325
	les	bx,dword ptr [bp-10]
	mov	ax,word ptr es:[bx]
	mov	word ptr [bp-12],ax
   ;	
   ;	    if (Len>0)
   ;	
	?debug	L 326
	cmp	word ptr [bp-12],0
	ja	@@4
	jmp	@7@1262
@@4:
   ;	
   ;	    {
   ;	     Ptr->x=word(ThisRobot->curr_x/100);
   ;	
	?debug	L 328
	xor	ax,ax
	mov	dx,100
	push	ax
	push	dx
	les	bx,dword ptr [bp-6]
	push	word ptr es:[bx+148]
	push	word ptr es:[bx+146]
	call	far ptr F_LDIV@
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+2],ax
   ;	
   ;	     Ptr->y=word(ThisRobot->curr_y/100);
   ;	
	?debug	L 329
	xor	ax,ax
	mov	dx,100
	push	ax
	push	dx
	les	bx,dword ptr [bp-6]
	push	word ptr es:[bx+152]
	push	word ptr es:[bx+150]
	call	far ptr F_LDIV@
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+4],ax
   ;	
   ;	     Ptr->Armour=ThisRobot->armour;
   ;	
	?debug	L 330
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+166]
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+6],ax
   ;	
   ;	     Ptr->Speed=ThisRobot->speed;
   ;	
	?debug	L 331
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+156]
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+8],ax
   ;	
   ;	     Ptr->Angle=ThisRobot->iangle;
   ;	
	?debug	L 332
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+154]
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+10],ax
   ;	
   ;	     Ptr->Invisible=ThisRobot->invisible;
   ;	
	?debug	L 333
	les	bx,dword ptr [bp-6]
	mov	al,byte ptr es:[bx+255]
	cbw	
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+12],ax
   ;	
   ;	     Ptr->LastShellState=ThisRobot->last_shell_state;
   ;	
	?debug	L 334
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+260]
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+14],ax
   ;	
   ;	     Ptr->Battery=(word)(ThisRobot->Battery/battery_realunit);
   ;	
	?debug	L 335
	xor	ax,ax
	mov	dx,10
	push	ax
	push	dx
	les	bx,dword ptr [bp-6]
	push	word ptr es:[bx+160]
	push	word ptr es:[bx+158]
	call	far ptr F_LDIV@
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+16],ax
   ;	
   ;	     Ptr->ShellsLeft=ThisRobot->shells_left;
   ;	
	?debug	L 336
	les	bx,dword ptr [bp-6]
	mov	ax,word ptr es:[bx+164]
	les	bx,dword ptr [bp-10]
	mov	word ptr es:[bx+18],ax
@7@1262:
	?debug	C E31A0A4461746153747275637414001E01
	?debug	C E319000400161A00
	?debug	C E6034C656E0A02F4FF00035074721902F6FF00
	?debug	E
	?debug	C E31B000400161C00
	?debug	C E60954686973526F626F741B02FAFF00
	?debug	E
   ;	
   ;	    }
   ;	   }
   ;	  }
   ;	  else
   ;	  {
   ;	//   ThisRobot=NULL;
   ;	//   ThisHQ=(HQState *)ThisTask;
   ;	  }
   ;	 }
   ;	 ax=newax;
   ;	
	?debug	L 346
	mov	ax,word ptr [bp-2]
	mov	word ptr [bp+16],ax
   ;	
   ;	// _fmemcpy(SysVecs,MK_FP(0,0x34*4),SysVecs,12*4); (redundant)
   ;	 _fmemcpy(MK_FP(0,0x34*4),ThisTask->IntVecs,12*4);
   ;	
	?debug	L 348
	mov	ax,48
	push	ax
	mov	ax,word ptr DGROUP:_ThisTask
	add	ax,40
	push	word ptr DGROUP:_ThisTask+2
	push	ax
	xor	ax,ax
	mov	dx,208
	push	ax
	push	dx
	call	far ptr __fmemcpy
	add	sp,10
   ;	
   ;	 InSystem=0;
   ;	
	?debug	L 349
	mov	ax,seg _InSystem
	mov	es,ax
	mov	byte ptr es:_InSystem,0
   ;	
   ;	}
   ;	
	?debug	L 350
	mov	sp,bp
	pop	bp
	pop	di
	pop	si
	pop	ds
	pop	es
	pop	dx
	pop	cx
	pop	bx
	pop	ax
	iret	
	?debug	C E6056E657761780A02FEFF000262700A0A000000+
	?debug	C 0264690A0A0200000273690A0A0400000264730A+
	?debug	C 0A0600000265730A0A0800000264780A0A0A0000+
	?debug	C 0263780A0A0C00000262780A0A0E00000261780A+
	?debug	C 0A100000
	?debug	E
	?debug	E
_function	endp
   ;	
   ;	void do_function(RobotState *ThisRobot)
   ;	
	?debug	L 352
	assume	cs:RUN_TEXT
@do_function$qn10RobotState	proc	far
	?debug	B
	push	bp
	mov	bp,sp
	sub	sp,18
	push	si
	push	di
	?debug	C E60954686973526F626F741B0A060000
	?debug	B
   ;	
   ;	{
   ;	 switch(ax1)
   ;	
	?debug	L 354
	mov	bx,word ptr DGROUP:_ax1
	cmp	bx,128
	jbe	@@5
	jmp	@8@4174
@@5:
	shl	bx,1
	jmp	word ptr cs:@8@C4866[bx]
@8@114:
   ;	
   ;	 {
   ;	  case SWAPTASK:Swap=TRUE;
   ;	
	?debug	L 356
	mov	word ptr DGROUP:_Swap,1
   ;	
   ;	                break;
   ;	
	?debug	L 357
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@142:
   ;	
   ;	  case MOVEMENT:cx1%=360;
   ;	
	?debug	L 358
	mov	bx,360
	mov	ax,word ptr DGROUP:_cx1
	xor	dx,dx
	div	bx
	mov	word ptr DGROUP:_cx1,dx
   ;	
   ;	                switch(ThisRobot->ObstacleState)
   ;	
	?debug	L 359
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+327]
	or	ax,ax
	je	short @8@310
	cmp	ax,1
	je	short @8@422
	cmp	ax,2
	je	short @8@534
	jmp	@8@562
@8@310:
   ;	
   ;	                {
   ;	                 case NONE:if (bx1>ThisRobot->max_speed)
   ;	
	?debug	L 361
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+176]
	mov	word ptr [bp-6],ax
	cmp	ax,word ptr DGROUP:_bx1
	jae	short @8@366
   ;	
   ;		                    bx1=ThisRobot->max_speed;
   ;	
	?debug	L 362
	mov	word ptr DGROUP:_bx1,ax
@8@366:
   ;	
   ;		                   if (ThisRobot->speed<=ThisRobot->manouevre_speed)
   ;	
	?debug	L 363
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+156]
	cmp	ax,word ptr es:[bx+178]
	jg	short @8@562
   ;	
   ;		                    ThisRobot->iangle=cx1;
   ;	
	?debug	L 364
	mov	ax,word ptr DGROUP:_cx1
	mov	word ptr es:[bx+154],ax
	jmp	short @8@562
@8@422:
   ;	
   ;	                           break;
   ;	                 case CARRYING: //Half speed
   ;	                           if (bx1>ThisRobot->max_speed/2)
   ;	
	?debug	L 367
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+176]
	mov	word ptr [bp-6],ax
	cwd	
	sub	ax,dx
	sar	ax,1
	cmp	ax,word ptr DGROUP:_bx1
	jae	short @8@478
   ;	
   ;	                            bx1=ThisRobot->max_speed/2;
   ;	
	?debug	L 368
	mov	ax,word ptr [bp-6]
	cwd	
	sub	ax,dx
	sar	ax,1
	mov	word ptr DGROUP:_bx1,ax
@8@478:
   ;	
   ;		                   if (ThisRobot->speed<=ThisRobot->manouevre_speed/2)
   ;	
	?debug	L 369
	les	bx,dword ptr [bp+6]
	push	es
	mov	si,word ptr [bp+6]
	mov	ax,word ptr es:[si+178]
	cwd	
	sub	ax,dx
	sar	ax,1
	pop	es
	cmp	word ptr es:[bx+156],ax
	jg	short @8@562
   ;	
   ;		                    ThisRobot->iangle=cx1;
   ;	
	?debug	L 370
	mov	es,word ptr [bp+8]
	mov	ax,word ptr DGROUP:_cx1
	mov	word ptr es:[bx+154],ax
	jmp	short @8@562
@8@534:
   ;	
   ;	                           break;
   ;	                 case HOLDING: //Immobile
   ;	                           bx1=0;
   ;	
	?debug	L 373
	mov	word ptr DGROUP:_bx1,0
   ;	
   ;	                           break;
   ;	
	?debug	L 374
@8@562:
   ;	
   ;	                }
   ;		        ThisRobot->target_speed=bx1;
   ;	
	?debug	L 376
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr DGROUP:_bx1
	mov	word ptr es:[bx+174],ax
   ;	
   ;	                Swap=TRUE;
   ;	
	?debug	L 377
	mov	word ptr DGROUP:_Swap,1
   ;	
   ;		        break;
   ;	
	?debug	L 378
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@590:
   ;	
   ;	  case SCAN    :ax1=scan(bx1,cx1,bx1);
   ;	
	?debug	L 379
	push	ds
	mov	ax,offset DGROUP:_bx1
	push	ax
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_bx1
	call	far ptr @scan$quiuimui
	add	sp,8
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                Swap=TRUE;
   ;	
	?debug	L 380
	mov	word ptr DGROUP:_Swap,1
   ;	
   ;	                break;
   ;	
	?debug	L 381
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@618:
   ;	
   ;	  case SHOOT   :ax1=cannon(bx1,cx1);
   ;	
	?debug	L 382
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_bx1
	call	far ptr @cannon$quiui
	add	sp,4
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                Swap=TRUE;
   ;	
	?debug	L 383
	mov	word ptr DGROUP:_Swap,1
   ;	
   ;		        break;
   ;	
	?debug	L 384
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@646:
   ;	
   ;	//  case 0x04:get_remote_map(MK_FP(bx1,cx1),(dx1>>8)&0xff,(dx1&0xff));
   ;	//            break;
   ;	  case GETXY   :bx1=int(ThisRobot->curr_x/100l);
   ;	
	?debug	L 387
	xor	ax,ax
	mov	dx,100
	push	ax
	push	dx
	les	bx,dword ptr [bp+6]
	push	word ptr es:[bx+148]
	push	word ptr es:[bx+146]
	call	far ptr F_LDIV@
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		        cx1=int(ThisRobot->curr_y/100l);
   ;	
	?debug	L 388
	xor	ax,ax
	mov	dx,100
	push	ax
	push	dx
	les	bx,dword ptr [bp+6]
	push	word ptr es:[bx+152]
	push	word ptr es:[bx+150]
	call	far ptr F_LDIV@
	mov	word ptr DGROUP:_cx1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 389
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@674:
   ;	
   ;	  case TRANSMIT:ax1=Transmit(bx1,cx1);
   ;	
	?debug	L 390
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_bx1
	call	far ptr @Transmit$quiui
	add	sp,4
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 391
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@702:
   ;	
   ;	  case RECEIVE :ax1=receive(bx1,cx1);
   ;	
	?debug	L 392
	push	ds
	mov	ax,offset DGROUP:_cx1
	push	ax
	push	ds
	mov	ax,offset DGROUP:_bx1
	push	ax
	call	far ptr @receive$qmuit1
	add	sp,8
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 393
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@730:
   ;	
   ;	  case DAMAGE  :bx1=ThisRobot->armour;
   ;	
	?debug	L 394
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+166]
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 395
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@758:
   ;	
   ;	  case SPEED   :bx1=ThisRobot->speed;
   ;	
	?debug	L 396
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+156]
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 397
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@786:
   ;	
   ;	  case BATTERY :bx1=int(ThisRobot->Battery/battery_realunit);
   ;	
	?debug	L 398
	xor	ax,ax
	mov	dx,10
	push	ax
	push	dx
	les	bx,dword ptr [bp+6]
	push	word ptr es:[bx+160]
	push	word ptr es:[bx+158]
	call	far ptr F_LDIV@
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 399
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@814:
   ;	
   ;	  case TICKS   :bx1=(word)(Ticks>>16);
   ;	
	?debug	L 400
	mov	ax,seg _Ticks
	mov	es,ax
	mov	ax,word ptr es:_Ticks+2
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		        cx1=(word)(Ticks&0xffff);
   ;	
	?debug	L 401
	mov	ax,seg _Ticks
	mov	es,ax
	mov	ax,word ptr es:_Ticks
	and	ax,-1
	mov	word ptr DGROUP:_cx1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 402
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@842:
   ;	
   ;	  case L_SIN   :{
   ;		         bx1%=360;
   ;	
	?debug	L 404
	mov	bx,360
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	div	bx
	mov	word ptr DGROUP:_bx1,dx
	?debug	B
   ;	
   ;		         long answer=sint[bx1];
   ;	
	?debug	L 405
	mov	ax,word ptr DGROUP:_bx1
	mov	cl,2
	shl	ax,cl
	les	bx,dword ptr DGROUP:_sint
	add	bx,ax
	mov	ax,word ptr es:[bx+2]
	mov	dx,word ptr es:[bx]
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;		         bx1=(word)(answer>>16);
   ;	
	?debug	L 406
	cwd	
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		         cx1=(word)(answer&0xffff);
   ;	
	?debug	L 407
	mov	ax,word ptr [bp-10]
	mov	word ptr DGROUP:_cx1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@898:
	?debug	C E606616E737765720602F6FF00
	?debug	E
   ;	
   ;		        }
   ;		        break;
   ;	  case L_COS   :{
   ;		         bx1%=360;
   ;	
	?debug	L 411
	mov	bx,360
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	div	bx
	mov	word ptr DGROUP:_bx1,dx
	?debug	B
   ;	
   ;		         long answer=cost[bx1];
   ;	
	?debug	L 412
	mov	ax,word ptr DGROUP:_bx1
	mov	cl,2
	shl	ax,cl
	les	bx,dword ptr DGROUP:_cost
	add	bx,ax
	mov	ax,word ptr es:[bx+2]
	mov	dx,word ptr es:[bx]
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;		         bx1=(word)(answer>>16);
   ;	
	?debug	L 413
	cwd	
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		         cx1=(word)(answer&0xffff);
   ;	
	?debug	L 414
	mov	ax,word ptr [bp-10]
	mov	word ptr DGROUP:_cx1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@954:
	?debug	C E606616E737765720602F6FF00
	?debug	E
   ;	
   ;		        }
   ;		        break;
   ;	  case L_TAN   :{
   ;		         bx1%=360;
   ;	
	?debug	L 418
	mov	bx,360
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	div	bx
	mov	word ptr DGROUP:_bx1,dx
	?debug	B
   ;	
   ;		         long answer=tan(bx1*PI/180)*trig_scale;
   ;	
	?debug	L 419
	mov	ax,word ptr DGROUP:_bx1
	mov	word ptr [bp-4],ax
	mov	word ptr [bp-2],0
	fild	dword ptr [bp-4]
	fmul	qword ptr DGROUP:PI
	fdiv	dword ptr DGROUP:s@
	sub	sp,8
	fstp	qword ptr [bp-30]
	fwait	
	call	far ptr _tan
	add	sp,8
	fmul	dword ptr DGROUP:s@+4
	call	far ptr F_FTOL@
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         bx1=(word)(answer>>16);
   ;	
	?debug	L 420
	mov	ax,word ptr [bp-8]
	cwd	
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		         cx1=(word)(answer&0xffff);
   ;	
	?debug	L 421
	mov	ax,word ptr [bp-10]
	mov	word ptr DGROUP:_cx1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1010:
	?debug	C E606616E737765720602F6FF00
	?debug	E
	?debug	B
   ;	
   ;		        }
   ;		        break;
   ;	  case L_ATAN  :{
   ;		         long answer=(long(bx1)<<16)+cx1;
   ;	
	?debug	L 425
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	add	dx,word ptr DGROUP:_cx1
	adc	ax,0
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;		         ax1=atan((double)answer/trig_scale)*180/PI;
   ;	
	?debug	L 426
	mov	word ptr [bp-4],dx
	mov	word ptr [bp-2],ax
	fild	dword ptr [bp-4]
	fdiv	dword ptr DGROUP:s@+4
	sub	sp,8
	fstp	qword ptr [bp-30]
	fwait	
	call	far ptr _atan
	add	sp,8
	fmul	dword ptr DGROUP:s@
	fdiv	qword ptr DGROUP:PI
	call	far ptr F_FTOL@
	mov	word ptr DGROUP:_ax1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1038:
	?debug	C E606616E737765720602F6FF00
	?debug	E
	?debug	B
   ;	
   ;		        }
   ;		        break;
   ;	  case L_SQRT  :{
   ;		         long x=(long(bx1)<<16)+cx1;
   ;	
	?debug	L 430
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	add	dx,word ptr DGROUP:_cx1
	adc	ax,0
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;		         if (x<0)
   ;	
	?debug	L 431
	cmp	word ptr [bp-8],0
	jg	short @8@1150
	jl	short @8@1122
	cmp	word ptr [bp-10],0
	jae	short @8@1150
@8@1122:
   ;	
   ;		          x=-x;
   ;	
	?debug	L 432
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	neg	ax
	neg	dx
	sbb	ax,0
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
@8@1150:
   ;	
   ;		         x=sqrt(x)+0.5;
   ;	
	?debug	L 433
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	mov	word ptr [bp-4],dx
	mov	word ptr [bp-2],ax
	fild	dword ptr [bp-4]
	sub	sp,8
	fstp	qword ptr [bp-30]
	fwait	
	call	far ptr _sqrt
	add	sp,8
	fadd	dword ptr DGROUP:s@+8
	call	far ptr F_FTOL@
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         bx1=(word)(x>>16);
   ;	
	?debug	L 434
	mov	ax,word ptr [bp-8]
	cwd	
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		         cx1=(word)(x&0xffff);
   ;	
	?debug	L 435
	mov	ax,word ptr [bp-10]
	mov	word ptr DGROUP:_cx1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1178:
	?debug	C E601780602F6FF00
	?debug	E
	?debug	B
   ;	
   ;		        }
   ;		        break;
   ;	  case SETPATTN:{		//Change robot picture
   ;	#ifndef BORING
   ;		         char far *ptr=(char far *)MK_FP(bx1,cx1);
   ;	
	?debug	L 440
	mov	ax,word ptr DGROUP:_bx1
	mov	dx,word ptr DGROUP:_cx1
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;		         draw_robot(ptr);
   ;	
	?debug	L 441
	push	ax
	push	dx
	call	far ptr @draw_robot$qnzc
	add	sp,4
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1206:
	?debug	C E31D000400160200
	?debug	C E6037074721D02F6FF00
	?debug	E
   ;	
   ;	#endif
   ;		        }
   ;		        break;
   ;	  case DEBGFLAG:{		//Debug flag display
   ;	#ifndef BORING
   ;		         setcolor((cx1)?ThisRobot->RobotColour:BLACK);
   ;	
	?debug	L 447
	cmp	word ptr DGROUP:_cx1,0
	je	short @8@1262
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+253]
	jmp	short @8@1290
@8@1262:
	xor	ax,ax
@8@1290:
	push	ax
	call	far ptr _setcolor
	add	sp,2
   ;	
   ;		         outtextxy(570+(bx1&1)*10,NextTask*15+1,"#");
   ;	
	?debug	L 448
	push	ds
	mov	ax,offset DGROUP:s@+12
	push	ax
	mov	ax,word ptr DGROUP:_NextTask
	mov	dx,15
	imul	dx
	inc	ax
	push	ax
	mov	ax,word ptr DGROUP:_bx1
	and	ax,1
	mov	dx,10
	imul	dx
	add	ax,570
	push	ax
	call	far ptr _outtextxy
	add	sp,8
   ;	
   ;	#endif
   ;		        }
   ;		        break;
   ;	
	?debug	L 451
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1318:
   ;	
   ;	  case BUYARMOR:{
   ;		         buy_armour(bx1);
   ;	
	?debug	L 453
	push	word ptr DGROUP:_bx1
	call	far ptr @buy_armour$qi
	add	sp,2
   ;	
   ;		        }
   ;		        break;
   ;	
	?debug	L 455
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1346:
   ;	
   ;	  case BUYSHELS:{
   ;		         buy_shells(bx1);
   ;	
	?debug	L 457
	push	word ptr DGROUP:_bx1
	call	far ptr @buy_shells$qui
	add	sp,2
   ;	
   ;		        }
   ;		        break;
   ;	
	?debug	L 459
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1374:
   ;	
   ;	  case SHELSLFT:bx1=ThisRobot->shells_left;
   ;	
	?debug	L 460
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+164]
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 461
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1402:
   ;	
   ;	  case GETLOCMP:get_local_map(MK_FP(bx1,cx1));
   ;	
	?debug	L 462
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_cx1
	call	far ptr @get_local_map$qnv
	add	sp,4
   ;	
   ;		        break;
   ;	
	?debug	L 463
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1430:
   ;	
   ;	  case INVISIBL:{
   ;		         if (ThisRobot->invisibility)
   ;	
	?debug	L 465
	les	bx,dword ptr [bp+6]
	cmp	byte ptr es:[bx+256],0
	jne	@@6
	jmp	@8@4174
@@6:
   ;	
   ;		         {
   ;		          if ((bx1)&&(!ThisRobot->invisible))
   ;	
	?debug	L 467
	cmp	word ptr DGROUP:_bx1,0
	je	short @8@1570
	mov	al,byte ptr es:[bx+255]
	cbw	
	or	ax,ax
	jne	short @8@1570
   ;	
   ;		          {
   ;		           if (ThisRobot->invis_ctr>0)
   ;	
	?debug	L 469
	cmp	word ptr es:[bx+262],0
	jle	short @8@1570
   ;	
   ;			   bx1=FALSE;
   ;	
	?debug	L 470
	mov	word ptr DGROUP:_bx1,0
@8@1570:
   ;	
   ;		          }
   ;		          ThisRobot->invisible=bx1;
   ;	
	?debug	L 472
	les	bx,dword ptr [bp+6]
	mov	al,byte ptr DGROUP:_bx1
	mov	byte ptr es:[bx+255],al
   ;	
   ;	#ifndef BORING
   ;		          setcolor((bx1)?ThisRobot->RobotColour:BLACK);
   ;	
	?debug	L 474
	cmp	word ptr DGROUP:_bx1,0
	je	short @8@1626
	mov	ax,word ptr es:[bx+253]
	jmp	short @8@1654
@8@1626:
	xor	ax,ax
@8@1654:
	push	ax
	call	far ptr _setcolor
	add	sp,2
   ;	
   ;		          outtextxy(590,NextTask*15+1,"I");
   ;	
	?debug	L 475
	push	ds
	mov	ax,offset DGROUP:s@+14
	push	ax
	mov	ax,word ptr DGROUP:_NextTask
	mov	dx,15
	imul	dx
	inc	ax
	push	ax
	mov	ax,590
	push	ax
	call	far ptr _outtextxy
	add	sp,8
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1682:
   ;	
   ;	#endif
   ;		         }
   ;		        }
   ;		        break;
   ;	  case GTSHLSTT:bx1=ThisRobot->last_shell_state;
   ;	
	?debug	L 480
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+260]
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 481
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1710:
   ;	
   ;	  case ISINVISB:bx1=ThisRobot->invisible;
   ;	
	?debug	L 482
	les	bx,dword ptr [bp+6]
	mov	al,byte ptr es:[bx+255]
	cbw	
	mov	word ptr DGROUP:_bx1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 483
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1738:
   ;	
   ;	  case L_ATAN2 :{
   ;		         if ((bx1==0)&&(cx1==0))
   ;	
	?debug	L 485
	cmp	word ptr DGROUP:_bx1,0
	jne	short @8@1822
	cmp	word ptr DGROUP:_cx1,0
	jne	short @8@1822
   ;	
   ;		          ax1=0;
   ;	
	?debug	L 486
	mov	word ptr DGROUP:_ax1,0
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1822:
   ;	
   ;		         else
   ;		          ax1=atan2((int)bx1,(int)cx1)*180/PI;
   ;	
	?debug	L 488
	mov	ax,word ptr DGROUP:_cx1
	mov	word ptr [bp-4],ax
	fild	word ptr [bp-4]
	sub	sp,8
	fstp	qword ptr [bp-30]
	fwait	
	mov	ax,word ptr DGROUP:_bx1
	mov	word ptr [bp-4],ax
	fild	word ptr [bp-4]
	sub	sp,8
	fstp	qword ptr [bp-38]
	fwait	
	call	far ptr _atan2
	add	sp,16
	fmul	dword ptr DGROUP:s@
	fdiv	qword ptr DGROUP:PI
	call	far ptr F_FTOL@
	mov	word ptr DGROUP:_ax1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1850:
   ;	
   ;		        }
   ;		        break;
   ;	  case GETROBID: //Get_Robot_Id
   ;	                ax1=NextTask;
   ;	
	?debug	L 492
	mov	ax,word ptr DGROUP:_NextTask
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 493
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1878:
   ;	
   ;	  case REGIFF  :{ //Register_IFF_String
   ;	                 if (ThisRobot->IFF_String==NULL)
   ;	
	?debug	L 495
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+264]
	or	ax,word ptr es:[bx+266]
	je	@@7
	jmp	@8@4174
@@7:
   ;	
   ;	                 {
   ;	                  ThisRobot->IFF_String=_fstrdup((char *)MK_FP(bx1,cx1));
   ;	
	?debug	L 497
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_cx1
	call	far ptr __fstrdup
	add	sp,4
	les	bx,dword ptr [bp+6]
	mov	word ptr es:[bx+266],dx
	mov	word ptr es:[bx+264],ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1934:
   ;	
   ;	                 }
   ;	                }
   ;	                break;
   ;	  case CHECKIFF:{ //Check_IFF
   ;	                 if (ThisRobot->IFF_String==NULL)
   ;	
	?debug	L 502
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+264]
	or	ax,word ptr es:[bx+266]
	jne	short @8@1990
   ;	
   ;	                  ax1=0;
   ;	
	?debug	L 503
	mov	word ptr DGROUP:_ax1,0
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@1990:
   ;	
   ;	                 else
   ;	                 {
   ;	                  if (bx1>=NumRobots)
   ;	
	?debug	L 506
	mov	ax,word ptr DGROUP:_bx1
	cmp	ax,word ptr DGROUP:_NumRobots
	jb	short @8@2046
   ;	
   ;	                   ax1=0;
   ;	
	?debug	L 507
	mov	word ptr DGROUP:_ax1,0
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2046:
	?debug	B
   ;	
   ;	                  else
   ;	                  {
   ;	                   RobotState &RobotPtr=Robot[bx1];
   ;	
	?debug	L 510
	mov	ax,word ptr DGROUP:_bx1
	mov	dx,335
	imul	dx
	mov	dx,word ptr DGROUP:_Robot+2
	mov	bx,word ptr DGROUP:_Robot
	add	bx,ax
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],bx
   ;	
   ;	                   if (RobotPtr.Dead)
   ;	
	?debug	L 511
	mov	es,word ptr [bp-8]
	cmp	word ptr es:[bx+90],0
	je	short @8@2102
   ;	
   ;	                    ax1=0;
   ;	
	?debug	L 512
	mov	word ptr DGROUP:_ax1,0
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2102:
   ;	
   ;	                   else
   ;	                   {
   ;	                    if (strcmp(ThisRobot->IFF_String,RobotPtr.IFF_String)==0)
   ;	
	?debug	L 515
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+266]
	mov	si,word ptr es:[bx+264]
	les	bx,dword ptr [bp-10]
	les	di,dword ptr es:[bx+264]
	push	ax
	xor	ax,ax
	mov	cx,-1
	repnz 	scasb	
	not	cx
	sub	di,cx
	mov	ax,ds
	pop	ds
	push	ax
	xor	ax,ax
	repz 	cmpsb	
	pop	ds
	je	short @8@2158
	sbb	ax,ax
	sbb	ax,-1
@8@2158:
	or	ax,ax
	jne	short @8@2214
   ;	
   ;	                     ax1=1;
   ;	
	?debug	L 516
	mov	word ptr DGROUP:_ax1,1
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2214:
   ;	
   ;	                    else
   ;	                     ax1=0;
   ;	
	?debug	L 518
	mov	word ptr DGROUP:_ax1,0
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2242:
	?debug	C E31E000400351C00
	?debug	C E608526F626F745074721E02F6FF00
	?debug	E
   ;	
   ;	                   }
   ;	                  }
   ;	                 }
   ;	                }
   ;	                break;
   ;	  case REGNAME :{ //Register_Name_String
   ;	                 if (ThisRobot->NameString==NULL)
   ;	
	?debug	L 525
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+268]
	or	ax,word ptr es:[bx+270]
	je	@@8
	jmp	@8@4174
@@8:
   ;	
   ;	                 {
   ;	                  ThisRobot->NameString=_fstrdup((char *)MK_FP(bx1,cx1));
   ;	
	?debug	L 527
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_cx1
	call	far ptr __fstrdup
	add	sp,4
	les	bx,dword ptr [bp+6]
	mov	word ptr es:[bx+270],dx
	mov	word ptr es:[bx+268],ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2298:
	?debug	B
   ;	
   ;	                 }
   ;	                }
   ;	                break;
   ;	  case FINDNAME:{ //Find_Name
   ;	                 char far *Ptr=(char far *)MK_FP(bx1,cx1);
   ;	
	?debug	L 532
	mov	ax,word ptr DGROUP:_bx1
	mov	dx,word ptr DGROUP:_cx1
	mov	word ptr [bp-8],ax
	mov	word ptr [bp-10],dx
   ;	
   ;	                 if (Ptr==NULL)
   ;	
	?debug	L 533
	mov	ax,word ptr [bp-10]
	or	ax,word ptr [bp-8]
	jne	short @8@2354
   ;	
   ;	                  ax1=-1;
   ;	
	?debug	L 534
	mov	word ptr DGROUP:_ax1,-1
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2354:
	?debug	B
   ;	
   ;	                 else
   ;	                 {
   ;	                  int found=-1;
   ;	
	?debug	L 537
	mov	word ptr [bp-12],-1
   ;	
   ;	                  for (int i=dx1;i<NumRobots;i++)
   ;	
	?debug	L 538
	mov	ax,word ptr DGROUP:_dx1
	mov	word ptr [bp-14],ax
	cmp	ax,word ptr DGROUP:_NumRobots
	jge	short @8@2634
@8@2410:
   ;	
   ;	                  {
   ;	                   if (i==NextTask)
   ;	
	?debug	L 540
	mov	ax,word ptr [bp-14]
	cmp	ax,word ptr DGROUP:_NextTask
	je	short @8@2578
	?debug	B
   ;	
   ;	                    continue;
   ;	                   RobotState &RobotPtr=Robot[i];
   ;	
	?debug	L 542
	mov	dx,335
	imul	dx
	mov	dx,word ptr DGROUP:_Robot+2
	mov	bx,word ptr DGROUP:_Robot
	add	bx,ax
	mov	word ptr [bp-16],dx
	mov	word ptr [bp-18],bx
   ;	
   ;	                   if (RobotPtr.NameString==NULL)
   ;	
	?debug	L 543
	mov	es,word ptr [bp-16]
	mov	ax,word ptr es:[bx+268]
	or	ax,word ptr es:[bx+270]
	je	short @8@2578
   ;	
   ;	                    continue;
   ;	                   if (strcmp(Ptr,RobotPtr.NameString)==0)
   ;	
	?debug	L 545
	les	di,dword ptr es:[bx+268]
	mov	ax,word ptr [bp-8]
	mov	si,word ptr [bp-10]
	push	ax
	xor	ax,ax
	mov	cx,-1
	repnz 	scasb	
	not	cx
	sub	di,cx
	mov	ax,ds
	pop	ds
	push	ax
	xor	ax,ax
	repz 	cmpsb	
	pop	ds
	je	short @8@2522
	sbb	ax,ax
	sbb	ax,-1
@8@2522:
	or	ax,ax
	jne	short @8@2578
   ;	
   ;	                   {
   ;	                    found=i;
   ;	
	?debug	L 547
	mov	ax,word ptr [bp-14]
	mov	word ptr [bp-12],ax
   ;	
   ;	                    break;
   ;	
	?debug	L 548
	jmp	short @8@2634
@8@2578:
	?debug	C E608526F626F745074721E02EEFF00
	?debug	E
	?debug	L 538
	inc	word ptr [bp-14]
	mov	ax,word ptr [bp-14]
	cmp	ax,word ptr DGROUP:_NumRobots
	jl	short @8@2410
@8@2634:
   ;	
   ;	                   }
   ;	                  }
   ;	                  ax1=found;
   ;	
	?debug	L 551
	mov	ax,word ptr [bp-12]
	mov	word ptr DGROUP:_ax1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2662:
	?debug	C E601690402F2FF0005666F756E640402F4FF00
	?debug	E
	?debug	C E6035074721D02F6FF00
	?debug	E
   ;	
   ;	                 }
   ;	                }
   ;	                break;
   ;	  case GETTMID :   //Get My team ID
   ;	                ax1=ThisRobot->Team;
   ;	
	?debug	L 556
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+88]
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 557
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2690:
   ;	
   ;	  case GTASHLST:   //Get specified shell state
   ;	                ax1=get_shell_state(bx1);
   ;	
	?debug	L 559
	push	word ptr DGROUP:_bx1
	call	far ptr @get_shell_state$qui
	add	sp,2
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;		        break;
   ;	
	?debug	L 560
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2718:
	?debug	B
   ;	
   ;	  case REG_X   :{		//Register_x_var
   ;		         dword temp=((dword)bx1<<4)|cx1;
   ;	
	?debug	L 562
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	or	ax,word ptr DGROUP:_cx1
	or	dx,0
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         dword temp2=((dword)ThisRobot->segment)<<4;
   ;	
	?debug	L 563
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+6]
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	mov	word ptr [bp-12],dx
	mov	word ptr [bp-14],ax
   ;	
   ;		         if ((temp<temp2)||(temp>temp2+(65536L-sizeof(*(ThisRobot->xVar)))))
   ;	
	?debug	L 564
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	cmp	ax,word ptr [bp-12]
	jb	short @8@2886
	jne	short @8@2802
	cmp	dx,word ptr [bp-14]
	jb	short @8@2886
@8@2802:
	mov	ax,word ptr [bp-12]
	mov	dx,word ptr [bp-14]
	add	dx,-2
	adc	ax,0
	cmp	ax,word ptr [bp-8]
	ja	short @8@2914
	jb	short @8@2886
	cmp	dx,word ptr [bp-10]
	jae	short @8@2914
@8@2886:
   ;	
   ;		         {
   ;		          ax1=0;
   ;	
	?debug	L 566
	mov	word ptr DGROUP:_ax1,0
   ;	
   ;		         }
   ;	
	?debug	L 567
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2914:
   ;	
   ;		         else
   ;		         {
   ;		          ThisRobot->xVar=(int far *)MK_FP(bx1,cx1);
   ;	
	?debug	L 570
	mov	ax,word ptr DGROUP:_bx1
	mov	dx,word ptr DGROUP:_cx1
	les	bx,dword ptr [bp+6]
	mov	word ptr es:[bx+274],ax
	mov	word ptr es:[bx+272],dx
   ;	
   ;		          ax1=1;
   ;	
	?debug	L 571
	mov	word ptr DGROUP:_ax1,1
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@2942:
	?debug	C E60574656D70320C02F2FF000474656D700C02F6+
	?debug	C FF00
	?debug	E
	?debug	B
   ;	
   ;		         }
   ;		        }
   ;		        break;
   ;	  case REG_Y   :{		//Register_y_var
   ;		         dword temp=((dword)bx1<<4)|cx1;
   ;	
	?debug	L 576
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	or	ax,word ptr DGROUP:_cx1
	or	dx,0
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         dword temp2=((dword)ThisRobot->segment)<<4;
   ;	
	?debug	L 577
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+6]
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	mov	word ptr [bp-12],dx
	mov	word ptr [bp-14],ax
   ;	
   ;		         if ((temp<temp2)||(temp>temp2+(65536L-sizeof(*(ThisRobot->yVar)))))
   ;	
	?debug	L 578
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	cmp	ax,word ptr [bp-12]
	jb	short @8@3110
	jne	short @8@3026
	cmp	dx,word ptr [bp-14]
	jb	short @8@3110
@8@3026:
	mov	ax,word ptr [bp-12]
	mov	dx,word ptr [bp-14]
	add	dx,-2
	adc	ax,0
	cmp	ax,word ptr [bp-8]
	ja	short @8@3138
	jb	short @8@3110
	cmp	dx,word ptr [bp-10]
	jae	short @8@3138
@8@3110:
   ;	
   ;		         {
   ;		          ax1=0;
   ;	
	?debug	L 580
	mov	word ptr DGROUP:_ax1,0
   ;	
   ;		         }
   ;	
	?debug	L 581
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3138:
   ;	
   ;		         else
   ;		         {
   ;		          ThisRobot->yVar=(int far *)MK_FP(bx1,cx1);
   ;	
	?debug	L 584
	mov	ax,word ptr DGROUP:_bx1
	mov	dx,word ptr DGROUP:_cx1
	les	bx,dword ptr [bp+6]
	mov	word ptr es:[bx+278],ax
	mov	word ptr es:[bx+276],dx
   ;	
   ;		          ax1=1;
   ;	
	?debug	L 585
	mov	word ptr DGROUP:_ax1,1
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3166:
	?debug	C E60574656D70320C02F2FF000474656D700C02F6+
	?debug	C FF00
	?debug	E
	?debug	B
   ;	
   ;		         }
   ;		        }
   ;		        break;
   ;	  case REG_DATA:{
   ;		         dword temp=((dword)bx1<<4)|cx1;
   ;	
	?debug	L 590
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	or	ax,word ptr DGROUP:_cx1
	or	dx,0
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         dword temp2=((dword)ThisRobot->segment)<<4;
   ;	
	?debug	L 591
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+6]
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	mov	word ptr [bp-12],dx
	mov	word ptr [bp-14],ax
   ;	
   ;		         if ((temp<temp2)||(temp>temp2+(65536L-sizeof(*(ThisRobot->DataVar)))))
   ;	
	?debug	L 592
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	cmp	ax,word ptr [bp-12]
	jb	short @8@3334
	jne	short @8@3250
	cmp	dx,word ptr [bp-14]
	jb	short @8@3334
@8@3250:
	mov	ax,word ptr [bp-12]
	mov	dx,word ptr [bp-14]
	add	dx,-20
	adc	ax,0
	cmp	ax,word ptr [bp-8]
	ja	short @8@3362
	jb	short @8@3334
	cmp	dx,word ptr [bp-10]
	jae	short @8@3362
@8@3334:
   ;	
   ;		         {
   ;		          ax1=0;
   ;	
	?debug	L 594
	mov	word ptr DGROUP:_ax1,0
   ;	
   ;		         }
   ;	
	?debug	L 595
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3362:
   ;	
   ;		         else
   ;		         {
   ;		          ThisRobot->DataVar=(DataStruct far *)MK_FP(bx1,cx1);
   ;	
	?debug	L 598
	mov	ax,word ptr DGROUP:_bx1
	mov	dx,word ptr DGROUP:_cx1
	les	bx,dword ptr [bp+6]
	mov	word ptr es:[bx+282],ax
	mov	word ptr es:[bx+280],dx
   ;	
   ;		          ax1=1;
   ;	
	?debug	L 599
	mov	word ptr DGROUP:_ax1,1
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3390:
	?debug	C E60574656D70320C02F2FF000474656D700C02F6+
	?debug	C FF00
	?debug	E
   ;	
   ;		         }
   ;	                }
   ;	                break;
   ;	  case FILTCOMM:ax1=FilterComms(ax1,bx1);
   ;	
	?debug	L 603
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_ax1
	call	far ptr @FilterComms$qii
	add	sp,4
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 604
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3418:
	?debug	B
   ;	
   ;	  case TXBLOCK :{   //Transmit a block of data
   ;		         dword temp=((dword)bx1<<4)|cx1;
   ;	
	?debug	L 606
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	or	ax,word ptr DGROUP:_cx1
	or	dx,0
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         dword temp2=((dword)ThisRobot->segment)<<4;
   ;	
	?debug	L 607
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+6]
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	mov	word ptr [bp-12],dx
	mov	word ptr [bp-14],ax
   ;	
   ;		         if ((temp<temp2)||(temp>temp2+(65536L-dx1)))
   ;	
	?debug	L 608
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	cmp	ax,word ptr [bp-12]
	jb	short @8@3586
	jne	short @8@3502
	cmp	dx,word ptr [bp-14]
	jb	short @8@3586
@8@3502:
	mov	ax,1
	xor	dx,dx
	sub	dx,word ptr DGROUP:_dx1
	sbb	ax,0
	mov	bx,word ptr [bp-12]
	mov	cx,word ptr [bp-14]
	add	cx,dx
	adc	bx,ax
	cmp	bx,word ptr [bp-8]
	ja	short @8@3614
	jb	short @8@3586
	cmp	cx,word ptr [bp-10]
	jae	short @8@3614
@8@3586:
   ;	
   ;		         {
   ;		          ax1=0;
   ;	
	?debug	L 610
	mov	word ptr DGROUP:_ax1,0
   ;	
   ;		         }
   ;	
	?debug	L 611
	jmp	short @8@3642
@8@3614:
   ;	
   ;	                 else
   ;	                 {
   ;	                  ax1=TransmitBlock(si1,(char *)MK_FP(bx1,cx1),dx1);
   ;	
	?debug	L 614
	push	word ptr DGROUP:_dx1
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_si1
	call	far ptr @TransmitBlock$quinzcui
	add	sp,8
	mov	word ptr DGROUP:_ax1,ax
@8@3642:
	?debug	C E60574656D70320C02F2FF000474656D700C02F6+
	?debug	C FF00
	?debug	E
   ;	
   ;	                 }
   ;	                }
   ;	                Swap=TRUE;
   ;	
	?debug	L 617
	mov	word ptr DGROUP:_Swap,1
   ;	
   ;	                break;
   ;	
	?debug	L 618
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3670:
	?debug	B
   ;	
   ;	  case RXBLOCK :{   //Receive a block of data
   ;		         dword temp=((dword)bx1<<4)|cx1;
   ;	
	?debug	L 620
	mov	ax,word ptr DGROUP:_bx1
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	or	ax,word ptr DGROUP:_cx1
	or	dx,0
	mov	word ptr [bp-8],dx
	mov	word ptr [bp-10],ax
   ;	
   ;		         dword temp2=((dword)ThisRobot->segment)<<4;
   ;	
	?debug	L 621
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+6]
	xor	dx,dx
	mov	cl,4
	call	far ptr F_LXLSH@
	mov	word ptr [bp-12],dx
	mov	word ptr [bp-14],ax
   ;	
   ;		         if ((temp<temp2)||(temp>temp2+(65536L-dx1)))
   ;	
	?debug	L 622
	mov	ax,word ptr [bp-8]
	mov	dx,word ptr [bp-10]
	cmp	ax,word ptr [bp-12]
	jb	short @8@3838
	jne	short @8@3754
	cmp	dx,word ptr [bp-14]
	jb	short @8@3838
@8@3754:
	mov	ax,1
	xor	dx,dx
	sub	dx,word ptr DGROUP:_dx1
	sbb	ax,0
	mov	bx,word ptr [bp-12]
	mov	cx,word ptr [bp-14]
	add	cx,dx
	adc	bx,ax
	cmp	bx,word ptr [bp-8]
	ja	short @8@3866
	jb	short @8@3838
	cmp	cx,word ptr [bp-10]
	jae	short @8@3866
@8@3838:
   ;	
   ;		         {
   ;		          ax1=0;
   ;	
	?debug	L 624
	mov	word ptr DGROUP:_ax1,0
   ;	
   ;		         }
   ;	
	?debug	L 625
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3866:
   ;	
   ;	                 else
   ;	                 {
   ;	                  ax1=ReceiveBlock(si1,(char *)MK_FP(bx1,cx1),dx1);
   ;	
	?debug	L 628
	push	word ptr DGROUP:_dx1
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_si1
	call	far ptr @ReceiveBlock$quinzcui
	add	sp,8
	mov	word ptr DGROUP:_ax1,ax
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3894:
	?debug	C E60574656D70320C02F2FF000474656D700C02F6+
	?debug	C FF00
	?debug	E
   ;	
   ;	                 }
   ;	                }
   ;	                break;
   ;	  case DISCBLCK:DiscardBlock(bx1);
   ;	
	?debug	L 632
	push	word ptr DGROUP:_bx1
	call	far ptr @DiscardBlock$qui
	add	sp,2
   ;	
   ;	                break;
   ;	
	?debug	L 633
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3922:
   ;	
   ;	  case TXBLKFRE:ax1=TransmitFree();
   ;	
	?debug	L 634
	call	far ptr @TransmitFree$qv
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 635
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3950:
   ;	
   ;	  case RXBLKINF:ax1=ReceiveInfo(bx1,bx1,cx1);
   ;	
	?debug	L 636
	push	ds
	mov	ax,offset DGROUP:_cx1
	push	ax
	push	ds
	mov	ax,offset DGROUP:_bx1
	push	ax
	push	word ptr DGROUP:_bx1
	call	far ptr @ReceiveInfo$quimuit2
	add	sp,10
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 637
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@3978:
   ;	
   ;	  case PICKOBST:ax1=PickupObstacle(bx1);
   ;	
	?debug	L 638
	push	word ptr DGROUP:_bx1
	call	far ptr @PickupObstacle$qi
	add	sp,2
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 639
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@4006:
   ;	
   ;	  case DROPOBST:ax1=DropObstacle(NextTask,bx1);
   ;	
	?debug	L 640
	xor	ax,ax
	xor	dx,dx
	push	ax
	push	dx
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_NextTask
	call	far ptr @DropObstacle$qiini
	add	sp,8
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 641
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@4034:
   ;	
   ;	  case OBSTATE :ax1=ThisRobot->ObstacleState;
   ;	
	?debug	L 642
	les	bx,dword ptr [bp+6]
	mov	ax,word ptr es:[bx+327]
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 643
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@4062:
   ;	
   ;	  case HOLDOBST:ax1=HoldObstacle(NextTask,bx1);
   ;	
	?debug	L 644
	push	word ptr DGROUP:_bx1
	push	word ptr DGROUP:_NextTask
	call	far ptr @HoldObstacle$qii
	add	sp,4
	mov	word ptr DGROUP:_ax1,ax
   ;	
   ;	                break;
   ;	
	?debug	L 645
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@4090:
   ;	
   ;	  case CONFIG  :{		//configure robot
   ;		         if (Ticks==0)
   ;	
	?debug	L 647
	mov	ax,seg _Ticks
	mov	es,ax
	mov	ax,word ptr es:_Ticks
	or	ax,word ptr es:_Ticks+2
	jne	short @8@4146
   ;	
   ;		         {
   ;		          ax1=(MajorVERS<<8)|(MinorVERS);
   ;	
	?debug	L 649
	mov	word ptr DGROUP:_ax1,299
   ;	
   ;		          configure_robot(ThisRobot,bx1,cx1);
   ;	
	?debug	L 650
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_bx1
	push	word ptr [bp+8]
	push	word ptr [bp+6]
	call	far ptr @configure_robot$qn10RobotStateuiui
	add	sp,8
   ;	
   ;	                  ThisRobot->ConfigureRobot(bx1,cx1);
   ;	
	?debug	L 651
	push	word ptr DGROUP:_cx1
	push	word ptr DGROUP:_bx1
	push	word ptr [bp+8]
	push	word ptr [bp+6]
	call	far ptr @RobotState@ConfigureRobot$quiui
	add	sp,8
   ;	
   ;		         }
   ;	
	?debug	L 652
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
@8@4146:
   ;	
   ;		         else
   ;		          ax1=0;
   ;	
	?debug	L 654
	mov	word ptr DGROUP:_ax1,0
@8@4174:
   ;	
   ;		        }
   ;		        break;
   ;	 }
   ;	}
   ;	
	?debug	L 658
	pop	di
	pop	si
	mov	sp,bp
	pop	bp
	ret	
	?debug	C E60954686973526F626F741B0A060000
	?debug	E
	?debug	E
@do_function$qn10RobotState	endp
@8@C4866	label	word
	dw	@8@114
	dw	@8@142
	dw	@8@590
	dw	@8@618
	dw	@8@4174
	dw	@8@3418
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@646
	dw	@8@674
	dw	@8@702
	dw	@8@730
	dw	@8@758
	dw	@8@786
	dw	@8@814
	dw	@8@842
	dw	@8@898
	dw	@8@954
	dw	@8@1010
	dw	@8@1038
	dw	@8@1178
	dw	@8@1206
	dw	@8@1318
	dw	@8@1346
	dw	@8@1374
	dw	@8@1402
	dw	@8@1430
	dw	@8@1682
	dw	@8@1710
	dw	@8@1738
	dw	@8@1850
	dw	@8@1878
	dw	@8@1934
	dw	@8@2242
	dw	@8@2298
	dw	@8@2662
	dw	@8@2690
	dw	@8@2718
	dw	@8@2942
	dw	@8@3166
	dw	@8@3390
	dw	@8@4174
	dw	@8@3670
	dw	@8@3950
	dw	@8@3894
	dw	@8@3922
	dw	@8@3978
	dw	@8@4006
	dw	@8@4034
	dw	@8@4062
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4174
	dw	@8@4090
   ;	
   ;	void KillRobot(TaskState *Task)
   ;	
	?debug	L 660
	assume	cs:RUN_TEXT
@KillRobot$qn9TaskState	proc	far
	?debug	B
	push	bp
	mov	bp,sp
	?debug	C E31F000400162000
	?debug	C E6045461736B1F0A060000
	?debug	B
   ;	
   ;	{
   ;	 Task->Dead=TRUE;
   ;	
	?debug	L 662
	les	bx,dword ptr [bp+6]
	mov	word ptr es:[bx+90],1
   ;	
   ;	 if (Task->isA(RobotTask))
   ;	
	?debug	L 663
	cmp	word ptr es:[bx+144],2
	jne	short @9@86
	mov	ax,1
	jmp	short @9@114
@9@86:
	xor	ax,ax
@9@114:
	or	ax,ax
	je	short @9@282
   ;	
   ;	 {
   ;	  if (Task->Team>=0)
   ;	
	?debug	L 665
	les	bx,dword ptr [bp+6]
	cmp	word ptr es:[bx+88],0
	jl	short @9@226
   ;	
   ;	  {
   ;	   if ( (--Team[Task->Team].Survivors) ==0)
   ;	
	?debug	L 667
	mov	ax,word ptr es:[bx+88]
	mov	dx,18
	imul	dx
	mov	bx,ax
	dec	word ptr DGROUP:_Team[bx+10]
	jne	short @9@254
   ;	
   ;	    AliveTeams--;
   ;	
	?debug	L 668
	dec	word ptr DGROUP:_AliveTeams
	jmp	short @9@254
@9@226:
   ;	
   ;	  }
   ;	  else
   ;	   LoneRobots--;
   ;	
	?debug	L 671
	dec	word ptr DGROUP:_LoneRobots
@9@254:
   ;	
   ;	  alive_robots--;
   ;	
	?debug	L 672
	dec	word ptr DGROUP:_alive_robots
@9@282:
   ;	
   ;	 }
   ;	}
   ;	
	?debug	L 674
	pop	bp
	ret	
	?debug	C E6045461736B1F0A060000
	?debug	E
	?debug	E
@KillRobot$qn9TaskState	endp
	?debug	C E9
	?debug	C FA81000000
RUN_TEXT	ends
_DATA	segment word public 'DATA'
s@	label	byte
	db	0
	db	0
	db	'4C'
	db	0
	db	'P'
	db	195
	db	'G'
	db	0
	db	0
	db	0
	db	'?#'
	db	0
	db	'I'
	db	0
_DATA	ends
RUN_TEXT	segment byte public 'CODE'
RUN_TEXT	ends
	?debug	C E320095461736B537461746592002E02
	?debug	C ED000200000C0D00
	?debug	C E3210000002D0404092000
	?debug	C E3230010001A0A
	?debug	C E324000A001A02
	?debug	C E3250030001A0C
	?debug	C E3270D5458426C6F636B53747275637408001E26
	?debug	C E326000400162700
	?debug	C E3280017001A08
	?debug	C E329000400160A00
	?debug	C E32A000400160800
	?debug	C E31C0A526F626F7453746174654F012E01
	?debug	C ED000100002B0D010200
	?debug	C E32B0000002D1B04091C00
	?debug	C E32D0000002D0104011C002040526F626F745374+
	?debug	C 61746540436F6E666967757265526F626F742471+
	?debug	C 75697569
	?debug	C E32F0028001A0A
	?debug	C E3300014001A08
	?debug	C E331000400160400
	?debug	C E3320014001A0A
	?debug	C E3330014001A04
	?debug	C E334074F425354415445020022000080FF7F58
	?debug	C E3370748515374617465E6002E03
	?debug	C ED000300005B0D010200
	?debug	C E3380000002D3604093700
	?debug	C E33A0050001A1B
	?debug	C E336000400163700
	extrn	F_LXLSH@:far
	extrn	F_FTOL@:far
	extrn	F_LDIV@:far
	public	_Swap
	public	_si1
	public	_dx1
	public	_cx1
	public	_bx1
	public	_ax1
	public	_SysVecs
	public	_C_setvect
	public	_killrun
	public	@test_timer$qv
_PI	equ	PI
	extrn	_KillFlag:byte
	extrn	_InSystem:byte
	public	_RobotTimeout
	public	_Timeout
	public	_bp_master
	public	_sp_master
	public	_ss_master
	extrn	_EmsHandle:word
	extrn	_NumTeams:word
	extrn	_Team:word
	extrn	_Ticks:word
	extrn	_NumHQs:word
	extrn	_NumRobots:word
	extrn	_NextTask:word
	extrn	_LoneRobots:word
	public	_AliveTeams
	extrn	_alive_robots:word
	extrn	_slowmode:word
	extrn	_InDos:word
	extrn	_cost:dword
	extrn	_sint:dword
	extrn	_HQ:dword
	extrn	_Robot:dword
	extrn	_ThisTask:dword
	public	_killtask
	extrn	_int1bvec:word
	extrn	_int67vec:word
	extrn	_int2fvec:word
	extrn	_int26vec:word
	extrn	_int25vec:word
	extrn	_int21vec:word
	extrn	_int1avec:word
	extrn	_int16vec:word
	extrn	_int15vec:word
	extrn	_int13vec:word
	public	@timer_tick$qv
	extrn	_oldtimerint:dword
	extrn	_inte3vec:dword
	extrn	_inte2vec:dword
	extrn	_int10vec:dword
	extrn	@DoHQFunction$qv:far
	public	@KillRobot$qn9TaskState
	public	@run$qv
	public	_function
	extrn	@draw_robot$qnzc:far
	extrn	@RobotState@ConfigureRobot$quiui:far
	extrn	@MyIntE2$quiuiuiuiuiuiuiuiui:far
	extrn	_MyInt10:far
	extrn	_MyInt1b:far
	extrn	_MyInt67:far
	extrn	_MyInt2f:far
	extrn	_MyInt26:far
	extrn	_MyInt25:far
	extrn	_MyInt21:far
	extrn	_MyInt1a:far
	extrn	_MyInt16:far
	extrn	_MyInt15:far
	extrn	_MyInt13:far
	extrn	@HoldObstacle$qii:far
	extrn	@DropObstacle$qiini:far
	extrn	@PickupObstacle$qi:far
	extrn	@ReceiveInfo$quimuit2:far
	extrn	@TransmitFree$qv:far
	extrn	@DiscardBlock$qui:far
	extrn	@ReceiveBlock$quinzcui:far
	extrn	@TransmitBlock$quinzcui:far
	extrn	@FilterComms$qii:far
	extrn	@get_shell_state$qui:far
	extrn	@get_local_map$qnv:far
	extrn	@buy_shells$qui:far
	extrn	@buy_armour$qi:far
	extrn	@configure_robot$qn10RobotStateuiui:far
	extrn	@receive$qmuit1:far
	extrn	@Transmit$quiui:far
	extrn	@cannon$quiui:far
	extrn	@scan$quiuimui:far
	extrn	@move$qv:far
	extrn	__fstrdup:far
	extrn	__fmemcpy:far
_atoi	equ	atoi
_abs	equ	abs
	extrn	_tan:far
	extrn	_sqrt:far
	extrn	_atan2:far
	extrn	_atan:far
	extrn	_setcolor:far
	extrn	_outtextxy:far
	extrn	_setvect:far
	extrn	_getvect:far
_pokeb	equ	pokeb
_poke	equ	poke
_peekb	equ	peekb
_peek	equ	peek
_s@	equ	s@
	?debug	C EA050C
	?debug	C E33B00000023040500
	?debug	C EB08465F4C584C5348403B00
	?debug	C EB07465F46544F4C403B00
	?debug	C EB07465F4C444956403B00
	?debug	C E33C00000023010400
	?debug	C EC055F537761700A0000
	?debug	C EC045F7369310A0000
	?debug	C EC045F6478310A0000
	?debug	C EC045F6378310A0000
	?debug	C EC045F6278310A0000
	?debug	C EC045F6178310A0000
	?debug	C E33D0030001A0C
	?debug	C EC085F537973566563733D0000
	?debug	C E33E00000023010400
	?debug	C EC0A5F435F736574766563743E1800
	?debug	C E33F00000023010400
	?debug	C EC085F6B696C6C72756E3F1800
	?debug	C E34000000023010700
	?debug	C EC0E40746573745F74696D6572247176409800
	?debug	C EB095F4B696C6C466C61670800
	?debug	C EB095F496E53797374656D0800
	?debug	C EC0D5F526F626F7454696D656F75740A0000
	?debug	C EC085F54696D656F75740A0000
	?debug	C EC0A5F62705F6D61737465720A0000
	?debug	C EC0A5F73705F6D61737465720A0000
	?debug	C EC0A5F73735F6D61737465720A0000
	?debug	C E34100000023010400
	?debug	C E34200000023010400
	?debug	C E34300000023010400
	?debug	C E34400000023040400
	?debug	C EB0A5F456D7348616E646C650A00
	?debug	C EB095F4E756D5465616D730400
	?debug	C E346045445414D12002E04
	?debug	C ED00040000610D00
	?debug	C E347000400164600
	?debug	C E3480000002D4704094600
	?debug	C E3450000001A46
	?debug	C EB055F5465616D4500
	?debug	C EB065F5469636B730C00
	?debug	C EB075F4E756D4851730400
	?debug	C EB0A5F4E756D526F626F74730400
	?debug	C EB095F4E6578745461736B0400
	?debug	C EB0B5F4C6F6E65526F626F74730400
	?debug	C EC0B5F416C6976655465616D73040000
	?debug	C EB0D5F616C6976655F726F626F74730400
	?debug	C EB095F736C6F776D6F64650400
	?debug	C EB065F496E446F730600
	?debug	C E34A000400160600
	?debug	C EB055F636F73744A00
	?debug	C EB055F73696E744A00
	?debug	C EB035F48513600
	?debug	C EB065F526F626F741B00
	?debug	C EB095F546869735461736B1F00
	?debug	C E34B00000023010400
	?debug	C EC095F6B696C6C7461736B4B1800
	?debug	C EB095F696E7431627665630600
	?debug	C EB095F696E7436377665630600
	?debug	C EB095F696E7432667665630600
	?debug	C EB095F696E7432367665630600
	?debug	C EB095F696E7432357665630600
	?debug	C EB095F696E7432317665630600
	?debug	C EB095F696E7431617665630600
	?debug	C EB095F696E7431367665630600
	?debug	C EB095F696E7431357665630600
	?debug	C EB095F696E7431337665630600
	?debug	C E34C00000023010700
	?debug	C EC0E4074696D65725F7469636B2471764C9800
	?debug	C E34E00000023010701
	?debug	C E34D000400164E00
	?debug	C EB0C5F6F6C6474696D6572696E744D00
	?debug	C E35000000023010701
	?debug	C E34F000400165000
	?debug	C EB095F696E7465337665634F00
	?debug	C E35200000023010701
	?debug	C E351000400165200
	?debug	C EB095F696E7465327665635100
	?debug	C E35400000023010701
	?debug	C E353000400165400
	?debug	C EB095F696E7431307665635300
	?debug	C E35500000023010400
	?debug	C EB1040446F485146756E6374696F6E2471765500
	?debug	C E35600000023010400
	?debug	C EC17404B696C6C526F626F7424716E395461736B+
	?debug	C 5374617465561800
	?debug	C E35700000023010700
	?debug	C EC074072756E247176579800
	?debug	C E35800000023010700
	?debug	C EC095F66756E6374696F6E589800
	?debug	C E35900000023010400
	?debug	C EB1040647261775F726F626F7424716E7A635900
	?debug	C E35A084F42535441434C4508002E05
	?debug	C ED000500006A0D00
	?debug	C E35B000400165A00
	?debug	C E35C0000002D5B04095A00
	?debug	C E35E084D656D426C6F636B10001E70
	?debug	C E35F0008001A02
	?debug	C E3600652454655454C04002E06
	?debug	C ED00060000770D00
	?debug	C E361000400166000
	?debug	C E3620000002D6104096000
	?debug	C E3640A5368656C6C537461746518002E07
	?debug	C ED000700007B0D00
	?debug	C E365000400166400
	?debug	C E3660000002D6504096400
	?debug	C E36805504F494E5404001E8087
	?debug	C E36900000023010700
	?debug	C EB1C404D79496E74453224717569756975697569+
	?debug	C 756975697569756975696900
	?debug	C E36A00000023010701
	?debug	C EB085F4D79496E7431306A00
	?debug	C E36B00000023010701
	?debug	C EB085F4D79496E7431626B00
	?debug	C E36C00000023010701
	?debug	C EB085F4D79496E7436376C00
	?debug	C E36D00000023010701
	?debug	C EB085F4D79496E7432666D00
	?debug	C E36E00000023010701
	?debug	C EB085F4D79496E7432366E00
	?debug	C E36F00000023010701
	?debug	C EB085F4D79496E7432356F00
	?debug	C E37000000023010701
	?debug	C EB085F4D79496E7432317000
	?debug	C E37100000023010701
	?debug	C EB085F4D79496E7431617100
	?debug	C E37200000023010701
	?debug	C EB085F4D79496E7431367200
	?debug	C E37300000023010701
	?debug	C EB085F4D79496E7431357300
	?debug	C E37400000023010701
	?debug	C EB085F4D79496E7431337400
	?debug	C E37500000023040400
	?debug	C EB1140486F6C644F62737461636C652471696975+
	?debug	C 00
	?debug	C E37600000023040400
	?debug	C EB134044726F704F62737461636C65247169696E+
	?debug	C 697600
	?debug	C E37700000023040400
	?debug	C EB12405069636B75704F62737461636C65247169+
	?debug	C 7700
	?debug	C E37800000023040400
	?debug	C EB154052656365697665496E666F247175696D75+
	?debug	C 6974327800
	?debug	C E37900000023040400
	?debug	C EB10405472616E736D6974467265652471767900
	?debug	C E37A00000023010400
	?debug	C EB114044697363617264426C6F636B247175697A+
	?debug	C 00
	?debug	C E37B00000023040400
	?debug	C EB164052656365697665426C6F636B247175696E+
	?debug	C 7A6375697B00
	?debug	C E37C00000023040400
	?debug	C EB17405472616E736D6974426C6F636B24717569+
	?debug	C 6E7A6375697C00
	?debug	C E37D00000023040400
	?debug	C EB104046696C746572436F6D6D73247169697D00
	?debug	C E37E00000023040400
	?debug	C EB14406765745F7368656C6C5F73746174652471+
	?debug	C 75697E00
	?debug	C E37F00000023010400
	?debug	C EB12406765745F6C6F63616C5F6D617024716E76+
	?debug	C 7F00
	?debug	C E3808000000023010400
	?debug	C EB0F406275795F7368656C6C7324717569808000
	?debug	C E3808100000023010400
	?debug	C EB0E406275795F61726D6F7572247169808100
	?debug	C E3808200000023010400
	?debug	C EB2340636F6E6669677572655F726F626F742471+
	?debug	C 6E3130526F626F74537461746575697569808200
	?debug	C E3808300000023040400
	?debug	C EB0F407265636569766524716D75697431808300
	?debug	C E3808400000023040400
	?debug	C EB0F405472616E736D6974247175697569808400
	?debug	C E3808500000023040400
	?debug	C EB0D4063616E6E6F6E247175697569808500
	?debug	C E3808600000023040400
	?debug	C EB0E407363616E2471756975696D7569808600
	?debug	C E3808700000023010400
	?debug	C EB08406D6F7665247176808700
	?debug	C E3808802746D12001E808A
	?debug	C E38089000000231D0400
	?debug	C EB095F5F66737472647570808900
	?debug	C E3808A00000023180400
	?debug	C EB095F5F666D656D637079808A00
	?debug	C E3808B00000023010400
	?debug	C E3808C00000023040400
	?debug	C E3808D00000023040400
	?debug	C E3808E00000023040400
	?debug	C E3808F0B5F657863657074696F6E6C24001E8094
	?debug	C E3809009657863657074696F6E1E001E809A
	?debug	C E38091000000230F0400
	?debug	C EB045F74616E809100
	?debug	C E38092000000230F0400
	?debug	C EB055F73717274809200
	?debug	C E38093000000230F0400
	?debug	C EB065F6174616E32809300
	?debug	C E38094000000230F0400
	?debug	C EB055F6174616E809400
	?debug	C E3809500000023010400
	?debug	C EB095F736574636F6C6F72809500
	?debug	C E3809600000023010400
	?debug	C EB0A5F6F7574746578747879809600
	?debug	C E380970D617263636F6F726473747970650C001E+
	?debug	C 80A0
	?debug	C E380980C76696577706F7274747970650A001E80+
	?debug	C A7
	?debug	C E3809909706F696E747479706504001E80AD
	?debug	C E3809A1066696C6C73657474696E677374797065+
	?debug	C 04001E80B0
	?debug	C E3809B107465787473657474696E677374797065+
	?debug	C 0A001E80B3
	?debug	C E3809C106C696E6573657474696E677374797065+
	?debug	C 06001E80B9
	?debug	C E3809D0B70616C657474657479706511001E80BD
	?debug	C E3809E0010001A02
	?debug	C E3809F00000023010400
	?debug	C EB085F73657476656374809F00
	?debug	C E380A200000023010701
	?debug	C E380A10004001680A200
	?debug	C E380A00000002380A10400
	?debug	C EB085F6765747665637480A000
	?debug	C E380A300000023010400
	?debug	C E380A400000023010400
	?debug	C E380A500000023020400
	?debug	C E380A600000023040400
	?debug	C E380A70666696E645F742B001E80C0
	?debug	C E380A80015001A02
	?debug	C E380A9000D001A02
	?debug	C E380AA056666626C6B2B001E80C7
	?debug	C E380AB0015001A02
	?debug	C E380AC000D001A02
	?debug	C E380AD075245475041434B14001E80CE
	?debug	C E380AE05535245475308001E80D9
	?debug	C E380AF045245475310001F80DE
	?debug	C E380B008574F52445245475310001E80E1
	?debug	C E380B108425954455245475308001E80EA
	?debug	C E380B209646F73646174655F7405001E80F3
	?debug	C E380B3046461746504001E80F8
	?debug	C E380B409646F7374696D655F7404001E80FC
	?debug	C E380B50474696D6504001E8101
	?debug	C E380B60664657668647212001E8106
	?debug	C E380B70008001A02
	?debug	C E380B807666174696E666F06001E810C
	?debug	C E380B90A6469736B667265655F7408001E8111
	?debug	C E380BA05646672656508001E8116
	?debug	C E380BB08444F534552524F5205001E811B
	?debug	C E380BC07434F554E54525922001E8120
	?debug	C E380BD0005001A02
	?debug	C E380BE0002001A02
	?debug	C E380BF0002001A02
	?debug	C E380C00002001A02
	?debug	C E380C10002001A02
	?debug	C E380C20002001A02
	?debug	C E380C3000A001A02
	?debug	C E380C404786663622C001E812D
	?debug	C E380C50005001A02
	?debug	C E380C60366636225001E8132
	?debug	C E380C70008001A02
	?debug	C E380C80003001A02
	?debug	C E380C9000A001A02
	?debug	C E380CA09746578745F696E666F0B001E813D
	?debug	C E380CB0B66617268656170696E666F0A001E8149
	?debug	C E380CC000400160101
	?debug	C E60250490F0000020200000544574F52440C0600+
	?debug	C 0564776F72640C060004574F52440A060004776F+
	?debug	C 72640A0600044259544508060004627974650806+
	?debug	C 0004424F4F4C04060007636C6F636B5F74060600+
	?debug	C 0674696D655F740606000777636861725F740206+
	?debug	C 000666706F735F740606000673697A655F740A06+
	?debug	C 0009707472646966665F74060600084F42535441+
	?debug	C 434C455A0700045445414D460700084D656D426C+
	?debug	C 6F636B5E07000652454655454C6007000A536865+
	?debug	C 6C6C537461746564070007485153746174653707+
	?debug	C 00095461736B53746174652007000A4461746153+
	?debug	C 74727563741A0700074F4253544154453407000D+
	?debug	C 5458426C6F636B53747275637427070005504F49+
	?debug	C 4E546807000A526F626F7453746174651C070002+
	?debug	C 746D808807000B5F657863657074696F6E6C808F+
	?debug	C 070009657863657074696F6E809007000D617263+
	?debug	C 636F6F72647374797065809707000C7669657770+
	?debug	C 6F7274747970658098070009706F696E74747970+
	?debug	C 65809907001066696C6C73657474696E67737479+
	?debug	C 7065809A0700107465787473657474696E677374+
	?debug	C 797065809B0700106C696E6573657474696E6773+
	?debug	C 74797065809C07000B70616C6574746574797065+
	?debug	C 809D07000666696E645F7480A70700056666626C+
	?debug	C 6B80AA0700075245475041434B80AD0700055352+
	?debug	C 45475380AE0700045245475380AF070008425954+
	?debug	C 455245475380B1070008574F52445245475380B0+
	?debug	C 070009646F73646174655F7480B2070004646174+
	?debug	C 6580B3070009646F7374696D655F7480B4070004+
	?debug	C 74696D6580B507000664657668647280B6070007+
	?debug	C 666174696E666F80B807000A6469736B66726565+
	?debug	C 5F7480B9070005646672656580BA070008444F53+
	?debug	C 4552524F5280BB070007434F554E54525980BC07+
	?debug	C 00047866636280C407000366636280C607000974+
	?debug	C 6578745F696E666F80CA07000B66617268656170+
	?debug	C 696E666F80CB0700
	?debug	F @do_function$qn10RobotState 60 24 0
	?debug	F @min$qt1 65 24 0
	?debug	F @max$qt1 66 24 0
	?debug	F @abs$q 67 24 0
	?debug	F @report$qi 68 24 0
	?debug	F @randomize$qv 139 24 0
	?debug	F @random$qi 140 24 0
	?debug	F atoi 141 24 0
	?debug	F abs 142 24 0
	?debug	F pokeb 163 24 0
	?debug	F poke 164 24 0
	?debug	F peekb 165 24 0
	?debug	F peek 166 24 0
	?debug	C E200095374727563744C656E0A0001780A000179+
	?debug	C 0A000641726D6F75720A000553706565640A0005+
	?debug	C 416E676C650A0009496E76697369626C650A000E+
	?debug	C 4C6173745368656C6C53746174650A0007426174+
	?debug	C 746572790A000A5368656C6C734C6566740AC014+
	?debug	C 000000
	?debug	C E24811405461736B537461746540697341247169+
	?debug	C 21000273730A000273700A000262700A00077365+
	?debug	C 676D656E740A00086D656D5F747970650A000645+
	?debug	C 6D734D617023000B46697273745365675074720A+
	?debug	C 00035053500A00044E616D65240007496E745665+
	?debug	C 63732500045465616D040004446561640A000C43+
	?debug	C 617573654F664465617468040009436175736544+
	?debug	C 6174610400075458426C6F636B26000552585074+
	?debug	C 7226000654584672656526000646696C74657228+
	?debug	C 000752585F4461746129000952585F53656E6465+
	?debug	C 722A000752585F53697A6508000A4D617852585F+
	?debug	C 53697A6504000249440400045479706504C09200+
	?debug	C 0000
	?debug	C E2000652585461736B08000654585461736B0800+
	?debug	C 064C656E6774680A00094E657874426C6F636B26+
	?debug	C C008000000
	?debug	C E24A1440526F626F745374617465402462637472+
	?debug	C 2471762B482040526F626F74537461746540436F+
	?debug	C 6E666967757265526F626F742471756975692D40+
	?debug	C 920000000006637572725F78060006637572725F+
	?debug	C 7906000669616E676C6504000573706565640400+
	?debug	C 07426174746572790600067368656C6C7304000B+
	?debug	C 7368656C6C735F6C6566740A000661726D6F7572+
	?debug	C 04000A6D61785F61726D6F75720400096C617374+
	?debug	C 5F666972650C000C7461726765745F7370656564+
	?debug	C 0400096D61785F737065656404000F6D616E6F75+
	?debug	C 657672655F73706565640400096D61785F72616E+
	?debug	C 676504000C616363656C65726174696F6E040007+
	?debug	C 52585F446174612F000952585F53656E64657230+
	?debug	C 000752585F53697A65080005726F626F74180005+
	?debug	C 6F6C645F780400056F6C645F7904000B526F626F+
	?debug	C 74436F6C6F7572040009696E76697369626C6502+
	?debug	C 000C696E7669736962696C69747902000B747261+
	?debug	C 6E73706F72746564020006736C6F77656402000A+
	?debug	C 72656368617267696E670200106C6173745F7368+
	?debug	C 656C6C5F7374617465040009696E7669735F6374+
	?debug	C 7204000A4946465F537472696E671D000A4E616D+
	?debug	C 65537472696E671D000478566172310004795661+
	?debug	C 723100074461746156617219000A4C6173745368+
	?debug	C 656C6C7332000B5368656C6C5374617465733300+
	?debug	C 085368656C6C5074720800085368656C6C437472+
	?debug	C 0A000D4F62737461636C65537461746534000E4F+
	?debug	C 62737461636C654E756D626572040002485136C0+
	?debug	C 4F010000
	?debug	C E400044E4F4E45000000084341525259494E4701+
	?debug	C 008007484F4C44494E470200
	?debug	C E24A114048515374617465402462637472247176+
	?debug	C 3840920000000005526F626F743A00094E756D52+
	?debug	C 6F626F747304000A506F696E74734C65667404C0+
	?debug	C E6000000
	?debug	C E24A0E405445414D402462637472247176480006+
	?debug	C 5374617274580400065374617274590400055363+
	?debug	C 6F72650C00054B696C6C73040009537572766976+
	?debug	C 6F7273040009436F6C6C65637465640400024851+
	?debug	C 36C012000000
	?debug	C E24A12404F42535441434C454024626374722471+
	?debug	C 765C000178040001790400055374617465340009+
	?debug	C 486F6C64526F626F7404C008000000
	?debug	C E200095369676E61747572650800054F776E6572+
	?debug	C 0A000453697A650A000644756D6D79310A000644+
	?debug	C 756D6D79320800044E616D655FC010000000
	?debug	C E24A104052454655454C40246263747224717662+
	?debug	C 00066368617267650400086F6363757069656404+
	?debug	C C004000000
	?debug	C E24A14405368656C6C5374617465402462637472+
	?debug	C 247176660009696E5F666C696768740400066375+
	?debug	C 72725F78060006637572725F7906000566697265+
	?debug	C 7204000572616E676504000669616E676C650400+
	?debug	C 035074720A00056F6C645F780400056F6C645F79+
	?debug	C 04000A6F6C645F636F6C6F757204C018000000
	?debug	C E20001780400017904C004000000
	?debug	C E20006746D5F736563040006746D5F6D696E0400+
	?debug	C 07746D5F686F7572040007746D5F6D6461790400+
	?debug	C 06746D5F6D6F6E040007746D5F79656172040007+
	?debug	C 746D5F77646179040007746D5F79646179040008+
	?debug	C 746D5F697364737404C012000000
	?debug	C E20004747970650400046E616D651D0004617267+
	?debug	C 311000046172673210000672657476616C10C024+
	?debug	C 000000
	?debug	C E20004747970650400046E616D651D0004617267+
	?debug	C 310F0004617267320F000672657476616C0FC01E+
	?debug	C 000000
	?debug	C E200017804000179040006787374617274040006+
	?debug	C 79737461727404000478656E6404000479656E64+
	?debug	C 04C00C000000
	?debug	C E200046C656674040003746F7004000572696768+
	?debug	C 74040006626F74746F6D040004636C697004C00A+
	?debug	C 000000
	?debug	C E20001780400017904C004000000
	?debug	C E200077061747465726E040005636F6C6F7204C0+
	?debug	C 04000000
	?debug	C E20004666F6E74040009646972656374696F6E04+
	?debug	C 00086368617273697A65040005686F72697A0400+
	?debug	C 047665727404C00A000000
	?debug	C E200096C696E657374796C650400087570617474+
	?debug	C 65726E0A0009746869636B6E65737304C0060000+
	?debug	C 00
	?debug	C E2000473697A65080006636F6C6F7273809EC011+
	?debug	C 000000
	?debug	C E20008726573657276656480A800066174747269+
	?debug	C 6202000777725F74696D650A000777725F646174+
	?debug	C 650A000473697A650600046E616D6580A9C02B00+
	?debug	C 0000
	?debug	C E2000B66665F726573657276656480AB00096666+
	?debug	C 5F61747472696202000866665F6674696D650A00+
	?debug	C 0866665F66646174650A000866665F6673697A65+
	?debug	C 06000766665F6E616D6580ACC02B000000
	?debug	C E20004725F61780A0004725F62780A0004725F63+
	?debug	C 780A0004725F64780A0004725F62700A0004725F+
	?debug	C 73690A0004725F64690A0004725F64730A000472+
	?debug	C 5F65730A0007725F666C6167730AC014000000
	?debug	C E2000265730A000263730A000273730A00026473+
	?debug	C 0AC008000000
	?debug	C E200017880B000016880B1C010000000
	?debug	C E2000261780A000262780A000263780A00026478+
	?debug	C 0A000273690A000264690A000563666C61670A00+
	?debug	C 05666C6167730AC010000000
	?debug	C E20002616C0800026168080002626C0800026268+
	?debug	C 080002636C0800026368080002646C0800026468+
	?debug	C 08C008000000
	?debug	C E200036461790800056D6F6E7468080004796561+
	?debug	C 720A00096461796F667765656B08C005000000
	?debug	C E2000764615F7965617204000664615F64617902+
	?debug	C 000664615F6D6F6E02C004000000
	?debug	C E20004686F75720800066D696E75746508000673+
	?debug	C 65636F6E64080007687365636F6E6408C0040000+
	?debug	C 00
	?debug	C E2000674695F6D696E08000774695F686F757208+
	?debug	C 000774695F68756E6408000674695F73656308C0+
	?debug	C 04000000
	?debug	C E2000764685F6E65787406000764685F61747472+
	?debug	C 04000864685F73747261740A000864685F696E74+
	?debug	C 65720A000764685F6E616D6580B7C012000000
	?debug	C E2000866695F73636C757302000866695F666174+
	?debug	C 696402000866695F6E636C75730A000866695F62+
	?debug	C 7973656304C006000000
	?debug	C E2000E746F74616C5F636C7573746572730A000E+
	?debug	C 617661696C5F636C7573746572730A0013736563+
	?debug	C 746F72735F7065725F636C75737465720A001062+
	?debug	C 797465735F7065725F736563746F720AC0080000+
	?debug	C 00
	?debug	C E2000864665F617661696C0A000864665F746F74+
	?debug	C 616C0A000764665F627365630A000864665F7363+
	?debug	C 6C75730AC008000000
	?debug	C E2000B64655F6578746572726F7204000864655F+
	?debug	C 636C61737302000964655F616374696F6E020008+
	?debug	C 64655F6C6F63757302C005000000
	?debug	C E20007636F5F64617465040007636F5F63757272+
	?debug	C 80BD0008636F5F746873657080BE0008636F5F64+
	?debug	C 6573657080BF0008636F5F647473657080C00008+
	?debug	C 636F5F746D73657080C1000C636F5F6375727273+
	?debug	C 74796C65020009636F5F64696769747302000763+
	?debug	C 6F5F74696D65020007636F5F6361736506000863+
	?debug	C 6F5F646173657080C20007636F5F66696C6C80C3+
	?debug	C C022000000
	?debug	C E20009786663625F666C6167020009786663625F+
	?debug	C 7265737680C50009786663625F61747472020008+
	?debug	C 786663625F66636280C6C02C000000
	?debug	C E200096663625F64726976650200086663625F6E+
	?debug	C 616D6580C700076663625F65787480C8000A6663+
	?debug	C 625F637572626C6B04000B6663625F7265637369+
	?debug	C 7A6504000B6663625F66696C73697A6506000866+
	?debug	C 63625F646174650400086663625F7265737680C9+
	?debug	C 000A6663625F63757272656302000A6663625F72+
	?debug	C 616E646F6D06C025000000
	?debug	C E2000777696E6C65667408000677696E746F7008+
	?debug	C 000877696E726967687408000977696E626F7474+
	?debug	C 6F6D0800096174747269627574650800086E6F72+
	?debug	C 6D61747472080008637572726D6F646508000C73+
	?debug	C 637265656E68656967687408000B73637265656E+
	?debug	C 7769647468080004637572780800046375727908+
	?debug	C C00B000000
	?debug	C E2000370747280CC000473697A650C0006696E5F+
	?debug	C 75736504C00A000000
	end
