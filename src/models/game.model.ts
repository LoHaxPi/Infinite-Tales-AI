export interface GameOption {
  label: string;
  action: string;
}

export interface GameScene {
  narrative: string;
  speakerName?: string;
  dialogue?: string;
  options: GameOption[];
  isGameOver: boolean;
  backgroundMood?: string;
  userChoice?: string;
  currencyUnit?: string;
  currencyAmount?: number;
  currentLocation?: string;
  currentTime?: string;
  grantedItems?: string[];
}

export interface GameConfig {
  theme: string;
  setting: string;
  protagonist: string;
  style: string;
}
