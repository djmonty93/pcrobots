export interface RandomGenerator {
  next(): number;
  nextInt(maxExclusive: number): number;
}

export class Mulberry32 implements RandomGenerator {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}
