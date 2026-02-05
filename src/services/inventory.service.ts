import { Injectable, signal, computed } from '@angular/core';
import { InventoryItem } from '../models/inventory.model';

/**
 * 物品栏管理服务
 * 管理玩家的物品收集、收藏、丢弃等功能
 */
@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    readonly MAX_SLOTS = 10;
    readonly MAX_FAVORITES = 5;

    /** 物品栏信号 */
    items = signal<InventoryItem[]>([]);

    /** 计算属性：空槽位数组（用于UI渲染） */
    emptySlots = computed(() => {
        const count = this.MAX_SLOTS - this.items().length;
        return Array(Math.max(0, count)).fill(0).map((_, i) => i);
    });

    /** 计算属性：收藏物品数量 */
    favoriteCount = computed(() => this.items().filter(i => i.isFavorite).length);

    /** 计算属性：是否有待丢弃的物品 */
    hasPendingDiscards = computed(() => this.items().some(i => i.pendingDiscard));

    /**
     * 添加物品到物品栏
     * @returns true 成功添加, false 物品栏已满
     */
    addItem(name: string, description?: string): boolean {
        if (this.isFull()) {
            return false;
        }

        const newItem: InventoryItem = {
            id: crypto.randomUUID(),
            name,
            description,
            isFavorite: false,
            pendingDiscard: false
        };

        this.items.update(items => [...items, newItem]);
        return true;
    }

    /**
     * 移除物品
     */
    removeItem(id: string): void {
        this.items.update(items => items.filter(i => i.id !== id));
    }

    /**
     * 切换收藏状态
     * @returns true 成功切换, false 已达收藏上限
     */
    toggleFavorite(id: string): boolean {
        const item = this.items().find(i => i.id === id);
        if (!item) return false;

        // 如果当前未收藏，检查是否达到上限
        if (!item.isFavorite && this.favoriteCount() >= this.MAX_FAVORITES) {
            return false;
        }

        this.items.update(items =>
            items.map(i =>
                i.id === id ? { ...i, isFavorite: !i.isFavorite } : i
            )
        );
        return true;
    }

    /**
     * 标记物品为待丢弃
     */
    markPendingDiscard(id: string): void {
        this.items.update(items =>
            items.map(i =>
                i.id === id ? { ...i, pendingDiscard: true } : i
            )
        );
    }

    /**
     * 取消待丢弃标记
     */
    cancelPendingDiscard(id: string): void {
        this.items.update(items =>
            items.map(i =>
                i.id === id ? { ...i, pendingDiscard: false } : i
            )
        );
    }

    /**
     * 切换待丢弃状态
     */
    togglePendingDiscard(id: string): void {
        const item = this.items().find(i => i.id === id);
        if (!item) return;

        if (item.pendingDiscard) {
            this.cancelPendingDiscard(id);
        } else {
            this.markPendingDiscard(id);
        }
    }

    /**
     * 确认丢弃所有待丢弃物品
     */
    confirmPendingDiscards(): void {
        this.items.update(items => items.filter(i => !i.pendingDiscard));
    }

    /**
     * 获取收藏物品列表
     */
    getFavorites(): InventoryItem[] {
        return this.items().filter(i => i.isFavorite);
    }

    /**
     * 获取待丢弃物品列表
     */
    getPendingDiscards(): InventoryItem[] {
        return this.items().filter(i => i.pendingDiscard);
    }

    /**
     * 获取所有物品名称
     */
    getAllItemNames(): string[] {
        return this.items().map(i => i.name);
    }

    /**
     * 获取收藏物品名称
     */
    getFavoriteNames(): string[] {
        return this.getFavorites().map(i => i.name);
    }

    /**
     * 获取待丢弃物品名称
     */
    getPendingDiscardNames(): string[] {
        return this.getPendingDiscards().map(i => i.name);
    }

    /**
     * 检查物品栏是否已满
     */
    isFull(): boolean {
        return this.items().length >= this.MAX_SLOTS;
    }

    /**
     * 重置物品栏
     */
    reset(): void {
        this.items.set([]);
    }

    /**
     * 从存档恢复物品栏
     */
    restore(items: InventoryItem[]): void {
        this.items.set(items);
    }

    /**
     * 导出物品栏数据（用于存档）
     */
    export(): InventoryItem[] {
        return [...this.items()];
    }
}
