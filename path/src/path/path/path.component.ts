import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  NgZone,
  Output,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export interface MapStep {
  title?: string;
  description: string;
  top: number;
  left: number;
  final?: boolean;
}

@Component({
  selector: 'app-path',
  templateUrl: './path.component.html',
  styleUrls: ['./path.component.scss'],
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
})
export class PathComponent implements AfterViewInit, DoCheck {
  private platformId = inject(PLATFORM_ID);
  private renderer = inject(Renderer2);
  private ngZone = inject(NgZone);

  @Input() steps: MapStep[] = [];
  @Input() hideCardAfterExit: boolean = false;
  @Output() stepChanged = new EventEmitter<number>();

  @ViewChild('mainPath') mainPathRef!: ElementRef<SVGPathElement>;
  @ViewChild('highlightPath') highlightPathRef!: ElementRef<SVGPathElement>;
  @ViewChild('runnerEl') runnerRef!: ElementRef<HTMLDivElement>;

  activeStepIndex = -1;
  visitedSteps: number[] = [];
  stepDistances: number[] = [];

  private cachedPathDefinition: string | null = null;

  ngAfterViewInit(): void {
    console.log('[PathComponent] ngAfterViewInit');
    if (isPlatformBrowser(this.platformId)) {
      if (!this.steps || this.steps.length === 0) return;

      const svgPath: SVGPathElement = this.mainPathRef.nativeElement;
      const totalPathLength: number = svgPath.getTotalLength();

      this.stepDistances = this.steps.map((step) => {
        let bestDistance = 0;
        let bestDistanceSq = Infinity;
        const interval = 8;

        for (let dist = 0; dist <= totalPathLength; dist += interval) {
          const point = svgPath.getPointAtLength(dist);
          const dx = point.x - step.left;
          const dy = point.y - step.top;
          const currentDistSq = dx * dx + dy * dy;
          if (currentDistSq < bestDistanceSq) {
            bestDistanceSq = currentDistSq;
            bestDistance = dist;
          }
        }

        const refineRange = interval;
        const start = Math.max(0, bestDistance - refineRange);
        const end = Math.min(totalPathLength, bestDistance + refineRange);
        for (let dist = start; dist <= end; dist++) {
          const point = svgPath.getPointAtLength(dist);
          const dx = point.x - step.left;
          const dy = point.y - step.top;
          const currentDistSq = dx * dx + dy * dy;
          if (currentDistSq < bestDistanceSq) {
            bestDistanceSq = currentDistSq;
            bestDistance = dist;
          }
        }
        return bestDistance;
      });

      this.cachedPathDefinition = this.generateCurvedPathInternal();

      this.ngZone.runOutsideAngular(() => {
        this.animateSteps(0);
      });
    }
  }

  ngDoCheck(): void {
    console.log('ngDoCheck');
  }

  animateSteps(index: number): void {
    if (index >= this.steps.length) return;
    const svgPath: SVGPathElement = this.mainPathRef.nativeElement;
    const startDist = index === 0 ? 0 : this.stepDistances[index - 1];
    const endDist = this.stepDistances[index];

    this.moveRunner(svgPath, startDist, endDist, () => {
      this.ngZone.run(() => {
        this.activeStepIndex = index;
        if (!this.visitedSteps.includes(index)) {
          this.visitedSteps.push(index);
        }
        this.stepChanged.emit(index);

        setTimeout(() => {
          this.ngZone.runOutsideAngular(() => {
            this.animateSteps(index + 1);
          });
        }, 1500);
      });
    });
  }

  moveRunner(
    svgPath: SVGPathElement,
    startDist: number,
    endDist: number,
    onComplete: () => void
  ): void {
    const frames = 100;
    let frame = 0;
    const delta = endDist - startDist;

    const animate = () => {
      frame++;
      const progress = frame / frames;
      const currentDist = startDist + delta * progress;
      const point = svgPath.getPointAtLength(currentDist);

      this.renderer.setStyle(
        this.runnerRef.nativeElement,
        'left',
        point.x + '%'
      );
      this.renderer.setStyle(
        this.runnerRef.nativeElement,
        'top',
        point.y + '%'
      );

      const totalLength = svgPath.getTotalLength();
      this.renderer.setAttribute(
        this.highlightPathRef.nativeElement,
        'stroke-dasharray',
        `${currentDist} ${totalLength - currentDist}`
      );
      const pathDef =
        this.cachedPathDefinition || this.generateCurvedPathInternal();
      this.renderer.setAttribute(
        this.highlightPathRef.nativeElement,
        'd',
        pathDef
      );

      if (frame < frames) {
        requestAnimationFrame(animate);
      } else {
        const finalPoint = svgPath.getPointAtLength(endDist);
        this.renderer.setStyle(
          this.runnerRef.nativeElement,
          'left',
          finalPoint.x + '%'
        );
        this.renderer.setStyle(
          this.runnerRef.nativeElement,
          'top',
          finalPoint.y + '%'
        );
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  public generateCurvedPathInternal(): string {
    if (this.steps.length < 2) return '';
    let pathDef = '';
    const first = this.steps[0];
    pathDef += `M ${first.left} ${first.top} `;
    for (let i = 1; i < this.steps.length; i++) {
      const prev = this.steps[i - 1];
      const curr = this.steps[i];
      const x1 = Number(prev.left);
      const y1 = Number(prev.top);
      const x2 = Number(curr.left);
      const y2 = Number(curr.top);
      const offset = i % 2 === 0 ? 13 : -13;
      const midY = (y1 + y2) / 2;
      const cp1 = x1 + offset;
      const cp2 = x2 - offset;
      pathDef += `C ${cp1} ${midY}, ${cp2} ${midY}, ${x2} ${y2} `;
    }
    return pathDef;
  }

  isCardVisible(index: number): boolean {
    return this.hideCardAfterExit
      ? this.activeStepIndex === index
      : this.visitedSteps.includes(index);
  }
}
