import { Injectable, signal } from '@angular/core';
import { SaveSlot, SaveSlotMeta } from '../models/save-data.model';

const SAVE_KEY_PREFIX = 'save_';

export class SaveLoadError extends Error {
    constructor(message: string, public readonly saveId: string, public readonly canDelete = false) {
        super(message);
        this.name = 'SaveLoadError';
    }
}

export interface CorruptedSaveMeta {
    id: string;
    reason: string;
}

@Injectable({
    providedIn: 'root'
})
export class PersistenceService {
    /** 已保存的存档列表（响应式） */
    saveList = signal<SaveSlotMeta[]>([]);
    corruptedSaveList = signal<CorruptedSaveMeta[]>([]);

    constructor() {
        this.refreshList();
    }

    /**
     * 保存存档
     */
    save(slot: SaveSlot): void {
        const key = SAVE_KEY_PREFIX + slot.id;
        localStorage.setItem(key, JSON.stringify(slot));
        this.refreshList();
    }

    /**
     * 读取存档
     */
    load(id: string): SaveSlot {
        const key = SAVE_KEY_PREFIX + id;
        const data = localStorage.getItem(key);
        if (!data) {
            throw new SaveLoadError('未找到该存档，请刷新后重试。', id);
        }
        try {
            return JSON.parse(data) as SaveSlot;
        } catch {
            console.error('Failed to parse save data:', id);
            throw new SaveLoadError('该存档已损坏，无法读取。请删除后重新保存。', id, true);
        }
    }

    /**
     * 删除存档
     */
    delete(id: string): void {
        const key = SAVE_KEY_PREFIX + id;
        localStorage.removeItem(key);
        this.refreshList();
    }

    /**
     * 刷新存档列表
     */
    private refreshList(): void {
        const list: SaveSlotMeta[] = [];
        const corruptedList: CorruptedSaveMeta[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(SAVE_KEY_PREFIX)) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const slot = JSON.parse(data) as SaveSlot;
                        list.push({
                            id: slot.id,
                            timestamp: slot.timestamp,
                            summary: slot.summary,
                            provider: slot.provider
                        });
                    } catch {
                        corruptedList.push({
                            id: key.replace(SAVE_KEY_PREFIX, ''),
                            reason: '存档数据格式损坏'
                        });
                    }
                }
            }
        }
        // 按时间戳降序排序（最新在前）
        list.sort((a, b) => b.timestamp - a.timestamp);
        this.saveList.set(list);
        this.corruptedSaveList.set(corruptedList);
    }

    /**
     * 生成存档摘要（基于场景历史）
     */
    generateSummary(sceneHistory: any[]): string {
        if (!sceneHistory || sceneHistory.length === 0) {
            return '新游戏';
        }
        const lastScene = sceneHistory[sceneHistory.length - 1];
        const narrative = lastScene.narrative || '';
        // 取前30个字符作为摘要
        const snippet = narrative.substring(0, 30).replace(/\s+/g, ' ').trim();
        return `第${sceneHistory.length}幕 - ${snippet}${narrative.length > 30 ? '...' : ''}`;
    }
}
