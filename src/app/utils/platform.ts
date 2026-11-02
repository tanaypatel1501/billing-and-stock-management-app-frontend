import { Capacitor } from '@capacitor/core';

export const IS_ANDROID_APP = Capacitor.getPlatform() === 'android';
export const USE_SKELETONS = true;