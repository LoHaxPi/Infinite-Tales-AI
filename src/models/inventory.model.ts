/**
 * 物品栏物品接口
 */
export interface InventoryItem {
    id: string;           // 唯一标识
    name: string;         // 物品名称
    description?: string; // 物品描述（可选）
    isFavorite: boolean;  // 是否收藏（星标）
    pendingDiscard: boolean; // 待丢弃标记
}
