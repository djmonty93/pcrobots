/*$Header$*/

/*$Log$*/

extern "C" {
void	interrupt MyInt13(...);
void	interrupt MyInt15(...);
void	interrupt MyInt16(...);
void	interrupt MyInt1a(...);
void	interrupt MyInt21(...);
void	interrupt MyInt25(...);
void	interrupt MyInt26(...);
void	interrupt MyInt2f(...);
void	interrupt MyInt67(...);
void 	interrupt MyInt1b(...);
void 	interrupt MyInt10(...);
}
void	interrupt MyIntE2(word bp,word di,word si,word ds,word es,
			  word dx,word cx,word bx,word ax);
void    InitOutput(void);

extern  int   Mono;
extern  int   DoOutput;