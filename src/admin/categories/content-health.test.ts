import { describe, it, expect, vi } from 'vitest';

// Avoid instantiating the real Amplify client (transitively imported).
vi.mock('../amplify-config', () => ({ client: {} }));

import { computeMismatchedFrom } from './content-health';

describe('computeMismatchedFrom', () => {
  const programs = [
    { id: 'progPerf', categoryID: 'perf' },
    { id: 'progCourt', categoryID: 'court' },
  ];
  const periods = [
    { id: 'per1', programID: 'progPerf' },
    { id: 'per2', programID: 'progCourt' },
  ];

  it('flags a workout whose category differs from a program that contains it', () => {
    const periodWorkouts = [{ periodID: 'per2', workoutID: 'w1' }]; // court program
    const workouts = [{ id: 'w1', categoryID: 'perf' }]; // but workout is perf
    const result = computeMismatchedFrom(programs, periods, periodWorkouts, workouts);
    expect(result.has('w1')).toBe(true);
  });

  it('does not flag a workout whose category matches its program', () => {
    const periodWorkouts = [{ periodID: 'per1', workoutID: 'w1' }]; // perf program
    const workouts = [{ id: 'w1', categoryID: 'perf' }];
    const result = computeMismatchedFrom(programs, periods, periodWorkouts, workouts);
    expect(result.has('w1')).toBe(false);
  });

  it('does not flag when either side has no category', () => {
    const periodWorkouts = [
      { periodID: 'per2', workoutID: 'wNoCat' }, // workout has no category
      { periodID: 'perX', workoutID: 'wOrphanPeriod' }, // period not found
    ];
    const workouts = [
      { id: 'wNoCat', categoryID: null },
      { id: 'wOrphanPeriod', categoryID: 'perf' },
    ];
    const result = computeMismatchedFrom(programs, periods, periodWorkouts, workouts);
    expect(result.size).toBe(0);
  });

  it('flags a shared workout when any containing program disagrees', () => {
    const periodWorkouts = [
      { periodID: 'per1', workoutID: 'wShared' }, // perf program — matches
      { periodID: 'per2', workoutID: 'wShared' }, // court program — mismatches
    ];
    const workouts = [{ id: 'wShared', categoryID: 'perf' }];
    const result = computeMismatchedFrom(programs, periods, periodWorkouts, workouts);
    expect(result.has('wShared')).toBe(true);
  });
});
