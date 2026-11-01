import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ff-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.html',
})
export class SkeletonComponent {
  readonly count = input(3);
  readonly height = input(56);
  protected rows() {
    return Array.from({ length: this.count() });
  }
}
