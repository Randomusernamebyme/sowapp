// 檢查點類型
export const CHECKPOINT_TYPES = [
  { id: "puzzle", label: "解謎" },
  { id: "physical", label: "體能" },
  { id: "photo", label: "拍照" },
  { id: "quiz", label: "問答" },
] as const;

// 地理區域
export const GEOGRAPHICAL_AREAS = [
  { id: "central", label: "中環" },
  { id: "wanchai", label: "灣仔" },
  { id: "causeway_bay", label: "銅鑼灣" },
  { id: "north_point", label: "北角" },
  { id: "quarry_bay", label: "鰂魚涌" },
  { id: "taikoo", label: "太古" },
  { id: "sai_wan_ho", label: "西灣河" },
  { id: "shau_kei_wan", label: "筲箕灣" },
  { id: "chai_wan", label: "柴灣" },
  { id: "sheung_wan", label: "上環" },
  { id: "admiralty", label: "金鐘" },
  { id: "tai_koo", label: "太古" },
  { id: "quarry_bay", label: "鰂魚涌" },
  { id: "north_point", label: "北角" },
  { id: "fortress_hill", label: "炮台山" },
  { id: "tin_hau", label: "天后" },
  { id: "causeway_bay", label: "銅鑼灣" },
  { id: "wan_chai", label: "灣仔" },
  { id: "central", label: "中環" },
  { id: "sheung_wan", label: "上環" },
  { id: "sai_ying_pun", label: "西營盤" },
  { id: "kennedy_town", label: "堅尼地城" },
] as const;

// 任務難度
export const MISSION_DIFFICULTY = [
  { id: "easy", label: "簡單" },
  { id: "medium", label: "中等" },
  { id: "hard", label: "困難" },
] as const;

// 任務類型
export const MISSION_TYPES = [
  { id: "urban", label: "城市探索" },
  { id: "nature", label: "自然探索" },
  { id: "historical", label: "歷史文化" },
  { id: "art", label: "藝術文化" },
] as const; 