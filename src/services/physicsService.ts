export interface Step {
  title: string;
  expression: string;
  result?: string | number;
}

export interface CalculationResult {
  steps: Step[];
  finalAnswer: string;
  unit: string;
}

export const physicsService = {
  calculateSpeed(distance: number, time: number): CalculationResult {
    const speed = distance / time;
    return {
      steps: [
        { title: 'Write formula', expression: 'Speed = distance / time' },
        { title: 'Substitute values', expression: `Speed = ${distance} / ${time}` },
        { title: 'Perform calculation', expression: `${distance} / ${time} = ${speed.toFixed(2)}` }
      ],
      finalAnswer: speed.toFixed(2),
      unit: 'm/s'
    };
  },

  calculateForce(mass: number, acceleration: number): CalculationResult {
    const force = mass * acceleration;
    return {
      steps: [
        { title: 'Write formula', expression: 'Force = mass × acceleration' },
        { title: 'Substitute values', expression: `Force = ${mass} × ${acceleration}` },
        { title: 'Perform calculation', expression: `${mass} × ${acceleration} = ${force.toFixed(2)}` }
      ],
      finalAnswer: force.toFixed(2),
      unit: 'N'
    };
  },

  calculateWork(force: number, distance: number): CalculationResult {
    const work = force * distance;
    return {
      steps: [
        { title: 'Write formula', expression: 'Work = force × distance' },
        { title: 'Substitute values', expression: `Work = ${force} × ${distance}` },
        { title: 'Perform calculation', expression: `${force} × ${distance} = ${work.toFixed(2)}` }
      ],
      finalAnswer: work.toFixed(2),
      unit: 'J'
    };
  },

  calculatePotentialEnergy(mass: number, height: number): CalculationResult {
    const gravity = 9.8;
    const energy = mass * gravity * height;
    return {
      steps: [
        { title: 'Write formula', expression: 'Energy = mass × gravity × height' },
        { title: 'Substitute values', expression: `Energy = ${mass} × 9.8 × ${height}` },
        { title: 'Perform calculation', expression: `${mass} × 9.8 × ${height} = ${energy.toFixed(2)}` }
      ],
      finalAnswer: energy.toFixed(2),
      unit: 'J'
    };
  }
};
