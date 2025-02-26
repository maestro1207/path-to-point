import { Component } from '@angular/core';
import { MapStep, PathComponent } from '../path/path/path.component';

@Component({
  selector: 'app-root',
  imports: [PathComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  description: string = 'Desc';

  customSteps: MapStep[] = [
    { description: this.description, top: 8, left: 16 },
    { description: this.description, top: 20, left: 23 },
    { description: this.description, top: 11, left: 40 },
    { description: this.description, top: 20, left: 52 },
    { description: this.description, top: 26, left: 43 },
    { description: this.description, top: 34, left: 30 },
    { description: this.description, top: 41, left: 21 },
    { description: this.description, top: 49, left: 34 },
    { description: this.description, top: 58, left: 45 },
    { description: this.description, top: 73, left: 29 },
    { description: this.description, top: 60, left: 20 },
    { description: this.description, top: 83, left: 24 },
    {
      title: 'Final',
      description: this.description,
      top: 50,
      left: 80,
      final: true,
    },
  ];

  onStepChanged(stepIndex: number): void {
    console.log('krok:', stepIndex);
  }
}
