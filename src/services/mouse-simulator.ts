import { generateRandomString, getRandomInRange } from "../utils/helpers";

/**
 * Advanced mouse movement simulation with improved noise pattern
 * for more natural-looking movements
 */
class NoiseGenerator {
  private p: number[];
  private perm: number[];
  private gradP: any[];
  private grad3: any[];
  private F2: number;
  private G2: number;
  private F3: number;
  private G3: number;

  constructor() {
    this.p = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30,
      69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94,
      252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171,
      168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60,
      211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1,
      216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86,
      164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126,
      255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253,
      19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242,
      193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192,
      214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138,
      236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ];
    
    this.perm = new Array(512);
    this.gradP = new Array(512);
    
    this.grad3 = [
      { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
      { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
      { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 }
    ];
    
    this.F2 = 0.5 * (Math.sqrt(3) - 1);
    this.G2 = (3 - Math.sqrt(3)) / 6;
    this.F3 = 1 / 3;
    this.G3 = 1 / 6;
    
    this.seed(Math.random() * 65536);
  }
  
  seed(seed: number): void {
    if (seed > 0 && seed < 1) {
      seed *= 65536;
    }
    
    seed = Math.floor(seed);
    if (seed < 256) {
      seed |= seed << 8;
    }
    
    for (let i = 0; i < 256; i++) {
      let v: number;
      if (i & 1) {
        v = this.p[i] ^ (seed & 255);
      } else {
        v = this.p[i] ^ ((seed >> 8) & 255);
      }
      
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
    }
  }
  
  simplex2(xin: number, yin: number): number {
    let n0, n1, n2;
    
    // Skew the input space to determine which simplex cell we're in
    const s = (xin + yin) * this.F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    
    const t = (i + j) * this.G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    
    // Determine which simplex we are in
    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }
    
    const x1 = x0 - i1 + this.G2;
    const y1 = y0 - j1 + this.G2;
    const x2 = x0 - 1 + 2 * this.G2;
    const y2 = y0 - 1 + 2 * this.G2;
    
    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    
    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) {
      n0 = 0;
    } else {
      t0 *= t0;
      n0 = t0 * t0 * this.gradP[ii + this.perm[jj]].dot2(x0, y0);
    }
    
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) {
      n1 = 0;
    } else {
      t1 *= t1;
      n1 = t1 * t1 * this.gradP[ii + i1 + this.perm[jj + j1]].dot2(x1, y1);
    }
    
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) {
      n2 = 0;
    } else {
      t2 *= t2;
      n2 = t2 * t2 * this.gradP[ii + 1 + this.perm[jj + 1]].dot2(x2, y2);
    }
    
    // Add contributions from each corner to get the final noise value
    // The result is scaled to return values in the interval [-1,1]
    return 70 * (n0 + n1 + n2);
  }
  
  simplex3(xin: number, yin: number, zin: number): number {
    // Implementation details omitted for brevity
    // This would contain the full simplex3 implementation
    
    // Simplified version that combines x, y, z inputs for random but smooth value
    const s = (xin + yin + zin) * this.F3;
    return this.simplex2(xin + zin * 0.3, yin + zin * 0.7);
  }
}

interface Vector2D {
  x: number;
  y: number;
}

export class MouseSimulator {
  private el: HTMLElement | null = null;
  private virtualCursorClass: string;
  private virtualCursorHtml: string;
  private noise: NoiseGenerator | null = null;
  private speed: number = 0;
  private randomness: number = 0;
  private random: number = 0;
  private lastMoveTime: number = 0;
  private stopWork: boolean = false;
  private running: boolean = false;
  private fakeMoving: boolean = false;
  
  constructor() {
    this.virtualCursorClass = generateRandomString();
    this.virtualCursorHtml = `<svg viewBox="11.8 9 16 22" class="${this.virtualCursorClass}" style="width:40px;top:0;left:0;position:fixed;opacity:60%;z-index:9999;"><path d="M20,21l4.5,8l-3.4,2l-4.6-8.1L12,29V9l16,12H20z"></path></svg>`;
  }
  
  private updateMouse(x: number, y: number): void {
    x = Math.trunc(x);
    y = Math.trunc(y);
    
    if (this.el !== null) {
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
    
    // Dispatch a native mouse event
    const mouseEvent = new MouseEvent("mousemove", {
      clientX: x,
      clientY: y,
    });
    
    document.dispatchEvent(mouseEvent);
  }
  
  private onMouseMove(e: MouseEvent): void {
    if (this.fakeMoving === true) return;
    
    const x = e.clientX;
    const y = e.clientY;
    
    this.updateMouse(x, y);
    this.lastMoveTime = Date.now();
  }
  
  public start(showCursor: boolean): void {
    if (this.running === true) return;
    
    // Add cursor element if needed
    if (showCursor === true && this.virtualCursorHtml !== null) {
      if (document.querySelector("." + this.virtualCursorClass)) {
        if (this.el) this.el.style.display = "block";
      } else {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = this.virtualCursorHtml;
        document.body.appendChild(tempDiv.firstElementChild as HTMLElement);
        this.el = document.querySelector("." + this.virtualCursorClass);
      }
    }
    
    // Initialize noise generator and settings
    this.noise = new NoiseGenerator();
    this.speed = getRandomInRange(8, 20);
    this.randomness = getRandomInRange(5, 20);
    this.random = 0;
    this.stopWork = false;
    
    // Set up event listeners and start animation
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    requestAnimationFrame((t) => this.render(t));
    
    this.running = true;
  }
  
  public stop(): void {
    window.removeEventListener("mousemove", (e) => this.onMouseMove(e));
    this.stopWork = true;
    this.fakeMoving = false;
    
    if (this.el !== null) {
      this.el.style.display = "none";
    }
    
    this.running = false;
  }
  
  private render(time: number): void {
    if (this.stopWork) return;
    
    // Check if we need to generate a fake mouse movement
    if (Date.now() - this.lastMoveTime > getRandomInRange(3000, 7000)) {
      this.fakeMoving = true;
      
      if (!this.noise) return;
      
      // Generate smooth mouse movement using noise
      const timeScale = this.speed / 100 * 0.001;
      const nx = (this.noise.simplex3(1, 0, time * timeScale) + 1) / 2;
      const ny = (this.noise.simplex3(11, 0, time * timeScale) + 1) / 2;
      
      this.random = this.randomness / 1000;
      const offsetX = this.noise.simplex3(1, 0, this.random) * window.innerWidth * 0.1;
      const offsetY = this.noise.simplex3(3, 0, this.random) * window.innerHeight * 0.1;
      
      const x = nx * window.innerWidth + offsetX;
      const y = ny * window.innerHeight + offsetY;
      
      this.updateMouse(x, y);
    } else {
      this.fakeMoving = false;
    }
    
    requestAnimationFrame((t) => this.render(t));
  }
}

// Create a singleton instance for reuse
export const mouseSimulator = new MouseSimulator();