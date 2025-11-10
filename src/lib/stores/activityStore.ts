import { writable } from 'svelte/store';

export type ActivityId = 'explorer' | 'search' | 'git' | 'extensions' | 'settings';

const createActivityStore = () => {
  const { subscribe, set } = writable<ActivityId>('explorer');

  const setActivity = (activity: ActivityId) => {
    set(activity);
  };

  return {
    subscribe,
    setActivity
  };
};

export const activityStore = createActivityStore();