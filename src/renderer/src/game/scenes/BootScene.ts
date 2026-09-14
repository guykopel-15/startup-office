import Phaser from 'phaser';

/** Empty starting scene. Task 2 replaces this with the office map. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'STARTUP OFFICE', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#ffd866',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 40, 'office map coming in task 2', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#8a7fb3',
      })
      .setOrigin(0.5);
  }
}
